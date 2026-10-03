import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';

// ============================================================
// Sales Returns API — T027/T028/T030 lifecycle client.
// ============================================================

export interface SalesReturnItemDto {
  salesReturnItemId: number;
  salesReturnId: number;
  salesInvoiceItemId: number;
  productId: number;
  productCodeSnapshot?: string | null;
  productNameSnapshot?: string | null;
  unitID: number;
  unitNameSnapshot?: string | null;
  hsnCodeSnapshot?: string | null;
  returnQuantity: number;
  freeQuantity: number;
  rate: number;
  discountAmount: number;
  taxableAmount: number;
  gstPercent: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  cessAmount: number;
  lineTotal: number;
}

export interface SalesReturnDto {
  salesReturnId: number;
  salesInvoiceId: number;
  salesInvoiceNo: string;
  companyId: number;
  branchId: number;
  warehouseId: number;
  customerId: number;
  customerNameSnapshot?: string | null;
  returnNumber: string;
  returnDate: string;
  totalGrossAmount: number;
  totalDiscountAmount: number;
  totalTaxableAmount: number;
  totalCGSTAmount: number;
  totalSGSTAmount: number;
  totalIGSTAmount: number;
  totalCESSAmount: number;
  totalRoundOff: number;
  grandTotal: number;
  refundAmount: number;
  status?: string | null;
  reason?: string | null;
  remarks?: string | null;
  cancellationReason?: string | null;
  items?: SalesReturnItemDto[];
}

export interface CreateSalesReturnItemInput {
  salesInvoiceItemId: number;
  productId: number;
  unitID: number;
  returnQuantity: number;
  freeQuantity: number;
  rate: number;
  discountAmount: number;
  gstPercent: number;
  cgstPercent: number;
  sgstPercent: number;
  igstPercent: number;
  cessPercent: number;
}

export interface SalesReturnRefundInput {
  paymentTypeId?: number | null;
  paymentMethodId?: number | null;
  amount: number;
}

export interface CreateSalesReturnRequest {
  salesInvoiceId: number;
  returnDate: string;
  items: CreateSalesReturnItemInput[];
  reason?: string | null;
  remarks?: string | null;
  refund?: SalesReturnRefundInput | null;
}

@Injectable({ providedIn: 'root' })
export class SalesReturnService {
  constructor(private readonly http: HttpClient) {}

  getPaged(page: number, size: number, search: string): Promise<{ items: SalesReturnDto[]; totalCount: number }> {
    const params = new HttpParams().set('page', page).set('size', size).set('search', search);
    return firstValueFrom(this.http.get<{ items: SalesReturnDto[]; totalCount: number }>('/api/sales-returns', { params }));
  }

  getById(id: number): Promise<SalesReturnDto> {
    return firstValueFrom(this.http.get<SalesReturnDto>(`/api/sales-returns/${id}`));
  }

  getNextNumber(): Promise<string> {
    return firstValueFrom(this.http.get<string>('/api/sales-returns/next-number'));
  }

  create(req: CreateSalesReturnRequest): Promise<SalesReturnDto> {
    return firstValueFrom(this.http.post<SalesReturnDto>('/api/sales-returns', req));
  }

  cancel(id: number, reason: string): Promise<SalesReturnDto> {
    return firstValueFrom(this.http.post<SalesReturnDto>(`/api/sales-returns/${id}/cancel`, { reason }));
  }
}
