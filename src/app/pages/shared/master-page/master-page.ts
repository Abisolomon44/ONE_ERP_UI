import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  Output,
  OnInit,
  OnChanges,
  SimpleChanges,
  inject,
  signal
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MasterRow } from '../master.model';
import { LucideAngularModule } from "lucide-angular";
import { PermissionService } from '../../../core/services/permission.service';
import { EntityEditorComponent } from '../entity-editor/entity-editor';
import { MultiSelectComponent } from '../multi-select/multi-select';

export interface DropdownOption {
  value: any;
  label: string;
}

export interface MasterColumn {
  field: string;
  header: string;
  width?: string;
  type?: 'text' | 'number' | 'date' | 'currency' | 'checkbox' | 'badge';
}

export interface MasterField {
  name: string;
  label: string;
  type:
    | 'text'
    | 'number'
    | 'textarea'
    | 'dropdown'
    | 'multiselect'
    | 'checkbox'
    | 'date'
    | 'email'
    | 'password';

  placeholder?: string;
  required?: boolean;
  readonly?: boolean;
  disabled?: boolean;
  minLength?: number;
  maxLength?: number;
  options?: DropdownOption[];
  screenCode?: string;
}

export interface MasterTab {
  name: string;
  fields: string[];
  /** When true, this tab renders the universal entity editor (address/contact/file/note/tag)
   *  bound to `userModel['addresses' | 'contacts' | 'files' | 'notes' | 'tags']`. */
  entity?: boolean;
  /** Restrict which entity editor sections appear (default: all sections). */
  entitySections?: string[];
  /** Entity type used when the entity editor must create the owning entity (default 'COMPANY'). */
  entityType?: string;
}

export interface MasterToolbarAction {
  /** Action code from the Actions master, e.g. 'export', 'import', 'print'. */
  code: string;
  label?: string;
  /** Lucide icon name; defaults to a per-code icon when omitted. */
  icon?: string;
  variant?: 'primary' | 'success' | 'warning' | 'secondary' | 'danger' | 'soft';
}

export interface MasterStat {
  label: string;
  value: number;
  icon: string;
  description?: string;
}

export interface MasterConfig {
  title: string;
  description?: string;
  icon: string;
  api: string;
  permissionName?: string;
  createLabel?: string;
  columns: MasterColumn[];
  fields: MasterField[];
  tabs: MasterTab[];
  stats?: MasterStat[];
  allowCreate?: boolean;
  allowEdit?: boolean;
  allowDelete?: boolean;
  allowImport?: boolean;
  allowExport?: boolean;
  allowRefresh?: boolean;
  /** Optional explicit permission code (e.g. 'branches.create'). When omitted,
   *  it is derived from permissionName as `${permissionName.toLowerCase()}.create`. */
  createPermission?: string;
  editPermission?: string;
  deletePermission?: string;
  /** Toolbar actions (e.g. export/import/print) loaded from the Actions master.
   *  Each is shown only when the user holds `${permissionName}.${code}`. */
  toolbarActions?: MasterToolbarAction[];
  /** Optional data-scope label shown in the page header (e.g. "Data Scope: ONEERP"). */
  scopeLabel?: string;
  /** When true, the current role has no data scope, so records can't load — shows a No Access empty state. */
  noAccess?: boolean;
}

@Component({
  selector: 'app-master-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LucideAngularModule,
    EntityEditorComponent,
    MultiSelectComponent
  ],
  templateUrl: './master-page.html',
  styleUrl: './master-page.css'
})
export class MasterPage implements OnInit, OnChanges {

  public readonly perm = inject(PermissionService);

  //===========================
  // Inputs
  //===========================

  @Input({ required: true })
  config!: MasterConfig;

  @Input()
  data: MasterRow[] = [];

  @Input()
  userModel: Record<string, any> = {};

  @Input()
  loading = false;

  @Input()
  saving = false;

  @Input()
  showEntry = false;

  //===========================
  // Permission-aware action visibility
  //===========================

  canShowCreate(): boolean {
    if (this.config.allowCreate === false) return false;
    const code = this.config.createPermission ?? this.deriveCode('create');
    return !code || this.perm.has(code);
  }

  canShowEdit(): boolean {
    if (this.config.allowEdit === false) return false;
    const code = this.config.editPermission ?? this.deriveCode('edit');
    return !code || this.perm.has(code);
  }

  canShowDelete(): boolean {
    if (this.config.allowDelete === false) return false;
    const code = this.config.deletePermission ?? this.deriveCode('delete');
    return !code || this.perm.has(code);
  }

  private deriveCode(action: string): string | null {
    const base = this.config.permissionName;
    if (!base) return null;
    return `${base.trim().toLowerCase()}.${action}`;
  }

  /** Check if user can view a field (by field name, using config permissionName as screenCode) */
  canViewField(fieldName: string): boolean {
    const screenCode = this.config.permissionName ?? '';
    return this.perm.canViewField(screenCode, fieldName);
  }

  /** Check if user can view a field (by field name, using config permissionName as screenCode) */
  isFieldHidden(fieldName: string): boolean {
    const screenCode = this.config.permissionName ?? '';
    return this.perm.isFieldHidden(screenCode, fieldName);
  }

  /** Toolbar actions the current user is permitted to perform. */
  visibleToolbarActions(): MasterToolbarAction[] {
    const actions = this.config.toolbarActions;
    if (!actions) return [];
    return actions.filter(a => {
      const code = this.deriveCode(a.code);
      return code != null && this.perm.has(code);
    });
  }

  actionIcon(code: string): string {
    switch (code) {
      case 'export': return 'Download';
      case 'import': return 'Upload';
      case 'print': return 'Printer';
      default: return 'CircleDot';
    }
  }

  triggerAction(code: string): void {
    this.actionClick.emit(code);
  }

  protected readonly menuOpen = signal(false);

  protected toggleMenu(): void {
    this.menuOpen.update(v => !v);
  }

  protected closeMenu(): void {
    this.menuOpen.set(false);
  }

  protected selectAction(code: string): void {
    this.closeMenu();
    this.triggerAction(code);
  }

  //===========================
  // Outputs
  //===========================

  @Output()
  createClick = new EventEmitter<void>();

  @Output()
  editClick = new EventEmitter<Record<string, any>>();

  @Output()
  deleteClick = new EventEmitter<Record<string, any>>();

  @Output()
  saveClick = new EventEmitter<void>();

  @Output()
  cancelClick = new EventEmitter<void>();

  @Output()
  refreshClick = new EventEmitter<void>();

  @Output()
  actionClick = new EventEmitter<string>();

  @Output()
  fieldChange = new EventEmitter<{ name: string; value: any }>();

  //===========================
  // Variables
  //===========================

  searchText = '';
  activeTab = '';
  currentPage = 1;
  pageSize = 10;
  pageSizes = [10, 25, 50, 100];

  //===========================
  // Init
  //===========================

  ngOnInit(): void {
    if (this.config.tabs.length) {
      this.activeTab = this.config.tabs[0].name;
    }
  }
ngOnChanges(changes: SimpleChanges): void {

  if (changes['config']) {
    console.log('Config updated');
  }

  if (changes['showEntry']) {
    console.log('Show Entry:', this.showEntry);
  }

  if (changes['userModel']) {
    console.log('User Model:', this.userModel);
  }
}
  //===========================
  // Data-scope tagging
  //===========================

  private fieldFor(name: string): MasterField | undefined {
    return this.config?.fields?.find((f) => f.name === name);
  }

  private isOutOfScopeValue(name: string, value: any): boolean {
    if (!['companyId', 'branchId', 'warehouseId'].includes(name)) return false;
    if (value == null || value === '') return false;
    const field = this.fieldFor(name);
    if (!field || field.type !== 'dropdown' || !field.options?.length) return false;
    return !field.options.some((o) => o.value === value);
  }

  /** True when a table cell references a company/branch/warehouse outside the current data scope. */
  protected isNoAccessCell(col: MasterColumn, row: Record<string, any>): boolean {
    return this.isOutOfScopeValue(col.field, row?.[col.field]);
  }

  /** True when a form dropdown currently holds an out-of-scope company/branch/warehouse value. */
  protected isNoAccessField(field: MasterField): boolean {
    return this.isOutOfScopeValue(field.name, this.userModel?.[field.name]);
  }

  /** Display text for a table cell: resolves dropdown ids to labels, else plain value. */
  protected cellText(col: MasterColumn, row: Record<string, any>): string {
    const value = row?.[col.field];
    if (value == null || value === '') return '—';
    const field = this.fieldFor(col.field);
    if (field && field.type === 'dropdown' && field.options?.length) {
      return field.options.find((o) => o.value === value)?.label ?? String(value);
    }
    return String(value);
  }

  //===========================
  // Search
  //===========================

  get filteredData() {
    const source = Array.isArray(this.data) ? this.data : [];

    if (!this.searchText) {
      return source;
    }

    const keyword = this.searchText.toLowerCase();

    return source.filter(x =>
      JSON.stringify(x)
        .toLowerCase()
        .includes(keyword)
    );
  }

  //===========================
  // Pagination
  //===========================

  get paginatedData() {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredData.slice(start, start + this.pageSize);
  }

  get totalPages() {
    return Math.max(
      1,
      Math.ceil(this.filteredData.length / this.pageSize)
    );
  }

  get pageStart() {
    if (this.filteredData.length === 0) return 0;
    return (this.currentPage - 1) * this.pageSize + 1;
  }

  get pageEnd() {
    return Math.min(
      this.currentPage * this.pageSize,
      this.filteredData.length
    );
  }

  previousPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }

  pageSizeChanged() {
    this.currentPage = 1;
  }

  //===========================
  // Toolbar
  //===========================

  create() {
    this.createClick.emit();
  }

  edit(row: Record<string, any>) {
    this.editClick.emit(row);
  }

  delete(row: Record<string, any>) {
    this.deleteClick.emit(row);
  }

  save() {
    this.saveClick.emit();
  }

  cancel() {
    this.cancelClick.emit();
  }

  refresh() {
    this.refreshClick.emit();
  }

  onFieldChange(name: string, value: any): void {
    this.fieldChange.emit({ name, value });
  }

  onEntityCreated(entityId: number): void {
    this.userModel['entityId'] = entityId;
  }

  //===========================
  // Tabs
  //===========================

  setTab(tab: string) {
    this.activeTab = tab;
  }

  get currentTab() {
    return this.config.tabs.find(
      x => x.name === this.activeTab
    );
  }

  /** Fields for the current tab (all fields shown, no permission filtering) */
  get visibleCurrentTabFields() {
    if (!this.config.tabs || this.config.tabs.length === 0) {
      return this.config.fields;
    }

    if (!this.currentTab) {
      return [];
    }

    // Start with fields assigned to this tab
    const tabFieldNames = this.currentTab.fields;
    return this.config.fields.filter(field =>
      tabFieldNames.includes(field.name)
    );
  }

  /** All effective fields (all fields shown, no permission filtering) */
  get effectiveFields() {
    return this.config.fields;
  }

  get currentTabFields() {
    if (!this.config.tabs || this.config.tabs.length === 0) {
      return this.config.fields;
    }

    if (!this.currentTab) {
      return [];
    }

    // Start with fields assigned to this tab
    const tabFieldNames = this.currentTab.fields;
    return this.config.fields.filter(field =>
      tabFieldNames.includes(field.name)
    );
  }

  //===========================
  // Helpers
  //===========================

  get hasData() {
    return this.filteredData.length > 0;
  }

  get isEmpty() {
    return !this.loading &&
           this.filteredData.length === 0;
  }

  isFieldFilled(field: MasterField): boolean {
    const value = this.userModel[field.name];
    return value !== null && value !== undefined && value !== '';
  }

}