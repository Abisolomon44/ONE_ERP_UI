import { HttpClient } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { LucideAngularModule } from 'lucide-angular';
import { BaseButton } from '../../shared/base-button';
import { BaseDropdown } from '../../shared/base-controls';
import { BaseEmpty } from '../../shared/base-data';
import { BasePermission } from '../../shared/base-permission';
import {
  Workspace,
  Domain,
  Module,
  SubModule,
  Screen,
  Action,
  Role,
  RolePermissionEntry,
} from '../../core/models';
import { PermissionService } from '../../core/services/permission.service';
import { ToastService } from '../../core/services/toast.service';

interface ScreenNode {
  id: number;
  name: string;
  code: string;
  subModuleId: number;
}

interface SubModuleNode {
  id: number;
  name: string;
  code: string;
  moduleId: number;
  screens: ScreenNode[];
}

interface ModuleNode {
  id: number;
  name: string;
  code: string;
  domainId: number;
  subModules: SubModuleNode[];
}

interface DomainNode {
  id: number;
  name: string;
  code: string;
  workspaceId: number;
  modules: ModuleNode[];
}

interface WorkspaceNode {
  id: number;
  name: string;
  code: string;
  domains: DomainNode[];
}

@Component({
  selector: 'app-role-permission-matrix',
  standalone: true,
  imports: [LucideAngularModule, BaseButton, BaseDropdown, BaseEmpty, BasePermission],
  templateUrl: './role-permission-matrix.html',
  styleUrl: './role-permission-matrix.css',
})
export class RolePermissionMatrixPage {
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);
  protected readonly perms = inject(PermissionService);

  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly selectedRoleId = signal<string>('');

  protected readonly roles = signal<Role[]>([]);
  protected readonly workspaces = signal<Workspace[]>([]);
  protected readonly domains = signal<Domain[]>([]);
  protected readonly modules = signal<Module[]>([]);
  protected readonly subModules = signal<SubModule[]>([]);
  protected readonly screens = signal<Screen[]>([]);
  protected readonly actions = signal<Action[]>([]);
  protected readonly existingPermissions = signal<RolePermissionEntry[]>([]);

  protected readonly expandedWorkspaces = signal<Set<number>>(new Set());
  protected readonly expandedDomains = signal<Set<number>>(new Set());
  protected readonly expandedModules = signal<Set<number>>(new Set());
  protected readonly expandedSubModules = signal<Set<number>>(new Set());
  protected readonly expandedScreens = signal<Set<number>>(new Set());

  protected readonly permissionState = signal<Map<string, boolean>>(new Map());

  protected readonly roleOptions = computed(() =>
    this.roles().map((r) => ({ value: r.roleId.toString(), label: r.name })),
  );

  protected readonly tree = computed<WorkspaceNode[]>(() => {
    const domainMap = new Map<number, DomainNode>();
    for (const d of this.domains()) {
      domainMap.set(d.id, {
        id: d.id,
        name: d.domainName,
        code: d.domainCode,
        workspaceId: d.workspaceId,
        modules: [],
      });
    }
    const moduleMap = new Map<number, ModuleNode>();
    for (const m of this.modules()) {
      const domainNode = domainMap.get(m.domainId);
      const moduleNode: ModuleNode = {
        id: m.id,
        name: m.moduleName,
        code: m.moduleCode,
        domainId: m.domainId,
        subModules: [],
      };
      moduleMap.set(m.id, moduleNode);
      domainNode?.modules.push(moduleNode);
    }
    for (const sm of this.subModules()) {
      const moduleNode = moduleMap.get(sm.moduleId);
      const subModuleNode: SubModuleNode = {
        id: sm.id,
        name: sm.subModuleName,
        code: sm.subModuleCode,
        moduleId: sm.moduleId,
        screens: [],
      };
      moduleNode?.subModules.push(subModuleNode);
    }
    for (const s of this.screens()) {
      const subModuleNode = [...moduleMap.values()].flatMap((mn) => mn.subModules).find((sm) => sm.id === s.subModuleId);
      subModuleNode?.screens.push({
        id: s.id,
        name: s.screenName,
        code: s.screenCode,
        subModuleId: s.subModuleId,
      });
    }
    const workspaceMap = new Map<number, WorkspaceNode>();
    for (const w of this.workspaces()) {
      workspaceMap.set(w.id, {
        id: w.id,
        name: w.workspaceName,
        code: w.workspaceCode,
        domains: [],
      });
    }
    for (const dn of domainMap.values()) {
      const ws = workspaceMap.get(dn.workspaceId);
      ws?.domains.push(dn);
    }
    return [...workspaceMap.values()];
  });

  protected readonly selectedRoleName = computed(() => {
    const roleId = parseInt(this.selectedRoleId(), 10);
    const role = this.roles().find((r) => r.roleId === roleId);
    return role?.name ?? '';
  });

  protected readonly totalPermissions = computed(() => {
    let count = 0;
    for (const v of this.permissionState().values()) {
      if (v) count++;
    }
    return count;
  });

  constructor() {
    void this.loadInitial();
  }

  private async loadInitial(): Promise<void> {
    this.loading.set(true);
    try {
      const [roles, workspaces, domains, modules, subModules, screens, actions] = await Promise.all([
        firstValueFrom(this.http.get<Role[]>('/api/roles')),
        firstValueFrom(this.http.get<Workspace[]>('/api/workspaces')),
        firstValueFrom(this.http.get<Domain[]>('/api/domains')),
        firstValueFrom(this.http.get<Module[]>('/api/modules')),
        firstValueFrom(this.http.get<SubModule[]>('/api/submodules')),
        firstValueFrom(this.http.get<Screen[]>('/api/screens')),
        firstValueFrom(this.http.get<Action[]>('/api/actions')),
      ]);
      this.roles.set(roles);
      this.workspaces.set(workspaces.filter((w) => w.isActive));
      this.domains.set(domains.filter((d) => d.isActive));
      this.modules.set(modules.filter((m) => m.isActive));
      this.subModules.set(subModules.filter((s) => s.isActive));
      this.screens.set(screens.filter((s) => s.isActive));
      this.actions.set(actions.filter((a) => a.isActive));
    } catch {
      this.toast.error('Failed to load permission data');
    } finally {
      this.loading.set(false);
    }
  }

  protected async onRoleChange(): Promise<void> {
    const roleId = parseInt(this.selectedRoleId(), 10);
    if (!roleId) {
      this.existingPermissions.set([]);
      this.permissionState.set(new Map());
      return;
    }
    this.loading.set(true);
    try {
      const permissions = await firstValueFrom(
        this.http.get<RolePermissionEntry[]>(`/api/role-permissions/role/${roleId}`),
      );
      this.existingPermissions.set(permissions);
      this.buildPermissionState(permissions);
      this.expandAll();
    } catch {
      this.toast.error('Failed to load role permissions');
    } finally {
      this.loading.set(false);
    }
  }

  private buildPermissionState(permissions: RolePermissionEntry[]): void {
    const state = new Map<string, boolean>();
    for (const p of permissions) {
      const key = this.makeKey(p.screenId, p.actionId);
      state.set(key, p.allow);
    }
    this.permissionState.set(state);
  }

  private makeKey(screenId: number, actionId: number): string {
    return `${screenId}:${actionId}`;
  }

  protected isAllowed(screenId: number, actionId: number): boolean {
    return this.permissionState().get(this.makeKey(screenId, actionId)) ?? false;
  }

  protected toggleCell(screenId: number, actionId: number): void {
    const key = this.makeKey(screenId, actionId);
    const current = this.permissionState().get(key) ?? false;
    const next = new Map(this.permissionState());
    next.set(key, !current);
    this.permissionState.set(next);
  }

  protected toggleWorkspace(ws: WorkspaceNode, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const next = new Map(this.permissionState());
    for (const domain of ws.domains) {
      for (const mod of domain.modules) {
        for (const sub of mod.subModules) {
          for (const screen of sub.screens) {
            for (const action of this.actions()) {
              next.set(this.makeKey(screen.id, action.id), checked);
            }
          }
        }
      }
    }
    this.permissionState.set(next);
  }

  protected toggleDomain(domain: DomainNode, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const next = new Map(this.permissionState());
    for (const mod of domain.modules) {
      for (const sub of mod.subModules) {
        for (const screen of sub.screens) {
          for (const action of this.actions()) {
            next.set(this.makeKey(screen.id, action.id), checked);
          }
        }
      }
    }
    this.permissionState.set(next);
  }

  protected toggleModule(mod: ModuleNode, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const next = new Map(this.permissionState());
    for (const sub of mod.subModules) {
      for (const screen of sub.screens) {
        for (const action of this.actions()) {
          next.set(this.makeKey(screen.id, action.id), checked);
        }
      }
    }
    this.permissionState.set(next);
  }

  protected toggleSubModule(sub: SubModuleNode, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const next = new Map(this.permissionState());
    for (const screen of sub.screens) {
      for (const action of this.actions()) {
        next.set(this.makeKey(screen.id, action.id), checked);
      }
    }
    this.permissionState.set(next);
  }

  protected toggleScreen(screen: ScreenNode, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const next = new Map(this.permissionState());
    for (const action of this.actions()) {
      next.set(this.makeKey(screen.id, action.id), checked);
    }
    this.permissionState.set(next);
  }

  protected toggleActionColumn(actionId: number, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const next = new Map(this.permissionState());
    for (const ws of this.tree()) {
      for (const domain of ws.domains) {
        for (const mod of domain.modules) {
          for (const sub of mod.subModules) {
            for (const screen of sub.screens) {
              next.set(this.makeKey(screen.id, actionId), checked);
            }
          }
        }
      }
    }
    this.permissionState.set(next);
  }

  protected isWorkspaceChecked(ws: WorkspaceNode): boolean {
    for (const domain of ws.domains) {
      for (const mod of domain.modules) {
        for (const sub of mod.subModules) {
          for (const screen of sub.screens) {
            for (const action of this.actions()) {
              if (!this.isAllowed(screen.id, action.id)) return false;
            }
          }
        }
      }
    }
    return ws.domains.length > 0;
  }

  protected isWorkspaceIndeterminate(ws: WorkspaceNode): boolean {
    if (this.isWorkspaceChecked(ws)) return false;
    for (const domain of ws.domains) {
      for (const mod of domain.modules) {
        for (const sub of mod.subModules) {
          for (const screen of sub.screens) {
            for (const action of this.actions()) {
              if (this.isAllowed(screen.id, action.id)) return true;
            }
          }
        }
      }
    }
    return false;
  }

  protected isDomainChecked(domain: DomainNode): boolean {
    for (const mod of domain.modules) {
      for (const sub of mod.subModules) {
        for (const screen of sub.screens) {
          for (const action of this.actions()) {
            if (!this.isAllowed(screen.id, action.id)) return false;
          }
        }
      }
    }
    return domain.modules.length > 0;
  }

  protected isDomainIndeterminate(domain: DomainNode): boolean {
    if (this.isDomainChecked(domain)) return false;
    for (const mod of domain.modules) {
      for (const sub of mod.subModules) {
        for (const screen of sub.screens) {
          for (const action of this.actions()) {
            if (this.isAllowed(screen.id, action.id)) return true;
          }
        }
      }
    }
    return false;
  }

  protected isModuleChecked(mod: ModuleNode): boolean {
    for (const sub of mod.subModules) {
      for (const screen of sub.screens) {
        for (const action of this.actions()) {
          if (!this.isAllowed(screen.id, action.id)) return false;
        }
      }
    }
    return mod.subModules.length > 0;
  }

  protected isModuleIndeterminate(mod: ModuleNode): boolean {
    if (this.isModuleChecked(mod)) return false;
    for (const sub of mod.subModules) {
      for (const screen of sub.screens) {
        for (const action of this.actions()) {
          if (this.isAllowed(screen.id, action.id)) return true;
        }
      }
    }
    return false;
  }

  protected isSubModuleChecked(sub: SubModuleNode): boolean {
    for (const screen of sub.screens) {
      for (const action of this.actions()) {
        if (!this.isAllowed(screen.id, action.id)) return false;
      }
    }
    return sub.screens.length > 0;
  }

  protected isSubModuleIndeterminate(sub: SubModuleNode): boolean {
    if (this.isSubModuleChecked(sub)) return false;
    for (const screen of sub.screens) {
      for (const action of this.actions()) {
        if (this.isAllowed(screen.id, action.id)) return true;
      }
    }
    return false;
  }

  protected isScreenChecked(screen: ScreenNode): boolean {
    for (const action of this.actions()) {
      if (!this.isAllowed(screen.id, action.id)) return false;
    }
    return this.actions().length > 0;
  }

  protected isScreenIndeterminate(screen: ScreenNode): boolean {
    if (this.isScreenChecked(screen)) return false;
    for (const action of this.actions()) {
      if (this.isAllowed(screen.id, action.id)) return true;
    }
    return false;
  }

  protected isActionColumnChecked(actionId: number): boolean {
    for (const ws of this.tree()) {
      for (const domain of ws.domains) {
        for (const mod of domain.modules) {
          for (const sub of mod.subModules) {
            for (const screen of sub.screens) {
              if (!this.isAllowed(screen.id, actionId)) return false;
            }
          }
        }
      }
    }
    return this.screens().length > 0;
  }

  protected isActionColumnIndeterminate(actionId: number): boolean {
    if (this.isActionColumnChecked(actionId)) return false;
    for (const ws of this.tree()) {
      for (const domain of ws.domains) {
        for (const mod of domain.modules) {
          for (const sub of mod.subModules) {
            for (const screen of sub.screens) {
              if (this.isAllowed(screen.id, actionId)) return true;
            }
          }
        }
      }
    }
    return false;
  }

  protected toggleWorkspaceExpand(wsId: number): void {
    const set = new Set(this.expandedWorkspaces());
    if (set.has(wsId)) {
      set.delete(wsId);
    } else {
      set.add(wsId);
    }
    this.expandedWorkspaces.set(set);
  }

  protected toggleDomainExpand(domainId: number): void {
    const set = new Set(this.expandedDomains());
    if (set.has(domainId)) {
      set.delete(domainId);
    } else {
      set.add(domainId);
    }
    this.expandedDomains.set(set);
  }

  protected toggleModuleExpand(moduleId: number): void {
    const set = new Set(this.expandedModules());
    if (set.has(moduleId)) {
      set.delete(moduleId);
    } else {
      set.add(moduleId);
    }
    this.expandedModules.set(set);
  }

  protected toggleSubModuleExpand(subModuleId: number): void {
    const set = new Set(this.expandedSubModules());
    if (set.has(subModuleId)) {
      set.delete(subModuleId);
    } else {
      set.add(subModuleId);
    }
    this.expandedSubModules.set(set);
  }

  protected isWorkspaceExpanded(wsId: number): boolean {
    return this.expandedWorkspaces().has(wsId);
  }

  protected isDomainExpanded(domainId: number): boolean {
    return this.expandedDomains().has(domainId);
  }

  protected isModuleExpanded(moduleId: number): boolean {
    return this.expandedModules().has(moduleId);
  }

  protected isSubModuleExpanded(subModuleId: number): boolean {
    return this.expandedSubModules().has(subModuleId);
  }

  private expandAll(): void {
    const wsIds = new Set(this.tree().map((w) => w.id));
    const domainIds = new Set(this.domains().map((d) => d.id));
    const moduleIds = new Set(this.modules().map((m) => m.id));
    const subModuleIds = new Set(this.subModules().map((sm) => sm.id));
    this.expandedWorkspaces.set(wsIds);
    this.expandedDomains.set(domainIds);
    this.expandedModules.set(moduleIds);
    this.expandedSubModules.set(subModuleIds);
  }

  protected expandAllNodes(): void {
    this.expandAll();
  }

  protected collapseAll(): void {
    this.expandedWorkspaces.set(new Set());
    this.expandedDomains.set(new Set());
    this.expandedModules.set(new Set());
    this.expandedSubModules.set(new Set());
    this.expandedScreens.set(new Set());
  }

  protected selectAll(): void {
    const next = new Map<string, boolean>();
    for (const ws of this.tree()) {
      for (const domain of ws.domains) {
        for (const mod of domain.modules) {
          for (const sub of mod.subModules) {
            for (const screen of sub.screens) {
              for (const action of this.actions()) {
                next.set(this.makeKey(screen.id, action.id), true);
              }
            }
          }
        }
      }
    }
    this.permissionState.set(next);
  }

  protected clearAll(): void {
    this.permissionState.set(new Map());
  }

  protected async save(): Promise<void> {
    const roleId = parseInt(this.selectedRoleId(), 10);
    if (!roleId || this.saving()) return;
    this.saving.set(true);
    try {
      const permissions: {
        workspaceId: number;
        domainId: number;
        moduleId: number;
        subModuleId: number;
        screenId: number;
        actionId: number;
        allow: boolean;
      }[] = [];
      const state = this.permissionState();
      for (const ws of this.tree()) {
        for (const domain of ws.domains) {
          for (const mod of domain.modules) {
            for (const sub of mod.subModules) {
              for (const screen of sub.screens) {
                for (const action of this.actions()) {
                  const key = this.makeKey(screen.id, action.id);
                  if (state.has(key)) {
                    permissions.push({
                      workspaceId: ws.id,
                      domainId: domain.id,
                      moduleId: mod.id,
                      subModuleId: sub.id,
                      screenId: screen.id,
                      actionId: action.id,
                      allow: state.get(key)!,
                    });
                  }
                }
              }
            }
          }
        }
      }
      await firstValueFrom(
        this.http.post('/api/role-permissions/bulk', { roleId, permissions }),
      );
      this.toast.success('Permissions saved successfully');
    } catch {
      this.toast.error('Failed to save permissions');
    } finally {
      this.saving.set(false);
    }
  }

  protected getWorkspaceScreenCount(ws: WorkspaceNode): number {
    let count = 0;
    for (const domain of ws.domains) {
      for (const mod of domain.modules) {
        for (const sub of mod.subModules) {
          count += sub.screens.length;
        }
      }
    }
    return count;
  }

  protected getDomainScreenCount(domain: DomainNode): number {
    let count = 0;
    for (const mod of domain.modules) {
      for (const sub of mod.subModules) {
        count += sub.screens.length;
      }
    }
    return count;
  }
}
