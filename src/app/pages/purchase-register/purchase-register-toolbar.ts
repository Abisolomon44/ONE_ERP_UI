import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { PurchaseService, PurchaseLookupsDto } from '../../core/services/master_service';
import { ToastService } from '../../core/services/toast.service';
import { PermissionService } from '../../core/services/permission.service';

@Component({
  selector: 'app-purchase-register-toolbar',
  standalone: true,
  imports: [LucideAngularModule],
  templateUrl: './purchase-register-toolbar.html',
  styleUrl: './purchase-register-toolbar.css',
})
export class PurchaseRegisterToolbar implements OnInit {
  private readonly svc = inject(PurchaseService);
  private readonly toast = inject(ToastService);
  private readonly perm = inject(PermissionService);
  private readonly router = inject(Router);

  protected canCreate = signal(false);
  protected lookups: PurchaseLookupsDto = { suppliers: [], products: [], units: [], companies: [], branches: [], warehouses: [], paymentTypes: [], paymentMethods: [], currentCompanyId: 0 };

  ngOnInit(): void {
    this.canCreate.set(this.perm.has(['purchases.create', 'purchases.manage']));
    this.loadLookups();
  }

  private async loadLookups(): Promise<void> {
    try {
      this.lookups = await this.svc.getLookups();
    } catch (e: any) {
      this.toast.error('Failed to load lookup data', e?.error?.message ?? e?.message ?? '');
    }
  }

  protected newPurchase(): void {
    this.router.navigate(['/purchase-entry']);
  }
}