export type GridValueType = 'text' | 'number' | 'date' | 'currency' | 'checkbox' | 'badge';

export interface GridColumn<T extends Record<string, unknown> = Record<string, unknown>> {
  field: keyof T & string;
  header: string;
  width?: string;
  type?: GridValueType;
  sortable?: boolean;
  value?: (row: T) => unknown;
}

export interface GridAction<T extends Record<string, unknown> = Record<string, unknown>> {
  code: string;
  label: string;
  icon?: string;
  variant?: 'secondary' | 'danger-soft' | 'primary';
  visible?: (row: T) => boolean;
}

export interface GridSort {
  field: string;
  direction: 'asc' | 'desc';
}

