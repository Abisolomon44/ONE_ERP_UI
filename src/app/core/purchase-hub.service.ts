import { Injectable, signal } from '@angular/core';

export interface PurchaseEditRequest {
  /** Purchase id to edit, or null to start a new purchase. */
  id: number | null;
  /** Monotonic token so repeated requests for the same id still fire. */
  nonce: number;
}

/**
 * Coordinates the Purchase workspace: the list tab asks the workspace to
 * open a purchase (or a new one) in the entry tab without navigating away
 * to the standalone /purchase-entry route. The workspace watches
 * `editRequest` to switch tabs; the entry component watches it to load.
 */
@Injectable({ providedIn: 'root' })
export class PurchaseHubService {
  readonly editRequest = signal<PurchaseEditRequest | null>(null);

  requestEdit(id: number): void {
    this.editRequest.set({ id, nonce: Date.now() + Math.random() });
  }

  requestNew(): void {
    this.editRequest.set({ id: null, nonce: Date.now() + Math.random() });
  }

  clear(): void {
    this.editRequest.set(null);
  }
}
