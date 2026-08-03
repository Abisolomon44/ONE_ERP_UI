import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AuthService } from '../core/services/auth.service';
import { PermissionService } from '../core/services/permission.service';
import { ThemeService } from '../core/services/theme.service';
import { AppShell } from './app-shell';

describe('AppShell', () => {
  let component: AppShell;
  let auth: { user: ReturnType<typeof vi.fn>; logout: ReturnType<typeof vi.fn> };
  let theme: { mode: ReturnType<typeof vi.fn>; toggleMode: ReturnType<typeof vi.fn> };
  let perms: { has: ReturnType<typeof vi.fn> };
  let router: { url: string; navigate: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    auth = { user: vi.fn(() => ({ fullName: 'Admin User', username: 'admin' })), logout: vi.fn(() => Promise.resolve()) };
    theme = { mode: vi.fn(() => 'light'), toggleMode: vi.fn() };
    perms = { has: vi.fn(() => true) };
    router = { url: '/users', navigate: vi.fn(() => Promise.resolve(true)) };
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: auth },
        { provide: ThemeService, useValue: theme },
        { provide: PermissionService, useValue: perms },
        { provide: Router, useValue: router },
      ],
    });
    component = TestBed.runInInjectionContext(() => new AppShell());
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('computes the page title from the current route', () => {
    expect(component.pageTitle()).toBe('Users');
  });

  it('computes initials from the signed-in user', () => {
    expect(component.initials()).toBe('AU');
  });

  it('logs out and navigates to login', async () => {
    await component.logout();
    expect(auth.logout).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });
});
