import { Component, Input } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { RouterModule } from '@angular/router';

import { WorkspaceModel } from './workspace.model';

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

}