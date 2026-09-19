import { inject } from '@angular/core';
import { CanActivateChildFn, CanActivateFn, Router, UrlTree } from '@angular/router';
import { NavigationStoreService } from './services/navigation-store.service';

// Routes that are not backed by a screen permission (hub/report pages reachable
// through the top bar or shared layouts), plus the dashboard which is always
// visible to every signed-in user.
const NON_SCREEN_ALLOWLIST = new Set([
  '/dashboard',
  '/access-denied',
  '/contact-administrator',
  '/business-master',
  '/administration',
]);

function normalizePath(path: string): string {
  let p = path.split('?')[0].split('#')[0];
  if (!p.startsWith('/')) p = `/${p}`;
  p = p.replace(/\/+$/, '');
  return p;
}

async function canEnter(url: string, nav: NavigationStoreService, router: Router): Promise<boolean | UrlTree> {
  const path = normalizePath(url);

  if (NON_SCREEN_ALLOWLIST.has(path)) return true;

  // Transaction detail pages share their parent screen's authorization.
  // Field-level / action-level security stays in the components + backend [Permission] checks.
  if (
    path === '/purchases' ||
    path.startsWith('/purchases/') ||
    path === '/purchase-returns/new' ||
    path.startsWith('/purchase-returns/') ||
    path === '/purchase-entry'
  ) {
    if (nav.isUnrestricted()) return true;
    await nav.ensureLoaded();
    if (nav.isRouteAuthorized('/purchase') || nav.isRouteAuthorized('/purchase-entry')) return true;
    // Fall through to exact-match check so restricted users without purchase
    // screens still get access-denied.
  }

  if (path === '/workspace' || path.startsWith('/workspace/')) {
    await nav.ensureLoaded();
    const id = Number(path.split('/')[2]);
    if (Number.isFinite(id) && nav.hasWorkspace(id)) return true;
    return router.parseUrl('/access-denied');
  }

  if (nav.isUnrestricted()) return true;

  await nav.ensureLoaded();
  return nav.isRouteAuthorized(path) || router.parseUrl('/access-denied');
}

export const navigationGuard: CanActivateFn = async (_route, state) => {
  const nav = inject(NavigationStoreService);
  const router = inject(Router);
  return canEnter(state.url, nav, router);
};

export const navigationChildGuard: CanActivateChildFn = async (_route, state) => {
  const nav = inject(NavigationStoreService);
  const router = inject(Router);
  return canEnter(state.url, nav, router);
};