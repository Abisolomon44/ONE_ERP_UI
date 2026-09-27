import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface LookupItem {
  id: number;
  name: string;
  code?: string | null;
}

export interface SaleEntryCompany {
  id: number;
  name: string;
  code?: string | null;
}

export interface SaleEntryBranch {
  id: number;
  companyId: number;
  name: string;
  code?: string | null;
}

export interface SaleEntryStore {
  id: number;
  branchId: number;
  name: string;
  code?: string | null;
}

export interface SaleEntryCounter {
  id: number;
  code: string;
  name: string;
  assignment: string;
  storeId?: number;
  storeName?: string;
}

export interface SaleEntryOperator {
  id: number;
  code: string;
  name: string;
  type: string;
}

export interface SaleEntryPOSSession {
  id: number;
  sessionNumber: string;
  status: string;
  openingCash: number;
  openedAt: string;
  openedBy: string;
  statusText: string;
}

export interface SaleEntryContextResponse {
  isValid: boolean;
  message: string | null;

  companies: SaleEntryCompany[];
  branches: SaleEntryBranch[];
  stores: SaleEntryStore[];

  company: SaleEntryCompany | null;
  branch: SaleEntryBranch | null;
  store: SaleEntryStore | null;

  counter: SaleEntryCounter | null;
  operator: SaleEntryOperator | null;
  posSession: SaleEntryPOSSession | null;
}

export interface SaleEntryContextValidateRequest {
  companyId: number;
  branchId: number;
  storeId: number;
  counterId: number;
  operatorId: number;
  posSessionId: number;
}

export interface SaleEntryContextValidateResponse {
  isValid: boolean;
  code: string | null;
  message: string;
  contextToken: string | null;
}

@Injectable({ providedIn: 'root' })
export class SaleEntryContextService {
  private readonly baseUrl = `${environment.apiUrl}/api/sales`;

  constructor(private readonly http: HttpClient) {}

  async getContext(
    companyId?: number,
    branchId?: number,
    storeId?: number
  ): Promise<SaleEntryContextResponse> {
    let params = new HttpParams();
    if (companyId) params = params.set('companyId', companyId);
    if (branchId) params = params.set('branchId', branchId);
    if (storeId) params = params.set('storeId', storeId);

    return firstValueFrom(
      this.http.get<SaleEntryContextResponse>(`${this.baseUrl}/sale-entry-context`, { params })
    );
  }

  async validateContext(request: SaleEntryContextValidateRequest): Promise<SaleEntryContextValidateResponse> {
    return firstValueFrom(
      this.http.post<SaleEntryContextValidateResponse>(`${this.baseUrl}/sale-entry-context/validate`, request)
    );
  }
}