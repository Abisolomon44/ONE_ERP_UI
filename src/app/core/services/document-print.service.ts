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

  private criteria = new Map<string, { invoiceTypeId: number; paperSizeId: number | null }>();

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
      const { invoiceTypeId, paperSizeId } = await this.criteriaFor(companyId, 'SALES');
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

  async openPurchasePreview(id: number, companyId: number, kind: 'PURCHASE' | 'PURCHASE_RETURN' | 'DEBIT_NOTE' = 'PURCHASE', autoPrint = false): Promise<void> {
    try {
      const { invoiceTypeId, paperSizeId } = await this.criteriaFor(companyId, kind);
      const template = await this.doc.resolve(companyId, invoiceTypeId, paperSizeId);
      void this.router.navigate(['/document-design/preview'], {
        queryParams: {
          versionId: template.templateVersionId,
          ...(kind === 'PURCHASE' ? { purchaseId: id } : { purchaseReturnId: id }),
          ...(kind === 'DEBIT_NOTE' ? { debitNote: '1' } : {}),
          ...(autoPrint ? { autoprint: '1' } : {}),
        },
      });
    } catch (e: unknown) {
      const err = e as { status?: number; error?: { message?: string } | string; message?: string };
      const msg = (typeof err?.error === 'string' ? err.error : err?.error?.message) || err?.message || 'Failed to render the purchase document.';
      this.toast.error(err?.status === 404 ? 'No published template found' : 'Print failed', msg);
    }
  }

  /** InvoiceTypeId (SALES) + PaperSizeId (A4), cached per session. */
  private async criteriaFor(_companyId: number | null, code = 'SALES'): Promise<{ invoiceTypeId: number; paperSizeId: number | null }> {
    const cached = this.criteria.get(code);
    if (cached) return cached;
    const [types, sizes] = await Promise.all([this.doc.invoiceTypes(), this.doc.paperSizes()]);
    const invoiceTypeId =
      types.find((t) => t.code?.toUpperCase() === code)?.id ??
      types.find((t) => (t.name ?? '').toUpperCase().includes(code.replace('_', ' ')))?.id ??
      0;
    const paperSizeId = sizes.find((p) => p.code?.toUpperCase() === 'A4')?.id ?? null;
    if (!invoiceTypeId) {
      throw Object.assign(new Error('Sales Invoice document type is missing.'), { status: 404 });
    }
    const value = { invoiceTypeId, paperSizeId };
    this.criteria.set(code, value);
    return value;
  }
}
