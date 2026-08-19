import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { LucideAngularModule } from 'lucide-angular';
import { BusinessTypesPage } from '../business-types/business-types';
import { IndustryTypesPage } from '../industry-types/industry-types';
import { CompanyGroupsPage } from '../company-groups/company-groups';
import { LocationsPage } from '../locations/locations';
import { LanguagesPage } from '../languages/languages';
import { TimeZonesPage } from '../time-zones/time-zones';
import { GstRegistrationTypesPage } from '../gst-registration-types/gst-registration-types';
import { AddressTypesPage } from '../address-types/address-types';
import { ContactTypesPage } from '../contact-types/contact-types';
import { DocumentTypesPage } from '../document-types/document-types';
import { OrganizationTypesPage } from '../organization-types/organization-types';
import { CurrenciesPage } from '../currencies/currencies';
import { BusinessPartnerRolesPage } from '../business-partner-roles/business-partner-roles';

type MasterTab = 'business-types' | 'industry-types' | 'company-groups' | 'locations' | 'languages' | 'time-zones' | 'gst-registration-types' | 'address-types' | 'contact-types' | 'document-types' | 'organization-types' | 'currencies' | 'business-partner-roles';

const TABS: { id: MasterTab; label: string; icon: string }[] = [
  { id: 'business-types', label: 'Business Types', icon: 'store' },
  { id: 'industry-types', label: 'Industry Types', icon: 'factory' },
  { id: 'company-groups', label: 'Company Groups', icon: 'network' },
  { id: 'locations', label: 'Locations', icon: 'map' },
  { id: 'languages', label: 'Languages', icon: 'languages' },
  { id: 'time-zones', label: 'Time Zones', icon: 'clock' },
  { id: 'gst-registration-types', label: 'GST Registration Types', icon: 'file-text' },
  { id: 'address-types', label: 'Address Types', icon: 'map-pin' },
  { id: 'contact-types', label: 'Contact Types', icon: 'user' },
  { id: 'document-types', label: 'Document Types', icon: 'file' },
  { id: 'organization-types', label: 'Organization Types', icon: 'layers' },
  { id: 'currencies', label: 'Currencies', icon: 'coins' },
  { id: 'business-partner-roles', label: 'Business Partner Roles', icon: 'users-round' },
];

@Component({
  selector: 'app-system-master',
  standalone: true,
  imports: [LucideAngularModule, BusinessTypesPage, IndustryTypesPage, CompanyGroupsPage, LocationsPage, LanguagesPage, TimeZonesPage, GstRegistrationTypesPage, AddressTypesPage, ContactTypesPage, DocumentTypesPage, OrganizationTypesPage, CurrenciesPage, BusinessPartnerRolesPage],
  templateUrl: './system-master.html',
  styleUrl: './system-master.css',
})
export class SystemMasterPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);

  protected readonly tabs = TABS;
  protected readonly tab = signal<MasterTab>('business-types');

  constructor() {
    this.route.queryParamMap.subscribe((params) => {
      const t = params.get('tab') as MasterTab | null;
      if (t && TABS.some((x) => x.id === t)) this.tab.set(t);
    });

    if (!this.auth.user()?.isSuperAdmin) {
      this.router.navigate(['/dashboard']);
    }
  }

  protected setTab(t: MasterTab): void {
    this.tab.set(t);
    this.router.navigate([], { relativeTo: this.route, queryParams: { tab: t }, queryParamsHandling: 'merge' });
  }
}
