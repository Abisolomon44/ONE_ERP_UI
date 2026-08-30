import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { DecimalPipe, SlicePipe } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { PaymentService, PaymentDto } from '../../core/services/master_service';
import { ToastService } from '../../core/services/toast.service';
import { PermissionService } from '../../core/services/permission.service';

@Component({
  selector: 'app-payment-list',
  standalone: true,
  imports: [DecimalPipe, SlicePipe, LucideAngularModule],
  templateUrl: './payment-list.html',
  styleUrl: './payment-list.css',
})
export class PaymentListPage implements OnInit {
  private readonly svc = inject(PaymentService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly perm = inject(PermissionService);

  protected readonly canManage = signal(false);
  protected readonly loading = signal(false);
  protected readonly rows = signal<PaymentDto[]>([]);

  async ngOnInit(): Promise<void> {
    this.canManage.set(this.perm.has('payments.manage'));
    await this.load();
  }

  private async load(): Promise<void> {
    try {
      this.loading.set(true);
      const p = await this.svc.getPaged(1, 100, '');
      this.rows.set(p.items ?? []);
    } catch (e: any) {
      this.toast.error('Failed to load payments', e?.error?.message ?? e?.message ?? '');
    } finally {
      this.loading.set(false);
    }
  }

  protected edit(p: PaymentDto): void {
    this.router.navigate(['/payment-entry'], { queryParams: { id: p.paymentId } });
  }

  protected async remove(p: PaymentDto): Promise<void> {
    if (!confirm(`Delete payment ${p.paymentNo}?`)) return;
    try {
      await this.svc.delete(p.paymentId);
      this.toast.success('Payment deleted');
      await this.load();
    } catch (e: any) {
      this.toast.error('Failed to delete', e?.error?.message ?? e?.message ?? '');
    }
  }
}
