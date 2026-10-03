import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';

// ============================================================
// Sales Reports API — server-side aggregation + paging.
// The backend resolves the company from the JWT; the client only
// sends filters/paging. Rows are generic dictionaries (camelCased
// by the API's DictionaryKeyPolicy) so every screen shares one grid.
// ============================================================

export interface SalesReportKpiDto {
  key: string;
  label: string;
  value?: number | null;
  display?: string | null;
}

export interface SalesReportChartDto {
  label: string;
  value: number;
}

export interface SalesReportResultDto {
  kpis: SalesReportKpiDto[];
  rows: Record<string, unknown>[];
  totalCount: number;
  page: number;
  size: number;
  trend: SalesReportChartDto[];
  customerRanking: SalesReportChartDto[];
  productRanking: SalesReportChartDto[];
  branchBreakdown: SalesReportChartDto[];
  warehouseBreakdown: SalesReportChartDto[];
  paymentStatus: SalesReportChartDto[];
  gstSummary: SalesReportChartDto[];
  sourceBreakdown: SalesReportChartDto[];
}

export interface SalesReportFilterDto {
  report: string;
  dateFrom?: string | null;
  dateTo?: string | null;
  branchId?: number | null;
  warehouseId?: number | null;
  customerId?: number | null;
  productId?: number | null;
  salesTypeId?: number | null;
  priceListId?: number | null;
  paymentTypeID?: number | null;
  paymentMethodID?: number | null;
  hsnId?: number | null;
  gstRate?: number | null;
  sourceType?: string | null;
  invoiceStatus?: string | null;
  invoiceNumber?: string | null;
  search?: string | null;
  groupBy?: string | null;
  sortBy?: string | null;
  sortDir?: string | null;
  page?: number;
  size?: number;
}

@Injectable({ providedIn: 'root' })
export class SalesReportService {
  constructor(private readonly http: HttpClient) {}

  run(filter: SalesReportFilterDto): Promise<SalesReportResultDto> {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(filter)) {
      if (value === undefined || value === null || value === '') continue;
      params = params.set(key, String(value));
    }
    return firstValueFrom(this.http.get<SalesReportResultDto>('/api/sales-reports', { params }));
  }
}
