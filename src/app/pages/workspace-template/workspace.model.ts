// workspace.model.ts

export interface MenuItem {
  id: number;
  title: string;
  icon: string;
  route: string;

  parentId?: number;
  badge?: number;
  isVisible?: boolean;
  isEnabled?: boolean;
}

export interface ShortcutCard {
  id: number;

  title: string;

  description: string;

  icon: string;

  route: string;

  count?: number;

  badge?: string;

  color?: string;

  isFavorite?: boolean;

  isVisible?: boolean;
}

export interface Activity {

  id: number;

  title: string;

  description: string;

  time: string;

  icon?: string;

  route?: string;

}

export interface QuickAction {

  id: number;

  title: string;

  icon: string;

  route?: string;

  color?: string;

}

export interface Favorite {

  id: number;

  title: string;

  icon: string;

  route: string;

}

export interface WorkspaceScreenLink {
  id: number;
  title: string;
  route: string;
}

export interface WorkspaceSubModuleModel {
  id: number;
  title: string;
  icon?: string;
  screens: WorkspaceScreenLink[];
}

export interface WorkspaceModuleModel {
  id: number;
  title: string;
  icon?: string;
  subModules: WorkspaceSubModuleModel[];
}

export interface WorkspaceDomainModel {
  id: number;
  title: string;
  icon?: string;
  modules: WorkspaceModuleModel[];
}

export interface WorkspaceModel {

  id: number;

  domains?: WorkspaceDomainModel[];

  title: string;

  icon: string;

  description: string;

  route?: string;

  quickActions: QuickAction[];

  shortcuts: ShortcutCard[];

  recentActivities: Activity[];

  favorites: Favorite[];

}