import { HttpClient } from '@angular/common/http';
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
      companyId: 1,
      companyCode: 'ABC',
      companyName: 'Acme Corp',
      address: '1 Main Street',
      email: 'a@b.com',
      phone: '123',
      gst: 'GST01',
      currency: 'USD',
      status: 'Active',
      createdBy: 'admin',
      createdDate: '2026-01-01T00:00:00',
      modifiedBy: 'admin',
      modifiedDate: '2026-01-02T00:00:00',
    };
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
    httpTesting.expectOne({ method: 'GET', url: '/api/companies/current' }).flush(mockCompany());
    expect(component).toBeTruthy();
  });

  it('loads company data on construction', () => {
    const company = mockCompany();
    httpTesting.expectOne({ method: 'GET', url: '/api/companies/current' }).flush(company);
    expect(toast.error).not.toHaveBeenCalled();
    expect(anyComponent.data()).toEqual(company);
    expect(anyComponent.loading()).toBe(false);
    expect(anyComponent.form.companyName()).toBe('Acme Corp');
  });

  it('sets error state when load fails', () => {
    httpTesting
      .expectOne({ method: 'GET', url: '/api/companies/current' })
      .error(new ProgressEvent('error'));
    expect(anyComponent.loadFailed()).toBe(true);
    expect(anyComponent.loading()).toBe(false);
  });

  it('reports a required error for an empty company name', () => {
    httpTesting.expectOne({ method: 'GET', url: '/api/companies/current' }).flush(mockCompany());
    anyComponent.form.companyName.set('');
    anyComponent.submitted.set(true);
    expect(anyComponent.errorFor('companyName')).toBe('This field is required');
  });

  it('validates an email address format', () => {
    httpTesting.expectOne({ method: 'GET', url: '/api/companies/current' }).flush(mockCompany());
    anyComponent.form.email.set('not-an-email');
    anyComponent.submitted.set(true);
    expect(anyComponent.errorFor('email')).toBe('Enter a valid email address');
  });

  it('skips the request when the form is invalid', async () => {
    httpTesting.expectOne({ method: 'GET', url: '/api/companies/current' }).flush(mockCompany());
    anyComponent.form.companyName.set('');
    await anyComponent.save();
    expect(toast.warning).toHaveBeenCalled();
  });

  it('saves the company and reloads on success', async () => {
    const company = mockCompany();
    httpTesting.expectOne({ method: 'GET', url: '/api/companies/current' }).flush(company);

    const savePromise = anyComponent.save();
    httpTesting.expectOne({ method: 'PUT', url: '/api/companies/current' }).flush(company);
    httpTesting.expectOne({ method: 'GET', url: '/api/companies/current' }).flush(company);
    await savePromise;

    expect(toast.success).toHaveBeenCalledWith('Company updated', 'Your company profile has been saved.');
    expect(anyComponent.saving()).toBe(false);
  });
});
