import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ToastService } from '../../core/services/toast.service';
import { BranchDto } from '../../core/services/organization_service';
import { BranchPage } from './branch';

describe('BranchPage', () => {
  let component: BranchPage;
  let httpTesting: HttpTestingController;
  let toast: {
    success: ReturnType<typeof vi.fn>;
    warning: ReturnType<typeof vi.fn>;
    info: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
  };
  let anyComponent: Record<string, any>;

  function mockBranch(): BranchDto {
    return {
      id: 1,
      companyId: 1,
      branchCode: 'BR01',
      branchName: 'Head Office',
      shortName: 'HO',
      branchTypeId: 1,
      parentBranchId: null,
      managerEmployeeId: null,
      defaultWarehouseId: null,
      gstNumber: 'GST01',
      registrationNumber: 'REG01',
      isHeadOffice: true,
      isSalesBranch: true,
      isPurchaseBranch: false,
      isServiceBranch: false,
      sortOrder: 0,
      isActive: true,
      isBlocked: false,
      isDeleted: false,
      createdBy: 1,
      createdAt: '2026-01-01T00:00:00',
      modifiedBy: null,
      modifiedDate: null,
    };
  }

  function flushMasterData(): void {
    httpTesting.expectOne({ method: 'GET', url: '/api/business-types' }).flush([]);
    httpTesting.expectOne({ method: 'GET', url: '/api/industry-types' }).flush([]);
    httpTesting.expectOne({ method: 'GET', url: '/api/gst-registration-types' }).flush([]);
    httpTesting.expectOne({ method: 'GET', url: '/api/Administration/currencies' }).flush([]);
    httpTesting.expectOne({ method: 'GET', url: '/api/languages' }).flush([]);
    httpTesting.expectOne({ method: 'GET', url: '/api/timezones' }).flush([]);
  }

  function flushAll(branch: BranchDto = mockBranch()): void {
    flushMasterData();
    httpTesting.expectOne({ method: 'GET', url: '/api/companies/current' }).flush({ id: 1, companyName: 'ACME' });
    httpTesting.expectOne({ method: 'GET', url: '/api/organization/branch-types' }).flush([]);
    httpTesting.expectOne({ method: 'GET', url: '/api/organization/branches?page=1&size=100&search=&companyId=1' }).flush({ items: [branch], totalCount: 1, pageNumber: 1, pageSize: 100, totalPages: 1, hasNext: false, hasPrevious: false });
  }

  beforeEach(() => {
    toast = { success: vi.fn(), warning: vi.fn(), info: vi.fn(), error: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ToastService, useValue: toast },
      ],
    });
    component = TestBed.runInInjectionContext(() => new BranchPage());
    anyComponent = component as unknown as Record<string, any>;
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('should create', () => {
    flushAll();
    expect(component).toBeTruthy();
  });

  it('loads branch data on construction', () => {
    const branch = mockBranch();
    flushAll(branch);
    expect(toast.error).not.toHaveBeenCalled();
    expect(anyComponent.data()).toEqual(branch);
    expect(anyComponent.loading()).toBe(false);
    expect(anyComponent.form.branchName()).toBe('Head Office');
  });

  it('sets error state when load fails', () => {
    flushMasterData();
    httpTesting.expectOne({ method: 'GET', url: '/api/companies/current' }).error(new ProgressEvent('error'));
    expect(anyComponent.loadFailed()).toBe(true);
    expect(anyComponent.loading()).toBe(false);
  });

  it('reports a required error for an empty branch name', () => {
    flushAll();
    anyComponent.form.branchName.set('');
    anyComponent.touched.branchName.set(true);
    anyComponent.submitted.set(true);
    expect(anyComponent.errorFor('branchName')).toBe('This field is required');
  });

  it('skips the request when the form is invalid', async () => {
    flushAll();
    anyComponent.form.branchName.set('');
    anyComponent.form.companyId.set(0);
    await anyComponent.save();
    expect(toast.warning).toHaveBeenCalled();
  });

  it('saves the branch and reloads on success', async () => {
    const branch = mockBranch();
    flushAll(branch);
    anyComponent.form.branchName.set('Head Office Updated');

    const savePromise = anyComponent.save();
    httpTesting.expectOne({ method: 'PUT', url: '/api/organization/branches/1' }).flush(branch);
    flushAll(branch);
    await savePromise;

    expect(toast.success).toHaveBeenCalledWith('Branch updated', 'Your branch has been saved.');
    expect(anyComponent.saving()).toBe(false);
  });
});