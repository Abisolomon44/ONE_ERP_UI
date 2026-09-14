import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

/* =====================================================================
   Invoice Template Design — UI API client.
   Mirrors ONEERP.ERP.API end-to-end (DTOs + repository surface) 1:1 so
   the pages can bind to the real endpoints once the backend
   Service/Controller/Program.cs registrations land. Follows the
   master_service.ts facade convention (Promise-returning methods that
   firstValueFrom() the raw JSON the API returns).
   ===================================================================== */

export interface LookupOption {
  id: number;
  code: string;
  name: string;
  description?: string | null;
  sortOrder: number;
  isActive: boolean;
}

export interface LookupOptionWithCategory extends LookupOption {
  categoryId?: number | null;
  categoryName?: string | null;
}

export interface InvoiceTemplateListItem {
  id: number; // satisfies MasterRow (== invoiceTemplateId)
  invoiceTemplateId: number;
  companyId: number | null;
  companyName?: string | null;
  templateCategoryId: number | null;
  categoryName?: string | null;
  invoiceTypeId: number;
  invoiceTypeName: string;
  paperSizeId: number;
  paperSizeName: string;
  orientationId: number;
  orientationName: string;
  code: string;
  name: string;
  description?: string | null;
  width?: number | null;
  height?: number | null;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  modifiedAt?: string | null;
  latestVersionNumber: number;
  latestStatus: string;
  hasPublishedVersion: boolean;
}

export interface CreateInvoiceTemplateRequest {
  companyId: number | null;
  templateCategoryId: number | null;
  invoiceTypeId: number;
  paperSizeId: number;
  orientationId: number;
  code: string;
  name: string;
  description?: string | null;
  width?: number | null;
  height?: number | null;
  isDefault?: boolean;
  isActive?: boolean;
}

export interface UpdateInvoiceTemplateRequest extends CreateInvoiceTemplateRequest {}

export interface InvoiceTemplateVersionListItem {
  templateVersionId: number;
  invoiceTemplateId: number;
  versionNumber: number;
  status: string;
  isPublished: boolean;
  createdBy: number;
  createdAt: string;
  publishedBy?: number | null;
  publishedAt?: string | null;
}

export interface DesignerStyleDto {
  fontId?: number | null;
  fontSize?: number | null;
  fontWeight?: string | null;
  textAlign?: string | null;
  verticalAlign?: string | null;
  paddingTop?: number | null;
  paddingRight?: number | null;
  paddingBottom?: number | null;
  paddingLeft?: number | null;
  borderTop?: boolean;
  borderRight?: boolean;
  borderBottom?: boolean;
  borderLeft?: boolean;
}

export interface DesignerFieldDto {
  fieldId: number;
  fieldName: string;
  label?: string | null;
  variableId?: number | null;
  bindingPath?: string | null;
  isVisible?: boolean;
  displayOrder?: number;
}

export interface DesignerItemColumnDto {
  itemColumnId: number;
  fieldName: string;
  headerText?: string | null;
  displayOrder?: number;
  width?: number | null;
  alignment?: string | null;
  isVisible?: boolean;
}

export interface DesignerElementDto {
  elementId: number;
  elementType: string; // 'static' | 'variable' | 'item-column' | 'style'
  elementName?: string | null;
  componentId?: number | null;
  x?: number | null;
  y?: number | null;
  width?: number | null;
  height?: number | null;
  displayOrder?: number;
  isVisible?: boolean;
  style?: DesignerStyleDto | null;
  fields?: DesignerFieldDto[];
  itemColumns?: DesignerItemColumnDto[];
}

export interface DesignerSectionDto {
  sectionId: number;
  sectionCode: string;
  sectionName: string;
  displayOrder?: number;
  x?: number | null;
  y?: number | null;
  width?: number | null;
  height?: number | null;
  isVisible?: boolean;
  elements: DesignerElementDto[];
}

export interface DesignerVersionDto {
  templateVersionId: number;
  invoiceTemplateId: number;
  versionNumber: number;
  status: string;
  isPublished: boolean;
  sections: DesignerSectionDto[];
}

export interface SaveDesignerVersionRequest {
  sections: DesignerSectionDto[];
}

export interface TemplatePrinterDto {
  templatePrinterId: number;
  invoiceTemplateId: number;
  paperSizeId: number;
  paperSizeName?: string;
  printerTypeId: number;
  printerTypeName?: string;
  printerModelId?: number | null;
  printerModelName?: string | null;
  printerName?: string | null;
  isDefault: boolean;
  isActive: boolean;
}

export interface SaveTemplatePrinterRequest {
  paperSizeId: number;
  printerTypeId: number;
  printerModelId?: number | null;
  printerName?: string | null;
  isDefault?: boolean;
  isActive?: boolean;
}

export interface TemplateAssignmentDto {
  assignmentId: number;
  invoiceTemplateId: number;
  companyId?: number | null;
  companyName?: string | null;
  industryTypeId?: number | null;
  industryTypeName?: string | null;
  invoiceTypeId?: number | null;
  invoiceTypeName?: string | null;
  paperSizeId?: number | null;
  paperSizeName?: string | null;
  isDefault?: boolean;
  isActive?: boolean;
}

export interface CreateTemplateAssignmentRequest {
  companyId?: number | null;
  industryTypeId?: number | null;
  invoiceTypeId?: number | null;
  paperSizeId?: number | null;
  isDefault?: boolean;
  isActive?: boolean;
}

export interface PaginatedResult<T> {
  items: T[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

// =====================================================================
// Facade
// =====================================================================

@Injectable({ providedIn: 'root' })
export class InvoiceTemplateService {
  private readonly http = inject(HttpClient);

  // ------------------------------------------------------------
  // Lookups
  // ------------------------------------------------------------
  invoiceTypes(includeInactive = false): Promise<LookupOption[]> {
    return this.get<LookupOption[]>('/api/invoice-template-lookups/invoice-types', { includeInactive });
  }

  paperSizes(includeInactive = false): Promise<LookupOption[]> {
    return this.get<LookupOption[]>('/api/invoice-template-lookups/paper-sizes', { includeInactive });
  }

  printerTypes(includeInactive = false): Promise<LookupOption[]> {
    return this.get<LookupOption[]>('/api/invoice-template-lookups/printer-types', { includeInactive });
  }

  printerModels(printerTypeId?: number, includeInactive = false): Promise<LookupOption[]> {
    return this.get<LookupOption[]>('/api/invoice-template-lookups/printer-models', {
      printerTypeId: printerTypeId ?? undefined,
      includeInactive,
    });
  }

  categories(includeInactive = false): Promise<LookupOption[]> {
    return this.get<LookupOption[]>('/api/invoice-template-lookups/categories', { includeInactive });
  }

  components(includeInactive = false): Promise<LookupOptionWithCategory[]> {
    return this.get<LookupOptionWithCategory[]>('/api/invoice-template-lookups/components', { includeInactive });
  }

  variables(includeInactive = false): Promise<LookupOptionWithCategory[]> {
    return this.get<LookupOptionWithCategory[]>('/api/invoice-template-lookups/variables', { includeInactive });
  }

  fonts(includeInactive = false): Promise<LookupOption[]> {
    return this.get<LookupOption[]>('/api/invoice-template-lookups/fonts', { includeInactive });
  }

  orientations(includeInactive = false): Promise<LookupOption[]> {
    return this.get<LookupOption[]>('/api/invoice-template-lookups/orientations', { includeInactive });
  }

  units(includeInactive = false): Promise<LookupOption[]> {
    return this.get<LookupOption[]>('/api/invoice-template-lookups/units', { includeInactive });
  }

  // ------------------------------------------------------------
  // Templates
  // ------------------------------------------------------------
  getPaged(page = 1, size = 50, search = ''): Promise<PaginatedResult<InvoiceTemplateListItem>> {
    return this.get<PaginatedResult<InvoiceTemplateListItem>>('/api/invoice-templates', { page, size, search });
  }

  getById(id: number): Promise<InvoiceTemplateListItem> {
    return this.get<InvoiceTemplateListItem>(`/api/invoice-templates/${id}`);
  }

  create(request: CreateInvoiceTemplateRequest): Promise<InvoiceTemplateListItem> {
    return this.post<InvoiceTemplateListItem>('/api/invoice-templates', request);
  }

  update(id: number, request: UpdateInvoiceTemplateRequest): Promise<InvoiceTemplateListItem> {
    return this.put<InvoiceTemplateListItem>(`/api/invoice-templates/${id}`, request);
  }

  remove(id: number): Promise<void> {
    return this.delete(`/api/invoice-templates/${id}`);
  }

  setDefault(id: number): Promise<void> {
    return this.post<void>(`/api/invoice-templates/${id}/set-default`, {});
  }

  // ------------------------------------------------------------
  // Versions
  // ------------------------------------------------------------
  versions(templateId: number): Promise<InvoiceTemplateVersionListItem[]> {
    return this.get<InvoiceTemplateVersionListItem[]>(`/api/invoice-templates/${templateId}/versions`);
  }

  createVersion(templateId: number): Promise<InvoiceTemplateVersionListItem> {
    return this.post<InvoiceTemplateVersionListItem>(`/api/invoice-templates/${templateId}/versions`, {});
  }

  getDesigner(versionId: number): Promise<DesignerVersionDto> {
    return this.get<DesignerVersionDto>(`/api/invoice-templates/versions/${versionId}/designer`);
  }

  saveDesigner(versionId: number, request: SaveDesignerVersionRequest): Promise<void> {
    return this.put<void>(`/api/invoice-templates/versions/${versionId}/designer`, request);
  }

  preview(versionId: number): Promise<string> {
    return this.post<string>(`/api/invoice-templates/versions/${versionId}/preview`, {});
  }

  publish(versionId: number): Promise<void> {
    return this.post<void>(`/api/invoice-templates/versions/${versionId}/publish`, {});
  }

  cloneToDraft(versionId: number): Promise<InvoiceTemplateVersionListItem> {
    return this.post<InvoiceTemplateVersionListItem>(`/api/invoice-templates/versions/${versionId}/clone`, {});
  }

  // ------------------------------------------------------------
  // Printers
  // ------------------------------------------------------------
  printers(templateId: number): Promise<TemplatePrinterDto[]> {
    return this.get<TemplatePrinterDto[]>(`/api/invoice-templates/${templateId}/printers`);
  }

  savePrinter(templateId: number, request: SaveTemplatePrinterRequest): Promise<TemplatePrinterDto> {
    return this.post<TemplatePrinterDto>(`/api/invoice-templates/${templateId}/printers`, request);
  }

  deletePrinter(templateId: number, printerId: number): Promise<void> {
    return this.delete(`/api/invoice-templates/${templateId}/printers/${printerId}`);
  }

  // ------------------------------------------------------------
  // Assignments
  // ------------------------------------------------------------
  assignments(templateId: number): Promise<TemplateAssignmentDto[]> {
    return this.get<TemplateAssignmentDto[]>(`/api/invoice-templates/${templateId}/assignments`);
  }

  createAssignment(templateId: number, request: CreateTemplateAssignmentRequest): Promise<TemplateAssignmentDto> {
    return this.post<TemplateAssignmentDto>(`/api/invoice-templates/${templateId}/assignments`, request);
  }

  deleteAssignment(templateId: number, assignmentId: number): Promise<void> {
    return this.delete(`/api/invoice-templates/${templateId}/assignments/${assignmentId}`);
  }

  // ------------------------------------------------------------
  // HTTP helpers — matches master_service.ts (raw JSON, no envelope)
  // ------------------------------------------------------------
  private async get<T>(url: string, params?: Record<string, unknown>): Promise<T> {
    let p = new HttpParams();
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== null && v !== '') p = p.set(k, String(v));
      }
    }
    return firstValueFrom(this.http.get<T>(url, { params: p }));
  }

  private async post<T>(url: string, body?: unknown): Promise<T> {
    return firstValueFrom(this.http.post<T>(url, body ?? {}));
  }

  private async put<T>(url: string, body: unknown): Promise<T> {
    return firstValueFrom(this.http.put<T>(url, body));
  }

  private async delete(url: string): Promise<void> {
    await firstValueFrom(this.http.delete(url));
  }
}
