import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SlicePipe } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import {
  PaymentTypeService,
  PaymentTypeDto,
  CreatePaymentTypeRequest,
  UpdatePaymentTypeRequest,
} from '../../core/services/master_service';
import { ToastService } from '../../core/services/toast.service';
import { PermissionService } from '../../core/services/permission.service';

@Component({
  selector: 'app-payment-type',
  standalone: true,
  imports: [FormsModule, SlicePipe, LucideAngularModule],
  templateUrl: './payment-type.html',
  styleUrl: './payment-type.css',
})
export class PaymentTypePage implements OnInit {
  private readonly svc = inject(PaymentTypeService);
  private readonly toast = inject(ToastService);
  private readonly perm = inject(PermissionService);

  protected readonly canView = signal(false);
  protected readonly canManage = signal(false);
  protected readonly loading = signal(false);
  protected readonly rows = signal<PaymentTypeDto[]>([]);
  protected readonly dialogOpen = signal(false);
  protected readonly editing = signal<PaymentTypeDto | null>(null);
  protected readonly form = signal({ code: '', name: '', displayOrder: 0, isActive: true });

  async ngOnInit(): Promise<void> {
    this.canView.set(this.perm.has('payment-types.view'));
    this.canManage.set(this.perm.has('payment-types.manage'));
    if (this.canView()) await this.load();
  }

  private async load(): Promise<void> {
    try {
      this.loading.set(true);
      this.rows.set(await this.svc.getAll(true));
    } catch (e: any) {
      this.toast.error('Failed to load payment types', e?.error?.message ?? e?.message ?? '');
    } finally {
      this.loading.set(false);
    }
  }

  protected openCreate(): void {
    this.editing.set(null);
    this.form.set({ code: '', name: '', displayOrder: 0, isActive: true });
    this.dialogOpen.set(true);
  }

  protected openEdit(r: PaymentTypeDto): void {
    this.editing.set(r);
    this.form.set({ code: r.code, name: r.name, displayOrder: r.displayOrder, isActive: r.isActive });
    this.dialogOpen.set(true);
  }

  protected async save(): Promise<void> {
    try {
      const f = this.form();
      if (this.editing()) {
        const req: UpdatePaymentTypeRequest = {
          code: f.code.trim(),
          name: f.name.trim(),
          displayOrder: f.displayOrder,
          isActive: f.isActive,
        };
        await this.svc.update(this.editing()!.paymentTypeId, req);
      } else {
        const req: CreatePaymentTypeRequest = {
          code: f.code.trim(),
          name: f.name.trim(),
          displayOrder: f.displayOrder,
          isActive: f.isActive,
        };
        await this.svc.create(req);
      }
      this.toast.success('Payment type saved');
      this.dialogOpen.set(false);
      await this.load();
    } catch (e: any) {
      this.toast.error('Failed to save', e?.error?.message ?? e?.message ?? '');
    }
  }

  protected async remove(r: PaymentTypeDto): Promise<void> {
    if (!confirm(`Delete payment type "${r.name}"?`)) return;
    try {
      await this.svc.delete(r.paymentTypeId);
      this.toast.success('Payment type deleted');
      await this.load();
    } catch (e: any) {
      this.toast.error('Failed to delete', e?.error?.message ?? e?.message ?? '');
    }
  }
}
