import { Injectable, signal } from '@angular/core';

export interface Toast {
  id: number;
  type: 'success' | 'danger' | 'warning' | 'info';
  title: string;
  message?: string;
}

let nextId = 1;

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly toasts = signal<Toast[]>([]);

  success(title: string, message?: string): void {
    this.push('success', title, message);
  }

  error(title: string, message?: string): void {
    this.push('danger', title, message);
  }

  warning(title: string, message?: string): void {
    this.push('warning', title, message);
  }

  info(title: string, message?: string): void {
    this.push('info', title, message);
  }

  dismiss(id: number): void {
    this.toasts.update((list) => list.filter((t) => t.id !== id));
  }

  private push(type: Toast['type'], title: string, message?: string): void {
    const toast: Toast = { id: nextId++, type, title, message };
    this.toasts.update((list) => [...list, toast]);
    setTimeout(() => this.dismiss(toast.id), 4200);
  }
}
