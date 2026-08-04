import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ToastService } from '../../core/services/toast.service';
import { Company } from '../../core/models';
import { CompanyPage } from './company';

describe('CompanyPage', () => {
  let component: CompanyPage;
  let httpTesting: HttpTestingController;
  let toast: {
    success: ReturnType<typeof vi.fn>;
    warning: ReturnType<typeof vi.fn>;
    info: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
  };
  let anyComponent: Record<string, any>;

  function mockCompany(): Company {
    return {
      id: 1,
      companyCode: 'ABC',
      companyName: 'Acme Corp',
      shortName: 'Acme',
      abbreviation: 'ACM',
      businessTypeId: 1,
      industryTypeId: 1,
      gstRegistrationTypeId: null,
      gstNumber: 'GST01',
      panNumber: 'PAN01',
      tanNumber: 'TAN01',
      cinNumber: 'CIN01',
      registrationNumber: 'REG10001',
      currencyId: 2,
      languageId: 1,
      timeZoneId: 1,
      isActive: true,
      isBlocked: false,
      createdBy: 0,
      createdDate: '2026-01-01T00:00:00',
      modifiedBy: 1,
      modifiedDate: '2026-01-02T00:00:00',
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

  function flushAll(company: Company = mockCompany()): void {
    flushMasterData();
    httpTesting.expectOne({ method: 'GET', url: '/api/companies/current' }).flush(company);
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
    component = TestBed.runInInjectionContext(() => new CompanyPage());
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

  it('loads company data on construction', () => {
    const company = mockCompany();
    flushAll(company);
    expect(toast.error).not.toHaveBeenCalled();
    expect(anyComponent.data()).toEqual(company);
    expect(anyComponent.loading()).toBe(false);
    expect(anyComponent.form.companyName()).toBe('Acme Corp');
  });

  it('sets error state when load fails', () => {
    flushMasterData();
    httpTesting.expectOne({ method: 'GET', url: '/api/companies/current' }).error(new ProgressEvent('error'));
    expect(anyComponent.loadFailed()).toBe(true);
    expect(anyComponent.loading()).toBe(false);
  });

  it('reports a required error for an empty company name', () => {
    flushAll();
    anyComponent.form.companyName.set('');
    anyComponent.touched.companyName.set(true);
    anyComponent.submitted.set(true);
    expect(anyComponent.errorFor('companyName')).toBe('This field is required');
  });

  it('skips the request when the form is invalid', async () => {
    flushAll();
    anyComponent.form.companyName.set('');
    anyComponent.form.businessTypeId.set(0);
    anyComponent.form.currencyId.set(0);
    await anyComponent.save();
    expect(toast.warning).toHaveBeenCalled();
  });

  it('saves the company and reloads on success', async () => {
    const company = mockCompany();
    flushAll(company);
    anyComponent.form.companyName.set('Acme Corp Updated');

    const savePromise = anyComponent.save();
    httpTesting.expectOne({ method: 'PUT', url: '/api/companies/current' }).flush(company);
    flushAll(company);
    await savePromise;

    expect(toast.success).toHaveBeenCalledWith('Company updated', 'Your company profile has been saved.');
    expect(anyComponent.saving()).toBe(false);
  });
});
