import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SlicePipe } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import {
  MasterImportService,
  ImportLogService,
  MasterImportMetaDto,
  ImportColumnMetaDto,
  ImportPreviewResponse,
  ImportConfirmResponse,
  ImportLogDto,
} from '../../core/services/master_service';
import { ToastService } from '../../core/services/toast.service';
import { PermissionService } from '../../core/services/permission.service';

@Component({
  selector: 'app-master-import',
  standalone: true,
  imports: [FormsModule, LucideAngularModule, SlicePipe],
  templateUrl: './master-import.html',
  styleUrl: './master-import.css',
})
export class MasterImportPage implements OnInit {
  private readonly importSvc = inject(MasterImportService);
  private readonly logSvc = inject(ImportLogService);
  private readonly toast = inject(ToastService);
  private readonly perm = inject(PermissionService);

  protected readonly loading = signal(false);
  protected readonly canView = signal(false);
  protected readonly canManage = signal(false);

  protected readonly masters = signal<MasterImportMetaDto[]>([]);
  protected readonly selectedMaster = signal<MasterImportMetaDto | null>(null);
  protected readonly selectedColumns = signal<Record<string, boolean>>({});

  protected readonly parsedFile = signal<{ name: string; dataRows: string[][] } | null>(null);
  protected readonly preview = signal<ImportPreviewResponse | null>(null);
  protected readonly confirming = signal(false);
  protected readonly result = signal<ImportConfirmResponse | null>(null);
  protected readonly step = signal(0);

  protected readonly logs = signal<ImportLogDto[]>([]);
  protected readonly showLogs = signal(false);
  protected readonly loadingLogs = signal(false);

  async ngOnInit(): Promise<void> {
    this.canView.set(this.perm.has('master-import.view'));
    this.canManage.set(this.perm.has('master-import.manage'));
    if (!this.canView()) return;
    await this.loadMasters();
  }

  private async loadMasters(): Promise<void> {
    try {
      this.loading.set(true);
      const list = await this.importSvc.getMasters();
      this.masters.set(list ?? []);
    } catch (e: any) {
      this.toast.error('Failed to load masters', e?.message ?? '');
    } finally {
      this.loading.set(false);
    }
  }

  protected onSelectMaster(meta: MasterImportMetaDto): void {
    this.selectedMaster.set(meta);
    const sel: Record<string, boolean> = {};
    for (const c of meta.columns) sel[c.key] = true;
    this.selectedColumns.set(sel);
    this.preview.set(null);
    this.result.set(null);
    this.parsedFile.set(null);
    this.step.set(1);
  }

  protected isColumnChecked(key: string): boolean {
    return !!this.selectedColumns()[key];
  }

  protected toggleColumn(col: ImportColumnMetaDto, checked: boolean): void {
    if (col.isMandatory) return;
    const sel = { ...this.selectedColumns(), [col.key]: checked };
    this.selectedColumns.set(sel);
  }

  protected selectedColumnList(): ImportColumnMetaDto[] {
    const meta = this.selectedMaster();
    if (!meta) return [];
    return meta.columns.filter((c) => this.selectedColumns()[c.key]);
  }

  protected downloadTemplate(): void {
    const cols = this.selectedColumnList();
    const header = cols.map((c) => c.key).join(',');
    const blob = new Blob([header + '\n'], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const name = this.selectedMaster()?.name ?? 'import';
    a.download = `${name}_template.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  protected onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const f = input.files && input.files.length ? input.files[0] : null;
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result ?? '');
        const rows = this.parseCsv(text);
        if (rows.length < 2) {
          this.toast.error('Invalid file', 'File must contain a header row and at least one data row.');
          return;
        }
        const dataRows = rows.slice(1).filter((r) => r.some((c) => (c ?? '').trim() !== ''));
        this.parsedFile.set({ name: f.name, dataRows });
        this.preview.set(null);
        this.step.set(2);
      } catch {
        this.toast.error('Parse error', 'Could not read the CSV file.');
      }
    };
    reader.readAsText(f);
  }

  private parseCsv(text: string): string[][] {
    const rows: string[][] = [];
    let row: string[] = [];
    let field = '';
    let inQuotes = false;
    const src = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    for (let i = 0; i < src.length; i++) {
      const ch = src[i];
      if (inQuotes) {
        if (ch === '"') {
          if (src[i + 1] === '"') {
            field += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          field += ch;
        }
      } else if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        row.push(field);
        field = '';
      } else if (ch === '\n') {
        row.push(field);
        rows.push(row);
        row = [];
        field = '';
      } else {
        field += ch;
      }
    }
    if (field.length > 0 || row.length > 0) {
      row.push(field);
      rows.push(row);
    }
    return rows;
  }

  protected async doPreview(): Promise<void> {
    const meta = this.selectedMaster();
    const file = this.parsedFile();
    if (!meta || !file) return;
    try {
      this.loading.set(true);
      const res = await this.importSvc.preview(meta.name, file.name, file.dataRows);
      this.preview.set(res);
      this.step.set(3);
    } catch (e: any) {
      this.toast.error('Preview failed', e?.error?.message ?? e?.message ?? '');
    } finally {
      this.loading.set(false);
    }
  }

  protected validRows(): string[][] {
    const file = this.parsedFile();
    const preview = this.preview();
    if (!file || !preview) return [];
    return preview.rows.filter((r) => r.valid).map((r) => file.dataRows[r.rowNumber - 1]);
  }

  protected async doConfirm(): Promise<void> {
    const meta = this.selectedMaster();
    const file = this.parsedFile();
    if (!meta || !file) return;
    const rows = this.validRows();
    if (rows.length === 0) {
      this.toast.error('Nothing to import', 'There are no valid rows to confirm.');
      return;
    }
    try {
      this.confirming.set(true);
      const res = await this.importSvc.confirm({ entityName: meta.name, fileName: file.name, rows });
      this.result.set(res);
      this.step.set(4);
      await this.loadLogs();
    } catch (e: any) {
      this.toast.error('Import failed', e?.error?.message ?? e?.message ?? '');
    } finally {
      this.confirming.set(false);
    }
  }

  protected async toggleLogs(): Promise<void> {
    if (!this.showLogs()) await this.loadLogs();
    this.showLogs.update((v) => !v);
  }

  private async loadLogs(): Promise<void> {
    try {
      this.loadingLogs.set(true);
      const list = await this.logSvc.getAll();
      this.logs.set(list ?? []);
    } catch {
      this.logs.set([]);
    } finally {
      this.loadingLogs.set(false);
    }
  }

  protected reset(): void {
    this.selectedMaster.set(null);
    this.selectedColumns.set({});
    this.parsedFile.set(null);
    this.preview.set(null);
    this.result.set(null);
    this.step.set(0);
  }

  protected hasError(row: { errors: { field: string }[] }, key: string): boolean {
    return row.errors.some((e) => e.field === key);
  }

  protected statusClass(status: string): string {
    return status === 'SUCCESS' ? 'badge-success' : status === 'PARTIAL' ? 'badge-warn' : 'badge-error';
  }
}
