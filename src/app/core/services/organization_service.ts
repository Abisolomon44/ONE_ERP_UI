import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { LookupService, PagedCrudService, PagedFilter } from './crud';

// Re-exported so existing imports of `OrgFilter` elsewhere don't break.
export type OrgFilter = PagedFilter;

// ============================================================
// DTOs — adjust field names to match your real ManagementDtos.cs
// ============================================================

export interface BranchDto {
  id: number;
  companyId: number;
  branchCode: string;
  branchName: string;
  branchTypeId?: number | null;
  city?: string | null;
  address?: string | null;
  managerName?: string | null;
  phone?: string | null;
  email?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string | null;
}
export type CreateBranchRequest = Omit<BranchDto, 'id' | 'isActive' | 'createdAt' | 'updatedAt'>;
export type UpdateBranchRequest = Omit<BranchDto, 'id' | 'companyId' | 'branchCode' | 'createdAt' | 'updatedAt'>;

export interface DepartmentDto {
  id: number;
  companyId: number;
  branchId?: number | null;
  departmentCode: string;
  departmentName: string;
  parentDepartmentId?: number | null;
  headEmployeeId?: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string | null;
}
export type CreateDepartmentRequest = Omit<DepartmentDto, 'id' | 'isActive' | 'createdAt' | 'updatedAt'>;
export type UpdateDepartmentRequest = Omit<DepartmentDto, 'id' | 'companyId' | 'departmentCode' | 'createdAt' | 'updatedAt'>;

export interface DesignationDto {
  id: number;
  companyId: number;
  designationCode: string;
  designationName: string;
  level?: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string | null;
}
export type CreateDesignationRequest = Omit<DesignationDto, 'id' | 'isActive' | 'createdAt' | 'updatedAt'>;
export type UpdateDesignationRequest = Omit<DesignationDto, 'id' | 'companyId' | 'designationCode' | 'createdAt' | 'updatedAt'>;

export interface EmployeeDto {
  id: number;
  companyId: number;
  branchId?: number | null;
  departmentId?: number | null;
  designationId?: number | null;
  employmentTypeId?: number | null;
  employeeCode: string;
  firstName: string;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  dateOfJoining?: string | null;
  reportingManagerId?: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string | null;
}
export type CreateEmployeeRequest = Omit<EmployeeDto, 'id' | 'isActive' | 'createdAt' | 'updatedAt'>;
export type UpdateEmployeeRequest = Omit<EmployeeDto, 'id' | 'companyId' | 'employeeCode' | 'createdAt' | 'updatedAt'>;

export interface WarehouseDto {
  id: number;
  companyId: number;
  branchId?: number | null;
  warehouseTypeId?: number | null;
  warehouseCode: string;
  warehouseName: string;
  address?: string | null;
  city?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string | null;
}
export type CreateWarehouseRequest = Omit<WarehouseDto, 'id' | 'isActive' | 'createdAt' | 'updatedAt'>;
export type UpdateWarehouseRequest = Omit<WarehouseDto, 'id' | 'companyId' | 'warehouseCode' | 'createdAt' | 'updatedAt'>;

// ---------- Reference tables ----------

export interface BranchTypeDto { id: number; name: string; isActive: boolean; }
export interface WarehouseTypeDto { id: number; name: string; isActive: boolean; }
export interface EmploymentTypeDto { id: number; name: string; isActive: boolean; }

// ============================================================
// Master service — single injection point for all
// Organization sub-resources.
//
// URL convention: /api/organization/{kebab-case-resource}
// ============================================================

@Injectable({ providedIn: 'root' })
export class OrganizationService {
  readonly branches: PagedCrudService<BranchDto, CreateBranchRequest, UpdateBranchRequest>;
  readonly departments: PagedCrudService<DepartmentDto, CreateDepartmentRequest, UpdateDepartmentRequest>;
  readonly designations: PagedCrudService<DesignationDto, CreateDesignationRequest, UpdateDesignationRequest>;
  readonly employees: PagedCrudService<EmployeeDto, CreateEmployeeRequest, UpdateEmployeeRequest>;
  readonly warehouses: PagedCrudService<WarehouseDto, CreateWarehouseRequest, UpdateWarehouseRequest>;

  readonly branchTypes: LookupService<BranchTypeDto>;
  readonly warehouseTypes: LookupService<WarehouseTypeDto>;
  readonly employmentTypes: LookupService<EmploymentTypeDto>;

  constructor(http: HttpClient) {
    this.branches = new PagedCrudService(http, '/api/organization/branches');
    this.departments = new PagedCrudService(http, '/api/organization/departments');
    this.designations = new PagedCrudService(http, '/api/organization/designations');
    this.employees = new PagedCrudService(http, '/api/organization/employees');
    this.warehouses = new PagedCrudService(http, '/api/organization/warehouses');

    this.branchTypes = new LookupService(http, '/api/organization/branch-types');
    this.warehouseTypes = new LookupService(http, '/api/organization/warehouse-types');
    this.employmentTypes = new LookupService(http, '/api/organization/employment-types');
  }
}