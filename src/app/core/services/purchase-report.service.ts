import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';

// ============================================================
// Purchase Reports API — server-side aggregation + paging.
// The backend resolves the company from the JWT; the client only
// sends filters/paging. Rows are generic dictionaries (camelCased
// by the API's DictionaryKeyPolicy) so every screen shares one grid.
// ============================================================

export interface PurchaseReportKpiDto {
  key: string;
  label: string;
  value?: number | null;
  display?: string | null;
}

export interface PurchaseReportChartDto {
  label: string;
  value: number;
}

export interface PurchaseReportResultDto {
  kpis: PurchaseReportKpiDto[];
  rows: Record<string, unknown>[];
  totalCount: number;
  page: number;
  size: number;
  trend: PurchaseReportChartDto[];
  supplierRanking: PurchaseReportChartDto[];
  productRanking: PurchaseReportChartDto[];
  categoryBreakdown: PurchaseReportChartDto[];
  branchBreakdown: PurchaseReportChartDto[];
  warehouseBreakdown: PurchaseReportChartDto[];
  paymentStatus: PurchaseReportChartDto[];
  gstSummary: PurchaseReportChartDto[];
  returnsBreakdown: PurchaseReportChartDto[];
}

export interface PurchaseReportFilterDto {
  report: string;
  dateFrom?: string | null;
  dateTo?: string | null;
  branchId?: number | null;
  warehouseId?: number | null;
  supplierId?: number | null;
  productId?: number | null;
  categoryId?: number | null;
  subCategoryId?: number | null;
  brandId?: number | null;
  unitId?: number | null;
  hsnId?: number | null;
  taxId?: number | null;
  gstRate?: number | null;
  paymentTypeID?: number | null;
  paymentMethodID?: number | null;
  statusId?: number | null;
  accountingYearId?: number | null;
  purchaseTypeId?: number | null;
  purchaseNumber?: string | null;
  supplierInvoiceNumber?: string | null;
  referenceNumber?: string | null;
  returnNumber?: string | null;
  search?: string | null;
  groupBy?: string | null;
  mode?: string | null;
  page?: number;
  size?: number;
}

@Injectable({ providedIn: 'root' })
export class PurchaseReportService {
  constructor(private readonly http: HttpClient) {}

  run(filter: PurchaseReportFilterDto): Promise<PurchaseReportResultDto> {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(filter)) {
      if (value === undefined || value === null || value === '') continue;
      params = params.set(key, String(value));
    }
    return firstValueFrom(this.http.get<PurchaseReportResultDto>('/api/purchase-reports', { params }));
  }
}