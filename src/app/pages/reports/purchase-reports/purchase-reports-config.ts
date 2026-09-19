// ============================================================
// Purchase Reports — declarative screen configs.
// Each config drives the shared <app-purchase-report-screen>
// component: filter bar, group-by/mode options, column set,
// KPI/chart widgets, paging and drill-down behaviour.
// ============================================================

export interface ReportColumn {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'amount' | 'percent';
  total?: boolean;
}

export interface GroupOption {
  value: string;
  label: string;
}

export interface ModeOption {
  value: string;
  label: string;
}

export type MaybeFn<T> = T | ((mode: string | null) => T);

export type ColumnsFn = (mode: string | null, group: string | null) => ReportColumn[];

export interface PurchaseReportScreenConfig {
  id: string;
  label: string;
  icon: string;
  description: string;
  permissions: string[];
  defaultSize?: number;
  defaultMode?: string;
  kpiCards?: boolean;
  charts?: boolean;
  drill?: boolean;
  modeOptions?: MaybeFn<ModeOption[]>;
  groupByOptions?: MaybeFn<GroupOption[]>;
  columns: ColumnsFn;
  filters: ('date' | 'search' | 'supplier' | 'product' | 'branch' | 'warehouse' | 'unit')[];
}

const GRP_PERIOD: GroupOption[] = [
  { value: 'month', label: 'Month' },
  { value: 'quarter', label: 'Quarter' },
  { value: 'year', label: 'Year' },
];

const GRP_ITEM: GroupOption[] = [
  { value: 'product', label: 'Product' },
  { value: 'category', label: 'Category' },
  { value: 'brand', label: 'Brand' },
  { value: 'uom', label: 'UOM' },
  { value: 'hsn', label: 'HSN' },
  ...GRP_PERIOD,
];

const PERCENT_RATE: ReportColumn[] = [
  { key: 'lines', label: 'Lines', type: 'number' },
  { key: 'quantity', label: 'Qty', type: 'number' },
  { key: 'discount', label: 'Discount', type: 'amount', total: true },
  { key: 'taxable', label: 'Taxable', type: 'amount', total: true },
  { key: 'gst', label: 'GST', type: 'amount', total: true },
  { key: 'cess', label: 'CESS', type: 'amount', total: true },
  { key: 'lineTotal', label: 'Line Total', type: 'amount', total: true },
];

export const PURCHASE_REPORT_CONFIGS: PurchaseReportScreenConfig[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: 'layout-dashboard',
    description: 'High-level overview of purchase value, trend and breakdowns.',
    permissions: ['purchases.view'],
    kpiCards: true,
    charts: true,
    filters: ['date', 'search', 'supplier', 'branch', 'warehouse', 'product'],
    columns: () => [],
  },
  {
    id: 'register',
    label: 'Purchase Register',
    icon: 'list',
    description: 'Every purchase header with its value and payment position.',
    permissions: ['purchases.view'],
    drill: true,
    defaultSize: 50,
    filters: ['date', 'search', 'supplier', 'branch', 'warehouse', 'unit'],
    columns: (): ReportColumn[] => [
      { key: 'purchaseNumber', label: 'Purchase No', type: 'text' },
      { key: 'purchaseDate', label: 'Date', type: 'date' },
      { key: 'supplierInvoiceNumber', label: 'Supplier Invoice', type: 'text' },
      { key: 'supplier', label: 'Supplier', type: 'text' },
      { key: 'branch', label: 'Branch', type: 'text' },
      { key: 'warehouse', label: 'Warehouse', type: 'text' },
      { key: 'paymentType', label: 'Payment Type', type: 'text' },
      { key: 'paymentMethod', label: 'Payment Method', type: 'text' },
      { key: 'status', label: 'Status', type: 'text' },
      { key: 'gross', label: 'Gross', type: 'amount', total: true },
      { key: 'discount', label: 'Discount', type: 'amount', total: true },
      { key: 'taxable', label: 'Taxable', type: 'amount', total: true },
      { key: 'gst', label: 'GST', type: 'amount', total: true },
      { key: 'cess', label: 'CESS', type: 'amount', total: true },
      { key: 'roundOff', label: 'Round Off', type: 'amount', total: true },
      { key: 'grandTotal', label: 'Grand Total', type: 'amount', total: true },
      { key: 'paidAmount', label: 'Paid', type: 'amount', total: true },
      { key: 'balanceAmount', label: 'Balance', type: 'amount', total: true },
    ],
  },
  {
    id: 'items',
    label: 'Item Analysis',
    icon: 'package',
    description: 'Purchased item lines with optional grouping by product/master dimension.',
    permissions: ['purchases.view'],
    drill: true,
    defaultSize: 50,
    filters: ['date', 'search', 'supplier', 'product', 'branch', 'warehouse', 'unit'],
    groupByOptions: GRP_ITEM,
    columns: (_mode: string | null, group: string | null): ReportColumn[] =>
      group
        ? [...groupDim(group), ...PERCENT_RATE]
        : [
            { key: 'purchaseNumber', label: 'Purchase No', type: 'text' },
            { key: 'purchaseDate', label: 'Date', type: 'date' },
            { key: 'supplier', label: 'Supplier', type: 'text' },
            { key: 'productCode', label: 'Product Code', type: 'text' },
            { key: 'product', label: 'Product', type: 'text' },
            { key: 'category', label: 'Category', type: 'text' },
            { key: 'subCategory', label: 'Sub Category', type: 'text' },
            { key: 'brand', label: 'Brand', type: 'text' },
            { key: 'unit', label: 'UOM', type: 'text' },
            { key: 'hsn', label: 'HSN', type: 'text' },
            { key: 'quantity', label: 'Qty', type: 'number', total: true },
            { key: 'freeQuantity', label: 'Free Qty', type: 'number', total: true },
            { key: 'purchaseRate', label: 'Rate', type: 'amount' },
            { key: 'discountPercentage', label: 'Disc %', type: 'percent' },
            { key: 'discountAmount', label: 'Discount', type: 'amount', total: true },
            { key: 'taxable', label: 'Taxable', type: 'amount', total: true },
            { key: 'gst', label: 'GST', type: 'amount', total: true },
            { key: 'cess', label: 'CESS', type: 'amount', total: true },
            { key: 'lineTotal', label: 'Line Total', type: 'amount', total: true },
          ],
  },
  {
    id: 'supplier',
    label: 'Supplier Analysis',
    icon: 'book-user',
    description: 'Purchase value, quantity and payment position per supplier.',
    permissions: ['purchases.view'],
    defaultSize: 50,
    filters: ['date', 'search', 'supplier', 'branch', 'warehouse', 'unit'],
    groupByOptions: [
      ...GRP_PERIOD,
      { value: 'branch', label: 'Branch' },
      { value: 'warehouse', label: 'Warehouse' },
      { value: 'purchase-type', label: 'Purchase Type' },
      { value: 'status', label: 'Status' },
    ],
    columns: (_mode: string | null, group: string | null): ReportColumn[] => [
      ...(group ? groupDim(group) : ([{ key: 'supplier', label: 'Supplier', type: 'text' }] as ReportColumn[])),
      { key: 'purchases', label: 'Purchases', type: 'number' },
      { key: 'quantity', label: 'Qty', type: 'number', total: true },
      { key: 'gross', label: 'Gross', type: 'amount', total: true },
      { key: 'discount', label: 'Discount', type: 'amount', total: true },
      { key: 'taxable', label: 'Taxable', type: 'amount', total: true },
      { key: 'gst', label: 'GST', type: 'amount', total: true },
      { key: 'cess', label: 'CESS', type: 'amount', total: true },
      { key: 'grandTotal', label: 'Grand Total', type: 'amount', total: true },
      { key: 'paid', label: 'Paid', type: 'amount', total: true },
      { key: 'balance', label: 'Balance', type: 'amount', total: true },
      { key: 'avgInvoice', label: 'Avg Invoice', type: 'amount' },
      { key: 'lastPurchaseDate', label: 'Last Purchase', type: 'date' },
    ],
  },
  {
    id: 'product-price',
    label: 'Product / Price Analysis',
    icon: 'badge-pound-sterling',
    description: 'Price history, rate summary and per-supplier price comparison.',
    permissions: ['purchases.view'],
    drill: true,
    defaultSize: 50,
    filters: ['date', 'search', 'supplier', 'product', 'branch', 'warehouse', 'unit'],
    modeOptions: [
      { value: 'history', label: 'History' },
      { value: 'rate', label: 'Rate Summary' },
      { value: 'supplier', label: 'By Supplier' },
    ],
    defaultMode: 'history',
    columns: (mode: string | null): ReportColumn[] =>
      mode === 'rate'
        ? [
            { key: 'productCode', label: 'Product Code', type: 'text' },
            { key: 'productName', label: 'Product', type: 'text' },
            { key: 'unit', label: 'UOM', type: 'text' },
            { key: 'minRate', label: 'Min Rate', type: 'amount' },
            { key: 'maxRate', label: 'Max Rate', type: 'amount' },
            { key: 'avgRate', label: 'Avg Rate', type: 'amount' },
            { key: 'lastRate', label: 'Last Rate', type: 'amount' },
            { key: 'purchaseCount', label: 'Purchases', type: 'number' },
            { key: 'quantity', label: 'Qty', type: 'number' },
            { key: 'changePct', label: 'Change %', type: 'percent' },
          ]
        : mode === 'supplier'
          ? [
              { key: 'productCode', label: 'Product Code', type: 'text' },
              { key: 'productName', label: 'Product', type: 'text' },
              { key: 'unit', label: 'UOM', type: 'text' },
              { key: 'supplier', label: 'Supplier', type: 'text' },
              { key: 'minRate', label: 'Min Rate', type: 'amount' },
              { key: 'maxRate', label: 'Max Rate', type: 'amount' },
              { key: 'avgRate', label: 'Avg Rate', type: 'amount' },
              { key: 'lastRate', label: 'Last Rate', type: 'amount' },
              { key: 'lastDate', label: 'Last Purchase', type: 'date' },
              { key: 'quantity', label: 'Qty', type: 'number' },
              { key: 'lines', label: 'Lines', type: 'number' },
              { key: 'changePct', label: 'Change %', type: 'percent' },
            ]
          : [
              { key: 'purchaseNumber', label: 'Purchase No', type: 'text' },
              { key: 'purchaseDate', label: 'Date', type: 'date' },
              { key: 'supplier', label: 'Supplier', type: 'text' },
              { key: 'productCode', label: 'Product Code', type: 'text' },
              { key: 'productName', label: 'Product', type: 'text' },
              { key: 'unit', label: 'UOM', type: 'text' },
              { key: 'purchaseRate', label: 'Rate', type: 'amount' },
              { key: 'quantity', label: 'Qty', type: 'number' },
              { key: 'prevRate', label: 'Prev Rate', type: 'amount' },
              { key: 'changePct', label: 'Change %', type: 'percent' },
            ],
  },
  {
    id: 'quantity',
    label: 'Quantity / PO / GRN Analysis',
    icon: 'boxes',
    description: 'Ordered vs received vs returned vs remaining quantities.',
    permissions: ['purchases.view'],
    drill: true,
    defaultSize: 50,
    filters: ['date', 'search', 'supplier', 'product', 'branch', 'warehouse', 'unit'],
    groupByOptions: [
      { value: 'product', label: 'Product' },
      { value: 'category', label: 'Category' },
      { value: 'brand', label: 'Brand' },
      { value: 'uom', label: 'UOM' },
      { value: 'supplier', label: 'Supplier' },
      { value: 'po', label: 'Purchase Order' },
      { value: 'grn', label: 'GRN' },
      { value: 'month', label: 'Month' },
    ],
    columns: (_mode: string | null, group: string | null): ReportColumn[] =>
      group
        ? [
            ...groupDim(group),
            { key: 'orderedQuantity', label: 'Ordered', type: 'number', total: true },
            { key: 'receivedQuantity', label: 'Received', type: 'number', total: true },
            { key: 'returnedQuantity', label: 'Returned', type: 'number', total: true },
            { key: 'remainingQuantity', label: 'Remaining', type: 'number', total: true },
            { key: 'unit', label: 'UOM', type: 'text' },
            { key: 'avgRate', label: 'Avg Rate', type: 'amount' },
          ]
        : [
            { key: 'purchaseNumber', label: 'Purchase No', type: 'text' },
            { key: 'purchaseDate', label: 'Date', type: 'date' },
            { key: 'supplier', label: 'Supplier', type: 'text' },
            { key: 'ponumber', label: 'PO No', type: 'text' },
            { key: 'grnid', label: 'GRN', type: 'number' },
            { key: 'product', label: 'Product', type: 'text' },
            { key: 'unit', label: 'UOM', type: 'text' },
            { key: 'purchaseRate', label: 'Rate', type: 'amount' },
            { key: 'orderedQuantity', label: 'Ordered', type: 'number', total: true },
            { key: 'receivedQuantity', label: 'Received', type: 'number', total: true },
            { key: 'returnedQuantity', label: 'Returned', type: 'number', total: true },
            { key: 'remainingQuantity', label: 'Remaining', type: 'number', total: true },
          ],
  },
  {
    id: 'tax',
    label: 'Tax Analysis',
    icon: 'receipt',
    description: 'GST/CESS values per purchase line or grouped by rate, HSN and more.',
    permissions: ['purchases.view'],
    drill: true,
    defaultSize: 50,
    filters: ['date', 'search', 'supplier', 'product', 'branch', 'warehouse', 'unit'],
    groupByOptions: [
      { value: 'gst-rate', label: 'GST Rate' },
      { value: 'hsn', label: 'HSN' },
      { value: 'product', label: 'Product' },
      { value: 'category', label: 'Category' },
      { value: 'brand', label: 'Brand' },
      { value: 'supplier', label: 'Supplier' },
      { value: 'month', label: 'Month' },
      { value: 'year', label: 'Year' },
    ],
    columns: (_mode: string | null, group: string | null): ReportColumn[] => {
      const cols: ReportColumn[] = [];
      if (group) {
        cols.push(...groupDim(group));
        cols.push({ key: 'lines', label: 'Lines', type: 'number' });
        cols.push({ key: 'quantity', label: 'Qty', type: 'number' });
        cols.push({ key: 'taxable', label: 'Taxable', type: 'amount', total: true });
        cols.push({ key: 'cgst', label: 'CGST', type: 'amount', total: true });
        cols.push({ key: 'sgst', label: 'SGST', type: 'amount', total: true });
        cols.push({ key: 'igst', label: 'IGST', type: 'amount', total: true });
        cols.push({ key: 'cess', label: 'CESS', type: 'amount', total: true });
        cols.push({ key: 'totalTax', label: 'Total Tax', type: 'amount', total: true });
      } else {
        cols.push({ key: 'purchaseNumber', label: 'Purchase No', type: 'text' });
        cols.push({ key: 'purchaseDate', label: 'Date', type: 'date' });
        cols.push({ key: 'supplier', label: 'Supplier', type: 'text' });
        cols.push({ key: 'product', label: 'Product', type: 'text' });
        cols.push({ key: 'hsn', label: 'HSN', type: 'text' });
        cols.push({ key: 'taxRate', label: 'Tax Rate', type: 'percent' });
        cols.push({ key: 'taxable', label: 'Taxable', type: 'amount', total: true });
        cols.push({ key: 'cgst', label: 'CGST', type: 'amount', total: true });
        cols.push({ key: 'sgst', label: 'SGST', type: 'amount', total: true });
        cols.push({ key: 'igst', label: 'IGST', type: 'amount', total: true });
        cols.push({ key: 'cess', label: 'CESS', type: 'amount', total: true });
        cols.push({ key: 'totalTax', label: 'Total Tax', type: 'amount', total: true });
      }
      return cols;
    },
  },
  {
    id: 'payment',
    label: 'Payment / Payable Analysis',
    icon: 'circle-dollar-sign',
    description: 'Invoice, paid and outstanding position per purchase.',
    permissions: ['purchases.view'],
    kpiCards: true,
    drill: true,
    defaultSize: 50,
    filters: ['date', 'search', 'supplier', 'branch', 'warehouse', 'unit'],
    groupByOptions: [
      { value: 'payment-type', label: 'Payment Type' },
      { value: 'payment-method', label: 'Payment Method' },
      { value: 'supplier', label: 'Supplier' },
      { value: 'status', label: 'Status' },
      { value: 'payment-status', label: 'Payment Status' },
      { value: 'month', label: 'Month' },
      { value: 'year', label: 'Year' },
    ],
    columns: (_mode: string | null, group: string | null): ReportColumn[] => {
      const cols: ReportColumn[] = [];
      if (group) {
        cols.push(...groupDim(group));
        cols.push({ key: 'invoices', label: 'Invoices', type: 'number' });
        cols.push({ key: 'invoice', label: 'Invoice', type: 'amount', total: true });
        cols.push({ key: 'paid', label: 'Paid', type: 'amount', total: true });
        cols.push({ key: 'balance', label: 'Balance', type: 'amount', total: true });
      } else {
        cols.push({ key: 'purchaseNumber', label: 'Purchase No', type: 'text' });
        cols.push({ key: 'purchaseDate', label: 'Date', type: 'date' });
        cols.push({ key: 'supplier', label: 'Supplier', type: 'text' });
        cols.push({ key: 'paymentType', label: 'Payment Type', type: 'text' });
        cols.push({ key: 'paymentMethod', label: 'Payment Method', type: 'text' });
        cols.push({ key: 'status', label: 'Status', type: 'text' });
        cols.push({ key: 'invoice', label: 'Invoice', type: 'amount', total: true });
        cols.push({ key: 'paid', label: 'Paid', type: 'amount', total: true });
        cols.push({ key: 'balance', label: 'Balance', type: 'amount', total: true });
        cols.push({ key: 'allocated', label: 'Allocated', type: 'amount', total: true });
        cols.push({ key: 'paymentStatus', label: 'Payment Status', type: 'text' });
      }
      return cols;
    },
  },
  {
    id: 'returns',
    label: 'Purchase Return Analysis',
    icon: 'rotate-ccw',
    description: 'Purchase returns with reasons, quantities and tax recovered.',
    permissions: ['purchases.view', 'purchases.return.view'],
    drill: true,
    defaultSize: 50,
    filters: ['date', 'search', 'supplier', 'branch', 'warehouse', 'unit'],
    groupByOptions: [
      { value: 'reason', label: 'Reason' },
      { value: 'supplier', label: 'Supplier' },
      { value: 'status', label: 'Status' },
      { value: 'branch', label: 'Branch' },
      { value: 'warehouse', label: 'Warehouse' },
      { value: 'purchase-type', label: 'Return Type' },
      { value: 'product', label: 'Product' },
      { value: 'month', label: 'Month' },
      { value: 'quarter', label: 'Quarter' },
      { value: 'year', label: 'Year' },
    ],
    columns: (_mode: string | null, group: string | null): ReportColumn[] => {
      const cols: ReportColumn[] = [];
      if (group) {
        cols.push(...groupDim(group));
        cols.push({ key: 'returns', label: 'Returns', type: 'number' });
        cols.push({ key: 'quantity', label: 'Qty', type: 'number', total: true });
        cols.push({ key: 'taxable', label: 'Taxable', type: 'amount', total: true });
        cols.push({ key: 'gst', label: 'GST', type: 'amount', total: true });
        cols.push({ key: 'cess', label: 'CESS', type: 'amount', total: true });
        cols.push({ key: group === 'product' ? 'lineTotal' : 'grandTotal', label: group === 'product' ? 'Line Total' : 'Grand Total', type: 'amount', total: true });
      } else {
        cols.push({ key: 'returnNumber', label: 'Return No', type: 'text' });
        cols.push({ key: 'returnDate', label: 'Return Date', type: 'date' });
        cols.push({ key: 'purchaseNumber', label: 'Purchase No', type: 'text' });
        cols.push({ key: 'supplier', label: 'Supplier', type: 'text' });
        cols.push({ key: 'branch', label: 'Branch', type: 'text' });
        cols.push({ key: 'warehouse', label: 'Warehouse', type: 'text' });
        cols.push({ key: 'reason', label: 'Reason', type: 'text' });
        cols.push({ key: 'status', label: 'Status', type: 'text' });
        cols.push({ key: 'quantity', label: 'Qty', type: 'number', total: true });
        cols.push({ key: 'taxable', label: 'Taxable', type: 'amount', total: true });
        cols.push({ key: 'gst', label: 'GST', type: 'amount', total: true });
        cols.push({ key: 'cess', label: 'CESS', type: 'amount', total: true });
        cols.push({ key: 'grandTotal', label: 'Grand Total', type: 'amount', total: true });
      }
      return cols;
    },
  },
  {
    id: 'reconciliation',
    label: 'Purchase Reconciliation',
    icon: 'scale',
    description: 'Purchases vs returns vs payments side by side.',
    permissions: ['purchases.view', 'purchases.return.view'],
    defaultSize: 50,
    filters: ['date', 'search', 'supplier', 'branch', 'warehouse', 'unit'],
    modeOptions: [
      { value: 'amount', label: 'Amount' },
      { value: 'quantity', label: 'Quantity' },
      { value: 'tax', label: 'Tax' },
      { value: 'payment', label: 'Payment' },
      { value: 'return', label: 'Return' },
    ],
    defaultMode: 'amount',
    groupByOptions: (mode) =>
      mode === 'quantity' || mode === 'tax'
        ? [
            { value: 'product', label: 'Product' },
            { value: 'category', label: 'Category' },
            { value: 'brand', label: 'Brand' },
          ]
        : [
            ...GRP_PERIOD,
            { value: 'supplier', label: 'Supplier' },
            { value: 'branch', label: 'Branch' },
            { value: 'warehouse', label: 'Warehouse' },
            { value: 'status', label: 'Status' },
            { value: 'purchase-type', label: 'Purchase Type' },
          ],
    columns: (mode: string | null, group: string | null): ReportColumn[] =>
      mode === 'quantity'
        ? [
            ...groupDim(group),
            { key: 'purchaseQty', label: 'Purchase Qty', type: 'number', total: true },
            { key: 'returnQty', label: 'Return Qty', type: 'number', total: true },
            { key: 'netQty', label: 'Net Qty', type: 'number', total: true },
          ]
        : mode === 'tax'
          ? [
              ...groupDim(group),
              { key: 'purchaseTaxable', label: 'Purchase Taxable', type: 'amount', total: true },
              { key: 'purchaseGST', label: 'Purchase GST', type: 'amount', total: true },
              { key: 'purchaseCESS', label: 'Purchase CESS', type: 'amount', total: true },
              { key: 'returnTaxable', label: 'Return Taxable', type: 'amount', total: true },
              { key: 'returnGST', label: 'Return GST', type: 'amount', total: true },
              { key: 'returnCESS', label: 'Return CESS', type: 'amount', total: true },
              { key: 'netGST', label: 'Net GST', type: 'amount', total: true },
            ]
          : [
              ...groupDim(group),
              { key: 'purchases', label: 'Purchases', type: 'number' },
              { key: 'purchaseGross', label: 'Purchase Gross', type: 'amount', total: true },
              { key: 'purchaseDiscount', label: 'Purchase Discount', type: 'amount', total: true },
              { key: 'purchaseTaxable', label: 'Purchase Taxable', type: 'amount', total: true },
              { key: 'purchaseGST', label: 'Purchase GST', type: 'amount', total: true },
              { key: 'purchaseCESS', label: 'Purchase CESS', type: 'amount', total: true },
              { key: 'purchaseGrand', label: 'Purchase Grand', type: 'amount', total: true },
              { key: 'paid', label: 'Paid', type: 'amount', total: true },
              { key: 'outstanding', label: 'Outstanding', type: 'amount', total: true },
              { key: 'returnCount', label: 'Returns', type: 'number' },
              { key: 'returnGrand', label: 'Return Grand', type: 'amount', total: true },
              { key: 'netPurchase', label: 'Net Purchase', type: 'amount', total: true },
            ],
  },
];

function groupDim(group: string | null): ReportColumn[] {
  if (!group || group === 'none') return [];
  const key =
    group === 'product'
      ? 'product'
      : group === 'category'
        ? 'category'
        : group === 'brand'
          ? 'brand'
          : group === 'uom'
            ? 'unit'
            : group === 'hsn'
              ? 'hsn'
              : group === 'supplier'
                ? 'supplier'
                : group === 'branch'
                  ? 'branch'
                  : group === 'warehouse'
                    ? 'warehouse'
                    : group === 'status'
                      ? 'status'
                      : group === 'payment-type'
                        ? 'paymentType'
                        : group === 'payment-method'
                          ? 'paymentMethod'
                          : group === 'payment-status'
                            ? 'paymentStatus'
                            : group === 'purchase-type'
                              ? 'purchaseType'
                              : group === 'po'
                                ? 'ponumber'
                                : group === 'grn'
                                  ? 'grn'
                                  : group === 'gst-rate'
                                    ? 'taxRate'
                                    : group === 'reason'
                                      ? 'reason'
                                      : group === 'quarter'
                                        ? 'period'
                                        : 'period';
  return [{ key, label: 'Group', type: 'text' }];
}

export function getReportConfig(id: string): PurchaseReportScreenConfig | undefined {
  return PURCHASE_REPORT_CONFIGS.find((c) => c.id === id);
}

export function resolveColumns(config: PurchaseReportScreenConfig, mode: string | null, group: string | null): ReportColumn[] {
  return typeof config.columns === 'function' ? config.columns(mode, group) : config.columns;
}

export function resolveGroupOptions(config: PurchaseReportScreenConfig, mode: string | null): GroupOption[] {
  return (typeof config.groupByOptions === 'function' ? config.groupByOptions(mode) : config.groupByOptions) ?? [];
}

export function resolveModeOptions(config: PurchaseReportScreenConfig): ModeOption[] {
  return (typeof config.modeOptions === 'function' ? config.modeOptions(null) : config.modeOptions) ?? [];
}