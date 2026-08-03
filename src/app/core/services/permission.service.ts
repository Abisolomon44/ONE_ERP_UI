import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class PermissionService {
  readonly permissions = signal<string[]>(['*']);

  has(required: string | string[]): boolean {
    const owned = this.permissions();
    if (owned.includes('*')) return true;
    const list = Array.isArray(required) ? required : [required];
    return list.some((p) => owned.includes(p));
  }
}
