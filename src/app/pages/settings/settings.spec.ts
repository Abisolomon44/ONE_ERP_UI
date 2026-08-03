import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuthService } from '../../core/services/auth.service';
import { ThemeService } from '../../core/services/theme.service';
import { ToastService } from '../../core/services/toast.service';
import { SettingsPage } from './settings';

describe('SettingsPage', () => {
  let component: SettingsPage;
  let httpTesting: HttpTestingController;
  let toast: { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };
  let auth: { user: ReturnType<typeof vi.fn> };
  let theme: { mode: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    toast = { success: vi.fn(), error: vi.fn() };
    auth = { user: vi.fn(() => ({ fullName: 'Admin User', email: 'a@b.com', username: 'admin', roles: ['ADMIN'] })) };
    theme = { mode: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ToastService, useValue: toast },
        { provide: AuthService, useValue: auth },
        { provide: ThemeService, useValue: theme },
      ],
    });
    component = TestBed.runInInjectionContext(() => new SettingsPage());
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('computes initials from the signed-in user', () => {
    expect(component.initials).toBe('AU');
  });

  it('reports password mismatch', () => {
    component['password'].next.set('one');
    component['password'].confirm.set('two');
    expect(component.passwordMismatch).toBe('Passwords do not match');
  });
});
