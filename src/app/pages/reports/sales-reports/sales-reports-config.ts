// ============================================================
// Sales Reports — declarative screen configs.
// Each config drives the shared <app-sales-report-screen>
// component: filter bar, group-by options, column set,
// KPI/chart widgets, paging and drill-down behaviour.
// ============================================================

export interface SalesReportColumn {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'amount' | 'percent';
  total?: boolean;
}

export interface SalesGroupOption {
  value: string;
  label: string;
}

export interface SalesSortOption {
  value: string;
  label: string;
}

export interface SalesReportScreenConfig {
  id: string;
  label: string;
  icon: string;
  description: string;
  permissions: string[];
  defaultSize?: number;
  kpiCards?: boolean;
  charts?: boolean;
  drill?: boolean;
  groupByOptions?: SalesGroupOption[];
  sortOptions?: SalesSortOption[];
  columns: (group: string | null) => SalesReportColumn[];
  filters: ('date' | 'search' | 'customer' | 'product' | 'branch' | 'warehouse' | 'status' | 'source')[];
}

const GRP_ITEM: SalesGroupOption[] = [
  { value: 'product', label: 'Product' },
  { value: 'hsn', label: 'HSN' },
  { value: 'customer', label: 'Customer' },
  { value: 'month', label: 'Month' },
];

const TAX_COLS: SalesReportColumn[] = [
  { key: 'taxable', label: 'Taxable', type: 'amount', total: true },
  { key: 'cgst', label: 'CGST', type: 'amount', total: true },
  { key: 'sgst', label: 'SGST', type: 'amount', total: true },
  { key: 'igst', label: 'IGST', type: 'amount', total: true },
  { key: 'cess', label: 'CESS', type: 'amount', total: true },
];

export const SALES_REPORT_CONFIGS: SalesReportScreenConfig[] = [
  {
    id: 'overview',
    label: 'Sales Overview',
    icon: 'layout-dashboard',
    description: 'High-level overview of sales value, trend and breakdowns.',
    permissions: ['sales.view'],
    kpiCards: true,
    charts: true,
    filters: ['date', 'search', 'customer', 'branch', 'warehouse', 'product'],
    columns: () => [],
  },
  {
    id: 'register',
    label: 'Sales Register',
    icon: 'list',
    description: 'Every sales invoice with its value, tax split and payment position.',
    permissions: ['sales.view'],
    drill: true,
    defaultSize: 50,
    filters: ['date', 'search', 'customer', 'branch', 'warehouse', 'status', 'source'],
    sortOptions: [
      { value: 'invoiceDate', label: 'Date' },
      { value: 'invoiceNo', label: 'Invoice No' },
      { value: 'customer', label: 'Customer' },
      { value: 'grandTotal', label: 'Grand Total' },
      { value: 'paid', label: 'Paid' },
      { value: 'balance', label: 'Balance' },
    ],
    columns: () => [
      { key: 'salesInvoiceNo', label: 'Invoice No', type: 'text' },
      { key: 'invoiceDate', label: 'Date', type: 'date' },
      { key: 'sourceType', label: 'Source', type: 'text' },
      { key: 'customer', label: 'Customer', type: 'text' },
      { key: 'branch', label: 'Branch', type: 'text' },
      { key: 'warehouse', label: 'Warehouse', type: 'text' },
      { key: 'gross', label: 'Gross', type: 'amount', total: true },
      { key: 'discount', label: 'Discount', type: 'amount', total: true },
      { key: 'taxable', label: 'Taxable', type: 'amount', total: true },
      { key: 'cgst', label: 'CGST', type: 'amount', total: true },
      { key: 'sgst', label: 'SGST', type: 'amount', total: true },
      { key: 'igst', label: 'IGST', type: 'amount', total: true },
      { key: 'cess', label: 'CESS', type: 'amount', total: true },
      { key: 'roundOff', label: 'Round Off', type: 'amount', total: true },
      { key: 'grandTotal', label: 'Grand Total', type: 'amount', total: true },
      { key: 'paid', label: 'Paid', type: 'amount', total: true },
      { key: 'balance', label: 'Balance', type: 'amount', total: true },
      { key: 'paymentType', label: 'Payment Type', type: 'text' },
      { key: 'paymentMethod', label: 'Payment Method', type: 'text' },
      { key: 'invoiceStatus', label: 'Status', type: 'text' },
    ],
  },
  {
    id: 'detail',
    label: 'Sales Detail',
    icon: 'package',
    description: 'Sold item lines with quantities, rates, tax split and totals.',
    permissions: ['sales.view'],
    drill: true,
    defaultSize: 50,
    filters: ['date', 'search', 'customer', 'product', 'branch', 'warehouse'],
    groupByOptions: GRP_ITEM,
    columns: (group: string | null): SalesReportColumn[] =>
      group
        ? [
            ...groupDim(group),
            { key: 'lines', label: 'Lines', type: 'number' },
            { key: 'quantity', label: 'Qty', type: 'number', total: true },
            { key: 'freeQuantity', label: 'Free Qty', type: 'number', total: true },
            { key: 'gross', label: 'Gross', type: 'amount', total: true },
            { key: 'discount', label: 'Discount', type: 'amount', total: true },
            { key: 'taxable', label: 'Taxable', type: 'amount', total: true },
            { key: 'cgst', label: 'CGST', type: 'amount', total: true },
            { key: 'sgst', label: 'SGST', type: 'amount', total: true },
            { key: 'igst', label: 'IGST', type: 'amount', total: true },
            { key: 'cess', label: 'CESS', type: 'amount', total: true },
            { key: 'lineTotal', label: 'Line Total', type: 'amount', total: true },
          ]
        : [
            { key: 'salesInvoiceNo', label: 'Invoice No', type: 'text' },
      { key: 'invoiceDate', label: 'Date', type: 'date' },
      { key: 'customer', label: 'Customer', type: 'text' },
      { key: 'productCode', label: 'Product Code', type: 'text' },
      { key: 'product', label: 'Product', type: 'text' },
      { key: 'unit', label: 'UOM', type: 'text' },
      { key: 'barcode', label: 'Barcode', type: 'text' },
      { key: 'hsn', label: 'HSN', type: 'text' },
      { key: 'quantity', label: 'Qty', type: 'number', total: true },
      { key: 'freeQuantity', label: 'Free Qty', type: 'number', total: true },
      { key: 'rate', label: 'Rate', type: 'amount' },
      { key: 'gross', label: 'Gross', type: 'amount', total: true },
      { key: 'discountPct', label: 'Disc %', type: 'percent' },
      { key: 'discount', label: 'Discount', type: 'amount', total: true },
      { key: 'taxable', label: 'Taxable', type: 'amount', total: true },
      { key: 'gstRate', label: 'GST %', type: 'percent' },
      { key: 'cgst', label: 'CGST', type: 'amount', total: true },
      { key: 'sgst', label: 'SGST', type: 'amount', total: true },
      { key: 'igst', label: 'IGST', type: 'amount', total: true },
      { key: 'cess', label: 'CESS', type: 'amount', total: true },
      { key: 'lineTotal', label: 'Line Total', type: 'amount', total: true },
    ],
  },
  {
    id: 'product',
    label: 'Product-wise Sales',
    icon: 'boxes',
    description: 'Quantity, value and tax position per product.',
    permissions: ['sales.view'],
    drill: true,
    defaultSize: 50,
    filters: ['date', 'search', 'customer', 'product', 'branch', 'warehouse'],
    groupByOptions: GRP_ITEM,
    columns: (group: string | null): SalesReportColumn[] => [
      ...(group ? groupDim(group) : ([{ key: 'product', label: 'Product', type: 'text' }] as SalesReportColumn[])),
      { key: 'lines', label: 'Lines', type: 'number' },
      { key: 'invoices', label: 'Invoices', type: 'number' },
      { key: 'quantity', label: 'Qty', type: 'number', total: true },
      { key: 'freeQuantity', label: 'Free Qty', type: 'number', total: true },
      { key: 'gross', label: 'Gross', type: 'amount', total: true },
      { key: 'discount', label: 'Discount', type: 'amount', total: true },
      ...TAX_COLS,
      { key: 'lineTotal', label: 'Line Total', type: 'amount', total: true },
    ],
  },
  {
    id: 'customer',
    label: 'Customer-wise Sales',
    icon: 'book-user',
    description: 'Sales value and payment position per customer.',
    permissions: ['sales.view'],
    defaultSize: 50,
    filters: ['date', 'search', 'customer', 'branch', 'warehouse'],
    groupByOptions: [
      { value: 'branch', label: 'Branch' },
      { value: 'warehouse', label: 'Warehouse' },
      { value: 'sales-type', label: 'Sales Type' },
      { value: 'status', label: 'Status' },
      { value: 'month', label: 'Month' },
    ],
    columns: (group: string | null): SalesReportColumn[] => [
      ...(group ? groupDim(group) : ([{ key: 'customer', label: 'Customer', type: 'text' }] as SalesReportColumn[])),
      { key: 'invoices', label: 'Invoices', type: 'number' },
      { key: 'gross', label: 'Gross', type: 'amount', total: true },
      { key: 'discount', label: 'Discount', type: 'amount', total: true },
      { key: 'taxable', label: 'Taxable', type: 'amount', total: true },
      { key: 'cgst', label: 'CGST', type: 'amount', total: true },
      { key: 'sgst', label: 'SGST', type: 'amount', total: true },
      { key: 'igst', label: 'IGST', type: 'amount', total: true },
      { key: 'cess', label: 'CESS', type: 'amount', total: true },
      { key: 'grandTotal', label: 'Grand Total', type: 'amount', total: true },
      { key: 'paid', label: 'Paid', type: 'amount', total: true },
      { key: 'balance', label: 'Balance', type: 'amount', total: true },
      { key: 'avgInvoice', label: 'Avg Invoice', type: 'amount' },
      { key: 'lastInvoiceDate', label: 'Last Invoice', type: 'date' },
    ],
  },
  {
    id: 'daily',
    label: 'Daily Sales',
    icon: 'calendar-days',
    description: 'Day-by-day sales totals with tax and payment position.',
    permissions: ['sales.view'],
    defaultSize: 50,
    filters: ['date', 'search', 'customer', 'branch', 'warehouse'],
    columns: () => [
      { key: 'date', label: 'Date', type: 'date' },
      { key: 'invoices', label: 'Invoices', type: 'number' },
      { key: 'customers', label: 'Customers', type: 'number' },
      { key: 'gross', label: 'Gross', type: 'amount', total: true },
      { key: 'discount', label: 'Discount', type: 'amount', total: true },
      { key: 'taxable', label: 'Taxable', type: 'amount', total: true },
      { key: 'cgst', label: 'CGST', type: 'amount', total: true },
      { key: 'sgst', label: 'SGST', type: 'amount', total: true },
      { key: 'igst', label: 'IGST', type: 'amount', total: true },
      { key: 'cess', label: 'CESS', type: 'amount', total: true },
      { key: 'roundOff', label: 'Round Off', type: 'amount', total: true },
      { key: 'grandTotal', label: 'Grand Total', type: 'amount', total: true },
      { key: 'paid', label: 'Paid', type: 'amount', total: true },
      { key: 'balance', label: 'Balance', type: 'amount', total: true },
    ],
  },
  {
    id: 'monthly',
    label: 'Monthly Sales',
    icon: 'calendar',
    description: 'Month-by-month sales totals with tax and payment position.',
    permissions: ['sales.view'],
    defaultSize: 50,
    filters: ['date', 'search', 'customer', 'branch', 'warehouse'],
    columns: () => [
      { key: 'period', label: 'Period', type: 'text' },
      { key: 'invoices', label: 'Invoices', type: 'number' },
      { key: 'customers', label: 'Customers', type: 'number' },
      { key: 'gross', label: 'Gross', type: 'amount', total: true },
      { key: 'discount', label: 'Discount', type: 'amount', total: true },
      { key: 'taxable', label: 'Taxable', type: 'amount', total: true },
      { key: 'cgst', label: 'CGST', type: 'amount', total: true },
      { key: 'sgst', label: 'SGST', type: 'amount', total: true },
      { key: 'igst', label: 'IGST', type: 'amount', total: true },
      { key: 'cess', label: 'CESS', type: 'amount', total: true },
      { key: 'roundOff', label: 'Round Off', type: 'amount', total: true },
      { key: 'grandTotal', label: 'Grand Total', type: 'amount', total: true },
      { key: 'paid', label: 'Paid', type: 'amount', total: true },
      { key: 'balance', label: 'Balance', type: 'amount', total: true },
    ],
  },
  {
    id: 'tax',
    label: 'Tax / GST Analysis',
    icon: 'receipt',
    description: 'GST/CESS values per sales line or grouped by rate, HSN and more.',
    permissions: ['sales.view'],
    drill: true,
    defaultSize: 50,
    filters: ['date', 'search', 'customer', 'product', 'branch', 'warehouse'],
    groupByOptions: [
      { value: 'gst-rate', label: 'GST Rate' },
      { value: 'hsn', label: 'HSN' },
      { value: 'product', label: 'Product' },
      { value: 'customer', label: 'Customer' },
      { value: 'month', label: 'Month' },
    ],
    columns: (group: string | null): SalesReportColumn[] => [
      ...(group ? groupDim(group) : ([] as SalesReportColumn[])),
      ...(group ? ([{ key: 'lines', label: 'Lines', type: 'number' }] as SalesReportColumn[]) : []),
      ...(group
        ? TAX_COLS
        : ([
            { key: 'salesInvoiceNo', label: 'Invoice No', type: 'text' },
            { key: 'invoiceDate', label: 'Date', type: 'date' },
            { key: 'customer', label: 'Customer', type: 'text' },
            { key: 'product', label: 'Product', type: 'text' },
            { key: 'hsn', label: 'HSN', type: 'text' },
            { key: 'gstRate', label: 'GST %', type: 'percent' },
            ...TAX_COLS,
            { key: 'totalTax', label: 'Total Tax', type: 'amount', total: true },
          ] as SalesReportColumn[])),
      ...(group ? ([{ key: 'totalTax', label: 'Total Tax', type: 'amount', total: true }] as SalesReportColumn[]) : []),
    ],
  },
  {
    id: 'hsn',
    label: 'HSN / SAC Summary',
    icon: 'hash',
    description: 'Taxable value and tax split per HSN/SAC code and rate.',
    permissions: ['sales.view'],
    defaultSize: 50,
    filters: ['date', 'search', 'product', 'branch', 'warehouse'],
    columns: () => [
      { key: 'hsn', label: 'HSN/SAC', type: 'text' },
      { key: 'gstRate', label: 'GST %', type: 'percent' },
      { key: 'lines', label: 'Lines', type: 'number' },
      { key: 'quantity', label: 'Qty', type: 'number', total: true },
      ...TAX_COLS,
      { key: 'totalTax', label: 'Total Tax', type: 'amount', total: true },
    ],
  },
  {
    id: 'payments',
    label: 'Payment Analysis',
    icon: 'circle-dollar-sign',
    description: 'Payments received against sales invoices with allocation position.',
    permissions: ['sales.view'],
    drill: true,
    defaultSize: 50,
    filters: ['date', 'search', 'customer', 'branch', 'warehouse', 'product'],
    sortOptions: [
      { value: 'paymentDate', label: 'Payment Date' },
      { value: 'paymentNo', label: 'Payment No' },
      { value: 'invoiceNo', label: 'Invoice No' },
      { value: 'amount', label: 'Amount' },
    ],
    columns: () => [
      { key: 'paymentNo', label: 'Payment No', type: 'text' },
      { key: 'paymentDate', label: 'Date', type: 'date' },
      { key: 'salesInvoiceNo', label: 'Invoice No', type: 'text' },
      { key: 'customer', label: 'Customer', type: 'text' },
      { key: 'paymentType', label: 'Payment Type', type: 'text' },
      { key: 'paymentMethod', label: 'Payment Method', type: 'text' },
      { key: 'referenceNo', label: 'Reference No', type: 'text' },
      { key: 'amount', label: 'Amount', type: 'amount', total: true },
      { key: 'allocated', label: 'Allocated', type: 'amount', total: true },
      { key: 'unallocated', label: 'Unallocated', type: 'amount', total: true },
    ],
  },
  {
    id: 'outstanding',
    label: 'Outstanding',
    icon: 'hourglass',
    description: 'Invoices with a balance, reconciled against payment allocations.',
    permissions: ['sales.view'],
    drill: true,
    defaultSize: 50,
    filters: ['date', 'search', 'customer', 'branch', 'warehouse', 'status'],
    sortOptions: [
      { value: 'invoiceDate', label: 'Date' },
      { value: 'invoiceNo', label: 'Invoice No' },
      { value: 'customer', label: 'Customer' },
      { value: 'balance', label: 'Balance' },
    ],
    columns: () => [
      { key: 'salesInvoiceNo', label: 'Invoice No', type: 'text' },
      { key: 'invoiceDate', label: 'Date', type: 'date' },
      { key: 'customer', label: 'Customer', type: 'text' },
      { key: 'branch', label: 'Branch', type: 'text' },
      { key: 'grandTotal', label: 'Grand Total', type: 'amount', total: true },
      { key: 'paid', label: 'Paid', type: 'amount', total: true },
      { key: 'allocated', label: 'Allocated', type: 'amount', total: true },
      { key: 'balance', label: 'Balance', type: 'amount', total: true },
      { key: 'unallocated', label: 'Unallocated', type: 'amount', total: true },
      { key: 'paymentStatus', label: 'Payment Status', type: 'text' },
      { key: 'invoiceStatus', label: 'Status', type: 'text' },
    ],
  },
  {
    id: 'pos',
    label: 'POS / Source Analysis',
    icon: 'shopping-cart',
    description: 'Sales split by source type and POS session.',
    permissions: ['sales.view'],
    drill: true,
    defaultSize: 50,
    filters: ['date', 'search', 'customer', 'branch', 'warehouse', 'source'],
    groupByOptions: [
      { value: 'source-type', label: 'Source Type' },
      { value: 'session', label: 'POS Session' },
      { value: 'month', label: 'Month' },
    ],
    columns: (group: string | null): SalesReportColumn[] =>
      group
        ? [
            ...groupDim(group),
            { key: 'invoices', label: 'Invoices', type: 'number' },
            { key: 'gross', label: 'Gross', type: 'amount', total: true },
            { key: 'discount', label: 'Discount', type: 'amount', total: true },
            { key: 'taxable', label: 'Taxable', type: 'amount', total: true },
            { key: 'grandTotal', label: 'Grand Total', type: 'amount', total: true },
            { key: 'paid', label: 'Paid', type: 'amount', total: true },
            { key: 'balance', label: 'Balance', type: 'amount', total: true },
          ]
        : [
            { key: 'salesInvoiceNo', label: 'Invoice No', type: 'text' },
            { key: 'invoiceDate', label: 'Date', type: 'date' },
            { key: 'sourceType', label: 'Source', type: 'text' },
            { key: 'possessionId', label: 'POS Session', type: 'text' },
            { key: 'customer', label: 'Customer', type: 'text' },
            { key: 'grandTotal', label: 'Grand Total', type: 'amount', total: true },
            { key: 'paid', label: 'Paid', type: 'amount', total: true },
            { key: 'balance', label: 'Balance', type: 'amount', total: true },
            { key: 'invoiceStatus', label: 'Status', type: 'text' },
          ],
  },
  {
    id: 'price-list',
    label: 'Price List Analysis',
    icon: 'badge-pound-sterling',
    description: 'Sales value per price list, or per product within price lists.',
    permissions: ['sales.view'],
    defaultSize: 50,
    filters: ['date', 'search', 'customer', 'branch', 'warehouse'],
    groupByOptions: [
      { value: 'product', label: 'Product' },
      { value: 'month', label: 'Month' },
    ],
    columns: (group: string | null): SalesReportColumn[] =>
      group === 'product'
        ? [
            { key: 'priceList', label: 'Price List', type: 'text' },
            { key: 'product', label: 'Product', type: 'text' },
            { key: 'lines', label: 'Lines', type: 'number' },
            { key: 'quantity', label: 'Qty', type: 'number', total: true },
            { key: 'avgRate', label: 'Avg Rate', type: 'amount' },
            { key: 'lineTotal', label: 'Line Total', type: 'amount', total: true },
          ]
        : [
            ...(group ? groupDim(group) : ([{ key: 'priceList', label: 'Price List', type: 'text' }] as SalesReportColumn[])),
            { key: 'invoices', label: 'Invoices', type: 'number' },
            { key: 'gross', label: 'Gross', type: 'amount', total: true },
            { key: 'discount', label: 'Discount', type: 'amount', total: true },
            { key: 'taxable', label: 'Taxable', type: 'amount', total: true },
            { key: 'grandTotal', label: 'Grand Total', type: 'amount', total: true },
            { key: 'paid', label: 'Paid', type: 'amount', total: true },
            { key: 'balance', label: 'Balance', type: 'amount', total: true },
          ],
  },
  {
    id: 'allocation',
    label: 'Payment Allocation',
    icon: 'scale',
    description: 'Allocation-level reconciliation of payments against invoices.',
    permissions: ['sales.view'],
    drill: true,
    defaultSize: 50,
    filters: ['date', 'search', 'customer'],
    sortOptions: [
      { value: 'paymentDate', label: 'Payment Date' },
      { value: 'paymentNo', label: 'Payment No' },
      { value: 'invoiceNo', label: 'Invoice No' },
      { value: 'allocated', label: 'Allocated' },
    ],
    columns: () => [
      { key: 'paymentNo', label: 'Payment No', type: 'text' },
      { key: 'paymentDate', label: 'Date', type: 'date' },
      { key: 'salesInvoiceNo', label: 'Invoice No', type: 'text' },
      { key: 'customer', label: 'Customer', type: 'text' },
      { key: 'paymentAmount', label: 'Payment Amount', type: 'amount', total: true },
      { key: 'allocatedAmount', label: 'Allocated', type: 'amount', total: true },
      { key: 'unallocated', label: 'Unallocated', type: 'amount', total: true },
      { key: 'grandTotal', label: 'Invoice Grand', type: 'amount', total: true },
      { key: 'paid', label: 'Invoice Paid', type: 'amount', total: true },
      { key: 'balance', label: 'Invoice Balance', type: 'amount', total: true },
    ],
  },
];

function groupDim(group: string | null): SalesReportColumn[] {
  if (!group || group === 'none') return [];
  const key =
    group === 'product'
      ? 'product'
      : group === 'customer'
        ? 'customer'
        : group === 'hsn'
          ? 'hsn'
          : group === 'gst-rate'
            ? 'gstRate'
            : group === 'branch'
              ? 'branch'
              : group === 'warehouse'
                ? 'warehouse'
                : group === 'status'
                  ? 'status'
                  : group === 'sales-type'
                    ? 'salesType'
                    : group === 'source-type'
                      ? 'sourceType'
                      : group === 'session'
                        ? 'possessionId'
                        : 'period';
  return [{ key, label: 'Group', type: 'text' }];
}

export function getSalesReportConfig(id: string): SalesReportScreenConfig | undefined {
  return SALES_REPORT_CONFIGS.find((c) => c.id === id);
}

export function resolveSalesColumns(config: SalesReportScreenConfig, group: string | null): SalesReportColumn[] {
  return config.columns(group);
}
