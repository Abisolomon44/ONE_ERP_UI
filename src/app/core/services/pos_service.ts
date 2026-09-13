import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { PagedCrudService, LookupService } from './crud';

// ============================================================
// POS/Retail master DTOs — Stores, Counters, POS Sessions.
// Backend lives in StoresController / CountersController /
// POSSessionsController (/api/stores, /api/counters,
// /api/pos-sessions).
// ============================================================

export interface StoreDto {
  storeId: number;
  id: number;
  entityId?: number | null;
  companyId: number;
  branchId?: number | null;
  storeCode: string;
  storeName: string;
  storeType?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string | null;
}
export type CreateStoreRequest = Omit<StoreDto, 'storeId' | 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateStoreRequest = Omit<StoreDto, 'storeId' | 'id' | 'companyId' | 'storeCode' | 'createdAt' | 'updatedAt'>;

export interface CounterDto {
  counterId: number;
  id: number;
  storeId: number;
  counterCode: string;
  counterName: string;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string | null;
}
export type CreateCounterRequest = Omit<CounterDto, 'counterId' | 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateCounterRequest = Omit<CounterDto, 'counterId' | 'id' | 'storeId' | 'counterCode' | 'createdAt' | 'updatedAt'>;

export interface POSSessionDto {
  posSessionId: number;
  id: number;
  companyId: number;
  companyName?: string | null;
  branchId?: number | null;
  branchName?: string | null;
  storeId?: number | null;
  storeName?: string | null;
  counterId?: number | null;
  counterName?: string | null;
  cashierUserId?: number | null;
  cashierUserName?: string | null;
  sessionNumber: string;
  openingCash: number;
  closingCash?: number | null;
  openedAt: string;
  closedAt?: string | null;
  status: number;
  createdAt: string;
  updatedAt?: string | null;
}
export type CreatePOSSessionRequest = Omit<POSSessionDto, 'posSessionId' | 'id' | 'status' | 'openedAt' | 'closedAt' | 'sessionNumber' | 'createdAt' | 'updatedAt'>;
export type UpdatePOSSessionRequest = { closingCash?: number | null; status: number };

// ============================================================
// FinancialYear DTOs — lives in FinancialYearsController (/api/financial-years).
// ============================================================

export interface FinancialYearDto {
  financialYearId: number;
  id: number;
  companyId: number;
  code: string;
  name: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  isClosed: boolean;
  isActive: boolean;
  createdAt: string;
  modifiedAt?: string | null;
}
export type CreateFinancialYearRequest = Omit<FinancialYearDto, 'financialYearId' | 'id' | 'createdAt' | 'modifiedAt'>;
export type UpdateFinancialYearRequest = Omit<FinancialYearDto, 'financialYearId' | 'id' | 'companyId' | 'createdAt' | 'modifiedAt'>;

// ============================================================
// PosService — single injection point for POS sub-resources.
// ============================================================

@Injectable({ providedIn: 'root' })
export class PosService {
  readonly stores: PagedCrudService<StoreDto, CreateStoreRequest, UpdateStoreRequest>;
  readonly counters: PagedCrudService<CounterDto, CreateCounterRequest, UpdateCounterRequest>;
  readonly posSessions: PagedCrudService<POSSessionDto, CreatePOSSessionRequest, UpdatePOSSessionRequest>;
  readonly financialYears: PagedCrudService<FinancialYearDto, CreateFinancialYearRequest, UpdateFinancialYearRequest>;

  constructor(http: HttpClient) {
    this.stores = new PagedCrudService(http, '/api/stores');
    this.counters = new PagedCrudService(http, '/api/counters');
    this.posSessions = new PagedCrudService(http, '/api/pos-sessions');
    this.financialYears = new PagedCrudService(http, '/api/financial-years');
  }
}