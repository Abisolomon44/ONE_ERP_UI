import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ThemeService } from '../../core/services/theme.service';
import { ToastService } from '../../core/services/toast.service';
import { LoginResponse } from '../../core/models';
import { LoginPage } from './login';

describe('LoginPage', () => {
  let component: LoginPage;
  let auth: { login: ReturnType<typeof vi.fn> };
  let toast: { success: ReturnType<typeof vi.fn> };
  let router: { navigateByUrl: ReturnType<typeof vi.fn> };
  let theme: { mode: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    auth = { login: vi.fn() };
    toast = { success: vi.fn() };
    router = { navigateByUrl: vi.fn() };
    theme = { mode: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: auth },
        { provide: ToastService, useValue: toast },
        { provide: Router, useValue: router },
        { provide: ThemeService, useValue: theme },
      ],
    });
    component = TestBed.runInInjectionContext(() => new LoginPage());
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('signs in and navigates to dashboard', async () => {
    auth.login.mockResolvedValue({ tenantCode: 'ACME', tenantName: 'ACME' } as LoginResponse);
    await component.submit();
    expect(auth.login).toHaveBeenCalledWith('admin', 'Admin@123');
    expect(router.navigateByUrl).toHaveBeenCalledWith('/dashboard');
  });
});
