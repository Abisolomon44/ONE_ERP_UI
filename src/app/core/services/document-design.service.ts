import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

/* =====================================================================
   Document Design module — UI API client.

   Mirrors the /api/document/* + /api/document-lookups/* +
   /api/document-templates/* + /api/document-settings/* endpoints 1:1.
   Returns Promises following the master_service.ts facade convention.
   The Document controllers wrap payloads in ApiResponse<T> envelopes,
   so every helper unwraps `.data` transparently.
   ===================================================================== */

export interface DocumentLookupOption {
  id: number;
  code: string;
  name: string;
  description?: string | null;
  sortOrder?: number;
  category?: string | null;
  componentType?: string | null;
  bindingPath?: string | null;
  dataType?: string | null;
  isCollection?: boolean;
  fontId?: number | null;
  fontName?: string | null;
  fontFamily?: string | null;
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
  width?: number | null;
  height?: number | null;
  unit?: string | null;
  isActive: boolean;
}

export interface DocumentMasterRow {
  id: number;
  code: string;
  name: string;
  description?: string | null;
  displayOrder: number;
  componentType?: string | null;
  bindingPath?: string | null;
  dataType?: string | null;
  category?: string | null;
  isCollection: boolean;
  fontFamily?: string | null;
  fontFileId?: number | null;
  width?: number | null;
  height?: number | null;
  unit?: string | null;
  isThermal: boolean;
  isCustom: boolean;
  printerTypeId?: number | null;
  printerTypeName?: string | null;
  manufacturer?: string | null;
  isActive: boolean;
  createdAt?: string | null;
  modifiedAt?: string | null;
}

export interface SaveDocumentMasterRequest {
  code: string;
  name: string;
  description?: string | null;
  displayOrder: number;
  componentType?: string | null;
  bindingPath?: string | null;
  dataType?: string | null;
  category?: string | null;
  isCollection: boolean;
  fontFamily?: string | null;
  fontFileId?: number | null;
  width?: number | null;
  height?: number | null;
  unit?: string | null;
  isThermal: boolean;
  isCustom: boolean;
  printerTypeId?: number | null;
  manufacturer?: string | null;
  isActive: boolean;
}

export type DocumentMasterKind =
  | 'types' | 'categories' | 'components' | 'variables' | 'fonts'
  | 'paper-sizes' | 'printer-types' | 'printer-models' | 'orientations' | 'units';

export interface DocumentTemplateListItem {
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

export interface SaveDocumentTemplateRequest {
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
  isDefault: boolean;
  isActive: boolean;
}

export interface DocumentTemplateVersionListItem {
  templateVersionId: number;
  invoiceTemplateId: number;
  versionNumber: number;
  status: string;
  isPublished: boolean;
  templateJson?: string | null;
  createdAt: string;
  createdBy?: number | null;
  publishedBy?: number | null;
  publishedAt?: string | null;
}

export interface DesignerStyleDto {
  fontId?: number | null;
  fontSize?: number | null;
  fontWeight?: string | null;
  fontStyle?: string | null;
  textAlign?: string | null;
  verticalAlign?: string | null;
  textColor?: string | null;
  backgroundColor?: string | null;
  borderColor?: string | null;
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
  templateFieldId?: number | null;
  variableId: number;
  fieldName: string;
  bindingPath: string;
  label?: string | null;
  isVisible: boolean;
  displayOrder?: number;
}

export interface DesignerItemColumnDto {
  itemColumnId?: number | null;
  fieldName: string;
  headerText: string;
  displayOrder: number;
  width?: number | null;
  alignment: string;
  isVisible: boolean;
}

export interface DesignerElementDto {
  elementId?: number | null;
  componentId: number;
  componentCode?: string | null;
  elementType: string; // 'static' | 'variable' | 'item-column' | 'style'
  elementName?: string | null;
  x?: number | null;
  y?: number | null;
  width?: number | null;
  height?: number | null;
  displayOrder: number;
  isVisible: boolean;
  style?: DesignerStyleDto | null;
  fields: DesignerFieldDto[];
  itemColumns: DesignerItemColumnDto[];
}

export interface DesignerSectionDto {
  sectionId?: number | null;
  sectionCode: string;
  sectionName: string;
  displayOrder: number;
  x?: number | null;
  y?: number | null;
  width?: number | null;
  height?: number | null;
  isVisible: boolean;
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

export interface TemplatePrinterDto {
  templatePrinterId?: number | null;
  invoiceTemplateId: number;
  paperSizeId: number;
  paperSizeName?: string | null;
  printerTypeId: number;
  printerTypeName?: string | null;
  printerModelId?: number | null;
  printerModelName?: string | null;
  printerName?: string | null;
  isDefault: boolean;
  isActive: boolean;
}

export interface InvoiceTemplatePrintSettingDto {
  printSettingId?: number | null;
  templatePrinterId?: number | null;
  marginTop: number;
  marginRight: number;
  marginBottom: number;
  marginLeft: number;
  scale: number;
  copies: number;
  autoFit: boolean;
  cutPaper: boolean;
  printHeader: boolean;
  printFooter: boolean;
}

export interface SaveTemplatePrinterRequest {
  invoiceTemplateId?: number;
  paperSizeId: number;
  printerTypeId: number;
  printerModelId?: number | null;
  printerName?: string | null;
  isDefault?: boolean;
  isActive?: boolean;
  printSetting?: InvoiceTemplatePrintSettingDto | null;
}

export interface TemplateAssignmentDto {
  assignmentId: number;
  invoiceTemplateId: number;
  templateCode?: string | null;
  templateName?: string | null;
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
  invoiceTemplateId?: number;
  companyId?: number | null;
  industryTypeId?: number | null;
  invoiceTypeId?: number | null;
  paperSizeId?: number | null;
  isDefault: boolean;
  isActive: boolean;
}

export interface ResolvedDocumentTemplateDto {
  invoiceTemplateId: number;
  templateCode: string;
  templateName: string;
  templateVersionId: number;
  versionNumber: number;
  invoiceTypeId: number;
  paperSizeId: number;
  paperSizeName?: string | null;
  width?: number | null;
  height?: number | null;
  design: DesignerVersionDto | null;
}

export interface Paginated<T> {
  items: T[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

/* ===================================================================== */

@Injectable({ providedIn: 'root' })
export class DocumentDesignService {
  private readonly http = inject(HttpClient);

  /* ------------------------------------------------------------------ */
  /* Document masters (10 kinds)                                        */
  /* ------------------------------------------------------------------ */

  master(kind: DocumentMasterKind, includeInactive = false): Promise<DocumentMasterRow[]> {
    return this.get<DocumentMasterRow[]>(`/api/document/master/${kind}`, { includeInactive });
  }

  masterById(kind: DocumentMasterKind, id: number): Promise<DocumentMasterRow> {
    return this.get<DocumentMasterRow>(`/api/document/master/${kind}/${id}`);
  }

  createMaster(kind: DocumentMasterKind, request: SaveDocumentMasterRequest): Promise<DocumentMasterRow> {
    return this.post<DocumentMasterRow>(`/api/document/master/${kind}`, request);
  }

  updateMaster(kind: DocumentMasterKind, id: number, request: SaveDocumentMasterRequest): Promise<DocumentMasterRow> {
    return this.put<DocumentMasterRow>(`/api/document/master/${kind}/${id}`, request);
  }

  deleteMaster(kind: DocumentMasterKind, id: number): Promise<void> {
    return this.delete(`/api/document/master/${kind}/${id}`);
  }

  /* ------------------------------------------------------------------ */
  /* Lookups (/api/document-lookups)                                    */
  /* ------------------------------------------------------------------ */

  invoiceTypes(includeInactive = false): Promise<DocumentLookupOption[]> {
    return this.get<DocumentLookupOption[]>('/api/document-lookups/invoice-types', { includeInactive });
  }

  paperSizes(includeInactive = false): Promise<DocumentLookupOption[]> {
    return this.get<DocumentLookupOption[]>('/api/document-lookups/paper-sizes', { includeInactive });
  }

  printerTypes(includeInactive = false): Promise<DocumentLookupOption[]> {
    return this.get<DocumentLookupOption[]>('/api/document-lookups/printer-types', { includeInactive });
  }

  printerModels(printerTypeId?: number, includeInactive = false): Promise<DocumentLookupOption[]> {
    return this.get<DocumentLookupOption[]>('/api/document-lookups/printer-models', {
      printerTypeId: printerTypeId ?? undefined,
      includeInactive,
    });
  }

  categories(includeInactive = false): Promise<DocumentLookupOption[]> {
    return this.get<DocumentLookupOption[]>('/api/document-lookups/categories', { includeInactive });
  }

  components(includeInactive = false): Promise<DocumentLookupOption[]> {
    return this.get<DocumentLookupOption[]>('/api/document-lookups/components', { includeInactive });
  }

  variables(includeInactive = false): Promise<DocumentLookupOption[]> {
    return this.get<DocumentLookupOption[]>('/api/document-lookups/variables', { includeInactive });
  }

  fonts(includeInactive = false): Promise<DocumentLookupOption[]> {
    return this.get<DocumentLookupOption[]>('/api/document-lookups/fonts', { includeInactive });
  }

  orientations(includeInactive = false): Promise<DocumentLookupOption[]> {
    return this.get<DocumentLookupOption[]>('/api/document-lookups/orientations', { includeInactive });
  }

  units(includeInactive = false): Promise<DocumentLookupOption[]> {
    return this.get<DocumentLookupOption[]>('/api/document-lookups/units', { includeInactive });
  }

  companies(): Promise<{ id: number; name: string }[]> {
    return this.get<{ id: number; name: string }[]>('/api/companies');
  }

  /* ------------------------------------------------------------------ */
  /* Templates                                                          */
  /* ------------------------------------------------------------------ */

  templates(page = 1, size = 50, search = ''): Promise<Paginated<DocumentTemplateListItem>> {
    return this.get<Paginated<DocumentTemplateListItem>>('/api/document-templates', { page, size, search });
  }

  /** Exact-code lookup (sees inactive/global rows; 404 when missing). */
  templateByCode(code: string): Promise<DocumentTemplateListItem> {
    return this.get<DocumentTemplateListItem>(`/api/document-templates/by-code/${encodeURIComponent(code)}`);
  }

  template(id: number): Promise<DocumentTemplateListItem> {
    return this.get<DocumentTemplateListItem>(`/api/document-templates/${id}`);
  }

  createTemplate(request: SaveDocumentTemplateRequest): Promise<DocumentTemplateListItem> {
    return this.post<DocumentTemplateListItem>('/api/document-templates', request);
  }

  updateTemplate(id: number, request: SaveDocumentTemplateRequest): Promise<DocumentTemplateListItem> {
    return this.put<DocumentTemplateListItem>(`/api/document-templates/${id}`, request);
  }

  deleteTemplate(id: number): Promise<void> {
    return this.delete(`/api/document-templates/${id}`);
  }

  setDefault(id: number): Promise<void> {
    return this.post<void>(`/api/document-templates/${id}/set-default`, {});
  }

  /* ------------------------------------------------------------------ */
  /* Versions                                                           */
  /* ------------------------------------------------------------------ */

  versions(templateId: number): Promise<DocumentTemplateVersionListItem[]> {
    return this.get<DocumentTemplateVersionListItem[]>(`/api/document-templates/${templateId}/versions`);
  }

  createVersion(templateId: number): Promise<DocumentTemplateVersionListItem> {
    return this.post<DocumentTemplateVersionListItem>(`/api/document-templates/${templateId}/versions`, {});
  }

  /* ------------------------------------------------------------------ */
  /* Designer                                                           */
  /* ------------------------------------------------------------------ */

  designer(versionId: number): Promise<DesignerVersionDto> {
    return this.get<DesignerVersionDto>(`/api/document-templates/versions/${versionId}/designer`);
  }

  saveDesigner(versionId: number, sections: DesignerSectionDto[]): Promise<void> {
    return this.put<void>(`/api/document-templates/versions/${versionId}/designer`, { sections });
  }

  /** GET preview. Pass salesInvoiceId to render real invoice data. */
  preview(versionId: number, salesInvoiceId?: number, transaction?: { purchaseId?: number; purchaseReturnId?: number; debitNote?: boolean }): Promise<string> {
    return this.get<string>(`/api/document-templates/versions/${versionId}/preview`, {
      salesInvoiceId: salesInvoiceId ?? undefined,
      purchaseId: transaction?.purchaseId,
      purchaseReturnId: transaction?.purchaseReturnId,
      debitNote: transaction?.debitNote ? true : undefined,
    });
  }

  publish(versionId: number): Promise<void> {
    return this.post<void>(`/api/document-templates/versions/${versionId}/publish`, {});
  }

  cloneVersion(versionId: number): Promise<DocumentTemplateVersionListItem> {
    return this.post<DocumentTemplateVersionListItem>(`/api/document-templates/versions/${versionId}/clone`, {});
  }

  /* ------------------------------------------------------------------ */
  /* Template printers                                                  */
  /* ------------------------------------------------------------------ */

  printers(templateId: number): Promise<TemplatePrinterDto[]> {
    return this.get<TemplatePrinterDto[]>(`/api/document-templates/templates/${templateId}/printers`);
  }

  savePrinter(templateId: number, request: SaveTemplatePrinterRequest): Promise<TemplatePrinterDto> {
    return this.post<TemplatePrinterDto>(`/api/document-templates/templates/${templateId}/printers`, {
      ...request,
      invoiceTemplateId: templateId,
    });
  }

  updatePrinter(templateId: number, printerId: number, request: SaveTemplatePrinterRequest): Promise<TemplatePrinterDto> {
    return this.put<TemplatePrinterDto>(`/api/document-templates/templates/${templateId}/printers/${printerId}`, {
      ...request,
      invoiceTemplateId: templateId,
    });
  }

  deletePrinter(templateId: number, printerId: number): Promise<void> {
    return this.delete(`/api/document-templates/templates/${templateId}/printers/${printerId}`);
  }

  updatePrintSetting(
    templateId: number,
    printerId: number,
    setting: InvoiceTemplatePrintSettingDto,
  ): Promise<InvoiceTemplatePrintSettingDto> {
    return this.put<InvoiceTemplatePrintSettingDto>(
      `/api/document-templates/templates/${templateId}/printers/${printerId}/print-setting`,
      setting,
    );
  }

  /* ------------------------------------------------------------------ */
  /* Assignments                                                        */
  /* ------------------------------------------------------------------ */

  assignments(templateId: number): Promise<TemplateAssignmentDto[]> {
    return this.get<TemplateAssignmentDto[]>(`/api/document-templates/${templateId}/assignments`);
  }

  createAssignment(templateId: number, request: CreateTemplateAssignmentRequest): Promise<TemplateAssignmentDto> {
    return this.post<TemplateAssignmentDto>(`/api/document-templates/${templateId}/assignments`, {
      ...request,
      invoiceTemplateId: templateId,
    });
  }

  deleteAssignment(assignmentId: number): Promise<void> {
    return this.delete(`/api/document-templates/assignments/${assignmentId}`);
  }

  allAssignments(): Promise<TemplateAssignmentDto[]> {
    return this.get<TemplateAssignmentDto[]>('/api/document-settings/assignments');
  }

  resolve(companyId: number | null, invoiceTypeId: number, paperSizeId: number | null): Promise<ResolvedDocumentTemplateDto> {
    return this.get<ResolvedDocumentTemplateDto>('/api/document-templates/resolve', {
      companyId: companyId ?? undefined,
      invoiceTypeId,
      paperSizeId: paperSizeId ?? undefined,
    });
  }

  /* ------------------------------------------------------------------ */
  /* HTTP helpers — unwrap the ApiResponse<T> envelope                  */
  /* ------------------------------------------------------------------ */

  private async get<T>(url: string, params?: Record<string, unknown>): Promise<T> {
    let p = new HttpParams();
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== null && v !== '') p = p.set(k, String(v));
      }
    }
    return firstValueFrom(this.http.get<Envelope<T>>(url, { params: p })).then(unwrap<T>, toHttpError);
  }

  private async post<T>(url: string, body?: unknown): Promise<T> {
    return firstValueFrom(this.http.post<Envelope<T>>(url, body ?? {})).then(unwrap<T>, toHttpError);
  }

  private async put<T>(url: string, body: unknown): Promise<T> {
    return firstValueFrom(this.http.put<Envelope<T>>(url, body)).then(unwrap<T>, toHttpError);
  }

  private async delete(url: string): Promise<void> {
    await firstValueFrom(this.http.delete<Envelope<unknown>>(url)).then(() => undefined, toHttpError);
  }
}

export interface DocumentLookupOption extends DocumentLookupBase {
  printerTypeId?: number | null;
}

interface DocumentLookupBase {
  id: number;
  code: string;
  name: string;
  bindingPath?: string | null;
}

interface Envelope<T> {
  success?: boolean;
  message?: string;
  data?: T;
  errors?: string[];
}

function unwrap<T>(res: Envelope<T> | T | null | undefined): T {
  if (res !== null && typeof res === 'object' && 'data' in (res as Envelope<T>)) {
    const env = res as Envelope<T>;
    return (env.data ?? (res as unknown)) as T;
  }
  return res as T;
}

/** Re-throws the raw error so callers can read status / error.message. */
function toHttpError(err: unknown): never {
  throw err;
}

export function apiErrorMessage(err: unknown): string {
  const e = err as HttpErrorResponse & { error?: { message?: string; errors?: string[] } | string };
  if (e?.error) {
    if (typeof e.error === 'string') return e.error;
    const parts: string[] = [];
    if (e.error.message) parts.push(e.error.message);
    if (Array.isArray(e.error.errors) && e.error.errors.length) parts.push(e.error.errors.join(' '));
    if (parts.length) return parts.join(' ');
  }
  if (e?.status === 401) return 'Session expired. Please sign in again.';
  if (e?.status === 403) return 'You do not have permission for this action.';
  if (e?.status === 0) return 'Cannot reach the server. Check your connection.';
  return e?.message || 'Unexpected error. Please try again.';
}
