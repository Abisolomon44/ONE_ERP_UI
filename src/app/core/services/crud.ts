import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

// ============================================================
// Shared pagination shape — matches the backend response:
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
// Generic lookup CRUD module — flat, non-paginated GET lists.
// Reused for every simple reference table (Currency, IndustryType,
// BranchType, WarehouseType, EmploymentType, ...).
// ============================================================

export class LookupService<TDto, TCreate = Partial<TDto>, TUpdate = Partial<TDto>> {
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
// Generic paginated CRUD module — for entities with a filterable,
// paged listing endpoint (Branches, Departments, Employees, ...).
// ============================================================

export interface PagedFilter {
  companyId?: number | null;
  branchId?: number | null;
  page?: number;
  size?: number;
  search?: string;
}

export class PagedCrudService<TDto, TCreate = Partial<TDto>, TUpdate = Partial<TDto>> {
  constructor(
    private readonly http: HttpClient,
    private readonly baseUrl: string,
  ) {}

  getPaged(filter: PagedFilter = {}): Promise<PaginatedResult<TDto>> {
    let params = new HttpParams()
      .set('page', filter.page ?? 1)
      .set('size', filter.size ?? 10)
      .set('search', filter.search ?? '');

    if (filter.companyId != null) params = params.set('companyId', filter.companyId);
    if (filter.branchId != null) params = params.set('branchId', filter.branchId);

    return firstValueFrom(this.http.get<PaginatedResult<TDto>>(this.baseUrl, { params }));
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