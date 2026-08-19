import { HttpClient } from '@angular/common/http';
import { Component, inject, model, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { LucideAngularModule } from 'lucide-angular';
import { BaseEmpty, BasePill } from '../../shared/base-data';
import { BaseButton } from '../../shared/base-button';
import { BaseDialog } from '../../shared/base-feedback';
import { BaseInput } from '../../shared/base-controls';
import { BasePermission } from '../../shared/base-permission';
import { BusinessPartner, BusinessPartnerRole } from '../../core/models';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-business-partners',
  standalone: true,
  imports: [LucideAngularModule, BaseEmpty, BasePill, BaseButton, BaseDialog, BaseInput, BasePermission],
  templateUrl: './business-partners.html',
  styleUrl: './business-partners.css',
})
export class BusinessPartnersPage {
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);

  protected readonly rows = signal<BusinessPartner[]>([]);
  protected readonly roles = signal<BusinessPartnerRole[]>([]);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly dialogOpen = signal(false);
  protected readonly editing = signal<BusinessPartner | null>(null);

  protected readonly partnerCode = model<string>('');
  protected readonly partnerName = model<string>('');
  protected readonly contactPerson = model<string>('');
  protected readonly mobileNo = model<string>('');
  protected readonly email = model<string>('');
  protected readonly taxRegistrationNo = model<string>('');
  protected readonly creditLimit = model<number>(0);
  protected readonly creditDays = model<number>(0);
  protected readonly paymentTermId = model<number | null>(null);
  protected readonly currencyId = model<number | null>(null);
  protected readonly priceListId = model<number | null>(null);
  protected readonly notes = model<string>('');
  protected readonly isActive = model<boolean>(true);
  protected readonly selectedRoleIds = signal<number[]>([]);

  constructor() {
    void this.load();
    void this.loadRoles();
  }

  protected roleName(id: number): string {
    return this.roles().find((r) => r.businessPartnerRoleId === id)?.name ?? '';
  }

  protected getRoleNames(csv: string): string {
    if (!csv) return '';
    return csv
      .split(',')
      .map((x) => this.roleName(Number(x)))
      .filter(Boolean)
      .join(', ');
  }

  protected isRoleSelected(id: number): boolean {
    return this.selectedRoleIds().includes(id);
  }

  protected toggleRole(id: number, checked: boolean): void {
    if (checked) {
      this.selectedRoleIds.set([...this.selectedRoleIds(), id]);
    } else {
      this.selectedRoleIds.set(this.selectedRoleIds().filter((r) => r !== id));
    }
  }

  protected async loadRoles(): Promise<void> {
    try {
      const res = await firstValueFrom(
        this.http.get<BusinessPartnerRole[]>('/api/business-partner-roles?includeInactive=true'),
      );
      this.roles.set(res);
    } catch {
      this.toast.error('Failed to load roles');
    }
  }

  protected openCreate(): void {
    this.editing.set(null);
    this.partnerCode.set('');
    this.partnerName.set('');
    this.contactPerson.set('');
    this.mobileNo.set('');
    this.email.set('');
    this.taxRegistrationNo.set('');
    this.creditLimit.set(0);
    this.creditDays.set(0);
    this.paymentTermId.set(null);
    this.currencyId.set(null);
    this.priceListId.set(null);
    this.notes.set('');
    this.isActive.set(true);
    this.selectedRoleIds.set([]);
    this.dialogOpen.set(true);
  }

  protected openEdit(item: BusinessPartner): void {
    this.editing.set(item);
    this.partnerCode.set(item.partnerCode);
    this.partnerName.set(item.partnerName);
    this.contactPerson.set(item.contactPerson ?? '');
    this.mobileNo.set(item.mobileNo ?? '');
    this.email.set(item.email ?? '');
    this.taxRegistrationNo.set(item.taxRegistrationNo ?? '');
    this.creditLimit.set(item.creditLimit);
    this.creditDays.set(item.creditDays);
    this.paymentTermId.set(item.paymentTermId ?? null);
    this.currencyId.set(item.currencyId ?? null);
    this.priceListId.set(item.priceListId ?? null);
    this.notes.set(item.notes ?? '');
    this.isActive.set(item.isActive);
    this.selectedRoleIds.set(
      (item.patnerRoleIds || '')
        .split(',')
        .map((x) => Number(x))
        .filter((x) => !isNaN(x)),
    );
    this.dialogOpen.set(true);
  }

  protected async save(): Promise<void> {
    if (this.saving()) return;
    this.saving.set(true);
    try {
      const payload = {
        partnerCode: this.partnerCode(),
        partnerName: this.partnerName(),
        patnerRoleIds: this.selectedRoleIds().join(','),
        contactPerson: this.contactPerson() || null,
        mobileNo: this.mobileNo() || null,
        email: this.email() || null,
        taxRegistrationNo: this.taxRegistrationNo() || null,
        creditLimit: this.creditLimit(),
        creditDays: this.creditDays(),
        paymentTermId: this.paymentTermId(),
        currencyId: this.currencyId(),
        priceListId: this.priceListId(),
        notes: this.notes() || null,
        isActive: this.isActive(),
      };

      if (this.editing()) {
        await firstValueFrom(this.http.put(`/api/business-partners/${this.editing()!.id}`, payload));
        this.toast.success('Business partner updated');
      } else {
        await firstValueFrom(this.http.post('/api/business-partners', payload));
        this.toast.success('Business partner created');
      }
      this.dialogOpen.set(false);
      await this.load();
    } catch {
      /* handled by interceptor */
    } finally {
      this.saving.set(false);
    }
  }

  protected async remove(item: BusinessPartner): Promise<void> {
    if (!confirm(`Delete business partner ${item.partnerName}?`)) return;
    try {
      await firstValueFrom(this.http.delete(`/api/business-partners/${item.id}`));
      this.toast.success('Business partner deleted');
      await this.load();
    } catch {
      /* handled by interceptor */
    }
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      const res = await firstValueFrom(
        this.http.get<BusinessPartner[]>('/api/business-partners?includeInactive=true'),
      );
      this.rows.set(res);
    } catch {
      this.toast.error('Failed to load business partners');
    } finally {
      this.loading.set(false);
    }
  }
}
