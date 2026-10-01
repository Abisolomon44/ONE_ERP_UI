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

  // The Document Designer and the standalone Document Preview are opened from
  // the Document Design hub (query params carry the template version) and
  // share its screen authorization. Document Master sub-pages
  // (/document-design/master/*) are part of the same module and share it too.
  // The DB-seeded master URLs (/invoice-types, /printer-models, …) are real
  // screens and fall through to the exact-match check below for restricted users.
  if (
    path === '/document-designer' ||
    path === '/document-design/preview' ||
    path.startsWith('/document-design/master/')
  ) {
    if (nav.isUnrestricted()) return true;
    await nav.ensureLoaded();
    if (nav.isRouteAuthorized('/document-design') || nav.isRouteAuthorized('/invoice-templates')) return true;
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