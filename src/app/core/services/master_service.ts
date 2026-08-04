import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom, Observable } from 'rxjs';
import { Currency, IndustryType, GstRegistrationType, Language, TimeZone } from '../models';

// ============================================================
// Shared API envelope (only Company uses this today)
// ============================================================

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  errors?: string[];
}

export interface PaginatedResult<T> {
  items: T[];
  page: number;
  size: number;
  totalCount: number;
  totalPages: number;
}

async function unwrap<T>(obs: Observable<ApiResponse<T>>): Promise<T> {
  const res = await firstValueFrom(obs);
  return res.data;
}

// ============================================================
// Generic lookup CRUD module — one concept, reused for every
// simple master-data entity (Currency, IndustryType, GST types,
// Language, TimeZone, ...future ones). Returns raw JSON, no envelope.
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
// Company — separate module: paginated list, /current endpoint,
// and every response wrapped in ApiResponse<T>.
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
    return unwrap(this.http.get<ApiResponse<PaginatedResult<CompanyDto>>>('/api/companies', { params }));
  }

  getCurrent(): Promise<CompanyDto> {
    return unwrap(this.http.get<ApiResponse<CompanyDto>>('/api/companies/current'));
  }

  getById(id: number): Promise<CompanyDto> {
    return unwrap(this.http.get<ApiResponse<CompanyDto>>(`/api/companies/${id}`));
  }

  create(request: CreateCompanyRequest): Promise<CompanyDto> {
    return unwrap(this.http.post<ApiResponse<CompanyDto>>('/api/companies', request));
  }

  updateCurrent(request: UpdateCompanyRequest): Promise<CompanyDto> {
    return unwrap(this.http.put<ApiResponse<CompanyDto>>('/api/companies/current', request));
  }

  update(id: number, request: UpdateCompanyRequest): Promise<CompanyDto> {
    return unwrap(this.http.put<ApiResponse<CompanyDto>>(`/api/companies/${id}`, request));
  }

  delete(id: number): Promise<void> {
    return firstValueFrom(this.http.delete<ApiResponse<null>>(`/api/companies/${id}`)).then(() => undefined);
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

  constructor(http: HttpClient) {
    this.company = new CompanyService(http);
    this.currency = new LookupService(http, '/api/Administration/currency', '/api/Administration/currencies');
    this.industryTypes = new LookupService(http, '/api/industry-types');
    this.gstRegistrationTypes = new LookupService(http, '/api/gst-registration-types');
    this.languages = new LookupService(http, '/api/languages');
    this.timeZones = new LookupService(http, '/api/timezones');
  }
}