import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ToastService } from '../../core/services/toast.service';
import { Paginated, UserWithRoles } from '../../core/models';
import { UsersPage } from './users';

describe('UsersPage', () => {
  let component: UsersPage;
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
    component = TestBed.runInInjectionContext(() => new UsersPage());
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('loads paginated users', () => {
    const user: UserWithRoles = {
      userId: 1,
      companyId: 1,
      username: 'admin',
      fullName: 'Admin User',
      email: 'a@b.com',
      status: 'Active',
      isSuperAdmin: true,
      createdDate: '2026-01-01',
      roleIds: [],
      roleNames: [],
    };
    const res: Paginated<UserWithRoles> = {
      items: [user],
      totalCount: 1,
      pageNumber: 1,
      pageSize: 10,
      totalPages: 1,
      hasPrevious: false,
      hasNext: false,
    };
    httpTesting.expectOne({ method: 'GET', url: '/api/users?page=1&size=10&search=' }).flush(res);
    expect(component['rows']().length).toBe(1);
  });
});
