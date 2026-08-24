import { Component, Input } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { RouterModule } from '@angular/router';

import {
  WorkspaceModel,
  WorkspaceScreenLink,
  ShortcutCard,
  QuickAction,
} from './workspace.model';

@Component({
  selector: 'app-workspace-template',
  standalone: true,
  imports: [
    LucideAngularModule,
    RouterModule
  ],
  templateUrl: './workspace-template.html',
  styleUrls: ['./workspace-template.css']
})
export class WorkspaceTemplate {

  @Input({ required: true })
  workspace!: WorkspaceModel;

  protected onScreenClick(screen: WorkspaceScreenLink): void {
    console.log('[workspace] screen link clicked:', { title: screen.title, route: screen.route });
  }

  protected onShortcutClick(card: ShortcutCard): void {
    console.log('[workspace] shortcut clicked:', { title: card.title, route: card.route });
  }

  protected onQuickActionClick(action: QuickAction): void {
    console.log('[workspace] quick action clicked:', { title: action.title, route: action.route });
  }

}