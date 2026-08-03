import { HttpClient } from '@angular/common/http';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ToastService } from '../../core/services/toast.service';
import { DashboardData } from '../../core/models';
import { DashboardPage } from './dashboard';

describe('DashboardPage', () => {
  let component: DashboardPage;
  let httpTesting: HttpTestingController;
  let toast: { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    toast = { success: vi.fn(), error: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ToastService, useValue: toast },
      ],
    });
    component = TestBed.runInInjectionContext(() => new DashboardPage());
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('loads dashboard data on construction', () => {
    const data: DashboardData = {
      company: { companyId: 1, companyCode: 'ABC', companyName: 'Acme', currency: 'USD', status: 'Active' },
      user: { userId: 1, companyId: 1, username: 'admin', fullName: 'Admin', email: 'a@b.com', status: 'Active', isSuperAdmin: true, roles: [], createdDate: '2026-01-01' },
      roles: [],
      permissions: [],
      tenantCode: 'ABC',
      tenantName: 'Acme Tenant',
      totalUsers: 5,
      activeUsers: 3,
      totalRoles: 2,
      recentUsers: [],
    };
    httpTesting.expectOne({ method: 'GET', url: '/api/dashboard' }).flush(data);
    expect(component['data']()).toEqual(data);
  });
});
