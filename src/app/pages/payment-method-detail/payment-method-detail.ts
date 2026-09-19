import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import {
  PaymentMethodDetailService,
  PaymentMethodDetailDto,
  CreatePaymentMethodDetailRequest,
  UpdatePaymentMethodDetailRequest,
  PaymentMethodService,
  PaymentMethodDto,
} from '../../core/services/master_service';
import { ToastService } from '../../core/services/toast.service';
import { PermissionService } from '../../core/services/permission.service';

@Component({
  selector: 'app-payment-method-detail',
  standalone: true,
  imports: [FormsModule, LucideAngularModule],
  templateUrl: './payment-method-detail.html',
  styleUrl: './payment-method-detail.css',
})
export class PaymentMethodDetailPage implements OnInit {
  private readonly svc = inject(PaymentMethodDetailService);
  private readonly pmSvc = inject(PaymentMethodService);
  private readonly toast = inject(ToastService);
  private readonly perm = inject(PermissionService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly canView = signal(false);
  protected readonly canManage = signal(false);
  protected readonly loading = signal(false);
  protected readonly method = signal<PaymentMethodDto | null>(null);
  protected readonly rows = signal<PaymentMethodDetailDto[]>([]);
  protected readonly dialogOpen = signal(false);
  protected readonly editing = signal<PaymentMethodDetailDto | null>(null);
  protected readonly form = signal({
    code: '',
    name: '',
    displayName: '',
    upiId: '',
    bankName: '',
    accountNumber: '',
    ifscCode: '',
    terminalName: '',
    cashCounterName: '',
    referenceValue: '',
    isDefault: false,
    displayOrder: 0,
    isActive: true,
  });

  private paymentMethodId = 0;

  async ngOnInit(): Promise<void> {
    this.canView.set(this.perm.has('payment-method-details.view'));
    this.canManage.set(this.perm.has('payment-method-details.manage'));
    this.paymentMethodId = Number(this.route.snapshot.paramMap.get('paymentMethodId') ?? 0);
    if (this.canView()) await this.load();
  }

  protected category(): string {
    return this.method()?.paymentCategory ?? '';
  }

  protected showUpi(): boolean {
    return ['DIGITAL'].includes(this.category());
  }

  protected showBank(): boolean {
    return ['BANK'].includes(this.category());
  }

  protected showCard(): boolean {
    return ['CARD'].includes(this.category());
  }

  protected showCash(): boolean {
    return ['CASH'].includes(this.category());
  }

  protected showRef(): boolean {
    return ['BANK', 'CARD', 'CREDIT', 'OTHER'].includes(this.category());
  }

  protected showBankName(): boolean {
    return ['DIGITAL', 'BANK', 'CARD'].includes(this.category());
  }

  protected accountOrRef(r: PaymentMethodDetailDto): string {
    return (r.accountNumber ?? r.referenceValue ?? '').trim() || '—';
  }

  private async load(): Promise<void> {
    try {
      this.loading.set(true);
      const method = await this.pmSvc.getById(this.paymentMethodId);
      this.method.set(method);
      this.rows.set(await this.svc.getByPaymentMethod(this.paymentMethodId, true));
    } catch (e: any) {
      this.toast.error('Failed to load payment method details', e?.error?.message ?? e?.message ?? '');
    } finally {
      this.loading.set(false);
    }
  }

  protected openCreate(): void {
    this.editing.set(null);
    this.form.set({
      code: '',
      name: '',
      displayName: '',
      upiId: '',
      bankName: '',
      accountNumber: '',
      ifscCode: '',
      terminalName: '',
      cashCounterName: '',
      referenceValue: '',
      isDefault: false,
      displayOrder: this.rows().length ? Math.max(...this.rows().map((r) => r.displayOrder)) + 1 : 0,
      isActive: true,
    });
    this.dialogOpen.set(true);
  }

  protected openEdit(r: PaymentMethodDetailDto): void {
    this.editing.set(r);
    this.form.set({
      code: r.code,
      name: r.name,
      displayName: r.displayName ?? '',
      upiId: r.upiId ?? '',
      bankName: r.bankName ?? '',
      accountNumber: r.accountNumber ?? '',
      ifscCode: r.ifscCode ?? '',
      terminalName: r.terminalName ?? '',
      cashCounterName: r.cashCounterName ?? '',
      referenceValue: r.referenceValue ?? '',
      isDefault: r.isDefault,
      displayOrder: r.displayOrder,
      isActive: r.isActive,
    });
    this.dialogOpen.set(true);
  }

  protected async save(): Promise<void> {
    try {
      const f = this.form();
      const Base = {
        code: f.code.trim(),
        name: f.name.trim(),
        displayName: f.displayName.trim() || null,
        upiId: f.upiId.trim() || null,
        bankName: f.bankName.trim() || null,
        accountNumber: f.accountNumber.trim() || null,
        ifscCode: f.ifscCode.trim() || null,
        terminalName: f.terminalName.trim() || null,
        cashCounterName: f.cashCounterName.trim() || null,
        referenceValue: f.referenceValue.trim() || null,
        isDefault: f.isDefault,
        displayOrder: f.displayOrder,
        isActive: f.isActive,
      };
      if (this.editing()) {
        const req: UpdatePaymentMethodDetailRequest = Base;
        await this.svc.update(this.editing()!.paymentMethodDetailId, req);
      } else {
        const req: CreatePaymentMethodDetailRequest = { ...Base, paymentMethodId: this.paymentMethodId };
        await this.svc.create(req);
      }
      this.toast.success('Payment method detail saved');
      this.dialogOpen.set(false);
      await this.load();
    } catch (e: any) {
      this.toast.error('Failed to save', e?.error?.message ?? e?.message ?? '');
    }
  }

  protected async remove(r: PaymentMethodDetailDto): Promise<void> {
    if (!confirm(`Delete payment method detail "${r.name}"?`)) return;
    try {
      await this.svc.delete(r.paymentMethodDetailId);
      this.toast.success('Payment method detail deleted');
      await this.load();
    } catch (e: any) {
      this.toast.error('Failed to delete', e?.error?.message ?? e?.message ?? '');
    }
  }

  protected back(): void {
    this.router.navigate(['/payment-method']);
  }
}