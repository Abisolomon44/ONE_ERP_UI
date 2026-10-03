import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';

// ============================================================
// Stage 5 Inventory API (T074–T085) — server-side authoritative
// calculations; the client only sends commands and filters.
// ============================================================

export interface InventoryDashboardDto {
  stockValue: number;
  productsWithStock: number;
  outOfStockCount: number;
  lowStockCount: number;
  qtyInToday: number;
  qtyOutToday: number;
  transactionsToday: number;
}

export interface OpeningStockItemInput {
  productId: number;
  unitId: number;
  warehouseId: number;
  quantity: number;
  rate: number;
}

export interface OpeningStockRequest {
  branchId: number;
  openingDate?: string | null;
  remarks?: string | null;
  items: OpeningStockItemInput[];
}

export interface StockAdjustmentItemInput {
  productId: number;
  unitId: number;
  quantityDelta: number;
  rate: number;
  reason?: string | null;
}

export interface CreateStockAdjustmentRequest {
  branchId: number;
  warehouseId: number;
  adjustmentDate: string;
  reason?: string | null;
  remarks?: string | null;
  items: StockAdjustmentItemInput[];
}

export interface StockDocumentDto {
  stockAdjustmentId?: number;
  stockTransferId?: number;
  stockCountId?: number;
  adjustmentNumber?: string;
  transferNumber?: string;
  countNumber?: string;
  warehouseId: number;
  fromWarehouseId?: number;
  toWarehouseId?: number;
  adjustmentDate?: string;
  transferDate?: string;
  countDate?: string;
  reason?: string | null;
  remarks?: string | null;
  status: string;
}

export interface CreateStockTransferRequest {
  branchId: number;
  fromWarehouseId: number;
  toWarehouseId: number;
  transferDate: string;
  remarks?: string | null;
  items: { productId: number; unitId: number; quantity: number; rate: number }[];
}

export interface CreateStockCountRequest {
  branchId: number;
  warehouseId: number;
  countDate: string;
  remarks?: string | null;
  items: { productId: number; unitId: number; countedQuantity: number; rate: number }[];
}

export interface StockReconciliationRow {
  productId: number;
  productCode?: string | null;
  productName?: string | null;
  warehouseId: number;
  bookQuantity: number;
  ledgerQuantity: number;
  variance: number;
}

export interface StockValuationRow {
  productId: number;
  productCode?: string | null;
  productName?: string | null;
  warehouseId: number;
  quantity: number;
  unitCost: number;
  value: number;
}

export interface LowStockRow {
  productId: number;
  productCode?: string | null;
  productName?: string | null;
  warehouseId: number;
  availableQuantity: number;
  reorderLevel: number;
}

interface Paged<T> {
  items: T[];
  totalCount: number;
}

@Injectable({ providedIn: 'root' })
export class InventoryService {
  constructor(private readonly http: HttpClient) {}

  dashboard(): Promise<InventoryDashboardDto> {
    return firstValueFrom(this.http.get<InventoryDashboardDto>('/api/inventory/dashboard'));
  }

  postOpening(req: OpeningStockRequest): Promise<void> {
    return firstValueFrom(this.http.post<void>('/api/inventory/opening', req));
  }

  getAdjustments(page = 1, size = 25): Promise<Paged<StockDocumentDto>> {
    return firstValueFrom(this.http.get<Paged<StockDocumentDto>>(`/api/inventory/adjustments?page=${page}&size=${size}`));
  }

  createAdjustment(req: CreateStockAdjustmentRequest): Promise<StockDocumentDto> {
    return firstValueFrom(this.http.post<StockDocumentDto>('/api/inventory/adjustments', req));
  }

  postAdjustment(id: number): Promise<StockDocumentDto> {
    return firstValueFrom(this.http.post<StockDocumentDto>(`/api/inventory/adjustments/${id}/post`, {}));
  }

  getTransfers(page = 1, size = 25): Promise<Paged<StockDocumentDto>> {
    return firstValueFrom(this.http.get<Paged<StockDocumentDto>>(`/api/inventory/transfers?page=${page}&size=${size}`));
  }

  createTransfer(req: CreateStockTransferRequest): Promise<StockDocumentDto> {
    return firstValueFrom(this.http.post<StockDocumentDto>('/api/inventory/transfers', req));
  }

  postTransfer(id: number): Promise<StockDocumentDto> {
    return firstValueFrom(this.http.post<StockDocumentDto>(`/api/inventory/transfers/${id}/post`, {}));
  }

  getCounts(page = 1, size = 25): Promise<Paged<StockDocumentDto>> {
    return firstValueFrom(this.http.get<Paged<StockDocumentDto>>(`/api/inventory/counts?page=${page}&size=${size}`));
  }

  createCount(req: CreateStockCountRequest): Promise<StockDocumentDto> {
    return firstValueFrom(this.http.post<StockDocumentDto>('/api/inventory/counts', req));
  }

  postCount(id: number): Promise<StockDocumentDto> {
    return firstValueFrom(this.http.post<StockDocumentDto>(`/api/inventory/counts/${id}/post`, {}));
  }

  reconciliation(warehouseId?: number | null): Promise<Paged<StockReconciliationRow>> {
    let params = new HttpParams();
    if (warehouseId) params = params.set('warehouseId', warehouseId);
    return firstValueFrom(this.http.get<Paged<StockReconciliationRow>>('/api/inventory/reconciliation', { params }));
  }

  valuation(warehouseId?: number | null): Promise<{ rows: StockValuationRow[]; totalValue: number }> {
    let params = new HttpParams();
    if (warehouseId) params = params.set('warehouseId', warehouseId);
    return firstValueFrom(this.http.get<{ rows: StockValuationRow[]; totalValue: number }>('/api/inventory/valuation', { params }));
  }

  lowStock(warehouseId?: number | null): Promise<Paged<LowStockRow>> {
    let params = new HttpParams();
    if (warehouseId) params = params.set('warehouseId', warehouseId);
    return firstValueFrom(this.http.get<Paged<LowStockRow>>('/api/inventory/low-stock', { params }));
  }
}
