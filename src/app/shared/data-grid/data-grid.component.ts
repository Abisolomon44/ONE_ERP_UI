import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { GridAction, GridColumn, GridSort } from './data-grid.types';

@Component({
  selector: 'app-data-grid',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './data-grid.component.html',
  styleUrl: './data-grid.component.scss',
})
export class DataGridComponent<T extends Record<string, unknown>> {
  @Input() columns: GridColumn<T>[] = [];
  @Input() rows: T[] = [];
  @Input() loading = false;
  @Input() error = '';
  @Input() emptyMessage = 'No Records Found';
  @Input() searchText = '';
  @Input() pageSize = 10;
  @Input() pageSizes = [10, 25, 50, 100];
  @Input() rowKey: keyof T & string = 'id' as keyof T & string;
  @Input() actions: GridAction<T>[] = [];
  @Input() resetKey = '';
  @Input() noAccess = false;

  @Output() sortChange = new EventEmitter<GridSort>();
  @Output() pageChange = new EventEmitter<{ page: number; pageSize: number }>();
  @Output() action = new EventEmitter<{ code: string; row: T }>();
  @Output() retry = new EventEmitter<void>();

  currentPage = 1;
  sort: GridSort | null = null;

  get sortedRows(): T[] {
    const source = [...(this.rows ?? [])];
    if (!this.sort) return source;
    const column = this.columns.find(c => c.field === this.sort?.field);
    return source.sort((a, b) => {
      const av = column?.value ? column.value(a) : a[this.sort!.field];
      const bv = column?.value ? column.value(b) : b[this.sort!.field];
      const result = String(av ?? '').localeCompare(String(bv ?? ''), undefined, { numeric: true, sensitivity: 'base' });
      return this.sort!.direction === 'asc' ? result : -result;
    });
  }

  get pagedRows(): T[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.sortedRows.slice(start, start + this.pageSize);
  }

  get totalPages(): number { return Math.max(1, Math.ceil(this.sortedRows.length / this.pageSize)); }
  get pageStart(): number { return this.sortedRows.length ? (this.currentPage - 1) * this.pageSize + 1 : 0; }
  get pageEnd(): number { return Math.min(this.currentPage * this.pageSize, this.sortedRows.length); }

  sortBy(column: GridColumn<T>): void {
    if (column.sortable === false) return;
    const direction = this.sort?.field === column.field && this.sort.direction === 'asc' ? 'desc' : 'asc';
    this.sort = { field: column.field, direction };
    this.currentPage = 1;
    this.sortChange.emit(this.sort);
  }

  setPageSize(value: string): void {
    this.pageSize = Number(value) || 10;
    this.currentPage = 1;
    this.pageChange.emit({ page: this.currentPage, pageSize: this.pageSize });
  }

  previousPage(): void { if (this.currentPage > 1) { this.currentPage--; this.pageChange.emit({ page: this.currentPage, pageSize: this.pageSize }); } }
  nextPage(): void { if (this.currentPage < this.totalPages) { this.currentPage++; this.pageChange.emit({ page: this.currentPage, pageSize: this.pageSize }); } }
  trackRow = (_: number, row: T): unknown => row[this.rowKey];
  cellValue(column: GridColumn<T>, row: T): unknown { return column.value ? column.value(row) : row[column.field]; }
  numericValue(column: GridColumn<T>, row: T): number | null {
    const value = this.cellValue(column, row);
    return typeof value === 'number' ? value : (value == null || value === '' ? null : Number(value));
  }
  cellText(column: GridColumn<T>, row: T): string { const value = this.cellValue(column, row); return value == null || value === '' ? '—' : String(value); }
  fire(code: string, row: T): void { this.action.emit({ code, row }); }
}
