import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { distinctUntilChanged, map, of, switchMap, catchError } from 'rxjs';
import { LucideAngularModule } from 'lucide-angular';
import { WorkspaceTemplate } from '../workspace-template/workspace-template';
import { NavigationStoreService, NavWorkspace } from '../../core/services/navigation-store.service';
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
  private readonly nav = inject(NavigationStoreService);

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

  private loadWorkspace(id: number) {
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

    // The tree is already filtered to CanView screens by the backend, so no
    // client-side permission masks or master /api/screens calls happen here.
    return of(id).pipe(
      switchMap(async (wid) => {
        const nav = await this.nav.ensureLoaded();
        return this.buildModel(nav.workspaces ?? [], wid);
      }),
      map((built) => {
        if (this.currentId() !== id) return null;
        this.loading.set(false);
        if (built) {
          this.model.set(built);
          this.notFound.set(false);
        } else {
          this.notFound.set(true);
        }
        return built;
      }),
      catchError(() => {
        if (this.currentId() === id) {
          this.loading.set(false);
          this.notFound.set(true);
        }
        return of(null);
      })
    );
  }

  private buildModel(workspaces: NavWorkspace[], id: number): WorkspaceModel | null {
    const ws = workspaces.find((w) => w.id === id);
    if (!ws) {
      return null;
    }

    const domainsModel: WorkspaceDomainModel[] = (ws.domains ?? [])
      .map((d) => {
        const modulesModel: WorkspaceModuleModel[] = (d.modules ?? [])
          .map((m) => {
            const subsModel: WorkspaceSubModuleModel[] = (m.subModules ?? [])
              .map((sm) => ({
                id: sm.id,
                title: sm.name,
                icon: sm.icon ?? undefined,
                screens: (sm.screens ?? [])
                  .filter((s) => s.routeUrl)
                  .map((s) => ({ id: s.id, title: s.name, route: s.routeUrl! })),
              }))
              .filter((sub) => sub.screens.length > 0);
            return { id: m.id, title: m.name, icon: m.icon ?? undefined, subModules: subsModel } as WorkspaceModuleModel;
          })
          .filter((mod) => mod.subModules.length > 0);
        return { id: d.id, title: d.name, icon: d.icon ?? undefined, modules: modulesModel } as WorkspaceDomainModel;
      })
      .filter((dom) => dom.modules.length > 0);

    return {
      id: ws.id,
      title: ws.name,
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