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
  }
}