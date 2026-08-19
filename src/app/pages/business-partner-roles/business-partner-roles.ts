import { HttpClient } from '@angular/common/http';
import { Component, inject, model, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { LucideAngularModule } from 'lucide-angular';
import { BaseEmpty, BasePill } from '../../shared/base-data';
import { BaseButton } from '../../shared/base-button';
import { BaseDialog } from '../../shared/base-feedback';
import { BaseInput } from '../../shared/base-controls';
import { BasePermission } from '../../shared/base-permission';
import { BusinessPartnerRole } from '../../core/models';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-business-partner-roles',
  standalone: true,
  imports: [LucideAngularModule, BaseEmpty, BasePill, BaseButton, BaseDialog, BaseInput, BasePermission],
  templateUrl: './business-partner-roles.html',
  styleUrl: './business-partner-roles.css',
})
export class BusinessPartnerRolesPage {
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);

  protected readonly rows = signal<BusinessPartnerRole[]>([]);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly dialogOpen = signal(false);
  protected readonly editing = signal<BusinessPartnerRole | null>(null);

  protected readonly code = model<string>('');
  protected readonly name = model<string>('');
  protected readonly description = model<string>('');
  protected readonly isActive = model<boolean>(true);

  constructor() {
    void this.load();
  }

  protected openCreate(): void {
    this.editing.set(null);
    this.code.set('');
    this.name.set('');
    this.description.set('');
    this.isActive.set(true);
    this.dialogOpen.set(true);
  }

  protected openEdit(item: BusinessPartnerRole): void {
    this.editing.set(item);
    this.code.set(item.code);
    this.name.set(item.name);
    this.description.set(item.description ?? '');
    this.isActive.set(item.isActive);
    this.dialogOpen.set(true);
  }

  protected async save(): Promise<void> {
    if (this.saving()) return;
    this.saving.set(true);
    try {
      if (this.editing()) {
        await firstValueFrom(
          this.http.put(`/api/business-partner-roles/${this.editing()!.businessPartnerRoleId}`, {
            code: this.code(),
            name: this.name(),
            description: this.description() || null,
            isActive: this.isActive(),
          }),
        );
        this.toast.success('Business partner role updated');
      } else {
        await firstValueFrom(
          this.http.post('/api/business-partner-roles', {
            code: this.code(),
            name: this.name(),
            description: this.description() || null,
          }),
        );
        this.toast.success('Business partner role created');
      }
      this.dialogOpen.set(false);
      await this.load();
    } catch {
      /* handled by interceptor */
    } finally {
      this.saving.set(false);
    }
  }

  protected async remove(item: BusinessPartnerRole): Promise<void> {
    if (!confirm(`Delete business partner role ${item.name}?`)) return;
    try {
      await firstValueFrom(this.http.delete(`/api/business-partner-roles/${item.businessPartnerRoleId}`));
      this.toast.success('Business partner role deleted');
      await this.load();
    } catch {
      /* handled by interceptor */
    }
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      const res = await firstValueFrom(
        this.http.get<BusinessPartnerRole[]>('/api/business-partner-roles?includeInactive=true'),
      );
      this.rows.set(res);
    } catch {
      this.toast.error('Failed to load business partner roles');
    } finally {
      this.loading.set(false);
    }
  }
}
