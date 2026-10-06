import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { PermissionService } from '../../core/services/permission.service';
import { ToastService } from '../../core/services/toast.service';
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
    // Grant all permissions so every widget's API call fires.
    TestBed.inject(PermissionService).permissions.set(['*']);
    component = TestBed.runInInjectionContext(() => new DashboardPage());
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('loads admin info and business widgets on construction', () => {
    const today = new Date().toISOString().slice(0, 10);

    // Admin panel (non-fatal).
    httpTesting.expectOne({ method: 'GET', url: '/api/dashboard' }).flush({
      company: null,
      user: { userId: 1, companyId: 1, username: 'admin', fullName: 'Admin', email: 'a@b.com', status: 'Active', isSuperAdmin: true, roles: [], createdDate: '2026-01-01' },
      roles: [],
      permissions: [],
      tenantCode: 'ABC',
      tenantName: 'Acme Tenant',
      totalUsers: 5,
      activeUsers: 3,
      totalRoles: 2,
      recentUsers: [],
    });

    // Sales Today (overview scoped to today).
    httpTesting
      .expectOne({ method: 'GET', url: `/api/sales-reports?report=overview&dateFrom=${today}&dateTo=${today}&size=1` })
      .flush({ kpis: [{ key: 'grand', label: 'Grand Total', value: 1000 }, { key: 'paid', label: 'Paid', value: 400 }, { key: 'invoices', label: 'Invoices', display: '4' }], rows: [], trend: [], productRanking: [] });

    // All-time overview → outstanding + trend + top products.
    httpTesting
      .expectOne({ method: 'GET', url: '/api/sales-reports?report=overview&size=1' })
      .flush({ kpis: [{ key: 'balance', label: 'Outstanding', value: 2500 }], rows: [], trend: [{ label: 'Mon', value: 10 }], productRanking: [{ label: 'Widget', value: 900 }] });

    // Payments today → payment summary grouping.
    httpTesting
      .expectOne({ method: 'GET', url: `/api/sales-reports?report=payments&dateFrom=${today}&dateTo=${today}&size=300` })
      .flush({ kpis: [], rows: [{ paymentMethod: 'Cash', amount: 300 }, { paymentMethod: 'UPI', amount: 100 }] });

    // Outstanding rows → customer grouping.
    httpTesting
      .expectOne({ method: 'GET', url: '/api/sales-reports?report=outstanding&size=300' })
      .flush({ kpis: [], rows: [{ customer: 'Acme Corp', balance: 1500 }] });

    // Recent sales.
    httpTesting
      .expectOne({ method: 'GET', url: '/api/sales?page=1&size=8' })
      .flush({ items: [{ salesInvoiceId: 1, salesInvoiceNo: 'INV-001', customerNameSnapshot: 'Acme Corp', grandTotal: 1000, balanceAmount: 0, invoiceStatus: 'Paid' }], totalCount: 1, pageNumber: 1, pageSize: 8, totalPages: 1, hasPrevious: false, hasNext: false });

    // Inventory dashboard + low stock.
    httpTesting
      .expectOne({ method: 'GET', url: '/api/inventory/dashboard' })
      .flush({ stockValue: 55000, productsWithStock: 12, outOfStockCount: 1, lowStockCount: 2, qtyInToday: 0, qtyOutToday: 0, transactionsToday: 0 });
    httpTesting
      .expectOne({ method: 'GET', url: '/api/inventory/low-stock' })
      .flush({ items: [{ productId: 5, productName: 'Widget', warehouseId: 1, availableQuantity: 2, reorderLevel: 5 }], totalCount: 1 });

    expect(component['data']()).toBeTruthy();
    expect(component['salesToday']()).toBe('1,000.00');
    expect(component['collectionToday']()).toBe('400.00');
    expect(component['invoicesToday']()).toBe('4');
    expect(component['outstanding']()).toBe('2,500.00');
    expect(component['paymentSummary']()).toEqual([
      { label: 'Cash', value: 300 },
      { label: 'UPI', value: 100 },
    ]);
    expect(component['customerOutstanding']()).toEqual([{ label: 'Acme Corp', value: 1500 }]);
    expect(component['recentSales']().length).toBe(1);
    expect(component['lowStock']().length).toBe(1);
    expect(component['inv']()?.stockValue).toBe(55000);
  });

  it('skips business widgets without permissions', () => {
    TestBed.inject(PermissionService).permissions.set([]);
    // Recreate with no permissions: only the admin endpoint fires.
    component = TestBed.runInInjectionContext(() => new DashboardPage());
    httpTesting.expectOne({ method: 'GET', url: '/api/dashboard' }).flush(null);
    // No sales/inventory calls expected — verify() in afterEach fails on extras.
    expect(component['canSales']()).toBe(false);
    expect(component['canStock']()).toBe(false);
  });
});
