import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Currency, IndustryType, GstRegistrationType, Language, TimeZone } from '../models';

// ============================================================
// Shared pagination shape — matches the real backend response:
// { items, pageNumber, pageSize, totalCount, totalPages, hasNext, hasPrevious }
// No ApiResponse<T> envelope — endpoints return raw JSON directly.
// ============================================================

export interface PaginatedResult<T> {
  items: T[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

// ============================================================
// Generic lookup CRUD module — one concept, reused for every
// simple master-data entity (Currency, IndustryType, GST types,
// Language, TimeZone, ...future ones). Returns raw JSON.
// ============================================================

class LookupService<TDto, TCreate = Partial<TDto>, TUpdate = Partial<TDto>> {
  constructor(
    private readonly http: HttpClient,
    private readonly baseUrl: string,
    private readonly listUrl: string = baseUrl,
  ) {}

  getAll(includeInactive: boolean = true): Promise<TDto[]> {
    const params = new HttpParams().set('includeInactive', includeInactive);
    return firstValueFrom(this.http.get<TDto[]>(this.listUrl, { params }));
  }

  getById(id: number): Promise<TDto> {
    return firstValueFrom(this.http.get<TDto>(`${this.baseUrl}/${id}`));
  }

  create(request: TCreate): Promise<TDto> {
    return firstValueFrom(this.http.post<TDto>(this.baseUrl, request));
  }

  update(id: number, request: TUpdate): Promise<TDto> {
    return firstValueFrom(this.http.put<TDto>(`${this.baseUrl}/${id}`, request));
  }

  delete(id: number): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`${this.baseUrl}/${id}`)).then(() => undefined);
  }
}

// ============================================================
// Company — separate module: paginated list + /current endpoint.
// Returns raw JSON, same as everything else (no envelope).
// ============================================================

export interface CompanyDto {
  id: number;
  companyCode: string;
  companyName: string;
  shortName?: string | null;
  abbreviation?: string | null;
  businessTypeId: number;
  industryTypeId: number;
  gstRegistrationTypeId?: number | null;
  gstNumber?: string | null;
  panNumber?: string | null;
  tanNumber?: string | null;
  cinNumber?: string | null;
  registrationNumber?: string | null;
  currencyId: number;
  languageId: number;
  timeZoneId: number;
  isActive: boolean;
  isBlocked: boolean;
  createdAt: string;
  updatedAt?: string | null;
}

export type CreateCompanyRequest = Omit<CompanyDto, 'id' | 'isActive' | 'isBlocked' | 'createdAt' | 'updatedAt'>;
export type UpdateCompanyRequest = Omit<CompanyDto, 'id' | 'companyCode' | 'createdAt' | 'updatedAt'>;

class CompanyService {
  constructor(private readonly http: HttpClient) {}

  getPaged(page: number = 1, size: number = 10, search: string = ''): Promise<PaginatedResult<CompanyDto>> {
    const params = new HttpParams().set('page', page).set('size', size).set('search', search ?? '');
    return firstValueFrom(this.http.get<PaginatedResult<CompanyDto>>('/api/companies', { params }));
  }

  getCurrent(): Promise<CompanyDto> {
    return firstValueFrom(this.http.get<CompanyDto>('/api/companies/current'));
  }

  getById(id: number): Promise<CompanyDto> {
    return firstValueFrom(this.http.get<CompanyDto>(`/api/companies/${id}`));
  }

  create(request: CreateCompanyRequest): Promise<CompanyDto> {
    return firstValueFrom(this.http.post<CompanyDto>('/api/companies', request));
  }

  updateCurrent(request: UpdateCompanyRequest): Promise<CompanyDto> {
    return firstValueFrom(this.http.put<CompanyDto>('/api/companies/current', request));
  }

  update(id: number, request: UpdateCompanyRequest): Promise<CompanyDto> {
    return firstValueFrom(this.http.put<CompanyDto>(`/api/companies/${id}`, request));
  }

  delete(id: number): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`/api/companies/${id}`)).then(() => undefined);
  }
}

// ============================================================
// Per-entity request shapes
// ============================================================

export type CreateCurrencyRequest = Pick<Currency, 'currencyCode' | 'currencyName' | 'symbol' | 'isoCode' | 'decimalPlaces' | 'isBaseCurrency'>;
export type UpdateCurrencyRequest = CreateCurrencyRequest & { isActive: boolean };

export type CreateIndustryTypeRequest = Pick<IndustryType, 'name' | 'description' | 'sortOrder'>;
export type UpdateIndustryTypeRequest = CreateIndustryTypeRequest & { isActive: boolean };

export type CreateGstRegistrationTypeRequest = Pick<GstRegistrationType, 'name' | 'description'>;
export type UpdateGstRegistrationTypeRequest = CreateGstRegistrationTypeRequest & { isActive: boolean };

export type CreateLanguageRequest = Pick<Language, 'name' | 'code' | 'cultureCode' | 'isRTL' | 'isDefault' | 'sortOrder'>;
export type UpdateLanguageRequest = CreateLanguageRequest & { isActive: boolean };

export type CreateTimeZoneRequest = Pick<TimeZone, 'name' | 'timeZoneName' | 'utcOffset'>;
export type UpdateTimeZoneRequest = CreateTimeZoneRequest & { isActive: boolean };

// ============================================================
// Product / Billing masters
// ============================================================

export interface ProductCategoryDto {
  id: number;
  categoryCode: string;
  categoryName: string;
  description?: string | null;
  parentCategoryId?: number | null;
  sortOrder?: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string | null;
}
export type CreateProductCategoryRequest = Pick<ProductCategoryDto, 'categoryCode' | 'categoryName' | 'description' | 'parentCategoryId' | 'sortOrder'>;
export type UpdateProductCategoryRequest = CreateProductCategoryRequest & { isActive: boolean };

export interface ProductSubCategoryDto {
  id: number;
  categoryId: number;
  subCategoryCode: string;
  subCategoryName: string;
  description?: string | null;
  sortOrder?: number | null;
  categoryName?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string | null;
}
export type CreateProductSubCategoryRequest = Pick<ProductSubCategoryDto, 'categoryId' | 'subCategoryCode' | 'subCategoryName' | 'description' | 'sortOrder'>;
export type UpdateProductSubCategoryRequest = CreateProductSubCategoryRequest & { isActive: boolean };

export interface ProductBrandDto {
  id: number;
  brandCode: string;
  brandName: string;
  description?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string | null;
}
export type CreateProductBrandRequest = Pick<ProductBrandDto, 'brandCode' | 'brandName' | 'description'>;
export type UpdateProductBrandRequest = CreateProductBrandRequest & { isActive: boolean };

export interface ProductUnitDto {
  id: number;
  unitCode: string;
  unitName: string;
  symbol?: string | null;
  decimalPlaces: number;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string | null;
}
export type CreateProductUnitRequest = Pick<ProductUnitDto, 'unitCode' | 'unitName' | 'symbol' | 'decimalPlaces'>;
export type UpdateProductUnitRequest = CreateProductUnitRequest & { isActive: boolean };

class ProductCategoryService {
  constructor(private readonly http: HttpClient) {}
  getPaged(page = 1, size = 10, search = ''): Promise<PaginatedResult<ProductCategoryDto>> {
    const params = new HttpParams().set('page', page).set('size', size).set('search', search ?? '');
    return firstValueFrom(this.http.get<PaginatedResult<ProductCategoryDto>>('/api/product-categories', { params }));
  }
  getById(id: number): Promise<ProductCategoryDto> { return firstValueFrom(this.http.get<ProductCategoryDto>(`/api/product-categories/${id}`)); }
  create(req: CreateProductCategoryRequest): Promise<ProductCategoryDto> { return firstValueFrom(this.http.post<ProductCategoryDto>('/api/product-categories', req)); }
  update(id: number, req: UpdateProductCategoryRequest): Promise<ProductCategoryDto> { return firstValueFrom(this.http.put<ProductCategoryDto>(`/api/product-categories/${id}`, req)); }
  delete(id: number): Promise<void> { return firstValueFrom(this.http.delete<void>(`/api/product-categories/${id}`)).then(() => undefined); }
}

class ProductSubCategoryService {
  constructor(private readonly http: HttpClient) {}
  getPaged(page = 1, size = 10, search = ''): Promise<PaginatedResult<ProductSubCategoryDto>> {
    const params = new HttpParams().set('page', page).set('size', size).set('search', search ?? '');
    return firstValueFrom(this.http.get<PaginatedResult<ProductSubCategoryDto>>('/api/product-subcategories', { params }));
  }
  getById(id: number): Promise<ProductSubCategoryDto> { return firstValueFrom(this.http.get<ProductSubCategoryDto>(`/api/product-subcategories/${id}`)); }
  create(req: CreateProductSubCategoryRequest): Promise<ProductSubCategoryDto> { return firstValueFrom(this.http.post<ProductSubCategoryDto>('/api/product-subcategories', req)); }
  update(id: number, req: UpdateProductSubCategoryRequest): Promise<ProductSubCategoryDto> { return firstValueFrom(this.http.put<ProductSubCategoryDto>(`/api/product-subcategories/${id}`, req)); }
  delete(id: number): Promise<void> { return firstValueFrom(this.http.delete<void>(`/api/product-subcategories/${id}`)).then(() => undefined); }
}

class ProductBrandService {
  constructor(private readonly http: HttpClient) {}
  getPaged(page = 1, size = 10, search = ''): Promise<PaginatedResult<ProductBrandDto>> {
    const params = new HttpParams().set('page', page).set('size', size).set('search', search ?? '');
    return firstValueFrom(this.http.get<PaginatedResult<ProductBrandDto>>('/api/brands', { params }));
  }
  getById(id: number): Promise<ProductBrandDto> { return firstValueFrom(this.http.get<ProductBrandDto>(`/api/brands/${id}`)); }
  create(req: CreateProductBrandRequest): Promise<ProductBrandDto> { return firstValueFrom(this.http.post<ProductBrandDto>('/api/brands', req)); }
  update(id: number, req: UpdateProductBrandRequest): Promise<ProductBrandDto> { return firstValueFrom(this.http.put<ProductBrandDto>(`/api/brands/${id}`, req)); }
  delete(id: number): Promise<void> { return firstValueFrom(this.http.delete<void>(`/api/brands/${id}`)).then(() => undefined); }
}

class ProductUnitService {
  constructor(private readonly http: HttpClient) {}
  getPaged(page = 1, size = 10, search = ''): Promise<PaginatedResult<ProductUnitDto>> {
    const params = new HttpParams().set('page', page).set('size', size).set('search', search ?? '');
    return firstValueFrom(this.http.get<PaginatedResult<ProductUnitDto>>('/api/units', { params }));
  }
  getById(id: number): Promise<ProductUnitDto> { return firstValueFrom(this.http.get<ProductUnitDto>(`/api/units/${id}`)); }
  create(req: CreateProductUnitRequest): Promise<ProductUnitDto> { return firstValueFrom(this.http.post<ProductUnitDto>('/api/units', req)); }
  update(id: number, req: UpdateProductUnitRequest): Promise<ProductUnitDto> { return firstValueFrom(this.http.put<ProductUnitDto>(`/api/units/${id}`, req)); }
  delete(id: number): Promise<void> { return firstValueFrom(this.http.delete<void>(`/api/units/${id}`)).then(() => undefined); }
}

// ============================================================
// Products
// ============================================================

export interface ProductDto {
  id: number;
  companyId: number;
  branchId?: number | null;
  productCode: string;
  productName: string;
  categoryId?: number | null;
  subCategoryId?: number | null;
  brandId?: number | null;
  uomId: number;
  sku?: string | null;
  barcode?: string | null;
  mrp?: number | null;
  purchasePrice?: number | null;
  salesPrice?: number | null;
  taxId?: number | null;
  isStockItem: boolean;
  isSaleable: boolean;
  isPurchaseable: boolean;
  isActive: boolean;
  description?: string | null;
  categoryName?: string | null;
  subCategoryName?: string | null;
  brandName?: string | null;
  uomName?: string | null;
  branchName?: string | null;
  createdAt: string;
  updatedAt?: string | null;
}

export type CreateProductRequest = {
  productCode: string;
  productName: string;
  companyId: number;
  categoryId?: number | null;
  subCategoryId?: number | null;
  brandId?: number | null;
  uomId: number;
  branchId?: number | null;
  sku?: string | null;
  barcode?: string | null;
  mrp?: number | null;
  purchasePrice?: number | null;
  salesPrice?: number | null;
  taxId?: number | null;
  isStockItem?: boolean;
  isSaleable?: boolean;
  isPurchaseable?: boolean;
  description?: string | null;
};
export type UpdateProductRequest = CreateProductRequest & { isActive: boolean };

class ProductService {
  constructor(private readonly http: HttpClient) {}
  getPaged(page = 1, size = 10, search = ''): Promise<PaginatedResult<ProductDto>> {
    const params = new HttpParams().set('page', page).set('size', size).set('search', search ?? '');
    return firstValueFrom(this.http.get<PaginatedResult<ProductDto>>('/api/products', { params }));
  }
  getById(id: number): Promise<ProductDto> { return firstValueFrom(this.http.get<ProductDto>(`/api/products/${id}`)); }
  create(req: CreateProductRequest): Promise<ProductDto> { return firstValueFrom(this.http.post<ProductDto>('/api/products', req)); }
  update(id: number, req: UpdateProductRequest): Promise<ProductDto> { return firstValueFrom(this.http.put<ProductDto>(`/api/products/${id}`, req)); }
  delete(id: number): Promise<void> { return firstValueFrom(this.http.delete<void>(`/api/products/${id}`)).then(() => undefined); }
}

// ============================================================
// Tax Type Systems (System Master)
// ============================================================

export interface TaxTypeSystemDto {
  id: number;
  code: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  createdAt: string;
}

export type CreateTaxTypeSystemRequest = {
  code: string;
  name: string;
  description?: string | null;
};
export type UpdateTaxTypeSystemRequest = CreateTaxTypeSystemRequest & { isActive: boolean };

class TaxTypeSystemService {
  constructor(private readonly http: HttpClient) {}
  getPaged(page = 1, size = 10, search = ''): Promise<PaginatedResult<TaxTypeSystemDto>> {
    const params = new HttpParams().set('page', page).set('size', size).set('search', search ?? '');
    return firstValueFrom(this.http.get<PaginatedResult<TaxTypeSystemDto>>('/api/tax-type-systems', { params }));
  }
  getById(id: number): Promise<TaxTypeSystemDto> { return firstValueFrom(this.http.get<TaxTypeSystemDto>(`/api/tax-type-systems/${id}`)); }
  create(req: CreateTaxTypeSystemRequest): Promise<TaxTypeSystemDto> { return firstValueFrom(this.http.post<TaxTypeSystemDto>('/api/tax-type-systems', req)); }
  update(id: number, req: UpdateTaxTypeSystemRequest): Promise<TaxTypeSystemDto> { return firstValueFrom(this.http.put<TaxTypeSystemDto>(`/api/tax-type-systems/${id}`, req)); }
  delete(id: number): Promise<void> { return firstValueFrom(this.http.delete<void>(`/api/tax-type-systems/${id}`)).then(() => undefined); }
}

// ============================================================
// Taxes (actual tax rates)
// ============================================================

export interface TaxDto {
  id: number;
  companyId: number;
  branchId?: number | null;
  taxTypeSystemId: number;
  taxCode: string;
  taxName: string;
  taxRate: number;
  isInclusive: boolean;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  isActive: boolean;
  description?: string | null;
  taxTypeSystemName?: string | null;
  createdAt: string;
}

export type CreateTaxRequest = {
  branchId?: number | null;
  taxTypeSystemId: number;
  taxCode: string;
  taxName: string;
  taxRate: number;
  isInclusive: boolean;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  description?: string | null;
};
export type UpdateTaxRequest = CreateTaxRequest & { isActive: boolean };

class TaxService {
  constructor(private readonly http: HttpClient) {}
  getPaged(page = 1, size = 10, search = ''): Promise<PaginatedResult<TaxDto>> {
    const params = new HttpParams().set('page', page).set('size', size).set('search', search ?? '');
    return firstValueFrom(this.http.get<PaginatedResult<TaxDto>>('/api/taxes', { params }));
  }
  getById(id: number): Promise<TaxDto> { return firstValueFrom(this.http.get<TaxDto>(`/api/taxes/${id}`)); }
  create(req: CreateTaxRequest): Promise<TaxDto> { return firstValueFrom(this.http.post<TaxDto>('/api/taxes', req)); }
  update(id: number, req: UpdateTaxRequest): Promise<TaxDto> { return firstValueFrom(this.http.put<TaxDto>(`/api/taxes/${id}`, req)); }
  delete(id: number): Promise<void> { return firstValueFrom(this.http.delete<void>(`/api/taxes/${id}`)).then(() => undefined); }
}

// ============================================================
// Master service — single injection point for every
// Administration sub-resource.
// ============================================================

@Injectable({ providedIn: 'root' })
export class AdministrationService {
  readonly company: CompanyService;
  readonly currency: LookupService<Currency, CreateCurrencyRequest, UpdateCurrencyRequest>;
  readonly industryTypes: LookupService<IndustryType, CreateIndustryTypeRequest, UpdateIndustryTypeRequest>;
  readonly gstRegistrationTypes: LookupService<GstRegistrationType, CreateGstRegistrationTypeRequest, UpdateGstRegistrationTypeRequest>;
  readonly languages: LookupService<Language, CreateLanguageRequest, UpdateLanguageRequest>;
  readonly timeZones: LookupService<TimeZone, CreateTimeZoneRequest, UpdateTimeZoneRequest>;
  readonly productCategories: ProductCategoryService;
  readonly productSubCategories: ProductSubCategoryService;
  readonly productBrands: ProductBrandService;
  readonly productUnits: ProductUnitService;
  readonly products: ProductService;
  readonly taxTypeSystems: TaxTypeSystemService;
  readonly taxes: TaxService;

  constructor(http: HttpClient) {
    this.company = new CompanyService(http);
    this.currency = new LookupService(http, '/api/Administration/currency', '/api/Administration/currencies');
    this.industryTypes = new LookupService(http, '/api/industry-types');
    this.gstRegistrationTypes = new LookupService(http, '/api/gst-registration-types');
    this.languages = new LookupService(http, '/api/languages');
    this.timeZones = new LookupService(http, '/api/timezones');
    this.productCategories = new ProductCategoryService(http);
    this.productSubCategories = new ProductSubCategoryService(http);
    this.productBrands = new ProductBrandService(http);
    this.productUnits = new ProductUnitService(http);
    this.products = new ProductService(http);
    this.taxTypeSystems = new TaxTypeSystemService(http);
    this.taxes = new TaxService(http);
  }
}

// ============================================================
// Master Import — generic bulk import engine
// ============================================================

export interface ImportColumnMetaDto {
  key: string;
  label: string;
  isMandatory: boolean;
  isReference: boolean;
  referenceMaster?: string | null;
  dataType: string;
  example?: string | null;
}

export interface MasterImportMetaDto {
  name: string;
  label: string;
  description: string;
  columns: ImportColumnMetaDto[];
}

export interface ImportRowErrorField {
  field: string;
  message: string;
}

export interface ImportRowResultDto {
  rowNumber: number;
  valid: boolean;
  errors: ImportRowErrorField[];
  values: Record<string, string>;
}

export interface ImportPreviewResponse {
  fileName?: string | null;
  entityName: string;
  totalRows: number;
  validRowsCount: number;
  errorRowsCount: number;
  rows: ImportRowResultDto[];
}

export interface ImportConfirmResponse {
  importLogId: number;
  fileName?: string | null;
  entityName: string;
  totalRows: number;
  successCount: number;
  errorCount: number;
  message?: string | null;
}

export interface ImportConfirmRequest {
  entityName: string;
  fileName?: string | null;
  rows: string[][];
}

export interface ImportLogDto {
  id: number;
  importType: string;
  fileName?: string | null;
  entityName: string;
  status: string;
  totalRows: number;
  successRows: number;
  errorRows: number;
  errorMessage?: string | null;
  createdAt: string;
  createdByName?: string | null;
}

@Injectable({ providedIn: 'root' })
export class MasterImportService {
  constructor(private readonly http: HttpClient) {}

  getMasters(): Promise<MasterImportMetaDto[]> {
    return firstValueFrom(this.http.get<MasterImportMetaDto[]>('/api/import/masters'));
  }

  preview(entityName: string, fileName: string | null, rows: string[][]): Promise<ImportPreviewResponse> {
    return firstValueFrom(
      this.http.post<ImportPreviewResponse>('/api/import/preview', { entityName, fileName, rows }),
    );
  }

  confirm(request: ImportConfirmRequest): Promise<ImportConfirmResponse> {
    return firstValueFrom(this.http.post<ImportConfirmResponse>('/api/import/confirm', request));
  }
}

@Injectable({ providedIn: 'root' })
export class ImportLogService {
  constructor(private readonly http: HttpClient) {}

  getAll(): Promise<ImportLogDto[]> {
    return firstValueFrom(this.http.get<ImportLogDto[]>('/api/import-logs'));
  }
}

// ============================================================
// Tenant Configuration — Purchase/Sale/Billing screen settings
// ============================================================

export interface TenantConfigurationDto {
  id: number;
  tenantId: number;
  applicationType: string;
  transactionType?: string | null;
  flowType?: string | null;
  pageCode?: string | null;
  fieldCode?: string | null;
  sequenceNo?: number | null;
  isPageEnabled: boolean;
  isVisible: boolean;
  isRequired: boolean;
  isReadonly: boolean;
  displayOrder?: number | null;
  defaultValue?: string | null;
  isActive: boolean;
}

export type CreateTenantConfigurationRequest = Partial<TenantConfigurationDto> & {
  applicationType: string;
  isPageEnabled?: boolean;
  isVisible?: boolean;
  isRequired?: boolean;
  isReadonly?: boolean;
  isActive?: boolean;
};

export type UpdateTenantConfigurationRequest = {
  applicationType: string;
  transactionType?: string | null;
  flowType?: string | null;
  pageCode?: string | null;
  fieldCode?: string | null;
  sequenceNo?: number | null;
  isPageEnabled: boolean;
  isVisible: boolean;
  isRequired: boolean;
  isReadonly: boolean;
  displayOrder?: number | null;
  defaultValue?: string | null;
  isActive: boolean;
};

@Injectable({ providedIn: 'root' })
export class TenantConfigurationService {
  constructor(private readonly http: HttpClient) {}

  getAll(): Promise<TenantConfigurationDto[]> {
    return firstValueFrom(this.http.get<TenantConfigurationDto[]>('/api/tenant-configuration'));
  }

  getGrouped(): Promise<any[]> {
    return firstValueFrom(this.http.get<any[]>('/api/tenant-configuration/grouped'));
  }

  getById(id: number): Promise<TenantConfigurationDto> {
    return firstValueFrom(this.http.get<TenantConfigurationDto>(`/api/tenant-configuration/${id}`));
  }

  create(request: CreateTenantConfigurationRequest): Promise<TenantConfigurationDto> {
    return firstValueFrom(this.http.post<TenantConfigurationDto>('/api/tenant-configuration', request));
  }

  update(id: number, request: UpdateTenantConfigurationRequest): Promise<TenantConfigurationDto> {
    return firstValueFrom(this.http.put<TenantConfigurationDto>(`/api/tenant-configuration/${id}`, request));
  }

  delete(id: number): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`/api/tenant-configuration/${id}`)).then(() => undefined);
  }
}

// ============================================================
// Purchase Entry — transaction with header + item lines.
// ============================================================

export interface LookupItem {
  id: number;
  code?: string | null;
  name?: string | null;
}

export interface PurchaseLookupsDto {
  suppliers: LookupItem[];
  products: LookupItem[];
  units: LookupItem[];
  paymentTypes: LookupItem[];
  paymentMethods: LookupItem[];
  branches: LookupItem[];
  warehouses: LookupItem[];
  companies: LookupItem[];
  currentCompanyId: number;
}

export interface PurchaseItemDto {
  purchaseItemId: number;
  purchaseId: number;
  productId: number;
  productCodeSnapshot?: string | null;
  productNameSnapshot?: string | null;
  brandID?: number | null;
  categoryID?: number | null;
  subCategoryID?: number | null;
  unitID: number;
  unitNameSnapshot?: string | null;
  hsnID?: number | null;
  hsnCodeSnapshot?: string | null;
  quantity: number;
  freeQuantity: number;
  purchaseRate: number;
  mrp?: number | null;
  retailPrice?: number | null;
  wholesalePrice?: number | null;
  saleRate?: number | null;
  discountPercentage: number;
  discountAmount: number;
  isGSTInclusive: boolean;
  taxableValue: number;
  gstRate: number;
  gstAmount: number;
  cgstRate: number;
  cgstAmount: number;
  sgstRate: number;
  sgstAmount: number;
  igstRate: number;
  igstAmount: number;
  cessRate: number;
  cessAmount: number;
  lineTotal: number;
  manufacturingDate?: string | null;
  expiryDate?: string | null;
  remarks?: string | null;
}

export interface PurchaseDto {
  purchaseId: number;
  companyId: number;
  companyNameSnapshot?: string | null;
  branchId: number;
  warehouseId: number;
  supplierId: number;
  supplierNameSnapshot?: string | null;
  purchaseNumber: string;
  purchaseDate: string;
  supplierInvoiceNumber?: string | null;
  supplierInvoiceDate?: string | null;
  totalGrossAmount: number;
  totalDiscountAmount: number;
  totalTaxableAmount: number;
  totalTaxAmount: number;
  totalCessAmount: number;
  totalRoundOff: number;
  grandTotal: number;
  paidAmount: number;
  balanceAmount: number;
  paymentTypeID?: number | null;
  paymentMethodID?: number | null;
  statusID: number;
  remarks?: string | null;
  isActive: boolean;
  createdByUserID: number;
  createdAt: string;
  items: PurchaseItemDto[];
}

export interface CreatePurchaseItemInput {
  productId: number;
  unitID: number;
  quantity: number;
  freeQuantity?: number;
  purchaseRate: number;
  mrp?: number | null;
  retailPrice?: number | null;
  wholesalePrice?: number | null;
  saleRate?: number | null;
  discountPercentage?: number;
  isGSTInclusive?: boolean;
  gstRate?: number;
  cgstRate?: number;
  sgstRate?: number;
  igstRate?: number;
  cessRate?: number;
  brandID?: number | null;
  categoryID?: number | null;
  subCategoryID?: number | null;
  hsnID?: number | null;
  hsnCode?: string | null;
  manufacturingDate?: string | null;
  expiryDate?: string | null;
  remarks?: string | null;
}

export interface CreatePurchasePaymentInput {
  amount: number;
  paymentTypeID?: number | null;
  paymentMethodID?: number | null;
  referenceNo?: string | null;
  remarks?: string | null;
}

export interface CreatePurchaseRequest {
  branchId: number;
  warehouseId: number;
  supplierId: number;
  purchaseNumber: string;
  purchaseDate: string;
  supplierInvoiceNumber?: string | null;
  supplierInvoiceDate?: string | null;
  paymentTypeID?: number | null;
  paymentMethodID?: number | null;
  remarks?: string | null;
  items: CreatePurchaseItemInput[];
  payment?: CreatePurchasePaymentInput | null;
  companyId: number;
}

export interface UpdatePurchaseRequest {
  branchId: number;
  warehouseId: number;
  supplierId: number;
  purchaseNumber: string;
  purchaseDate: string;
  supplierInvoiceNumber?: string | null;
  supplierInvoiceDate?: string | null;
  paymentTypeID?: number | null;
  paymentMethodID?: number | null;
  remarks?: string | null;
  items: CreatePurchaseItemInput[];
  companyId: number;
}

@Injectable({ providedIn: 'root' })
export class PurchaseService {
  constructor(private readonly http: HttpClient) {}

  getPaged(page: number = 1, size: number = 10, search: string = ''): Promise<PaginatedResult<PurchaseDto>> {
    let params = new HttpParams().set('page', page).set('size', size);
    if (search) params = params.set('search', search);
    return firstValueFrom(this.http.get<PaginatedResult<PurchaseDto>>('/api/purchases', { params }));
  }

  getLookups(): Promise<PurchaseLookupsDto> {
    return firstValueFrom(this.http.get<PurchaseLookupsDto>('/api/purchases/lookups'));
  }

  getNextNumber(): Promise<string> {
    return firstValueFrom(this.http.get<string>('/api/purchases/next-number'));
  }

  getById(id: number): Promise<PurchaseDto> {
    return firstValueFrom(this.http.get<PurchaseDto>(`/api/purchases/${id}`));
  }

  getItems(id: number): Promise<PurchaseItemDto[]> {
    return firstValueFrom(this.http.get<PurchaseItemDto[]>(`/api/purchases/${id}/items`));
  }

  getPayments(id: number): Promise<PaymentAllocationDto[]> {
    return firstValueFrom(this.http.get<PaymentAllocationDto[]>(`/api/purchases/${id}/payments`));
  }

  getStock(id: number): Promise<StockTransactionDto[]> {
    return firstValueFrom(this.http.get<StockTransactionDto[]>(`/api/purchases/${id}/stock`));
  }

  create(request: CreatePurchaseRequest): Promise<PurchaseDto> {
    return firstValueFrom(this.http.post<PurchaseDto>('/api/purchases', request));
  }

  update(id: number, request: UpdatePurchaseRequest): Promise<PurchaseDto> {
    return firstValueFrom(this.http.put<PurchaseDto>(`/api/purchases/${id}`, request));
  }

  delete(id: number): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`/api/purchases/${id}`)).then(() => undefined);
  }
}

// ============================================================
// Stock + Stock Transactions
// ============================================================

export interface StockDto {
  stockId: number;
  companyId: number;
  branchId: number;
  warehouseId: number;
  productId: number;
  unitId: number;
  quantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  averageCost: number;
  lastPurchaseRate: number;
  updatedAt: string;
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
export class StockService {
  constructor(private readonly http: HttpClient) {}

  getPaged(page = 1, size = 10, search = '', warehouseId?: number | null, productId?: number | null): Promise<PaginatedResult<StockDto>> {
    let params = new HttpParams().set('page', page).set('size', size);
    if (search) params = params.set('search', search);
    if (warehouseId != null) params = params.set('warehouseId', warehouseId);
    if (productId != null) params = params.set('productId', productId);
    return firstValueFrom(this.http.get<PaginatedResult<StockDto>>('/api/stock', { params }));
  }

  getTransactions(page = 1, size = 20, productId?: number | null, warehouseId?: number | null): Promise<PaginatedResult<StockTransactionDto>> {
    let params = new HttpParams().set('page', page).set('size', size);
    if (productId != null) params = params.set('productId', productId);
    if (warehouseId != null) params = params.set('warehouseId', warehouseId);
    return firstValueFrom(this.http.get<PaginatedResult<StockTransactionDto>>('/api/stock/transactions', { params }));
  }
}

// ============================================================
// Purchase Return
// ============================================================

export interface PurchaseReturnItemDto {
  purchaseReturnItemId: number;
  purchaseReturnId: number;
  purchaseItemId: number;
  productId: number;
  productCodeSnapshot?: string | null;
  productNameSnapshot?: string | null;
  unitId: number;
  unitNameSnapshot?: string | null;
  returnQuantity: number;
  purchaseRate: number;
  discountAmount: number;
  taxableValue: number;
  gstRate: number;
  gstAmount: number;
  cgstRate: number;
  cgstAmount: number;
  sgstRate: number;
  sgstAmount: number;
  igstRate: number;
  igstAmount: number;
  cessRate: number;
  cessAmount: number;
  lineTotal: number;
}

export interface PurchaseReturnDto {
  purchaseReturnId: number;
  purchaseId: number;
  companyId: number;
  branchId: number;
  warehouseId: number;
  supplierId: number;
  supplierNameSnapshot?: string | null;
  returnNumber: string;
  returnDate: string;
  totalGrossAmount: number;
  totalDiscountAmount: number;
  totalTaxableAmount: number;
  totalTaxAmount: number;
  totalCessAmount: number;
  totalRoundOff: number;
  grandTotal: number;
  statusID: number;
  reason?: string | null;
  remarks?: string | null;
  items: PurchaseReturnItemDto[];
}

export interface CreatePurchaseReturnItemInput {
  purchaseItemId: number;
  productId: number;
  unitId: number;
  returnQuantity: number;
  purchaseRate: number;
  discountAmount?: number;
  taxableValue: number;
  gstRate?: number;
  gstAmount?: number;
  cgstRate?: number;
  cgstAmount?: number;
  sgstRate?: number;
  sgstAmount?: number;
  igstRate?: number;
  igstAmount?: number;
  cessRate?: number;
  cessAmount?: number;
}

export interface CreatePurchaseReturnRequest {
  purchaseId: number;
  returnDate: string;
  reason?: string | null;
  remarks?: string | null;
  items: CreatePurchaseReturnItemInput[];
}

@Injectable({ providedIn: 'root' })
export class PurchaseReturnService {
  constructor(private readonly http: HttpClient) {}

  getPaged(page = 1, size = 10, search = ''): Promise<PaginatedResult<PurchaseReturnDto>> {
    let params = new HttpParams().set('page', page).set('size', size);
    if (search) params = params.set('search', search);
    return firstValueFrom(this.http.get<PaginatedResult<PurchaseReturnDto>>('/api/purchase-returns', { params }));
  }

  getNextNumber(): Promise<string> {
    return firstValueFrom(this.http.get<string>('/api/purchase-returns/next-number'));
  }

  getById(id: number): Promise<PurchaseReturnDto> {
    return firstValueFrom(this.http.get<PurchaseReturnDto>(`/api/purchase-returns/${id}`));
  }

  create(request: CreatePurchaseReturnRequest): Promise<PurchaseReturnDto> {
    return firstValueFrom(this.http.post<PurchaseReturnDto>('/api/purchase-returns', request));
  }
}

export interface PaymentAllocationDto {
  paymentAllocationId: number;
  paymentId: number;
  referenceType: string;
  referenceId: number;
  allocatedAmount: number;
  createdAt: string;
}

// ============================================================
// Payment Types (global master)
// ============================================================

export interface PaymentTypeDto {
  paymentTypeId: number;
  code: string;
  name: string;
  isActive: boolean;
  displayOrder: number;
}

export interface CreatePaymentTypeRequest {
  code: string;
  name: string;
  displayOrder?: number;
  isActive?: boolean;
}

export interface UpdatePaymentTypeRequest {
  code: string;
  name: string;
  displayOrder: number;
  isActive: boolean;
}

@Injectable({ providedIn: 'root' })
export class PaymentTypeService {
  constructor(private readonly http: HttpClient) {}

  getAll(includeInactive: boolean = false): Promise<PaymentTypeDto[]> {
    let params = new HttpParams();
    if (includeInactive) params = params.set('includeInactive', 'true');
    return firstValueFrom(this.http.get<PaymentTypeDto[]>('/api/payment-types', { params }));
  }

  getById(id: number): Promise<PaymentTypeDto> {
    return firstValueFrom(this.http.get<PaymentTypeDto>(`/api/payment-types/${id}`));
  }

  create(request: CreatePaymentTypeRequest): Promise<PaymentTypeDto> {
    return firstValueFrom(this.http.post<PaymentTypeDto>('/api/payment-types', request));
  }

  update(id: number, request: UpdatePaymentTypeRequest): Promise<PaymentTypeDto> {
    return firstValueFrom(this.http.put<PaymentTypeDto>(`/api/payment-types/${id}`, request));
  }

  delete(id: number): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`/api/payment-types/${id}`)).then(() => undefined);
  }
}

// ============================================================
// Payment Methods (global master)
// ============================================================

export interface PaymentMethodDto {
  paymentMethodId: number;
  code: string;
  name: string;
  paymentCategory: string;
  isCash: boolean;
  isCredit: boolean;
  requiresReferenceNo: boolean;
  isActive: boolean;
  displayOrder: number;
}

export interface CreatePaymentMethodRequest {
  code: string;
  name: string;
  paymentCategory: string;
  isCash: boolean;
  isCredit: boolean;
  requiresReferenceNo: boolean;
  displayOrder?: number;
  isActive?: boolean;
}

export interface UpdatePaymentMethodRequest {
  code: string;
  name: string;
  paymentCategory: string;
  isCash: boolean;
  isCredit: boolean;
  requiresReferenceNo: boolean;
  displayOrder: number;
  isActive: boolean;
}

@Injectable({ providedIn: 'root' })
export class PaymentMethodService {
  constructor(private readonly http: HttpClient) {}

  getAll(includeInactive: boolean = false): Promise<PaymentMethodDto[]> {
    let params = new HttpParams();
    if (includeInactive) params = params.set('includeInactive', 'true');
    return firstValueFrom(this.http.get<PaymentMethodDto[]>('/api/payment-methods', { params }));
  }

  getById(id: number): Promise<PaymentMethodDto> {
    return firstValueFrom(this.http.get<PaymentMethodDto>(`/api/payment-methods/${id}`));
  }

  create(request: CreatePaymentMethodRequest): Promise<PaymentMethodDto> {
    return firstValueFrom(this.http.post<PaymentMethodDto>('/api/payment-methods', request));
  }

  update(id: number, request: UpdatePaymentMethodRequest): Promise<PaymentMethodDto> {
    return firstValueFrom(this.http.put<PaymentMethodDto>(`/api/payment-methods/${id}`, request));
  }

  delete(id: number): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`/api/payment-methods/${id}`)).then(() => undefined);
  }
}

// ============================================================
// Payments (common transaction)
// ============================================================

export interface PaymentLookupsDto {
  paymentTypes: LookupItem[];
  paymentMethods: LookupItem[];
  businessPartners: LookupItem[];
}

export interface PaymentDto {
  paymentId: number;
  companyId: number;
  paymentNo: string;
  paymentDate: string;
  paymentTypeID: number;
  paymentMethodID: number;
  referenceType: string;
  referenceId: number;
  businessPartnerId?: number | null;
  amount: number;
  referenceNo?: string | null;
  remarks?: string | null;
  statusID: number;
  createdByUserID: number;
  createdAt: string;
  updatedByUserID?: number | null;
  updatedAt?: string | null;
}

export interface CreatePaymentRequest {
  businessPartnerId?: number | null;
  paymentTypeID: number;
  paymentMethodID: number;
  referenceType: string;
  referenceId: number;
  amount: number;
  paymentDate: string;
  paymentNo: string;
  referenceNo?: string | null;
  remarks?: string | null;
}

export interface UpdatePaymentRequest {
  businessPartnerId?: number | null;
  paymentTypeID: number;
  paymentMethodID: number;
  referenceType: string;
  referenceId: number;
  amount: number;
  paymentDate: string;
  paymentNo: string;
  referenceNo?: string | null;
  remarks?: string | null;
  statusID: number;
}

@Injectable({ providedIn: 'root' })
export class PaymentService {
  constructor(private readonly http: HttpClient) {}

  getPaged(page: number = 1, size: number = 10, search: string = ''): Promise<PaginatedResult<PaymentDto>> {
    let params = new HttpParams().set('page', page).set('size', size);
    if (search) params = params.set('search', search);
    return firstValueFrom(this.http.get<PaginatedResult<PaymentDto>>('/api/payments', { params }));
  }

  getLookups(): Promise<PaymentLookupsDto> {
    return firstValueFrom(this.http.get<PaymentLookupsDto>('/api/payments/lookups'));
  }

  getNextNumber(): Promise<string> {
    return firstValueFrom(this.http.get<string>('/api/payments/next-number'));
  }

  getById(id: number): Promise<PaymentDto> {
    return firstValueFrom(this.http.get<PaymentDto>(`/api/payments/${id}`));
  }

  create(request: CreatePaymentRequest): Promise<PaymentDto> {
    return firstValueFrom(this.http.post<PaymentDto>('/api/payments', request));
  }

  update(id: number, request: UpdatePaymentRequest): Promise<PaymentDto> {
    return firstValueFrom(this.http.put<PaymentDto>(`/api/payments/${id}`, request));
  }

  delete(id: number): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`/api/payments/${id}`)).then(() => undefined);
  }
}