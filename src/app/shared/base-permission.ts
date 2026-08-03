import { Directive, EmbeddedViewRef, Input, TemplateRef, ViewContainerRef, inject } from '@angular/core';
import { PermissionService } from '../core/services/permission.service';

@Directive({
  selector: '[basePermission]',
  standalone: true,
})
export class BasePermission {
  private readonly viewContainer = inject(ViewContainerRef);
  private readonly template = inject(TemplateRef<unknown>);
  private readonly permissions = inject(PermissionService);

  private view: EmbeddedViewRef<unknown> | null = null;

  @Input() set basePermission(permission: string | string[]) {
    this.apply(permission);
  }

  private apply(permission: string | string[]): void {
    if (this.permissions.has(permission)) {
      if (!this.view) this.view = this.viewContainer.createEmbeddedView(this.template);
    } else if (this.view) {
      this.viewContainer.clear();
      this.view = null;
    }
  }
}
