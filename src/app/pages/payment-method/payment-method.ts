import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import {
  PaymentMethodService,
  PaymentMethodDto,
  CreatePaymentMethodRequest,
  UpdatePaymentMethodRequest,
} from '../../core/services/master_service';
import { ToastService } from '../../core/services/toast.service';
import { PermissionService } from '../../core/services/permission.service';

@Component({
  selector: 'app-payment-method',
  standalone: true,
  imports: [FormsModule, LucideAngularModule],
  templateUrl: './payment-method.html',
  styleUrl: './payment-method.css',
})
export class PaymentMethodPage implements OnInit {
  private readonly svc = inject(PaymentMethodService);
  private readonly toast = inject(ToastService);
  private readonly perm = inject(PermissionService);

  protected readonly canView = signal(false);
  protected readonly canManage = signal(false);
  protected readonly loading = signal(false);
  protected readonly rows = signal<PaymentMethodDto[]>([]);
  protected readonly dialogOpen = signal(false);
  protected readonly editing = signal<PaymentMethodDto | null>(null);
  protected readonly form = signal({
    code: '',
    name: '',
    paymentCategory: 'CASH',
    isCash: false,
    isCredit: false,
    requiresReferenceNo: false,
    displayOrder: 0,
    isActive: true,
  });

  async ngOnInit(): Promise<void> {
    this.canView.set(this.perm.has('payment-methods.view'));
    this.canManage.set(this.perm.has('payment-methods.manage'));
    if (this.canView()) await this.load();
  }

  private async load(): Promise<void> {
    try {
      this.loading.set(true);
      this.rows.set(await this.svc.getAll(true));
    } catch (e: any) {
      this.toast.error('Failed to load payment methods', e?.error?.message ?? e?.message ?? '');
    } finally {
      this.loading.set(false);
    }
  }

  protected openCreate(): void {
    this.editing.set(null);
    this.form.set({
      code: '',
      name: '',
      paymentCategory: 'CASH',
      isCash: false,
      isCredit: false,
      requiresReferenceNo: false,
      displayOrder: 0,
      isActive: true,
    });
    this.dialogOpen.set(true);
  }

  protected openEdit(r: PaymentMethodDto): void {
    this.editing.set(r);
    this.form.set({
      code: r.code,
      name: r.name,
      paymentCategory: r.paymentCategory,
      isCash: r.isCash,
      isCredit: r.isCredit,
      requiresReferenceNo: r.requiresReferenceNo,
      displayOrder: r.displayOrder,
      isActive: r.isActive,
    });
    this.dialogOpen.set(true);
  }

  protected async save(): Promise<void> {
    try {
      const f = this.form();
      if (this.editing()) {
        const req: UpdatePaymentMethodRequest = {
          code: f.code.trim(),
          name: f.name.trim(),
          paymentCategory: f.paymentCategory,
          isCash: f.isCash,
          isCredit: f.isCredit,
          requiresReferenceNo: f.requiresReferenceNo,
          displayOrder: f.displayOrder,
          isActive: f.isActive,
        };
        await this.svc.update(this.editing()!.paymentMethodId, req);
      } else {
        const req: CreatePaymentMethodRequest = {
          code: f.code.trim(),
          name: f.name.trim(),
          paymentCategory: f.paymentCategory,
          isCash: f.isCash,
          isCredit: f.isCredit,
          requiresReferenceNo: f.requiresReferenceNo,
          displayOrder: f.displayOrder,
          isActive: f.isActive,
        };
        await this.svc.create(req);
      }
      this.toast.success('Payment method saved');
      this.dialogOpen.set(false);
      await this.load();
    } catch (e: any) {
      this.toast.error('Failed to save', e?.error?.message ?? e?.message ?? '');
    }
  }

  protected async remove(r: PaymentMethodDto): Promise<void> {
    if (!confirm(`Delete payment method "${r.name}"?`)) return;
    try {
      await this.svc.delete(r.paymentMethodId);
      this.toast.success('Payment method deleted');
      await this.load();
    } catch (e: any) {
      this.toast.error('Failed to delete', e?.error?.message ?? e?.message ?? '');
    }
  }
}
