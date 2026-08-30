import { Injectable, signal } from '@angular/core';

export interface SalesEditRequest {
  id: number | null;
  nonce: number;
}

@Injectable({ providedIn: 'root' })
export class SalesHubService {
  readonly editRequest = signal<SalesEditRequest | null>(null);

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
