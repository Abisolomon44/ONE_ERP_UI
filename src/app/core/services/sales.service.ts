import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { PaginatedResult } from './crud';

export interface LookupItem {
  id: number;
  code?: string | null;
  name?: string | null;
}

export interface SalesLookupsDto {
  customers: LookupItem[];
  products: LookupItem[];
  units: LookupItem[];
  paymentTypes: LookupItem[];
  paymentMethods: LookupItem[];
  branches: LookupItem[];
  warehouses: LookupItem[];
  companies: LookupItem[];
  currentCompanyId: number;
}

export interface SalesItemDto {
  salesInvoiceItemId: number;
  salesInvoiceId: number;
  productId: number;
  productCodeSnapshot?: string | null;
  productNameSnapshot?: string | null;
  unitID: number;
  unitNameSnapshot?: string | null;
  batchId?: number | null;
  hsnID?: number | null;
  hsnCodeSnapshot?: string | null;
  barcodeSnapshot?: string | null;
  quantity: number;
  freeQuantity: number;
  rate: number;
  grossAmount: number;
  discountPercentage: number;
  discountAmount: number;
  taxableAmount: number;
  gstPercent: number;
  cgstPercent: number;
  sgstPercent: number;
  igstPercent: number;
  cessPercent: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  cessAmount: number;
  lineTotal: number;
  remarks?: string | null;
}

export interface SalesInvoiceDto {
  salesInvoiceId: number;
  companyId: number;
  companyNameSnapshot?: string | null;
  branchId: number;
  warehouseId: number;
  customerId: number;
  customerNameSnapshot?: string | null;
  salesInvoiceNo: string;
  invoiceDate: string;
  sourceType: string;
  salesTypeId?: number | null;
  priceListId?: number | null;
  referenceNo?: string | null;
  referenceDate?: string | null;
  totalGrossAmount: number;
  totalDiscountAmount: number;
  totalTaxableAmount: number;
  totalCGSTAmount: number;
  totalSGSTAmount: number;
  totalIGSTAmount: number;
  totalCESSAmount: number;
  totalRoundOff: number;
  grandTotal: number;
  paidAmount: number;
  balanceAmount: number;
  paymentTypeID?: number | null;
  paymentMethodID?: number | null;
  statusID: number;
  invoiceStatus: string;
  remarks?: string | null;
  isActive: boolean;
  createdByUserID: number;
  createdAt: string;
  items: SalesItemDto[];
}

export interface CreateSalesItemInput {
  productId: number;
  unitID: number;
  quantity: number;
  freeQuantity?: number;
  rate: number;
  batchId?: number | null;
  discountPercentage?: number;
  gstPercent?: number;
  cgstPercent?: number;
  sgstPercent?: number;
  igstPercent?: number;
  cessPercent?: number;
  remarks?: string | null;
}

export interface CreateSalesPaymentInput {
  amount: number;
  paymentTypeID?: number | null;
  paymentMethodID?: number | null;
  referenceNo?: string | null;
  remarks?: string | null;
}

export interface CreateSalesRequest {
  branchId: number;
  warehouseId: number;
  customerId: number;
  companyId: number;
  invoiceNumber: string;
  invoiceDate: string;
  sourceType?: string;
  salesTypeId?: number | null;
  priceListId?: number | null;
  referenceNo?: string | null;
  referenceDate?: string | null;
  paymentTypeID?: number | null;
  paymentMethodID?: number | null;
  remarks?: string | null;
  items: CreateSalesItemInput[];
  payment?: CreateSalesPaymentInput | null;
}

export interface UpdateSalesRequest {
  branchId: number;
  warehouseId: number;
  customerId: number;
  companyId: number;
  invoiceNumber: string;
  invoiceDate: string;
  salesTypeId?: number | null;
  priceListId?: number | null;
  referenceNo?: string | null;
  referenceDate?: string | null;
  paymentTypeID?: number | null;
  paymentMethodID?: number | null;
  remarks?: string | null;
  items: CreateSalesItemInput[];
}

export interface PaymentAllocationDto {
  paymentAllocationId: number;
  paymentId: number;
  referenceType: string;
  referenceId: number;
  allocatedAmount: number;
}

export interface StockTransactionDto {
  stockTransactionId: number;
  companyId: number;
  branchId: number;
  warehouseId: number;
  productId: number;
  unitId: number;
  transactionType: string;
  referenceType: string;
  referenceId: number;
  quantityIn: number;
  quantityOut: number;
  rate: number;
  balanceQuantity: number;
  transactionDate: string;
  remarks?: string | null;
}

@Injectable({ providedIn: 'root' })
export class SalesService {
  constructor(private readonly http: HttpClient) {}

  getPaged(page: number = 1, size: number = 10, search: string = ''): Promise<PaginatedResult<SalesInvoiceDto>> {
    let params = new HttpParams().set('page', page).set('size', size);
    if (search) params = params.set('search', search);
    return firstValueFrom(this.http.get<PaginatedResult<SalesInvoiceDto>>('/api/sales', { params }));
  }

  getLookups(): Promise<SalesLookupsDto> {
    return firstValueFrom(this.http.get<SalesLookupsDto>('/api/sales/lookups'));
  }

  getNextNumber(): Promise<string> {
    return firstValueFrom(this.http.get<string>('/api/sales/next-number'));
  }

  getById(id: number): Promise<SalesInvoiceDto> {
    return firstValueFrom(this.http.get<SalesInvoiceDto>(`/api/sales/${id}`));
  }

  getItems(id: number): Promise<SalesItemDto[]> {
    return firstValueFrom(this.http.get<SalesItemDto[]>(`/api/sales/${id}/items`));
  }

  getPayments(id: number): Promise<PaymentAllocationDto[]> {
    return firstValueFrom(this.http.get<PaymentAllocationDto[]>(`/api/sales/${id}/payments`));
  }

  getStock(id: number): Promise<StockTransactionDto[]> {
    return firstValueFrom(this.http.get<StockTransactionDto[]>(`/api/sales/${id}/stock`));
  }

  create(request: CreateSalesRequest): Promise<SalesInvoiceDto> {
    return firstValueFrom(this.http.post<SalesInvoiceDto>('/api/sales', request));
  }

  update(id: number, request: UpdateSalesRequest): Promise<SalesInvoiceDto> {
    return firstValueFrom(this.http.put<SalesInvoiceDto>(`/api/sales/${id}`, request));
  }

  delete(id: number): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`/api/sales/${id}`)).then(() => undefined);
  }
}
