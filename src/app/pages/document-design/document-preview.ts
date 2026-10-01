import { Component, OnInit, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import {
  DesignerVersionDto,
  DocumentDesignService,
  apiErrorMessage,
} from '../../core/services/document-design.service';
import { ToastService } from '../../core/services/toast.service';

/* =====================================================================
   DOCUMENT PREVIEW PAGE (/document-design/preview?versionId=N).

   Standalone full-width preview of a SAVED template version — the same
   backend HTML the designer's same-page preview shows:

     GET /api/document-templates/versions/{id}/preview
       ?salesInvoiceId=  → real invoice data (print flow)
       (omitted)         → sample data

   Opened from the Document Design hub (versions row) or the Sales
   Invoice print flow. Zoom + print included; Design stays one click
   away via "Open in Designer".
   ===================================================================== */

@Component({
  selector: 'app-document-preview',
  standalone: true,
  imports: [LucideAngularModule, DecimalPipe],
  template: `
    <div class="dvp">
      <header class="dvp-topbar">
        <div class="dvp-brand">
          <span class="dvp-logo"><lucide-icon name="file-text" size="15"></lucide-icon></span>
          <div class="dvp-brand-text">
            <span class="dvp-title">Document Preview</span>
            <span class="dvp-subtitle">
              @if (design(); as d) {
                Version {{ d.versionNumber }}
                <span class="dvp-chip" [class.pub]="d.status === 'PUBLISHED'">{{ d.status }}</span>
              }
              @if (salesInvoiceId()) { · invoice #{{ salesInvoiceId() }} (real data) } @else { · sample data }
            </span>
          </div>
        </div>
        <div class="dvp-actions">
          <div class="dvp-zoom">
            <button type="button" (click)="zoomOut()" title="Zoom out"><lucide-icon name="minus" size="12"></lucide-icon></button>
            <span>{{ zoom() * 100 | number: '1.0-0' }}%</span>
            <button type="button" (click)="zoomIn()" title="Zoom in"><lucide-icon name="plus" size="12"></lucide-icon></button>
          </div>
          <button class="dvp-btn" type="button" (click)="refresh()" [disabled]="loading()">
            <lucide-icon name="refresh-cw" size="12"></lucide-icon> {{ loading() ? 'Rendering…' : 'Refresh' }}
          </button>
          <button class="dvp-btn" type="button" (click)="print()" [disabled]="!previewHtml()">
            <lucide-icon name="printer" size="12"></lucide-icon> Print
          </button>
          @if (!salesInvoiceId()) {
            <button class="dvp-btn" type="button" (click)="openDesigner()">
              <lucide-icon name="pencil-ruler" size="12"></lucide-icon> Open in Designer
            </button>
          }
          <button class="dvp-btn" type="button" (click)="back()">Back</button>
        </div>
      </header>

      <main class="dvp-stage">
        @if (loading()) {
          <div class="dvp-note">Rendering preview…</div>
        } @else if (html; as safe) {
          <iframe
            class="dvp-frame"
            [srcdoc]="safe"
            [style.width.mm]="210 * zoom()"
            [style.height.mm]="297 * zoom()"
            title="A4 document preview"
          ></iframe>
        } @else {
          <div class="dvp-note">Nothing to preview — open a version from the Document Design hub.</div>
        }
      </main>
    </div>
  `,
  styles: `
    :host { display: block; height: 100%; }
    .dvp { display: flex; flex-direction: column; height: 100vh; }
    .dvp-topbar {
      display: flex; align-items: center; justify-content: space-between;
      gap: 10px; padding: 10px 16px; border-bottom: 1px solid rgba(127,127,127,.25); flex-wrap: wrap;
    }
    .dvp-brand { display: flex; align-items: center; gap: 10px; }
    .dvp-logo {
      width: 28px; height: 28px; border-radius: 8px;
      display: inline-flex; align-items: center; justify-content: center;
      background: #7c3aed; color: #fff;
    }
    .dvp-title { font-size: 14px; font-weight: 700; display: block; }
    .dvp-subtitle { font-size: 11px; opacity: .65; display: block; }
    .dvp-chip {
      display: inline-block; margin-left: 4px; padding: 1px 7px; border-radius: 999px;
      font-size: 9.5px; font-weight: 700; letter-spacing: .04em;
      background: rgba(217, 119, 6, .15); color: #d97706;
    }
    .dvp-chip.pub { background: rgba(22, 163, 74, .15); color: #16a34a; }
    .dvp-actions { display: flex; gap: 7px; align-items: center; flex-wrap: wrap; }
    .dvp-zoom {
      display: inline-flex; align-items: center; gap: 4px;
      border: 1px solid rgba(127,127,127,.25); border-radius: 8px; padding: 2px 6px;
      font-size: 11.5px; font-weight: 600;
    }
    .dvp-zoom button {
      border: none; background: transparent; color: inherit; cursor: pointer;
      width: 22px; height: 22px; display: inline-flex; align-items: center; justify-content: center;
      border-radius: 6px;
    }
    .dvp-zoom button:hover { background: rgba(127,127,127,.15); }
    .dvp-btn {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 6px 12px; border-radius: 8px; cursor: pointer;
      border: 1px solid rgba(127,127,127,.25); background: transparent; color: inherit;
      font-size: 12px; font-weight: 600;
    }
    .dvp-btn:hover:not(:disabled) { background: rgba(127,127,127,.12); }
    .dvp-btn:disabled { opacity: .5; cursor: not-allowed; }
    .dvp-stage {
      flex: 1; overflow: auto; display: flex; justify-content: center;
      padding: 14px 16px 20px;
    }
    .dvp-frame {
      flex: none; border: 1px solid #999;
      border-radius: 4px; background: #fff; box-shadow: 0 4px 20px rgba(0,0,0,.18);
    }
    .dvp-note { font-size: 12.5px; opacity: .6; align-self: center; }
  `,
})
export class DocumentPreviewPage implements OnInit {
  private readonly svc = inject(DocumentDesignService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly sanitizer = inject(DomSanitizer);

  protected readonly versionId = signal(0);
  protected readonly salesInvoiceId = signal<number | null>(null);
  /* Save & Print flow: /document-design/preview?...&autoprint=1 fires the
     print dialog as soon as the backend HTML has rendered. */
  private autoPrint = false;
  private autoPrintFired = false;
  protected readonly design = signal<DesignerVersionDto | null>(null);
  protected readonly previewHtml = signal<string | null>(null);
  protected readonly loading = signal(false);
  protected readonly zoom = signal(1);

  /* Preview HTML comes from our own backend renderer (pure HTML+CSS, no
     scripts) — bypass Angular's style-stripping sanitizer. */
  protected get html(): SafeHtml | null {
    const raw = this.previewHtml();
    return raw ? this.sanitizer.bypassSecurityTrustHtml(raw) : null;
  }

  ngOnInit(): void {
    const id = Number(this.route.snapshot.queryParamMap.get('versionId'));
    const inv = Number(this.route.snapshot.queryParamMap.get('salesInvoiceId'));
    if (!Number.isFinite(id) || id <= 0) {
      this.toast.error('No template version selected', 'Open the preview from the Document Design hub.');
      return;
    }
    this.versionId.set(id);
    if (Number.isFinite(inv) && inv > 0) this.salesInvoiceId.set(inv);
    this.autoPrint = this.route.snapshot.queryParamMap.get('autoprint') === '1';
    void this.load();
  }

  protected async load(): Promise<void> {
    this.loading.set(true);
    try {
      const [design, html] = await Promise.all([
        this.svc.designer(this.versionId()),
        this.svc.preview(this.versionId(), this.salesInvoiceId() ?? undefined),
      ]);
      this.design.set(design);
      this.previewHtml.set(html);
      if (this.autoPrint && !this.autoPrintFired) {
        this.autoPrintFired = true;
        setTimeout(() => this.print(), 400);
      }
    } catch (e) {
      this.toast.error('Preview failed', apiErrorMessage(e));
    } finally {
      this.loading.set(false);
    }
  }

  protected refresh(): void {
    void this.load();
  }

  protected print(): void {
    /* Preferred: print the iframe directly — same-origin (srcdoc), no popup,
       keeps exact A4 CSS. Popup fallback for exotic embeds. */
    const frame = document.querySelector('iframe.dvp-frame') as HTMLIFrameElement | null;
    if (frame?.contentWindow) {
      frame.contentWindow.focus();
      frame.contentWindow.print();
      return;
    }
    const html = this.previewHtml();
    if (!html) return;
    const win = window.open('', '_blank');
    if (!win) {
      this.toast.warning('Popup blocked', 'Allow popups for this site to print.');
      return;
    }
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 300);
  }

  protected openDesigner(): void {
    void this.router.navigate(['/document-designer'], {
      queryParams: { versionId: this.versionId() },
    });
  }

  protected back(): void {
    void this.router.navigate(['/document-design']);
  }

  protected zoomIn(): void {
    this.zoom.set(Math.min(2, Math.round((this.zoom() + 0.1) * 10) / 10));
  }

  protected zoomOut(): void {
    this.zoom.set(Math.max(0.5, Math.round((this.zoom() - 0.1) * 10) / 10));
  }
}
