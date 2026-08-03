import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { BusinessTypesPage } from '../business-types/business-types';
import { IndustryTypesPage } from '../industry-types/industry-types';
import { CompanyGroupsPage } from '../company-groups/company-groups';
import { LocationsPage } from '../locations/locations';

type MasterTab = 'business-types' | 'industry-types' | 'company-groups' | 'locations';

const TABS: { id: MasterTab; label: string; icon: string }[] = [
  { id: 'business-types', label: 'Business Types', icon: 'store' },
  { id: 'industry-types', label: 'Industry Types', icon: 'factory' },
  { id: 'company-groups', label: 'Company Groups', icon: 'network' },
  { id: 'locations', label: 'Locations', icon: 'map' },
];

@Component({
  selector: 'app-system-master',
  standalone: true,
  imports: [LucideAngularModule, BusinessTypesPage, IndustryTypesPage, CompanyGroupsPage, LocationsPage],
  templateUrl: './system-master.html',
  styleUrl: './system-master.css',
})
export class SystemMasterPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly tabs = TABS;
  protected readonly tab = signal<MasterTab>('business-types');

  constructor() {
    this.route.queryParamMap.subscribe((params) => {
      const t = params.get('tab') as MasterTab | null;
      if (t && TABS.some((x) => x.id === t)) this.tab.set(t);
    });
  }

  protected setTab(t: MasterTab): void {
    this.tab.set(t);
    this.router.navigate([], { relativeTo: this.route, queryParams: { tab: t }, queryParamsHandling: 'merge' });
  }
}
