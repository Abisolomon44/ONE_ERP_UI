import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { LucideAngularModule } from 'lucide-angular';
import { BaseButton } from '../../shared/base-button';
import { BaseDropdown, BaseInput } from '../../shared/base-controls';
import { ToastService } from '../../core/services/toast.service';
import { PermissionService } from '../../core/services/permission.service';
import {
  PurchaseWorkflowService,
  PurchaseSettingsDto,
  ApprovalRuleDto,
  UpsertApprovalRuleRequest,
} from '../../core/services/purchase-workflow.service';

interface RuleDraft {
  approvalSettingId: number;
  documentType: 'PURCHASE' | 'PURCHASE_RETURN';
  // Editable fields are strings because base-input/base-dropdown models are string-typed;
  // they are converted to numbers on save.
  approvalLevel: string;
  minimumAmount: string;
  maximumAmount: string;
  approverRoleId: string;
  isActive: boolean;
}

@Component({
  selector: 'app-purchase-settings',
  standalone: true,
  imports: [FormsModule, LucideAngularModule, BaseButton, BaseDropdown, BaseInput],
  templateUrl: './purchase-settings.html',
  styleUrl: './purchase-settings.css',
})
export class PurchaseSettingsPage implements OnInit {
  private readonly workflow = inject(PurchaseWorkflowService);
  private readonly toast = inject(ToastService);
  protected readonly perm = inject(PermissionService);
  private readonly router = inject(Router);
  private readonly http = inject(HttpClient);

  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly dirty = signal(false);
  protected readonly loaded = signal<PurchaseSettingsDto | null>(null);

  protected readonly mode = signal<'BILLING' | 'ERP'>('BILLING');
  protected readonly requirePo = signal(false);
  protected readonly requireGrn = signal(false);
  protected readonly requireApproval = signal(false);
  protected readonly requireMatching = signal(false);
  protected readonly allowPartial = signal(true);
  protected readonly allowExcess = signal(false);
  protected readonly excessTolerance = signal('5');
  protected readonly enableLandedCost = signal(false);
  protected readonly requireReturnApproval = signal(false);

  protected readonly rules = signal<RuleDraft[]>([]);
  protected readonly roles = signal<{ value: number; label: string }[]>([]);

  protected readonly canEdit = computed(() => this.perm.has('purchases.manage') || this.perm.has('purchases.edit'));

  protected readonly isErp = computed(() => this.mode() === 'ERP');

  protected readonly toleranceError = computed(() => {
    const v = Number(this.excessTolerance());
    if (Number.isNaN(v) || v < 0 || v > 100) return 'Tolerance must be between 0 and 100';
    return '';
  });

  protected readonly modeOptions = [
    { value: 'BILLING', label: 'Billing Mode — direct bill entry (software behaves like billing software)' },
    { value: 'ERP', label: 'ERP Mode — PO → approval → GRN → invoice matching' },
  ];

  protected readonly docTypeOptions = [
    { value: 'PURCHASE', label: 'Purchase' },
    { value: 'PURCHASE_RETURN', label: 'Purchase Return' },
  ];

  ngOnInit(): void {
    void this.load();
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      const [settings, rules] = await Promise.all([
        this.workflow.getSettings(),
        this.workflow.getApprovalRules().catch(() => [] as ApprovalRuleDto[]),
      ]);
      this.applySettings(settings);
      this.rules.set(
        rules.map<RuleDraft>((r) => ({
          approvalSettingId: r.approvalSettingId,
          documentType: r.documentType,
          approvalLevel: String(r.approvalLevel),
          minimumAmount: String(r.minimumAmount),
          maximumAmount: r.maximumAmount == null ? '' : String(r.maximumAmount),
          approverRoleId: String(r.approverRoleId),
          isActive: r.isActive,
        })),
      );
      void this.loadRoles();
    } catch {
      /* interceptor shows the error */
    } finally {
      this.loading.set(false);
    }
  }

  private async loadRoles(): Promise<void> {
    try {
      // Roles come from the shared RolesController (ApiResponse envelope is
      // unwrapped by the HTTP interceptor).
      const roles = await firstValueFrom(
        this.http.get<{ roleId: number; name: string; code: string }[]>('/api/roles'),
      );
      this.roles.set((roles ?? []).map((r) => ({ value: r.roleId, label: r.name || r.code })));
    } catch {
      /* roles are optional for viewing settings */
    }
  }

  private applySettings(s: PurchaseSettingsDto): void {
    this.loaded.set(s);
    this.mode.set(s.purchaseWorkflowMode);
    this.requirePo.set(s.requirePurchaseOrder);
    this.requireGrn.set(s.requireGoodsReceipt);
    this.requireApproval.set(s.requirePurchaseApproval);
    this.requireMatching.set(s.requireInvoiceMatching);
    this.allowPartial.set(s.allowPartialReceipt);
    this.allowExcess.set(s.allowExcessReceipt);
    this.excessTolerance.set(String(s.excessReceiptTolerancePercent));
    this.enableLandedCost.set(s.enableLandedCost);
    this.requireReturnApproval.set(s.requireReturnApproval);
  }

  protected touch(): void {
    this.dirty.set(true);
  }

  protected setMode(value: string): void {
    if (value === 'BILLING' || value === 'ERP') {
      this.mode.set(value);
      this.touch();
    }
  }

  protected async save(): Promise<void> {
    if (this.saving() || !this.canEdit() || this.toleranceError()) return;
    this.saving.set(true);
    try {
      const updated = await this.workflow.updateSettings({
        purchaseWorkflowMode: this.mode(),
        requirePurchaseOrder: this.requirePo(),
        requireGoodsReceipt: this.requireGrn(),
        requirePurchaseApproval: this.requireApproval(),
        requireInvoiceMatching: this.requireMatching(),
        allowPartialReceipt: this.allowPartial(),
        allowExcessReceipt: this.allowExcess(),
        excessReceiptTolerancePercent: Number(this.excessTolerance()),
        enableLandedCost: this.enableLandedCost(),
        requireReturnApproval: this.requireReturnApproval(),
        concurrencyVersion: this.loaded()?.concurrencyVersion ?? null,
      });
      this.applySettings(updated);
      this.dirty.set(false);
      this.toast.success('Purchase settings saved');
    } catch {
      /* interceptor shows the error */
    } finally {
      this.saving.set(false);
    }
  }

  protected async saveRules(): Promise<void> {
    if (this.saving() || !this.canEdit()) return;
    const payload = this.rules().map<UpsertApprovalRuleRequest>((r) => ({
      approvalSettingId: r.approvalSettingId || undefined,
      documentType: r.documentType,
      approvalLevel: Number(r.approvalLevel),
      minimumAmount: Number(r.minimumAmount),
      maximumAmount: r.maximumAmount === '' ? null : Number(r.maximumAmount),
      approverRoleId: Number(r.approverRoleId),
      isActive: r.isActive,
    }));
    this.saving.set(true);
    try {
      const saved = await this.workflow.saveApprovalRules(payload);
      this.rules.set(
        saved.map<RuleDraft>((r) => ({
          approvalSettingId: r.approvalSettingId,
          documentType: r.documentType,
          approvalLevel: String(r.approvalLevel),
          minimumAmount: String(r.minimumAmount),
          maximumAmount: r.maximumAmount == null ? '' : String(r.maximumAmount),
          approverRoleId: String(r.approverRoleId),
          isActive: r.isActive,
        })),
      );
      this.toast.success('Approval rules saved');
    } catch {
      /* interceptor shows the error */
    } finally {
      this.saving.set(false);
    }
  }

  protected addRule(): void {
    this.rules.update((list) => [
      ...list,
      {
        approvalSettingId: 0,
        documentType: 'PURCHASE',
        approvalLevel: String(Number(list.at(-1)?.approvalLevel ?? 0) + 1),
        minimumAmount: '0',
        maximumAmount: '',
        approverRoleId: '',
        isActive: true,
      },
    ]);
    this.dirty.set(true);
  }

  protected removeRule(index: number): void {
    this.rules.update((list) => list.filter((_, i) => i !== index));
    this.dirty.set(true);
  }

  protected openApprovalsInDbManager(): void {
    this.router.navigate(['/admin/database-manager']);
  }

  protected cancel(): void {
    const s = this.loaded();
    if (s) this.applySettings(s);
    this.dirty.set(false);
  }
}
