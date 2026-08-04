import { HttpClient } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { LucideAngularModule } from 'lucide-angular';
import { BaseEmpty, BasePill } from '../../shared/base-data';
import { BaseButton } from '../../shared/base-button';
import { BaseDialog } from '../../shared/base-feedback';
import { BaseInput, BaseSearch } from '../../shared/base-controls';
import { BasePermission } from '../../shared/base-permission';
import { DocumentType } from '../../core/models';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-document-types',
  standalone: true,
  imports: [LucideAngularModule, BaseEmpty, BasePill, BaseButton, BaseDialog, BaseInput, BaseSearch, BasePermission],
  templateUrl: './document-types.html',
  styleUrl: './document-types.css',
})
export class DocumentTypesPage {
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);

  protected readonly rows = signal<DocumentType[]>([]);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly search = signal('');
  protected readonly dialogOpen = signal(false);
  protected readonly editing = signal<DocumentType | null>(null);

  protected readonly form = {
    name: signal(''),
    description: signal(''),
    isActive: signal(true),
  };

  protected readonly filtered = computed(() => {
    const q = this.search().toLowerCase();
    const list = this.rows();
    if (!q) return list;
    return list.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        (t.description ?? '').toLowerCase().includes(q),
    );
  });

  constructor() {
    void this.load();
  }

  protected async openCreate(): Promise<void> {
    this.editing.set(null);
    this.form.name.set('');
    this.form.description.set('');
    this.form.isActive.set(true);
    this.dialogOpen.set(true);
  }

  protected async openEdit(item: DocumentType): Promise<void> {
    this.editing.set(item);
    this.form.name.set(item.name);
    this.form.description.set(item.description ?? '');
    this.form.isActive.set(item.isActive);
    this.dialogOpen.set(true);
  }

  protected onActiveChange(event: Event): void {
    this.form.isActive.set((event.target as HTMLInputElement).checked);
  }

  protected async save(): Promise<void> {
    if (this.saving()) return;
    this.saving.set(true);
    try {
      const payload = {
        name: this.form.name().trim(),
        description: this.form.description() || null,
        isActive: this.editing()?.isActive ?? true,
      };
      if (this.editing()) {
        await firstValueFrom(
          this.http.put('/api/document-types/' + this.editing()!.documentTypeId, payload),
        );
        this.toast.success('Document type updated');
      } else {
        await firstValueFrom(this.http.post('/api/document-types', payload));
        this.toast.success('Document type created');
      }
      this.dialogOpen.set(false);
      await this.load();
    } catch {
      /* handled by interceptor */
    } finally {
      this.saving.set(false);
    }
  }

  protected async remove(item: DocumentType): Promise<void> {
    if (!confirm('Delete document type "' + item.name + '"? This cannot be undone.')) return;
    try {
      await firstValueFrom(this.http.delete('/api/document-types/' + item.documentTypeId));
      this.toast.success('Document type deleted');
      await this.load();
    } catch {
      /* handled by interceptor */
    }
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      const res = await firstValueFrom(this.http.get<DocumentType[]>('/api/document-types?includeInactive=true'));
      this.rows.set(res);
    } catch {
      this.toast.error('Failed to load document types');
    } finally {
      this.loading.set(false);
    }
  }
}
