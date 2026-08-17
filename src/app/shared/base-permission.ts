import { Directive, EmbeddedViewRef, Input, TemplateRef, ViewContainerRef, inject } from '@angular/core';
import { PermissionService } from '../core/services/permission.service';
import { AuthService } from '../core/services/auth.service';

@Directive({
  selector: '[basePermission]',
  standalone: true,
})
export class BasePermission {
  private readonly viewContainer = inject(ViewContainerRef);
  private readonly template = inject(TemplateRef<unknown>);
  private readonly permissions = inject(PermissionService);
  private readonly auth = inject(AuthService);

  private view: EmbeddedViewRef<unknown> | null = null;

  @Input() set basePermission(permission: string | string[]) {
    this.apply(permission);
  }

  private apply(permission: string | string[]): void {
    const isSuperAdmin = this.auth.user()?.isSuperAdmin ?? false;
    const hasAccess = isSuperAdmin || this.permissions.has(permission);
    if (hasAccess) {
      if (!this.view) this.view = this.viewContainer.createEmbeddedView(this.template);
    } else if (this.view) {
      this.viewContainer.clear();
      this.view = null;
    }
  }
}
