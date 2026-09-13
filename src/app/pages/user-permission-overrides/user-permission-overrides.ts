import { HttpClient } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { LucideAngularModule } from 'lucide-angular';
import { BaseButton } from '../../shared/base-button';
import { BaseDropdown, DropdownOption } from '../../shared/base-controls';
import { BaseEmpty } from '../../shared/base-data';
import { BasePermission } from '../../shared/base-permission';
import {
  Workspace,
  Domain,
  Module,
  SubModule,
  Screen,
  Action,
  ErpUser,
  Paginated,
  UserPermissionOverride,
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

type CellState = 'grant' | 'deny';

interface OverrideRecord {
  id: number;
  permissionType: string;
  allow: boolean;
  effectiveFrom: string;
  effectiveTo?: string;
  remarks?: string;
  isActive: boolean;
}

@Component({
  selector: 'app-user-permission-overrides',
  standalone: true,
  imports: [LucideAngularModule, BaseButton, BaseDropdown, BaseEmpty, BasePermission],
  templateUrl: './user-permission-overrides.html',
  styleUrl: './user-permission-overrides.css',
})
export class UserPermissionOverridesPage {
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);
  protected readonly perms = inject(PermissionService);

  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly selectedUserId = signal<string>('');

  protected readonly userOptions = signal<DropdownOption[]>([]);
  protected readonly workspaces = signal<Workspace[]>([]);
  protected readonly domains = signal<Domain[]>([]);
  protected readonly modules = signal<Module[]>([]);
  protected readonly subModules = signal<SubModule[]>([]);
  protected readonly screens = signal<Screen[]>([]);
  protected readonly actions = signal<Action[]>([]);

  protected readonly expandedWorkspaces = signal<Set<number>>(new Set());
  protected readonly expandedDomains = signal<Set<number>>(new Set());
  protected readonly expandedModules = signal<Set<number>>(new Set());
  protected readonly expandedSubModules = signal<Set<number>>(new Set());

  /** Current tri-state (unset when absent) keyed by `${screenId}:${actionId}` */
  protected readonly permissionState = signal<Map<string, CellState>>(new Map());
  /** Originally loaded overrides keyed by `${screenId}:${actionId}`, used to diff on save */
  private originalOverrides = new Map<string, OverrideRecord>();

  protected readonly tree = computed<WorkspaceNode[]>(() => {
    const domainMap = new Map<number, DomainNode>();
    for (const d of this.domains()) {
      domainMap.set(d.id, { id: d.id, name: d.domainName, code: d.domainCode, workspaceId: d.workspaceId, modules: [] });
    }
    const moduleMap = new Map<number, ModuleNode>();
    for (const m of this.modules()) {
      const domainNode = domainMap.get(m.domainId);
      const moduleNode: ModuleNode = { id: m.id, name: m.moduleName, code: m.moduleCode, domainId: m.domainId, subModules: [] };
      moduleMap.set(m.id, moduleNode);
      domainNode?.modules.push(moduleNode);
    }
    for (const sm of this.subModules()) {
      const moduleNode = moduleMap.get(sm.moduleId);
      const subModuleNode: SubModuleNode = { id: sm.id, name: sm.subModuleName, code: sm.subModuleCode, moduleId: sm.moduleId, screens: [] };
      moduleNode?.subModules.push(subModuleNode);
    }
    for (const s of this.screens()) {
      const subModuleNode = [...moduleMap.values()].flatMap((mn) => mn.subModules).find((sm) => sm.id === s.subModuleId);
      subModuleNode?.screens.push({ id: s.id, name: s.screenName, code: s.screenCode, subModuleId: s.subModuleId });
    }
    const workspaceMap = new Map<number, WorkspaceNode>();
    for (const w of this.workspaces()) {
      workspaceMap.set(w.id, { id: w.id, name: w.workspaceName, code: w.workspaceCode, domains: [] });
    }
    for (const dn of domainMap.values()) {
      workspaceMap.get(dn.workspaceId)?.domains.push(dn);
    }
    return [...workspaceMap.values()];
  });

  protected readonly totalOverrides = computed(() => this.permissionState().size);

  constructor() {
    void this.loadUsers();
    void this.loadInitial();
  }

  private async loadInitial(): Promise<void> {
    this.loading.set(true);
    try {
      const [workspaces, domains, modules, subModules, screens, actions] = await Promise.all([
        firstValueFrom(this.http.get<Workspace[]>('/api/workspaces')),
        firstValueFrom(this.http.get<Domain[]>('/api/domains')),
        firstValueFrom(this.http.get<Module[]>('/api/modules')),
        firstValueFrom(this.http.get<SubModule[]>('/api/submodules')),
        firstValueFrom(this.http.get<Screen[]>('/api/screens')),
        firstValueFrom(this.http.get<Action[]>('/api/actions')),
      ]);
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

  private async loadUsers(): Promise<void> {
    try {
      const res = await firstValueFrom(this.http.get<Paginated<ErpUser>>('/api/users?page=1&size=1000&search='));
      this.userOptions.set(res.items.map((u) => ({ value: u.userId, label: `${u.fullName} (${u.username})` })));
    } catch {
      /* handled by interceptor */
    }
  }

  protected async onUserChange(): Promise<void> {
    const userId = this.selectedUserId();
    if (!userId) {
      this.permissionState.set(new Map());
      this.originalOverrides = new Map();
      return;
    }
    this.loading.set(true);
    try {
      const overrides = await firstValueFrom(
        this.http.get<UserPermissionOverride[]>(`/api/user-permission-overrides/user/${userId}`),
      );
      this.buildState(overrides);
      this.expandAll();
    } catch {
      this.toast.error('Failed to load user overrides');
    } finally {
      this.loading.set(false);
    }
  }

  private buildState(overrides: UserPermissionOverride[]): void {
    const state = new Map<string, CellState>();
    const original = new Map<string, OverrideRecord>();
    for (const o of overrides) {
      const key = this.makeKey(o.screenId, o.actionId);
      state.set(key, o.allow ? 'grant' : 'deny');
      original.set(key, {
        id: o.id,
        permissionType: o.permissionType,
        allow: o.allow,
        effectiveFrom: o.effectiveFrom,
        effectiveTo: o.effectiveTo,
        remarks: o.remarks,
        isActive: o.isActive,
      });
    }
    this.permissionState.set(state);
    this.originalOverrides = original;
  }

  private makeKey(screenId: number, actionId: number): string {
    return `${screenId}:${actionId}`;
  }

  protected cellState(screenId: number, actionId: number): CellState | undefined {
    return this.permissionState().get(this.makeKey(screenId, actionId));
  }

  /** Cycles a cell through unset -> grant -> deny -> unset */
  protected toggleCell(screenId: number, actionId: number): void {
    const key = this.makeKey(screenId, actionId);
    const current = this.permissionState().get(key);
    const next = new Map(this.permissionState());
    if (current === undefined) {
      next.set(key, 'grant');
    } else if (current === 'grant') {
      next.set(key, 'deny');
    } else {
      next.delete(key);
    }
    this.permissionState.set(next);
  }

  private setScreensState(screenIds: number[], state: CellState | undefined): void {
    const next = new Map(this.permissionState());
    for (const screenId of screenIds) {
      for (const action of this.actions()) {
        const key = this.makeKey(screenId, action.id);
        if (state === undefined) {
          next.delete(key);
        } else {
          next.set(key, state);
        }
      }
    }
    this.permissionState.set(next);
  }

  private getWorkspaceScreenIds(ws: WorkspaceNode): number[] {
    return ws.domains.flatMap((d) => this.getDomainScreenIds(d));
  }

  private getDomainScreenIds(domain: DomainNode): number[] {
    return domain.modules.flatMap((m) => m.subModules.flatMap((sm) => sm.screens.map((s) => s.id)));
  }

  private getModuleScreenIds(mod: ModuleNode): number[] {
    return mod.subModules.flatMap((sm) => sm.screens.map((s) => s.id));
  }

  private getSubModuleScreenIds(sub: SubModuleNode): number[] {
    return sub.screens.map((s) => s.id);
  }

  protected toggleWorkspace(ws: WorkspaceNode, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.setScreensState(this.getWorkspaceScreenIds(ws), checked ? 'grant' : undefined);
  }

  protected toggleDomain(domain: DomainNode, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.setScreensState(this.getDomainScreenIds(domain), checked ? 'grant' : undefined);
  }

  protected toggleModule(mod: ModuleNode, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.setScreensState(this.getModuleScreenIds(mod), checked ? 'grant' : undefined);
  }

  protected toggleSubModule(sub: SubModuleNode, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.setScreensState(this.getSubModuleScreenIds(sub), checked ? 'grant' : undefined);
  }

  protected toggleScreen(screen: ScreenNode, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.setScreensState([screen.id], checked ? 'grant' : undefined);
  }

  protected toggleActionColumn(actionId: number, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const next = new Map(this.permissionState());
    for (const ws of this.tree()) {
      for (const screenId of this.getWorkspaceScreenIds(ws)) {
        const key = this.makeKey(screenId, actionId);
        if (checked) {
          next.set(key, 'grant');
        } else {
          next.delete(key);
        }
      }
    }
    this.permissionState.set(next);
  }

  private isFullyGranted(screenIds: number[]): boolean {
    if (screenIds.length === 0 || this.actions().length === 0) return false;
    for (const screenId of screenIds) {
      for (const action of this.actions()) {
        if (this.cellState(screenId, action.id) !== 'grant') return false;
      }
    }
    return true;
  }

  private hasAnyOverride(screenIds: number[]): boolean {
    for (const screenId of screenIds) {
      for (const action of this.actions()) {
        if (this.cellState(screenId, action.id) !== undefined) return true;
      }
    }
    return false;
  }

  protected isWorkspaceChecked(ws: WorkspaceNode): boolean {
    return this.isFullyGranted(this.getWorkspaceScreenIds(ws));
  }

  protected isWorkspaceIndeterminate(ws: WorkspaceNode): boolean {
    return !this.isWorkspaceChecked(ws) && this.hasAnyOverride(this.getWorkspaceScreenIds(ws));
  }

  protected isDomainChecked(domain: DomainNode): boolean {
    return this.isFullyGranted(this.getDomainScreenIds(domain));
  }

  protected isDomainIndeterminate(domain: DomainNode): boolean {
    return !this.isDomainChecked(domain) && this.hasAnyOverride(this.getDomainScreenIds(domain));
  }

  protected isModuleChecked(mod: ModuleNode): boolean {
    return this.isFullyGranted(this.getModuleScreenIds(mod));
  }

  protected isModuleIndeterminate(mod: ModuleNode): boolean {
    return !this.isModuleChecked(mod) && this.hasAnyOverride(this.getModuleScreenIds(mod));
  }

  protected isSubModuleChecked(sub: SubModuleNode): boolean {
    return this.isFullyGranted(this.getSubModuleScreenIds(sub));
  }

  protected isSubModuleIndeterminate(sub: SubModuleNode): boolean {
    return !this.isSubModuleChecked(sub) && this.hasAnyOverride(this.getSubModuleScreenIds(sub));
  }

  protected isScreenChecked(screen: ScreenNode): boolean {
    return this.isFullyGranted([screen.id]);
  }

  protected isScreenIndeterminate(screen: ScreenNode): boolean {
    return !this.isScreenChecked(screen) && this.hasAnyOverride([screen.id]);
  }

  protected isActionColumnChecked(actionId: number): boolean {
    const screenIds = this.tree().flatMap((ws) => this.getWorkspaceScreenIds(ws));
    if (screenIds.length === 0) return false;
    return screenIds.every((screenId) => this.cellState(screenId, actionId) === 'grant');
  }

  protected isActionColumnIndeterminate(actionId: number): boolean {
    if (this.isActionColumnChecked(actionId)) return false;
    const screenIds = this.tree().flatMap((ws) => this.getWorkspaceScreenIds(ws));
    return screenIds.some((screenId) => this.cellState(screenId, actionId) !== undefined);
  }

  protected toggleWorkspaceExpand(wsId: number): void {
    const set = new Set(this.expandedWorkspaces());
    set.has(wsId) ? set.delete(wsId) : set.add(wsId);
    this.expandedWorkspaces.set(set);
  }

  protected toggleDomainExpand(domainId: number): void {
    const set = new Set(this.expandedDomains());
    set.has(domainId) ? set.delete(domainId) : set.add(domainId);
    this.expandedDomains.set(set);
  }

  protected toggleModuleExpand(moduleId: number): void {
    const set = new Set(this.expandedModules());
    set.has(moduleId) ? set.delete(moduleId) : set.add(moduleId);
    this.expandedModules.set(set);
  }

  protected toggleSubModuleExpand(subModuleId: number): void {
    const set = new Set(this.expandedSubModules());
    set.has(subModuleId) ? set.delete(subModuleId) : set.add(subModuleId);
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
    this.expandedWorkspaces.set(new Set(this.tree().map((w) => w.id)));
    this.expandedDomains.set(new Set(this.domains().map((d) => d.id)));
    this.expandedModules.set(new Set(this.modules().map((m) => m.id)));
    this.expandedSubModules.set(new Set(this.subModules().map((sm) => sm.id)));
  }

  protected expandAllNodes(): void {
    this.expandAll();
  }

  protected collapseAll(): void {
    this.expandedWorkspaces.set(new Set());
    this.expandedDomains.set(new Set());
    this.expandedModules.set(new Set());
    this.expandedSubModules.set(new Set());
  }

  protected clearAll(): void {
    this.permissionState.set(new Map());
  }

  protected getWorkspaceScreenCount(ws: WorkspaceNode): number {
    return this.getWorkspaceScreenIds(ws).length;
  }

  protected getDomainScreenCount(domain: DomainNode): number {
    return this.getDomainScreenIds(domain).length;
  }

  protected async save(): Promise<void> {
    const userId = parseInt(this.selectedUserId(), 10);
    if (!userId || this.saving()) return;
    this.saving.set(true);
    try {
      const state = this.permissionState();
      const requests: Promise<unknown>[] = [];
      const today = new Date().toISOString().split('T')[0];

      for (const ws of this.tree()) {
        for (const domain of ws.domains) {
          for (const mod of domain.modules) {
            for (const sub of mod.subModules) {
              for (const screen of sub.screens) {
                for (const action of this.actions()) {
                  const key = this.makeKey(screen.id, action.id);
                  const desired = state.get(key);
                  const original = this.originalOverrides.get(key);

                  if (desired === undefined) {
                    if (original) {
                      requests.push(firstValueFrom(this.http.delete(`/api/user-permission-overrides/${original.id}`)));
                    }
                    continue;
                  }

                  const desiredAllow = desired === 'grant';
                  const desiredType = desired === 'grant' ? 'Grant' : 'Deny';

                  if (!original) {
                    requests.push(
                      firstValueFrom(
                        this.http.post('/api/user-permission-overrides', {
                          userId,
                          workspaceId: ws.id,
                          domainId: domain.id,
                          moduleId: mod.id,
                          subModuleId: sub.id,
                          screenId: screen.id,
                          actionId: action.id,
                          permissionType: desiredType,
                          allow: desiredAllow,
                          effectiveFrom: today,
                          isActive: true,
                        }),
                      ),
                    );
                  } else if (original.permissionType !== desiredType || original.allow !== desiredAllow) {
                    requests.push(
                      firstValueFrom(
                        this.http.put(`/api/user-permission-overrides/${original.id}`, {
                          permissionType: desiredType,
                          allow: desiredAllow,
                          effectiveFrom: original.effectiveFrom,
                          effectiveTo: original.effectiveTo ?? null,
                          remarks: original.remarks ?? null,
                          isActive: original.isActive,
                        }),
                      ),
                    );
                  }
                }
              }
            }
          }
        }
      }

      await Promise.all(requests);
      this.toast.success('Overrides saved successfully');
      await this.onUserChange();
    } catch {
      this.toast.error('Failed to save overrides');
    } finally {
      this.saving.set(false);
    }
  }
}
