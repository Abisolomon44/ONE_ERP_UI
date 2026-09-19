import { Injectable, inject, signal } from '@angular/core';
import { PurchaseLookupsDto, PurchaseService } from './master_service';

// ============================================================
// Purchase Reports UI store — caches the shared lookups bundle
// (suppliers/products/units/branches/warehouses) so the ten
// report screens don't fetch it ten times per workspace open.
// ============================================================

@Injectable({ providedIn: 'root' })
export class PurchaseReportUiStore {
  private readonly purchaseSvc = inject(PurchaseService);
  private readonly lookupsSig = signal<PurchaseLookupsDto | null>(null);
  private loading: Promise<void> | null = null;

  readonly lookups = this.lookupsSig.asReadonly();

  ensureLookups(): void {
    if (this.lookupsSig() !== null || this.loading) return;
    this.loading = this.purchaseSvc
      .getLookups()
      .then((l) => this.lookupsSig.set(l))
      .catch(() => undefined)
      .finally(() => {
        this.loading = null;
      });
  }
}