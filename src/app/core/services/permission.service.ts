import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import {
  Workspace,
  Domain,
  Module,
  SubModule,
  Screen,
  Field,
  Action,
  RolePermissionEntry,
  UserPermissionOverride,
  RoleFieldPermissionEntry,
  UserFieldPermissionEntry,
  DataScope,
  EffectiveDataScope,
  WorkflowPermissionEntry,
  PermissionTreeWorkspace,
  Role,
} from '../models';

export interface UserPermission {
  code: string;
  scope: string;
  scopeId?: number | null;
}

export interface ScopeOption {
  id: number;
  name: string;
}

interface MyScopeEntry {
  id: number;
  name?: string | null;
}

interface MyEffectiveScope {
  companies: MyScopeEntry[];
  branches: MyScopeEntry[];
  warehouses: MyScopeEntry[];
}

@Injectable({ providedIn: 'root' })
export class PermissionService {
  private readonly http = inject(HttpClient);

  readonly permissions = signal<string[]>(['*']);
  readonly userPermissions = signal<UserPermission[]>([]);
  readonly currentScope = signal<{
    level: string;
    id: number | null;
  }>({ level: 'Company', id: null });

  // Effective Data Scope (Company/Branch/Warehouse)
  readonly effectiveDataScope = signal<EffectiveDataScope | null>(null);

  // Enterprise Permission Engine state
  readonly workspaces = signal<Workspace[]>([]);
  readonly domains = signal<Domain[]>([]);
  readonly modules = signal<Module[]>([]);
  readonly subModules = signal<SubModule[]>([]);
  readonly screens = signal<Screen[]>([]);
  readonly fields = signal<Field[]>([]);
  readonly actions = signal<Action[]>([]);
  readonly rolePermissions = signal<RolePermissionEntry[]>([]);
  readonly userOverrides = signal<UserPermissionOverride[]>([]);
  readonly roleFieldPermissions = signal<RoleFieldPermissionEntry[]>([]);
  readonly userFieldPermissions = signal<UserFieldPermissionEntry[]>([]);
  readonly dataScopes = signal<DataScope[]>([]);
  readonly workflowPermissions = signal<WorkflowPermissionEntry[]>([]);

  private readonly PERMISSIONS_KEY = 'oneerp-erp-user-permissions';
  private readonly ENTERPRISE_KEY = 'oneerp-erp-enterprise-permissions';

  has(required: string | string[]): boolean {
    const owned = this.permissions();
    if (owned.includes('*')) return true;
    const list = Array.isArray(required) ? required : [required];
    return list.some((p) => owned.includes(p));
  }

  hasInScope(moduleCode: string, actionCode: string, scope?: string, scopeId?: number): boolean {
    const perms = this.userPermissions();
    const currentScope = this.currentScope();

    const targetScope = scope || currentScope.level;
    const targetScopeId = scopeId !== undefined ? scopeId : currentScope.id;

    return perms.some(
      (p) =>
        p.code === `${moduleCode}.${actionCode}` &&
        (p.scope === targetScope || p.scope === 'Platform') &&
        (p.scope === 'Platform' || p.scopeId === null || p.scopeId === targetScopeId)
    );
  }

  canView(moduleCode: string): boolean {
    return this.hasInScope(moduleCode, 'view') || this.hasInScope(moduleCode, 'manage');
  }

  canCreate(moduleCode: string): boolean {
    return this.hasInScope(moduleCode, 'create') || this.hasInScope(moduleCode, 'manage');
  }

  canEdit(moduleCode: string): boolean {
    return this.hasInScope(moduleCode, 'edit') || this.hasInScope(moduleCode, 'manage');
  }

  canDelete(moduleCode: string): boolean {
    return this.hasInScope(moduleCode, 'delete') || this.hasInScope(moduleCode, 'manage');
  }

  canManage(moduleCode: string): boolean {
    return this.hasInScope(moduleCode, 'manage');
  }

  // Enterprise Permission Engine methods

  canAccess(screenCode: string, actionCode: string): boolean {
    const owned = this.permissions();
    if (owned.includes('*')) return true;
    return owned.some(p => p === `${screenCode}.${actionCode}`);
  }

  getFieldPermission(screenId: number, fieldId: number): { canView: boolean; canEdit: boolean; isHidden: boolean; isReadOnly: boolean; isMandatory: boolean } | null {
    const userId = this.getCurrentUserId();
    if (!userId) return null;

    // Check user-level field permissions first (highest priority)
    const userFieldPerm = this.userFieldPermissions().find(
      fp => fp.screenId === screenId && fp.fieldId === fieldId && fp.isActive
    );
    if (userFieldPerm) {
      return {
        canView: userFieldPerm.canView,
        canEdit: userFieldPerm.canEdit,
        isHidden: userFieldPerm.isHidden,
        isReadOnly: userFieldPerm.isReadOnly,
        isMandatory: userFieldPerm.isMandatory,
      };
    }

    // Then check role-level field permissions
    const roleFieldPerms = this.roleFieldPermissions().filter(
      fp => fp.screenId === screenId && fp.fieldId === fieldId && fp.isActive
    );
    if (roleFieldPerms.length > 0) {
      // Merge role permissions (OR logic for view/edit, AND for hidden/readonly/mandatory)
      return {
        canView: roleFieldPerms.some(fp => fp.canView),
        canEdit: roleFieldPerms.some(fp => fp.canEdit),
        isHidden: roleFieldPerms.every(fp => fp.isHidden),
        isReadOnly: roleFieldPerms.every(fp => fp.isReadOnly),
        isMandatory: roleFieldPerms.some(fp => fp.isMandatory),
      };
    }

    return null;
  }

  /** Get field permission using screenCode and fieldCode (looks up IDs from the fields list) */
  getFieldPermissionByCode(screenCode: string, fieldCode: string): { canView: boolean; canEdit: boolean; isHidden: boolean; isReadOnly: boolean; isMandatory: boolean } | null {
    const screen = this.screens().find(s => s.screenCode === screenCode);
    if (!screen) return null;
    const field = this.fields().find(f => f.screenId === screen.id && f.fieldCode === fieldCode);
    if (!field) return null;
    return this.getFieldPermission(screen.id, field.id) ?? null;
  }

  /** Check if user can view a field (by screenCode/fieldCode) */
  canViewField(screenCode: string, fieldCode: string): boolean {
    const perm = this.getFieldPermissionByCode(screenCode, fieldCode);
    return perm?.canView === true;
  }

  /** Check if user can edit a field (by screenCode/fieldCode) */
  canEditField(screenCode: string, fieldCode: string): boolean {
    const perm = this.getFieldPermissionByCode(screenCode, fieldCode);
    return perm?.canEdit === true;
  }

  /** Check if a field is hidden (by screenCode/fieldCode) */
  isFieldHidden(screenCode: string, fieldCode: string): boolean {
    const perm = this.getFieldPermissionByCode(screenCode, fieldCode);
    return perm?.isHidden === true;
  }

  /** Check if a field is read-only (by screenCode/fieldCode) */
  isFieldReadonly(screenCode: string, fieldCode: string): boolean {
    const perm = this.getFieldPermissionByCode(screenCode, fieldCode);
    return perm?.isReadOnly === true;
  }

  /** Check if a field is mandatory (by screenCode/fieldCode) */
  isFieldMandatory(screenCode: string, fieldCode: string): boolean {
    const perm = this.getFieldPermissionByCode(screenCode, fieldCode);
    return perm?.isMandatory === true;
  }

  getDataScope(): EffectiveDataScope | null {
    // Return the effective data scope (Company/Branch/Warehouse) resolved at login
    // This is the authoritative data scope for filtering records
    return this.effectiveDataScope();
  }

  /**
   * Resolves Company/Branch/Warehouse dropdown options from the current user's
   * effective data scope = role-based Data Scope entries + user overrides
   * (/api/data-scopes/my, which also resolves real names server-side), so master-data
   * dropdowns don't need Companies/Branches/Warehouses view permissions.
   * Falls back to local role-scope + override merging when that endpoint is unavailable.
   */
  async loadMyDataScopeOptions(
    _roleNames: string[],
  ): Promise<{ companies: ScopeOption[]; branches: ScopeOption[]; warehouses: ScopeOption[] }> {
    try {
      const me = await firstValueFrom(this.http.get<MyEffectiveScope>('/api/data-scopes/my'));
      return {
        companies: (me.companies ?? []).map((c) => ({ id: c.id, name: c.name || `#${c.id}` })),
        branches: (me.branches ?? []).map((b) => ({ id: b.id, name: b.name || `#${b.id}` })),
        warehouses: (me.warehouses ?? []).map((w) => ({ id: w.id, name: w.name || `#${w.id}` })),
      };
    } catch (err) {
      console.warn('[PermissionService] /api/data-scopes/my unavailable, falling back to local merge:', err);
    }

    const companies = new Map<number, string>();
    const branches = new Map<number, string>();
    const warehouses = new Map<number, string>();

    try {
      // /api/roles/my is self-service (no roles.view needed) and already scoped
      // to the current user, so no client-side filtering by roleNames is needed.
      const roles = await firstValueFrom(this.http.get<Role[]>('/api/roles/my'));
      const myRoleIds = roles.map((r) => r.roleId);

      const scopeLists = await Promise.all(
        myRoleIds.map((roleId) =>
          firstValueFrom(this.http.get<DataScope[]>(`/api/data-scopes/role/${roleId}`)).catch(() => [] as DataScope[]),
        ),
      );

      for (const scopes of scopeLists) {
        for (const s of scopes) {
          if (!s.isActive || !s.canView) continue;
          if (s.companyId) companies.set(s.companyId, s.companyName || `#${s.companyId}`);
          if (s.branchId) branches.set(s.branchId, s.branchName || `#${s.branchId}`);
          if (s.warehouseId) warehouses.set(s.warehouseId, s.warehouseName || `#${s.warehouseId}`);
        }
      }
    } catch (err) {
      console.error('[PermissionService] failed to resolve role-based data scope options:', err);
    }

    // Merge user-level data scope overrides so UI dropdowns reflect what the
    // server-side resolver actually allows (Grant + valid id adds access).
    try {
      const userId = this.getCurrentUserId();
      if (userId !== null) {
        const overrides = await firstValueFrom(
          this.http.get<any[]>(`/api/user-data-scope-overrides/user/${userId}`),
        ).catch(() => [] as any[]);
        const now = Date.now();
        for (const o of overrides ?? []) {
          if (!o.isActive || !o.allow) continue;
          if (o.effectiveFrom && new Date(o.effectiveFrom).getTime() > now) continue;
          if (o.effectiveTo && new Date(o.effectiveTo).getTime() <= now) continue;
          const id = parseInt(String(o.scopeValue), 10);
          if (!id || id <= 0) continue;
          const label = `#${id}`;
          if (o.scopeType === 'Company') companies.set(id, label);
          else if (o.scopeType === 'Branch') branches.set(id, label);
          else if (o.scopeType === 'Warehouse') warehouses.set(id, label);
        }
      }
    } catch (err) {
      console.error('[PermissionService] failed to resolve user data scope overrides:', err);
    }

    return {
      companies: [...companies].map(([id, name]) => ({ id, name })),
      branches: [...branches].map(([id, name]) => ({ id, name })),
      warehouses: [...warehouses].map(([id, name]) => ({ id, name })),
    };
  }

  canSubmitWorkflow(moduleId: number, screenId: number): boolean {
    const perms = this.workflowPermissions();
    return perms.some(wp => wp.moduleId === moduleId && wp.screenId === screenId && wp.canSubmit && wp.isActive);
  }

  canApproveWorkflow(moduleId: number, screenId: number): boolean {
    const perms = this.workflowPermissions();
    return perms.some(wp => wp.moduleId === moduleId && wp.screenId === screenId && wp.canApprove && wp.isActive);
  }

  buildPermissionTree(workspaces: Workspace[], domains: Domain[], modules: Module[], subModules: SubModule[], screens: Screen[], fields: Field[]): PermissionTreeWorkspace[] {
    const domainMap = new Map<number, Domain>();
    domains.forEach(d => domainMap.set(d.id, d));

    const moduleMap = new Map<number, Module>();
    modules.forEach(m => moduleMap.set(m.id, m));

    const screenMap = new Map<number, Screen>();
    screens.forEach(s => screenMap.set(s.id, s));

    return workspaces.map(ws => ({
      id: ws.id,
      code: ws.workspaceCode,
      name: ws.workspaceName,
      icon: ws.icon,
      domains: domains
        .filter(d => d.workspaceId === ws.id)
        .map(d => ({
          id: d.id,
          code: d.domainCode,
          name: d.domainName,
          icon: d.icon,
          modules: modules
            .filter(m => m.domainId === d.id)
            .map(m => ({
              id: m.id,
              code: m.moduleCode,
              name: m.moduleName,
              icon: m.icon,
              subModules: subModules
                .filter(sm => sm.moduleId === m.id)
                .map(sm => ({
                  id: sm.id,
                  code: sm.subModuleCode,
                  name: sm.subModuleName,
                  icon: sm.icon,
                  screens: screens
                    .filter(s => s.subModuleId === sm.id)
                    .map(s => ({
                      id: s.id,
                      code: s.screenCode,
                      name: s.screenName,
                      routeUrl: s.routeUrl,
                      componentName: s.componentName,
                      fields: fields
                        .filter(f => f.screenId === s.id)
                        .map(f => ({
                          id: f.id,
                          code: f.fieldCode,
                          name: f.fieldName,
                          displayName: f.displayName,
                          dataType: f.dataType,
                          displayOrder: f.displayOrder,
                          isSystemField: f.isSystemField,
                          isRequired: f.isRequired,
                        })),
                    })),
                })),
            })),
        })),
    }));
  }

  setScope(level: string, id: number | null): void {
    this.currentScope.set({ level, id });
  }

  setEffectiveDataScope(scope: EffectiveDataScope | null): void {
    this.effectiveDataScope.set(scope);
  }

  loadEnterprisePermissions(data: {
    workspaces?: Workspace[];
    domains?: Domain[];
    modules?: Module[];
    subModules?: SubModule[];
    screens?: Screen[];
    fields?: Field[];
    actions?: Action[];
    rolePermissions?: RolePermissionEntry[];
    userOverrides?: UserPermissionOverride[];
    roleFieldPermissions?: RoleFieldPermissionEntry[];
    userFieldPermissions?: UserFieldPermissionEntry[];
    dataScopes?: DataScope[];
    workflowPermissions?: WorkflowPermissionEntry[];
  }): void {
    if (data.workspaces) this.workspaces.set(data.workspaces);
    if (data.domains) this.domains.set(data.domains);
    if (data.modules) this.modules.set(data.modules);
    if (data.subModules) this.subModules.set(data.subModules);
    if (data.screens) this.screens.set(data.screens);
    if (data.fields) this.fields.set(data.fields);
    if (data.actions) this.actions.set(data.actions);
    if (data.rolePermissions) this.rolePermissions.set(data.rolePermissions);
    if (data.userOverrides) this.userOverrides.set(data.userOverrides);
    if (data.roleFieldPermissions) this.roleFieldPermissions.set(data.roleFieldPermissions);
    if (data.userFieldPermissions) this.userFieldPermissions.set(data.userFieldPermissions);
    if (data.dataScopes) this.dataScopes.set(data.dataScopes);
    if (data.workflowPermissions) this.workflowPermissions.set(data.workflowPermissions);

    localStorage.setItem(this.ENTERPRISE_KEY, JSON.stringify(data));
  }

  loadFromStorage(): void {
    const stored = localStorage.getItem(this.ENTERPRISE_KEY);
    if (stored) {
      try {
        const data = JSON.parse(stored);
        this.loadEnterprisePermissions(data);
        // Also load user overrides from JWT token to ensure they're always
        // up-to-date, even if localStorage data is from an older session
        this.loadUserOverridesFromToken();
      } catch {
        localStorage.removeItem(this.ENTERPRISE_KEY);
      }
    } else {
      // No stored enterprise permissions; try loading from JWT token
      this.loadUserOverridesFromToken();
    }
  }

  clearPermissions(): void {
    this.permissions.set([]);
    this.userPermissions.set([]);
    this.workspaces.set([]);
    this.domains.set([]);
    this.modules.set([]);
    this.subModules.set([]);
    this.screens.set([]);
    this.fields.set([]);
    this.actions.set([]);
    this.rolePermissions.set([]);
    this.userOverrides.set([]);
    this.roleFieldPermissions.set([]);
    this.userFieldPermissions.set([]);
    this.dataScopes.set([]);
    this.workflowPermissions.set([]);
    localStorage.removeItem(this.PERMISSIONS_KEY);
    localStorage.removeItem(this.ENTERPRISE_KEY);
  }

  private getCurrentUserId(): number | null {
    try {
      const token = localStorage.getItem('oneerp-erp-token');
      if (!token) return null;
      const payload = JSON.parse(atob(token.split('.')[1]));
      return parseInt(payload.nameid, 10) || null;
    } catch {
      return null;
    }
  }

  /** Load user overrides from the JWT token and update signals */
  loadUserOverridesFromToken(): void {
    const userId = this.getCurrentUserId();
    if (userId === null) return;

    const token = localStorage.getItem('oneerp-erp-token');
    if (!token) return;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      // The JWT payload may contain user override information from AuthService.LoginAsync
      // and ResolveAllPermissionsAsync which fetches overrides from the DB.
      const overrides: UserPermissionOverride[] = [];

      // Check for user overrides in the token payload
      if (payload.userOverrides && Array.isArray(payload.userOverrides)) {
        payload.userOverrides.forEach((o: any) => {
          overrides.push({
            id: o.Id ?? o.id ?? 0,
            userId: userId,
            workspaceId: o.WorkspaceId ?? o.workspaceId ?? 0,
            domainId: o.DomainId ?? o.domainId ?? 0,
            moduleId: o.ModuleId ?? o.moduleId ?? 0,
            subModuleId: o.SubModuleId ?? o.subModuleId ?? 0,
            screenId: o.ScreenId ?? o.screenId ?? 0,
            actionId: o.ActionId ?? o.actionId ?? 0,
            permissionType: o.PermissionType ?? o.permissionType ?? 'Grant',
            allow: o.Allow ?? o.allow ?? true,
            effectiveFrom: o.EffectiveFrom ?? o.effectiveFrom ?? '',
            effectiveTo: o.EffectiveTo ?? o.effectiveTo ?? undefined,
            isActive: o.IsActive ?? o.isActive ?? true,
            remarks: o.Remarks ?? o.remarks ?? '',
            createdDate: o.CreatedDate ?? o.createdDate ?? ''
          });
        });
      }

      // Also check for permissions that can be derived into override concepts
      if (payload.permissions && Array.isArray(payload.permissions)) {
        // Derive overrides from the permissions list if needed
        // This handles cases where overrides were baked into the permission codes
        // like 'companies.view', 'branches.view', etc.
      }

      this.userOverrides.set(overrides);
    } catch {
      // Silently fail if token decoding fails or data is malformed
    }
  }
}
