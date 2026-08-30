import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import {
  PaymentService,
  PaymentLookupsDto,
  PaymentDto,
  CreatePaymentRequest,
  UpdatePaymentRequest,
} from '../../core/services/master_service';
import { ToastService } from '../../core/services/toast.service';
import { PermissionService } from '../../core/services/permission.service';

@Component({
  selector: 'app-payment-entry',
  standalone: true,
  imports: [FormsModule, LucideAngularModule],
  templateUrl: './payment-entry.html',
  styleUrl: './payment-entry.css',
})
export class PaymentEntryPage implements OnInit {
  private readonly svc = inject(PaymentService);
  private readonly toast = inject(ToastService);
  private readonly perm = inject(PermissionService);
  private readonly route = inject(ActivatedRoute);

  protected readonly canView = signal(false);
  protected readonly canManage = signal(false);
  protected readonly lookups = signal<PaymentLookupsDto | null>(null);

  protected paymentTypeId: number | null = null;
  protected paymentMethodId: number | null = null;
  protected businessPartnerId: number | null = null;
  protected referenceType = 'PURCHASE';
  protected referenceId: number | null = null;
  protected amount = 0;
  protected paymentDate = new Date().toISOString().slice(0, 10);
  protected paymentNo = '';
  protected referenceNo = '';
  protected remarks = '';
  protected editingId: number | null = null;

  async ngOnInit(): Promise<void> {
    this.canView.set(this.perm.has('payments.view'));
    this.canManage.set(this.perm.has('payments.manage'));
    if (this.canView()) {
      await this.refreshLookups();
      const id = this.route.snapshot.queryParamMap.get('id');
      if (id) {
        try {
          const d = await this.svc.getById(Number(id));
          if (d) this.edit(d);
        } catch {
          /* ignore */
        }
      }
    }
  }

  protected async refreshLookups(): Promise<void> {
    this.lookups.set(await this.svc.getLookups());
    if (!this.paymentNo) {
      try {
        this.paymentNo = await this.svc.getNextNumber();
      } catch {
        this.paymentNo = '';
      }
    }
  }

  protected async save(): Promise<void> {
    if (!this.paymentTypeId || !this.paymentMethodId || !this.referenceId) {
      this.toast.error('Payment Type, Payment Method and Reference Id are required');
      return;
    }
    const base = {
      businessPartnerId: this.businessPartnerId,
      paymentTypeID: this.paymentTypeId,
      paymentMethodID: this.paymentMethodId,
      referenceType: this.referenceType,
      referenceId: this.referenceId,
      amount: this.amount,
      paymentDate: this.paymentDate,
      paymentNo: this.paymentNo,
      referenceNo: this.referenceNo || null,
      remarks: this.remarks || null,
    };
    try {
      if (this.editingId) {
        const req: UpdatePaymentRequest = { ...base, statusID: 4 };
        await this.svc.update(this.editingId, req);
      } else {
        const req: CreatePaymentRequest = base;
        await this.svc.create(req);
      }
      this.toast.success('Payment saved');
      this.resetForm();
    } catch (e: any) {
      this.toast.error('Failed to save', e?.error?.message ?? e?.message ?? '');
    }
  }

  protected edit(p: PaymentDto): void {
    void this.refreshLookups();
    this.editingId = p.paymentId;
    this.paymentTypeId = p.paymentTypeID;
    this.paymentMethodId = p.paymentMethodID;
    this.businessPartnerId = p.businessPartnerId ?? null;
    this.referenceType = p.referenceType;
    this.referenceId = p.referenceId;
    this.amount = p.amount;
    this.paymentDate = p.paymentDate ? p.paymentDate.slice(0, 10) : this.paymentDate;
    this.paymentNo = p.paymentNo;
    this.referenceNo = p.referenceNo ?? '';
    this.remarks = p.remarks ?? '';
  }

  protected resetForm(): void {
    this.editingId = null;
    this.paymentTypeId = null;
    this.paymentMethodId = null;
    this.businessPartnerId = null;
    this.referenceType = 'PURCHASE';
    this.referenceId = null;
    this.amount = 0;
    this.paymentDate = new Date().toISOString().slice(0, 10);
    this.paymentNo = '';
    this.referenceNo = '';
    this.remarks = '';
    void this.refreshLookups();
  }

  protected readonly trackByIndex = (i: number): number => i;
}
