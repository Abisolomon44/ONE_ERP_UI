import { Component, OnInit, inject, signal, Output, EventEmitter, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { SaleEntryContextService, SaleEntryContextResponse, SaleEntryContextValidateRequest, SaleEntryContextValidateResponse } from '../../core/services/sale-entry-context.service';
import { ToastService } from '../../core/services/toast.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-sale-entry-context-popup',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './sale-entry-context-popup.component.html',
  styleUrl: './sale-entry-context-popup.component.scss',
})
export class SaleEntryContextPopupComponent implements OnInit {
  private readonly contextSvc = inject(SaleEntryContextService);
  private readonly toast = inject(ToastService);
  private readonly auth = inject(AuthService);

  @Output() close = new EventEmitter<void>();
  @Output() continue = new EventEmitter<{ contextToken: string; context: SaleEntryContextResponse }>();

  protected readonly loading = signal(false);
  protected readonly validating = signal(false);
  protected readonly context = signal<SaleEntryContextResponse | null>(null);
  protected readonly errorMessage = signal<string | null>(null);

  protected selectedCompanyId: number | null = null;
  protected selectedBranchId: number | null = null;
  protected selectedStoreId: number | null = null;

  ngOnInit(): void {
    this.loadContext();
  }

  private async loadContext(): Promise<void> {
    this.loading.set(true);
    this.errorMessage.set(null);
    try {
      const ctx = await this.contextSvc.getContext();
      this.context.set(ctx);

      if (ctx.company) this.selectedCompanyId = ctx.company.id;
      if (ctx.branch) this.selectedBranchId = ctx.branch.id;
      if (ctx.store) this.selectedStoreId = ctx.store.id;
    } catch (err: any) {
      const msg = err?.error?.message ?? err?.message ?? 'Failed to load sale entry context';
      this.errorMessage.set(msg);
      this.toast.error(msg);
    } finally {
      this.loading.set(false);
    }
  }

  protected async onCompanyChange(): Promise<void> {
    if (!this.selectedCompanyId) {
      this.selectedBranchId = null;
      this.selectedStoreId = null;
      return;
    }
    this.selectedBranchId = null;
    this.selectedStoreId = null;
    await this.refreshContext();
  }

  protected async onBranchChange(): Promise<void> {
    if (!this.selectedBranchId) {
      this.selectedStoreId = null;
      return;
    }
    this.selectedStoreId = null;
    await this.refreshContext();
  }

  protected async onStoreChange(): Promise<void> {
    await this.refreshContext();
  }

  private async refreshContext(): Promise<void> {
    this.loading.set(true);
    try {
      const ctx = await this.contextSvc.getContext(
        this.selectedCompanyId ?? undefined,
        this.selectedBranchId ?? undefined,
        this.selectedStoreId ?? undefined
      );
      this.context.set(ctx);
    } catch (err: any) {
      const msg = err?.error?.message ?? err?.message ?? 'Failed to refresh context';
      this.toast.error(msg);
    } finally {
      this.loading.set(false);
    }
  }

  protected async onContinue(): Promise<void> {
    const ctx = this.context();
    if (!ctx) return;

    if (!this.selectedCompanyId || !this.selectedBranchId || !this.selectedStoreId) {
      this.toast.error('Please select Company, Branch, and Store');
      return;
    }
    if (!ctx.counter) {
      this.toast.error('No default counter assigned. Please contact administrator.');
      return;
    }
    if (!ctx.operator) {
      this.toast.error('Operator not found. Please contact administrator.');
      return;
    }
    if (!ctx.posSession) {
      this.toast.error('No active POS session. Please open a POS session first.');
      return;
    }

    this.validating.set(true);
    try {
      const request: SaleEntryContextValidateRequest = {
        companyId: this.selectedCompanyId!,
        branchId: this.selectedBranchId!,
        storeId: this.selectedStoreId!,
        counterId: ctx.counter.id,
        operatorId: ctx.operator.id,
        posSessionId: ctx.posSession.id,
      };

      const response = await this.contextSvc.validateContext(request);

      if (response.isValid) {
        this.continue.emit({ contextToken: response.contextToken!, context: ctx });
      } else {
        this.errorMessage.set(response.message);
        this.toast.error(response.message);
      }
    } catch (err: any) {
      const msg = err?.error?.message ?? err?.message ?? 'Validation failed';
      this.errorMessage.set(msg);
      this.toast.error(msg);
    } finally {
      this.validating.set(false);
    }
  }

  protected onCancel(): void {
    this.close.emit();
  }

  protected getStatusBadgeClass(status: string): string {
    switch (status?.toUpperCase()) {
      case 'OPEN':
        return 'badge-open';
      case 'CLOSED':
        return 'badge-closed';
      case 'SUSPENDED':
        return 'badge-suspended';
      default:
        return 'badge-unknown';
    }
  }

  protected getStatusText(status: string): string {
    switch (status?.toUpperCase()) {
      case 'OPEN':
        return 'OPEN';
      case 'CLOSED':
        return 'CLOSED';
      case 'SUSPENDED':
        return 'SUSPENDED';
      default:
        return status || 'UNKNOWN';
    }
  }

  protected formatDateTime(dateStr: string | undefined): string {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).replace(',', '');
  }

  protected formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(amount);
  }
}