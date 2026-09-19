import { Component } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { PurchaseReportsWorkspace } from './purchase-reports/purchase-reports-workspace';

@Component({
  selector: 'app-reports-workspace',
  standalone: true,
  imports: [LucideAngularModule, PurchaseReportsWorkspace],
  templateUrl: './reports-workspace.html',
  styleUrl: './reports-workspace.css',
})
export class ReportsWorkspace {}