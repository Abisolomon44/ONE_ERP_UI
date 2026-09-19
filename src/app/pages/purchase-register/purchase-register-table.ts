import { Component, OnInit, inject, signal, computed, effect, input } from '@angular/core';
import { DecimalPipe, SlicePipe } from '@angular/common';
import { Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { PurchaseService, PurchaseDto } from '../../core/services/master_service';
import { ToastService } from '../../core/services/toast.service';
import { PermissionService } from '../../core/services/permission.service';

@Component({
  selector: 'app-purchase-register-table',
  standalone: true,
  imports: [DecimalPipe, SlicePipe, LucideAngularModule],
  templateUrl: './purchase-register-table.html',
  styleUrl: './purchase-register-table.css',
})
export class PurchaseRegisterTable implements OnInit {
  private readonly svc = inject(PurchaseService);
  private readonly toast = inject(ToastService);
  private readonly perm = inject(PermissionService);
  private readonly router = inject(Router);

  protected loading = signal(false);
  protected rows = signal<PurchaseDto[]>([]);
  protected selectedRows = signal<number[]>([]);

  // Permission signals - expected to be set by parent
  protected readonly canView = input.required<boolean>();
  protected readonly canEdit = input.required<boolean>();
  protected readonly canCancel = input.required<boolean>();
  protected readonly canDelete = input.required<boolean>();
  protected readonly canReturn = input.required<boolean>();

  ngOnInit(): void {
    // Rows will be populated by the parent component
  }

  protected trackById(_: number, p: PurchaseDto): number {
    return p.purchaseId;
  }

  protected isSelectAll(): boolean {
    const count = this.rows().length;
    return count > 0 && this.selectedRows().length === count;
  }

  protected toggleSelectAll(): void {
    const count = this.rows().length;
    const allSelected = this.isSelectAll();
    if (allSelected) {
      this.selectedRows.set([]);
    } else {
      this.selectedRows.set(this.rows().map((p: PurchaseDto, _i: number) => p.purchaseId!));
    }
  }

  protected isSelected(id: number): boolean {
    return this.selectedRows().includes(id);
  }

  protected toggleSelect(id: number): void {
    const current = this.selectedRows();
    if (current.includes(id)) {
      this.selectedRows.set(current.filter(x => x !== id));
    } else {
      this.selectedRows.set([...current, id]);
    }
  }

  protected viewPurchase(id: number): void {
    this.router.navigate(['/purchase-view', id]);
  }

  protected editPurchase(id: number): void {
    this.router.navigate(['/purchase-edit', id]);
  }

  protected cancelPurchase(id: number): void {
    this.router.navigate(['/purchase-cancel', id]);
  }

  protected deletePurchase(id: number): void {
    this.router.navigate(['/purchase-delete', id]);
  }

  protected returnPurchase(id: number): void {
    this.router.navigate(['/purchase-returns/new'], { queryParams: { purchaseId: id } });
  }

  protected printPurchase(id: number): void {
    this.router.navigate(['/purchase-print', id]);
  }
}