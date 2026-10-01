import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { DocumentDesignService } from './document-design.service';
import { ToastService } from './toast.service';

/* =====================================================================
   Runtime print pipeline for Sales Invoice.

   SalesInvoiceId → CompanyId → InvoiceTypeId (SALES) → PaperSizeId (A4)
     → resolve template → published version → designer
     → GET preview?salesInvoiceId=... (backend renders REAL database data)
     → A4 HTML → Preview window → Print
   ===================================================================== */

@Injectable({ providedIn: 'root' })
export class DocumentPrintService {
  private readonly doc = inject(DocumentDesignService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  private criteria: { invoiceTypeId: number; paperSizeId: number | null } | null = null;

  /**
   * Renders the A4 document for a saved sales invoice using the resolved
   * published template. Throws with a user-friendly message when no
   * published template exists yet.
   */
  async previewHtml(salesInvoiceId: number, companyId: number | null): Promise<string> {
    const { invoiceTypeId, paperSizeId } = await this.criteriaFor(companyId);
    const template = await this.doc.resolve(companyId, invoiceTypeId, paperSizeId);
    return this.doc.preview(template.templateVersionId, salesInvoiceId);
  }

  /** Opens the resolved published template in the in-app A4 preview page
   *  with the saved invoice's real database values. With autoPrint the page
   *  fires the print dialog as soon as the render finishes. */
  async openPreview(salesInvoiceId: number, companyId: number | null, autoPrint = false): Promise<void> {
    try {
      const { invoiceTypeId, paperSizeId } = await this.criteriaFor(companyId);
      const template = await this.doc.resolve(companyId, invoiceTypeId, paperSizeId);
      void this.router.navigate(['/document-design/preview'], {
        queryParams: {
          versionId: template.templateVersionId,
          salesInvoiceId,
          ...(autoPrint ? { autoprint: '1' } : {}),
        },
      });
    } catch (e: unknown) {
      const err = e as { status?: number; error?: { message?: string } | string; message?: string };
      const msg =
        (typeof err?.error === 'string' ? err.error : err?.error?.message) ||
        err?.message ||
        'Failed to render the invoice document.';
      if (err?.status === 404) {
        this.toast.error(
          'No published template found',
          `${msg} Run "Create Default A4 Sales Invoice" in Document Design.`,
        );
      } else {
        this.toast.error('Print failed', msg);
      }
    }
  }

  /** InvoiceTypeId (SALES) + PaperSizeId (A4), cached per session. */
  private async criteriaFor(_companyId: number | null): Promise<{ invoiceTypeId: number; paperSizeId: number | null }> {
    if (this.criteria) return this.criteria;
    const [types, sizes] = await Promise.all([this.doc.invoiceTypes(), this.doc.paperSizes()]);
    const invoiceTypeId =
      types.find((t) => t.code?.toUpperCase() === 'SALES')?.id ??
      types.find((t) => (t.name ?? '').toLowerCase().includes('sales invoice'))?.id ??
      0;
    const paperSizeId = sizes.find((p) => p.code?.toUpperCase() === 'A4')?.id ?? null;
    if (!invoiceTypeId) {
      throw Object.assign(new Error('Sales Invoice document type is missing.'), { status: 404 });
    }
    this.criteria = { invoiceTypeId, paperSizeId };
    return this.criteria;
  }
}
