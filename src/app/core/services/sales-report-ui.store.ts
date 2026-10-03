import { Injectable, inject, signal } from '@angular/core';
import { SalesLookupsDto, SalesService } from './sales.service';

// ============================================================
// Sales Reports UI store — caches the shared lookups bundle
// (customers/products/units/branches/warehouses) so the fourteen
// report screens don't fetch it fourteen times per workspace open.
// ============================================================

@Injectable({ providedIn: 'root' })
export class SalesReportUiStore {
  private readonly salesSvc = inject(SalesService);
  private readonly lookupsSig = signal<SalesLookupsDto | null>(null);
  private loading: Promise<void> | null = null;

  readonly lookups = this.lookupsSig.asReadonly();

  ensureLookups(): void {
    if (this.lookupsSig() !== null || this.loading) return;
    this.loading = this.salesSvc
      .getLookups()
      .then((l) => this.lookupsSig.set(l))
      .catch(() => undefined)
      .finally(() => {
        this.loading = null;
      });
  }
}
