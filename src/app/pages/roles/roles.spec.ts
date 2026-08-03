import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { PermissionService } from '../../core/services/permission.service';
import { ToastService } from '../../core/services/toast.service';
import { Role } from '../../core/models';
import { RolesPage } from './roles';

describe('RolesPage', () => {
  let component: RolesPage;
  let httpTesting: HttpTestingController;
  let toast: { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };
  let perms: { has: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    toast = { success: vi.fn(), error: vi.fn() };
    perms = { has: vi.fn(() => true) };
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ToastService, useValue: toast },
        { provide: PermissionService, useValue: perms },
      ],
    });
    component = TestBed.runInInjectionContext(() => new RolesPage());
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('loads roles on construction', () => {
    const role: Role = {
      roleId: 1,
      name: 'Admin',
      code: 'ADMIN',
      isSystem: true,
      isActive: true,
      permissions: ['users.view'],
    };
    httpTesting.expectOne({ method: 'GET', url: '/api/roles' }).flush([role]);
    expect(component['rows']().length).toBe(1);
  });
});
