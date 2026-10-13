import { Component, Input, OnInit, inject, signal } from '@angular/core';
import { DecimalPipe, SlicePipe } from '@angular/common';
import { LookupItem, PurchaseDto, PurchaseLookupsDto, PurchaseService } from '../../core/services/master_service';

@Component({
  selector: 'app-purchase-details-panel',
  standalone: true,
  imports: [DecimalPipe, SlicePipe],
  templateUrl: './purchase-details-panel.html',
  styleUrl: './purchase-details-panel.css',
})
export class PurchaseDetailsPanel implements OnInit {
  private readonly purchaseService = inject(PurchaseService);
  protected readonly lookups = signal<PurchaseLookupsDto | null>(null);

  @Input({ required: true }) purchase!: PurchaseDto;

  async ngOnInit(): Promise<void> {
    try {
      this.lookups.set(await this.purchaseService.getLookups());
    } catch {
      // Keep showing the saved IDs as a fallback when lookup data is unavailable.
    }
  }

  protected lookupName(items: LookupItem[] | undefined, id: number | null | undefined): string {
    if (id == null) return '—';
    const item = items?.find((entry) => Number(entry.id) === Number(id));
    return item?.name || item?.code || String(id);
  }
}
