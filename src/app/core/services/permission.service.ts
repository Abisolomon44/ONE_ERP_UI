import { Injectable, signal } from '@angular/core';
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
  WorkflowPermissionEntry,
  PermissionTreeWorkspace,
} from '../models';

export interface UserPermission {
  code: string;
  scope: string;
  scopeId?: number | null;
}

@Injectable({ providedIn: 'root' })
export class PermissionService {
  readonly permissions = signal<string[]>(['*']);
  readonly userPermissions = signal<UserPermission[]>([]);
  readonly currentScope = signal<{
    level: string;
    id: number | null;
  }>({ level: 'Company', id: null });

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

  canAccessHierarchical(workspaceCode: string, domainCode: string, moduleCode: string, screenCode: string, actionCode: string): boolean {
    const owned = this.permissions();
    if (owned.includes('*')) return true;
    const fullCode = `${workspaceCode}.${domainCode}.${moduleCode}.${screenCode}.${actionCode}`;
    const shortCode = `${moduleCode}.${actionCode}`;
    return owned.includes(fullCode) || owned.includes(shortCode);
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

  getDataScope(): DataScope | null {
    const scopes = this.dataScopes();
    return scopes.length > 0 ? scopes[0] : null;
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
      } catch {
        localStorage.removeItem(this.ENTERPRISE_KEY);
      }
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
}
