import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { PagedCrudService, LookupService } from './crud';

// ============================================================
// Store Types — lookup master data
// ============================================================

export interface StoreTypeDto {
  id: number;
  code: string;
  name: string;
  description?: string | null;
  sortOrder: number;
  isActive: boolean;
}
export type CreateStoreTypeRequest = Omit<StoreTypeDto, 'id'>;
export type UpdateStoreTypeRequest = Partial<CreateStoreTypeRequest>;

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
  counterAssignmentId?: number | null;
  operatorId?: number | null;
  operatorNameSnapshot?: string | null;
  sessionNumber: string;
  openingCash: number;
  expectedClosingCash: number;
  actualClosingCash: number;
  cashDifference: number;
  openedAt: string;
  openedBy?: number | null;
  closedAt?: string | null;
  closedBy?: number | null;
  closingRemarks?: string | null;
  status: number;
  /** rowversion token, echoed back on update for optimistic concurrency. */
  version?: string | null;
  createdAt: string;
  updatedAt?: string | null;
}

/** Only these four values are chosen by the user; the rest is resolved server-side. */
export type CreatePOSSessionRequest = Pick<
  POSSessionDto,
  'storeId' | 'counterId' | 'operatorId' | 'openingCash'
>;

/** ExpectedClosingCash/CashDifference stay backend-owned. */
export type UpdatePOSSessionRequest = {
  actualClosingCash?: number | null;
  status: number;
  closingRemarks?: string | null;
  version?: string | null;
};

// ============================================================
// Operator DTOs — lives in OperatorsController (/api/operators).
// ============================================================

export interface OperatorDto {
  operatorId: number;
  id: number;
  companyId: number;
  branchId?: number | null;
  userId: number;
  userName?: string | null;
  operatorTypeId?: number | null;
  operatorTypeCode?: string | null;
  operatorTypeName?: string | null;
  operatorCode: string;
  operatorName: string;
  isActive: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt?: string | null;
}
export type CreateOperatorRequest = Omit<OperatorDto, 'operatorId' | 'id' | 'userName' | 'operatorTypeCode' | 'operatorTypeName' | 'isDeleted' | 'createdAt' | 'updatedAt'>;
export type UpdateOperatorRequest = Omit<OperatorDto, 'operatorId' | 'id' | 'companyId' | 'userId' | 'operatorCode' | 'operatorTypeId' | 'operatorTypeCode' | 'operatorTypeName' | 'isDeleted' | 'createdAt' | 'updatedAt'>;

// ============================================================
// Counter Assignment DTOs — lives in CounterAssignmentsController (/api/counter-assignments).
// ============================================================

export interface CounterOperatorAssignmentDto {
  assignmentId: number;
  id: number;
  companyId: number;
  branchId?: number | null;
  storeId: number;
  storeName?: string | null;
  counterId: number;
  counterCode?: string | null;
  counterName?: string | null;
  operatorId: number;
  operatorCode?: string | null;
  operatorName?: string | null;
  isPrimary: boolean;
  validFrom?: string | null;
  validTo?: string | null;
  isActive: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt?: string | null;
}
export type CreateCounterAssignmentRequest = Omit<CounterOperatorAssignmentDto, 'assignmentId' | 'id' | 'storeName' | 'counterCode' | 'counterName' | 'operatorCode' | 'operatorName' | 'isDeleted' | 'createdAt' | 'updatedAt'>;
export type UpdateCounterAssignmentRequest = Omit<CounterOperatorAssignmentDto, 'assignmentId' | 'id' | 'companyId' | 'storeId' | 'counterId' | 'operatorId' | 'storeName' | 'counterCode' | 'counterName' | 'operatorCode' | 'operatorName' | 'isDeleted' | 'createdAt' | 'updatedAt'>;

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
// User DTOs — lives in UsersController (/api/users).
// ============================================================

export interface UserDto {
  userId: number;
  companyId: number;
  username: string;
  fullName: string;
  email: string;
  mobile?: string | null;
  status: string;
  isSuperAdmin: boolean;
  lastLoginDate?: string | null;
  createdDate: string;
}
export type CreateUserRequest = Omit<UserDto, 'userId' | 'createdDate' | 'lastLoginDate'>;
export type UpdateUserRequest = Omit<UserDto, 'userId' | 'companyId' | 'createdDate' | 'lastLoginDate'>;

// ============================================================
// OperatorType DTOs — lives in OperatorTypesController (/api/operator-types).
// ============================================================

export interface OperatorTypeDto {
  id: number;
  code: string;
  name: string;
  description?: string | null;
  sortOrder: number;
  isActive: boolean;
}
export type CreateOperatorTypeRequest = Omit<OperatorTypeDto, 'id'>;
export type UpdateOperatorTypeRequest = Partial<CreateOperatorTypeRequest>;

// ============================================================
// Source DTOs — lives in SourcesController (/api/sources).
// ============================================================

export interface SourceDto {
  id: number;
  code: string;
  name: string;
  description?: string | null;
  sortOrder: number;
  isActive: boolean;
}
export type CreateSourceRequest = Omit<SourceDto, 'id'>;
export type UpdateSourceRequest = Partial<CreateSourceRequest>;

// ============================================================
// PosService — single injection point for POS sub-resources.
// ============================================================

@Injectable({ providedIn: 'root' })
export class PosService {
  readonly stores: PagedCrudService<StoreDto, CreateStoreRequest, UpdateStoreRequest>;
  readonly counters: PagedCrudService<CounterDto, CreateCounterRequest, UpdateCounterRequest>;
  readonly posSessions: PagedCrudService<POSSessionDto, CreatePOSSessionRequest, UpdatePOSSessionRequest>;
  readonly financialYears: PagedCrudService<FinancialYearDto, CreateFinancialYearRequest, UpdateFinancialYearRequest>;
  readonly operators: PagedCrudService<OperatorDto, CreateOperatorRequest, UpdateOperatorRequest>;
  readonly counterAssignments: PagedCrudService<CounterOperatorAssignmentDto, CreateCounterAssignmentRequest, UpdateCounterAssignmentRequest>;
  readonly storeTypes: PagedCrudService<StoreTypeDto, CreateStoreTypeRequest, UpdateStoreTypeRequest>;
  readonly operatorTypes: PagedCrudService<OperatorTypeDto, CreateOperatorTypeRequest, UpdateOperatorTypeRequest>;
  readonly sources: PagedCrudService<SourceDto, CreateSourceRequest, UpdateSourceRequest>;
  readonly users: PagedCrudService<UserDto, CreateUserRequest, UpdateUserRequest>;

  constructor(private readonly http: HttpClient) {
    this.stores = new PagedCrudService(http, '/api/stores');
    this.counters = new PagedCrudService(http, '/api/counters');
    this.posSessions = new PagedCrudService(http, '/api/pos-sessions');
    this.financialYears = new PagedCrudService(http, '/api/financial-years');
    this.operators = new PagedCrudService(http, '/api/operators');
    this.counterAssignments = new PagedCrudService(http, '/api/counter-assignments');
    this.storeTypes = new PagedCrudService(http, '/api/store-types');
    this.operatorTypes = new PagedCrudService(http, '/api/operator-types');
    this.sources = new PagedCrudService(http, '/api/sources');
    this.users = new PagedCrudService(http, '/api/users');
  }

  /**
   * Operators currently assigned to a counter, primary assignment first.
   * Backs the Store > Counter > Counter Assignment > Operator cascade.
   */
  operatorsByCounter(counterId: number): Promise<CounterOperatorAssignmentDto[]> {
    return firstValueFrom(
      this.http.get<CounterOperatorAssignmentDto[]>(`/api/counter-assignments/by-counter/${counterId}`),
    );
  }
}