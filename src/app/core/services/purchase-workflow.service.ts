import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { PaginatedResult } from './crud';

// ============================================================
// DTOs — mirror the backend (PurchaseSettingsService,
// PurchaseOrderService, GoodsReceiptService).
// ============================================================

export interface PurchaseSettingsDto {
  companyId: number;
  purchaseWorkflowMode: 'BILLING' | 'ERP';
  requirePurchaseOrder: boolean;
  requireGoodsReceipt: boolean;
  requirePurchaseApproval: boolean;
  requireInvoiceMatching: boolean;
  allowPartialReceipt: boolean;
  allowExcessReceipt: boolean;
  excessReceiptTolerancePercent: number;
  enableLandedCost: boolean;
  requireReturnApproval: boolean;
  createdAt: string;
  updatedAt: string;
  /** base64 rowversion token for optimistic concurrency */
  concurrencyVersion?: string | null;
}

export type UpdatePurchaseSettingsRequest = Omit<
  PurchaseSettingsDto,
  'companyId' | 'createdAt' | 'updatedAt'
> & { concurrencyVersion?: string | null };

export interface ApprovalRuleDto {
  approvalSettingId: number;
  documentType: 'PURCHASE' | 'PURCHASE_RETURN';
  approvalLevel: number;
  minimumAmount: number;
  maximumAmount?: number | null;
  approverRoleId: number;
  isActive: boolean;
}

export interface UpsertApprovalRuleRequest {
  approvalSettingId?: number;
  documentType: 'PURCHASE' | 'PURCHASE_RETURN';
  approvalLevel: number;
  minimumAmount: number;
  maximumAmount?: number | null;
  approverRoleId: number;
  isActive: boolean;
}

export interface PurchaseOrderItemDto {
  purchaseOrderItemId: number;
  purchaseOrderId: number;
  productId: number;
  productName?: string | null;
  productCode?: string | null;
  unitId: number;
  unitName?: string | null;
  orderedQuantity: number;
  receivedQuantity: number;
  cancelledQuantity: number;
  unitPrice: number;
  discountAmount: number;
  taxAmount: number;
  lineTotal: number;
}

export interface PurchaseOrderDto {
  purchaseOrderId: number;
  purchaseOrderNumber: string;
  supplierId: number;
  supplierName?: string | null;
  orderDate: string;
  expectedDate?: string | null;
  warehouseId: number;
  warehouseName?: string | null;
  status: string;
  subTotal: number;
  taxAmount: number;
  grandTotal: number;
  remarks?: string | null;
  items: PurchaseOrderItemDto[];
}

export interface CreatePurchaseOrderItemRequest {
  productId: number;
  unitId: number;
  orderedQuantity: number;
  unitPrice: number;
  discountAmount?: number;
  taxAmount?: number;
}

export interface CreatePurchaseOrderRequest {
  supplierId: number;
  orderDate: string;
  expectedDate?: string | null;
  warehouseId: number;
  branchId?: number | null;
  remarks?: string | null;
  items: CreatePurchaseOrderItemRequest[];
}

export interface ReceiptStatusItemDto {
  purchaseOrderItemId: number;
  productId: number;
  orderedQuantity: number;
  receivedQuantity: number;
  cancelledQuantity: number;
}

export interface ReceiptStatusDto {
  purchaseOrderId: number;
  purchaseOrderNumber: string;
  orderedTotal: number;
  receivedTotal: number;
  items: ReceiptStatusItemDto[];
}

export interface GoodsReceiptItemDto {
  goodsReceiptItemId: number;
  goodsReceiptId: number;
  purchaseOrderItemId?: number | null;
  productId: number;
  productName?: string | null;
  productCode?: string | null;
  unitId: number;
  unitName?: string | null;
  receivedQuantity: number;
  acceptedQuantity: number;
  rejectedQuantity: number;
  unitCost: number;
}

export interface GoodsReceiptDto {
  goodsReceiptId: number;
  grnNumber: string;
  purchaseOrderId?: number | null;
  purchaseOrderNumber?: string | null;
  supplierId: number;
  supplierName?: string | null;
  warehouseId: number;
  warehouseName?: string | null;
  receiptDate: string;
  status: string;
  postedAt?: string | null;
  remarks?: string | null;
  items: GoodsReceiptItemDto[];
}

export interface CreateGoodsReceiptItemRequest {
  purchaseOrderItemId?: number | null;
  productId: number;
  unitId: number;
  receivedQuantity: number;
  acceptedQuantity: number;
  rejectedQuantity?: number;
  unitCost: number;
}

export interface CreateGoodsReceiptRequest {
  purchaseOrderId?: number | null;
  supplierId: number;
  warehouseId: number;
  branchId?: number | null;
  receiptDate: string;
  remarks?: string | null;
  items: CreateGoodsReceiptItemRequest[];
}

export interface MatchingLineDto {
  purchaseItemId: number;
  productId: number;
  billedQuantity: number;
  receivedQuantity: number;
  orderedQuantity: number;
  billedAmount: number;
  receivedAmount: number;
  ok: boolean;
}

export interface InvoiceMatchingDto {
  purchaseId: number;
  purchaseNumber: string;
  purchaseOrderId?: number | null;
  lines: MatchingLineDto[];
  matchOk: boolean;
  mismatches: string[];
}

// ============================================================
// Service
// ============================================================

@Injectable({ providedIn: 'root' })
export class PurchaseWorkflowService {
  private readonly http = inject(HttpClient);

  // ---- Settings ----

  getSettings(): Promise<PurchaseSettingsDto> {
    return firstValueFrom(this.http.get<PurchaseSettingsDto>('/api/purchase-settings'));
  }

  updateSettings(request: UpdatePurchaseSettingsRequest): Promise<PurchaseSettingsDto> {
    return firstValueFrom(this.http.put<PurchaseSettingsDto>('/api/purchase-settings', request));
  }

  // ---- Approval rules ----

  getApprovalRules(): Promise<ApprovalRuleDto[]> {
    return firstValueFrom(this.http.get<ApprovalRuleDto[]>('/api/purchase-settings/approvals'));
  }

  saveApprovalRules(rules: UpsertApprovalRuleRequest[]): Promise<ApprovalRuleDto[]> {
    return firstValueFrom(this.http.put<ApprovalRuleDto[]>('/api/purchase-settings/approvals', rules));
  }

  deleteApprovalRule(ruleId: number): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`/api/purchase-settings/approvals/${ruleId}`)).then(() => undefined);
  }

  // ---- Purchase orders ----

  getOrders(page: number = 1, size: number = 20, status: string = ''): Promise<PaginatedResult<PurchaseOrderDto>> {
    let params = new HttpParams().set('page', page).set('size', size);
    if (status) params = params.set('status', status);
    return firstValueFrom(this.http.get<PaginatedResult<PurchaseOrderDto>>('/api/purchase-orders', { params }));
  }

  getOrder(id: number): Promise<PurchaseOrderDto> {
    return firstValueFrom(this.http.get<PurchaseOrderDto>(`/api/purchase-orders/${id}`));
  }

  createOrder(request: CreatePurchaseOrderRequest): Promise<PurchaseOrderDto> {
    return firstValueFrom(this.http.post<PurchaseOrderDto>('/api/purchase-orders', request));
  }

  submitOrder(id: number): Promise<PurchaseOrderDto> {
    return firstValueFrom(this.http.post<PurchaseOrderDto>(`/api/purchase-orders/${id}/submit`, {}));
  }

  approveOrder(id: number): Promise<PurchaseOrderDto> {
    return firstValueFrom(this.http.post<PurchaseOrderDto>(`/api/purchase-orders/${id}/approve`, {}));
  }

  rejectOrder(id: number, reason: string): Promise<PurchaseOrderDto> {
    return firstValueFrom(this.http.post<PurchaseOrderDto>(`/api/purchase-orders/${id}/reject`, { reason }));
  }

  cancelOrder(id: number, reason: string): Promise<PurchaseOrderDto> {
    return firstValueFrom(this.http.post<PurchaseOrderDto>(`/api/purchase-orders/${id}/cancel`, { reason }));
  }

  getReceiptStatus(id: number): Promise<ReceiptStatusDto> {
    return firstValueFrom(this.http.get<ReceiptStatusDto>(`/api/purchase-orders/${id}/receipt-status`));
  }

  // ---- Goods receipts ----

  getReceipts(page: number = 1, size: number = 20, status: string = ''): Promise<PaginatedResult<GoodsReceiptDto>> {
    let params = new HttpParams().set('page', page).set('size', size);
    if (status) params = params.set('status', status);
    return firstValueFrom(this.http.get<PaginatedResult<GoodsReceiptDto>>('/api/goods-receipts', { params }));
  }

  getReceipt(id: number): Promise<GoodsReceiptDto> {
    return firstValueFrom(this.http.get<GoodsReceiptDto>(`/api/goods-receipts/${id}`));
  }

  createReceipt(request: CreateGoodsReceiptRequest): Promise<GoodsReceiptDto> {
    return firstValueFrom(this.http.post<GoodsReceiptDto>('/api/goods-receipts', request));
  }

  postReceipt(id: number): Promise<GoodsReceiptDto> {
    return firstValueFrom(this.http.post<GoodsReceiptDto>(`/api/goods-receipts/${id}/post`, {}));
  }

  cancelReceipt(id: number, reason: string): Promise<GoodsReceiptDto> {
    return firstValueFrom(this.http.post<GoodsReceiptDto>(`/api/goods-receipts/${id}/cancel`, { reason }));
  }

  // ---- Matching ----

  getMatching(purchaseId: number): Promise<InvoiceMatchingDto> {
    return firstValueFrom(this.http.get<InvoiceMatchingDto>(`/api/purchases/${purchaseId}/matching`));
  }
}
