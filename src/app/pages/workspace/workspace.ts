import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, distinctUntilChanged, finalize, forkJoin, map, of, switchMap, tap, Observable } from 'rxjs';
import { LucideAngularModule } from 'lucide-angular';
import { WorkspaceTemplate } from '../workspace-template/workspace-template';
import {
  WorkspaceModel,
  WorkspaceDomainModel,
  WorkspaceModuleModel,
  WorkspaceSubModuleModel,
} from '../workspace-template/workspace.model';

@Component({
  selector: 'app-workspace',
  standalone: true,
  imports: [LucideAngularModule, WorkspaceTemplate],
  templateUrl: './workspace.html',
})
export class WorkspacePage {
  private readonly route = inject(ActivatedRoute);
  private readonly http = inject(HttpClient);

  protected readonly loading = signal(true);
  protected readonly notFound = signal(false);
  protected readonly model = signal<WorkspaceModel | null>(null);

  // Tracks the workspace currently being loaded so a slow/stale response
  // from a previously selected workspace can never overwrite the new one.
  private currentId = signal<number | null>(null);

  constructor() {
    this.route.paramMap
      .pipe(
        map((params) => Number(params.get('id'))),
        distinctUntilChanged(),
        switchMap((id) => this.loadWorkspace(id)),
        takeUntilDestroyed()
      )
      .subscribe();
  }

  private loadWorkspace(id: number): Observable<WorkspaceModel | null> {
    // Requirement #5: clear previous workspace data immediately.
    if (!Number.isFinite(id) || id <= 0) {
      this.currentId.set(null);
      this.model.set(null);
      this.notFound.set(true);
      this.loading.set(false);
      return of(null);
    }

    this.currentId.set(id);
    this.loading.set(true);
    this.notFound.set(false);
    this.model.set(null);

    return forkJoin({
      workspaces: this.http.get<any[]>('/api/workspaces'),
      domains: this.http.get<any[]>('/api/domains'),
      modules: this.http.get<any[]>('/api/modules'),
      subModules: this.http.get<any[]>('/api/submodules'),
      screens: this.http.get<any[]>('/api/screens'),
    }).pipe(
      map(({ workspaces, domains, modules, subModules, screens }) =>
        this.buildModel(workspaces ?? [], domains ?? [], modules ?? [], subModules ?? [], screens ?? [], id)
      ),
      tap((built) => {
        // Only apply if this workspace is still the selected one.
        if (this.currentId() !== id) return;
        if (built) {
          this.model.set(built);
          this.notFound.set(false);
        } else {
          this.notFound.set(true);
        }
      }),
      catchError(() => {
        if (this.currentId() === id) {
          this.notFound.set(true);
        }
        return of(null);
      }),
      finalize(() => {
        if (this.currentId() === id) {
          this.loading.set(false);
        }
      })
    );
  }

  private buildModel(
    workspaces: any[],
    domains: any[],
    modules: any[],
    subModules: any[],
    screens: any[],
    id: number
  ): WorkspaceModel | null {
    const ws = workspaces.find((w) => w.id === id);
    if (!ws) {
      return null;
    }

    const myDomains = domains.filter((d) => d.workspaceId === id);
    const domainIds = new Set(myDomains.map((d) => d.id));
    const myModules = modules.filter((m) => domainIds.has(m.domainId));
    const moduleIds = new Set(myModules.map((m) => m.id));
    const mySubs = subModules.filter((sm) => moduleIds.has(sm.moduleId));
    const subIds = new Set(mySubs.map((sm) => sm.id));
    const myScreens = screens.filter((s) => subIds.has(s.subModuleId));

    const domainsModel: WorkspaceDomainModel[] = myDomains.map((d) => {
      const dModules = myModules
        .filter((m) => m.domainId === d.id)
        .map((m) => {
          const mSubs: WorkspaceSubModuleModel[] = mySubs
            .filter((sm) => sm.moduleId === m.id)
            .map((sm) => ({
              id: sm.id,
              title: sm.subModuleName,
              icon: sm.icon,
              screens: myScreens
                .filter((s) => s.subModuleId === sm.id && s.routeUrl)
                .map((s) => ({ id: s.id, title: s.screenName, route: s.routeUrl })),
            }));
          return { id: m.id, title: m.moduleName, icon: m.icon, subModules: mSubs } as WorkspaceModuleModel;
        });
      return { id: d.id, title: d.domainName, icon: d.icon, modules: dModules } as WorkspaceDomainModel;
    });

    return {
      id: ws.id,
      title: ws.workspaceName,
      icon: ws.icon || 'layout-grid',
      description: '',
      quickActions: [],
      shortcuts: [],
      recentActivities: [],
      favorites: [],
      domains: domainsModel,
    };
  }
}
