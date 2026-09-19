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
  ExportFilterMetaDto,
  ExportFilterOptionDto,
  ExportQueryDto,
  ExportPreviewResponseDto,
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

  // ── Shared ──
  protected readonly loading = signal(false);
  protected readonly canView = signal(false);
  protected readonly canManage = signal(false);
  protected readonly tab = signal<'import' | 'export'>('import');

  protected readonly masters = signal<MasterImportMetaDto[]>([]);
  protected readonly logs = signal<ImportLogDto[]>([]);
  protected readonly showLogs = signal(false);
  protected readonly loadingLogs = signal(false);

  // ── Import state ──
  protected readonly templateBusy = signal(false);
  protected readonly selectedMaster = signal<MasterImportMetaDto | null>(null);
  protected readonly selectedColumns = signal<Record<string, boolean>>({});
  protected readonly parsedFile = signal<{ name: string; dataRows: Record<string, string>[] } | null>(null);
  protected readonly preview = signal<ImportPreviewResponse | null>(null);
  protected readonly confirming = signal(false);
  protected readonly result = signal<ImportConfirmResponse | null>(null);
  protected readonly step = signal(0);

  // ── Export state ──
  protected readonly eSelectedMaster = signal<MasterImportMetaDto | null>(null);
  protected readonly eMeta = signal<MasterImportMetaDto | null>(null);
  protected readonly eFilters = signal<ExportFilterMetaDto[]>([]);
  protected readonly eOptions = signal<Record<string, ExportFilterOptionDto[]>>({});
  protected readonly eFilterValues = signal<Record<string, string>>({});
  protected readonly eSearch = signal('');
  protected readonly eColumnSelection = signal<Record<string, boolean>>({});
  protected readonly eFormat = signal<'xlsx' | 'csv'>('xlsx');
  protected readonly eIncludeHeaders = signal(true);
  protected readonly eUseDisplayNames = signal(true);
  protected readonly eIncludeInactive = signal(false);
  protected readonly eIncludeEmptyColumns = signal(false);
  protected readonly ePreview = signal<ExportPreviewResponseDto | null>(null);
  protected readonly eStep = signal(0);
  protected readonly eBusy = signal(false);
  protected readonly exporting = signal(false);

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

  protected switchTab(t: 'import' | 'export'): void {
    this.tab.set(t);
    if (t === 'import') this.resetExport();
    else this.resetImport();
  }

  // ═══════════════════════════════════════════════
  //  IMPORT
  // ═══════════════════════════════════════════════

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
    if (col.required) return;
    this.selectedColumns.set({ ...this.selectedColumns(), [col.key]: checked });
  }

  protected selectedColumnList(): ImportColumnMetaDto[] {
    const meta = this.selectedMaster();
    if (!meta) return [];
    return meta.columns.filter((c) => this.selectedColumns()[c.key]);
  }

  protected async downloadTemplate(): Promise<void> {
    const meta = this.selectedMaster();
    if (!meta || this.templateBusy()) return;
    try {
      this.templateBusy.set(true);
      const blob = await this.importSvc.getTemplate(meta.name);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${meta.name}_template.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      this.toast.error('Template download failed', e?.message ?? '');
    } finally {
      this.templateBusy.set(false);
    }
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
        const header = rows[0].map((h) => h.trim());
        const dataRows = rows
          .slice(1)
          .filter((r) => r.some((c) => (c ?? '').trim() !== ''))
          .map((r) => {
            const row: Record<string, string> = {};
            header.forEach((k, i) => { if (k) row[k] = r[i] ?? ''; });
            return row;
          });
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
          if (src[i + 1] === '"') { field += '"'; i++; }
          else inQuotes = false;
        } else field += ch;
      } else if (ch === '"') inQuotes = true;
      else if (ch === ',') { row.push(field); field = ''; }
      else if (ch === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
      else field += ch;
    }
    if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
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

  protected validRows(): Record<string, string>[] {
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
    if (rows.length === 0) { this.toast.error('Nothing to import', 'There are no valid rows to confirm.'); return; }
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

  protected resetImport(): void {
    this.selectedMaster.set(null);
    this.selectedColumns.set({});
    this.parsedFile.set(null);
    this.preview.set(null);
    this.result.set(null);
    this.step.set(0);
  }

  // ═══════════════════════════════════════════════
  //  EXPORT
  // ═══════════════════════════════════════════════

  protected async onSelectExportMaster(meta: MasterImportMetaDto): Promise<void> {
    this.eSelectedMaster.set(meta);
    this.eStep.set(1);
    await this.loadExportMeta(meta.name);
  }

  private async loadExportMeta(entityName: string): Promise<void> {
    try {
      this.eBusy.set(true);
      const [meta, opts] = await Promise.all([
        this.importSvc.getExportMeta(entityName),
        this.importSvc.getExportOptions(entityName),
      ]);
      this.eMeta.set(meta);
      this.eFilters.set(meta.filters);
      this.eOptions.set(opts);

      // init column selection: all checked
      const colSel: Record<string, boolean> = {};
      for (const c of meta.columns) colSel[c.key] = true;
      this.eColumnSelection.set(colSel);

      // reset filter values
      this.eFilterValues.set({});
      this.eSearch.set('');
    } catch (e: any) {
      this.toast.error('Failed to load export metadata', e?.message ?? '');
      this.eStep.set(0);
    } finally {
      this.eBusy.set(false);
    }
  }

  protected eIsFilterVisible(f: ExportFilterMetaDto): boolean {
    if (f.key === 'search') return true;
    return this.eFilters().some((ef) => ef.key === f.key);
  }

  protected eSetFilter(key: string, value: string): void {
    this.eFilterValues.set({ ...this.eFilterValues(), [key]: value });
  }

  protected eOptionList(key: string): ExportFilterOptionDto[] {
    return this.eOptions()[key] ?? [];
  }

  protected eFilterValue(key: string): string {
    return this.eFilterValues()[key] ?? '';
  }

  protected eIsColumnSelected(key: string): boolean {
    return this.eColumnSelection()[key] === true;
  }

  protected eToggleColumn(key: string, checked: boolean): void {
    this.eColumnSelection.set({ ...this.eColumnSelection(), [key]: checked });
  }

  protected eSelectedColumnKeys(): string[] {
    return Object.entries(this.eColumnSelection())
      .filter(([, v]) => v)
      .map(([k]) => k);
  }

  private buildExportQuery(): ExportQueryDto {
    const meta = this.eSelectedMaster();
    return {
      entityName: meta?.name ?? '',
      format: this.eFormat(),
      filters: { ...this.eFilterValues(), search: this.eSearch() || '' },
      columns: this.eSelectedColumnKeys(),
      search: this.eSearch() || '',
      includeHeaders: this.eIncludeHeaders(),
      useDisplayNames: this.eUseDisplayNames(),
      includeInactive: this.eIncludeInactive(),
      includeEmptyColumns: this.eIncludeEmptyColumns(),
      page: 1,
      pageSize: 200,
    };
  }

  protected async doExportPreview(): Promise<void> {
    try {
      this.eBusy.set(true);
      const query = this.buildExportQuery();
      const res = await this.importSvc.getExportPreview(query);
      this.ePreview.set(res);
      this.eStep.set(2);
    } catch (e: any) {
      this.toast.error('Export preview failed', e?.error?.message ?? e?.message ?? '');
    } finally {
      this.eBusy.set(false);
    }
  }

  protected async doExportDownload(): Promise<void> {
    const meta = this.eSelectedMaster();
    if (!meta) return;
    try {
      this.exporting.set(true);
      const query = this.buildExportQuery();
      query.page = 1;
      query.pageSize = 100000;
      const blob = await this.importSvc.exportFile(query);
      const ext = query.format === 'csv' ? '.csv' : '.xlsx';
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${meta.name}_export${ext}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      this.toast.error('Export failed', e?.error?.message ?? e?.message ?? '');
    } finally {
      this.exporting.set(false);
    }
  }

  protected resetExport(): void {
    this.eSelectedMaster.set(null);
    this.eMeta.set(null);
    this.eFilters.set([]);
    this.eOptions.set({});
    this.eFilterValues.set({});
    this.eSearch.set('');
    this.eColumnSelection.set({});
    this.eFormat.set('xlsx');
    this.eIncludeHeaders.set(true);
    this.eUseDisplayNames.set(true);
    this.eIncludeInactive.set(false);
    this.eIncludeEmptyColumns.set(false);
    this.ePreview.set(null);
    this.eStep.set(0);
  }

  // ═══════════════════════════════════════════════
  //  Shared
  // ═══════════════════════════════════════════════

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
    this.tab() === 'import' ? this.resetImport() : this.resetExport();
  }

  protected statusClass(status: string): string {
    return status === 'COMPLETED' ? 'badge-success' : status === 'PARTIAL' ? 'badge-warn' : 'badge-error';
  }
}