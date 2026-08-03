import { HttpClient } from '@angular/common/http';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { LucideAngularModule } from 'lucide-angular';
import { BaseEmpty, BasePill } from '../../shared/base-data';
import { BaseButton } from '../../shared/base-button';
import { BaseDialog } from '../../shared/base-feedback';
import { BaseDropdown, BaseInput, BaseSearch, DropdownOption } from '../../shared/base-controls';
import { BasePermission } from '../../shared/base-permission';
import { City, Country, State } from '../../core/models';
import { ToastService } from '../../core/services/toast.service';

type Tab = 'countries' | 'states' | 'cities';

@Component({
  selector: 'app-locations',
  standalone: true,
  imports: [LucideAngularModule, BaseEmpty, BasePill, BaseButton, BaseDialog, BaseInput, BaseSearch, BaseDropdown, BasePermission],
  templateUrl: './locations.html',
  styleUrl: './locations.css',
})
export class LocationsPage {
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);

  protected readonly tab = signal<Tab>('countries');

  protected readonly countries = signal<Country[]>([]);
  protected readonly states = signal<State[]>([]);
  protected readonly cities = signal<City[]>([]);

  protected readonly loading = signal(false);
  protected readonly saving = signal(false);

  protected readonly countrySearch = signal('');
  protected readonly stateSearch = signal('');
  protected readonly citySearch = signal('');

  protected readonly stateCountryFilter = signal('');
  protected readonly cityCountryFilter = signal('');
  protected readonly cityStateFilter = signal('');

  protected readonly dialogOpen = signal(false);
  protected readonly editingCountry = signal<Country | null>(null);
  protected readonly editingState = signal<State | null>(null);
  protected readonly editingCity = signal<City | null>(null);

  protected readonly countryForm = {
    name: signal(''),
    iso2: signal(''),
    iso3: signal(''),
    phone: signal(''),
    currency: signal(''),
    nationality: signal(''),
    isActive: signal(true),
  };

  protected readonly stateForm = {
    countryId: signal(''),
    name: signal(''),
    code: signal(''),
    gstCode: signal(''),
    isActive: signal(true),
  };

  protected readonly cityForm = {
    countryId: signal(''),
    stateId: signal(''),
    name: signal(''),
    postalCode: signal(''),
    latitude: signal(''),
    longitude: signal(''),
    isActive: signal(true),
  };

  protected readonly filteredCountries = computed(() => {
    const q = this.countrySearch().toLowerCase();
    const list = this.countries();
    if (!q) return list;
    return list.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.isoCode2.toLowerCase().includes(q) ||
        c.isoCode3.toLowerCase().includes(q) ||
        (c.nationality ?? '').toLowerCase().includes(q),
    );
  });

  protected readonly filteredStates = computed(() => {
    const q = this.stateSearch().toLowerCase();
    const cid = this.stateCountryFilter();
    return this.states().filter(
      (s) =>
        (!cid || String(s.countryId) === cid) &&
        (!q || s.name.toLowerCase().includes(q) || s.stateCode.toLowerCase().includes(q)),
    );
  });

  protected readonly filteredCities = computed(() => {
    const q = this.citySearch().toLowerCase();
    const cid = this.cityCountryFilter();
    const sid = this.cityStateFilter();
    return this.cities().filter(
      (c) =>
        (!cid || String(c.countryId) === cid) &&
        (!sid || String(c.stateId) === sid) &&
        (!q || c.name.toLowerCase().includes(q) || (c.postalCode ?? '').toLowerCase().includes(q)),
    );
  });

  protected readonly countryOptions = computed<DropdownOption[]>(() =>
    this.countries().map((c) => ({ value: String(c.countryId), label: c.name })),
  );

  protected readonly cityFilterStateOptions = computed<DropdownOption[]>(() => {
    const cid = this.cityCountryFilter();
    return this.states()
      .filter((s) => !cid || String(s.countryId) === cid)
      .map((s) => ({ value: String(s.stateId), label: s.name }));
  });

  protected readonly cityFormStateOptions = computed<DropdownOption[]>(() => {
    const cid = this.cityForm.countryId();
    return this.states()
      .filter((s) => String(s.countryId) === cid)
      .map((s) => ({ value: String(s.stateId), label: s.name }));
  });

  protected readonly dialogTitle = computed(() => {
    switch (this.tab()) {
      case 'countries':
        return this.editingCountry() ? 'Edit Country' : 'Create Country';
      case 'states':
        return this.editingState() ? 'Edit State' : 'Create State';
      default:
        return this.editingCity() ? 'Edit City' : 'Create City';
    }
  });

  protected readonly saveLabel = computed(() => {
    const editing =
      this.tab() === 'countries' ? this.editingCountry() : this.tab() === 'states' ? this.editingState() : this.editingCity();
    return editing ? 'Save Changes' : `Create ${this.tab() === 'countries' ? 'Country' : this.tab() === 'states' ? 'State' : 'City'}`;
  });

  protected readonly canSave = computed(() => {
    switch (this.tab()) {
      case 'countries':
        return !!(this.countryForm.name() && this.countryForm.iso2() && this.countryForm.iso3());
      case 'states':
        return !!(this.stateForm.countryId() && this.stateForm.name() && this.stateForm.code());
      default:
        return !!(this.cityForm.countryId() && this.cityForm.stateId() && this.cityForm.name());
    }
  });

  constructor() {
    void this.loadAll();

    effect(() => {
      const cid = this.cityForm.countryId();
      const sid = this.cityForm.stateId();
      if (sid && (!cid || !this.states().some((s) => String(s.stateId) === sid && String(s.countryId) === cid))) {
        this.cityForm.stateId.set('');
      }
    });

    effect(() => {
      const cid = this.cityCountryFilter();
      const sid = this.cityStateFilter();
      if (sid && (!cid || !this.states().some((s) => String(s.stateId) === sid && String(s.countryId) === cid))) {
        this.cityStateFilter.set('');
      }
    });
  }

  protected setTab(t: Tab): void {
    this.tab.set(t);
  }

  protected openCountryCreate(): void {
    this.editingCountry.set(null);
    this.countryForm.name.set('');
    this.countryForm.iso2.set('');
    this.countryForm.iso3.set('');
    this.countryForm.phone.set('');
    this.countryForm.currency.set('');
    this.countryForm.nationality.set('');
    this.countryForm.isActive.set(true);
    this.dialogOpen.set(true);
  }

  protected openCountryEdit(item: Country): void {
    this.editingCountry.set(item);
    this.countryForm.name.set(item.name);
    this.countryForm.iso2.set(item.isoCode2);
    this.countryForm.iso3.set(item.isoCode3);
    this.countryForm.phone.set(item.phoneCode ?? '');
    this.countryForm.currency.set(item.currencyCode ?? '');
    this.countryForm.nationality.set(item.nationality ?? '');
    this.countryForm.isActive.set(item.isActive);
    this.dialogOpen.set(true);
  }

  protected openStateCreate(): void {
    this.editingState.set(null);
    this.stateForm.countryId.set(this.stateCountryFilter());
    this.stateForm.name.set('');
    this.stateForm.code.set('');
    this.stateForm.gstCode.set('');
    this.stateForm.isActive.set(true);
    this.dialogOpen.set(true);
  }

  protected openStateEdit(item: State): void {
    this.editingState.set(item);
    this.stateForm.countryId.set(String(item.countryId));
    this.stateForm.name.set(item.name);
    this.stateForm.code.set(item.stateCode);
    this.stateForm.gstCode.set(item.gstStateCode ?? '');
    this.stateForm.isActive.set(item.isActive);
    this.dialogOpen.set(true);
  }

  protected openCityCreate(): void {
    this.editingCity.set(null);
    this.cityForm.countryId.set(this.cityCountryFilter());
    this.cityForm.stateId.set('');
    this.cityForm.name.set('');
    this.cityForm.postalCode.set('');
    this.cityForm.latitude.set('');
    this.cityForm.longitude.set('');
    this.cityForm.isActive.set(true);
    this.dialogOpen.set(true);
  }

  protected openCityEdit(item: City): void {
    this.editingCity.set(item);
    this.cityForm.countryId.set(String(item.countryId));
    this.cityForm.stateId.set(String(item.stateId));
    this.cityForm.name.set(item.name);
    this.cityForm.postalCode.set(item.postalCode ?? '');
    this.cityForm.latitude.set(item.latitude != null ? String(item.latitude) : '');
    this.cityForm.longitude.set(item.longitude != null ? String(item.longitude) : '');
    this.cityForm.isActive.set(item.isActive);
    this.dialogOpen.set(true);
  }

  protected onActiveChange(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    if (this.tab() === 'countries') this.countryForm.isActive.set(checked);
    else if (this.tab() === 'states') this.stateForm.isActive.set(checked);
    else this.cityForm.isActive.set(checked);
  }

  protected async save(): Promise<void> {
    if (this.saving() || !this.canSave()) return;
    this.saving.set(true);
    try {
      if (this.tab() === 'countries') await this.saveCountry();
      else if (this.tab() === 'states') await this.saveState();
      else await this.saveCity();
      this.dialogOpen.set(false);
      await this.loadAll();
    } catch {
      /* handled by interceptor */
    } finally {
      this.saving.set(false);
    }
  }

  private async saveCountry(): Promise<void> {
    const payload = {
      name: this.countryForm.name().trim(),
      isoCode2: this.countryForm.iso2().trim().toUpperCase(),
      isoCode3: this.countryForm.iso3().trim().toUpperCase(),
      phoneCode: this.countryForm.phone().trim() || null,
      currencyCode: this.countryForm.currency().trim() || null,
      nationality: this.countryForm.nationality().trim() || null,
    };
    if (this.editingCountry()) {
      await firstValueFrom(
        this.http.put(`/api/countries/${this.editingCountry()!.countryId}`, {
          ...payload,
          isActive: this.countryForm.isActive(),
        }),
      );
      this.toast.success('Country updated');
    } else {
      await firstValueFrom(this.http.post('/api/countries', payload));
      this.toast.success('Country created');
    }
  }

  private async saveState(): Promise<void> {
    const payload = {
      countryId: parseInt(this.stateForm.countryId(), 10),
      name: this.stateForm.name().trim(),
      stateCode: this.stateForm.code().trim().toUpperCase(),
      gstStateCode: this.stateForm.gstCode().trim() || null,
    };
    if (this.editingState()) {
      await firstValueFrom(
        this.http.put(`/api/states/${this.editingState()!.stateId}`, { ...payload, isActive: this.stateForm.isActive() }),
      );
      this.toast.success('State updated');
    } else {
      await firstValueFrom(this.http.post('/api/states', payload));
      this.toast.success('State created');
    }
  }

  private async saveCity(): Promise<void> {
    const payload = {
      countryId: parseInt(this.cityForm.countryId(), 10),
      stateId: parseInt(this.cityForm.stateId(), 10),
      name: this.cityForm.name().trim(),
      postalCode: this.cityForm.postalCode().trim() || null,
      latitude: this.cityForm.latitude() ? parseFloat(this.cityForm.latitude()) : null,
      longitude: this.cityForm.longitude() ? parseFloat(this.cityForm.longitude()) : null,
    };
    if (this.editingCity()) {
      await firstValueFrom(
        this.http.put(`/api/cities/${this.editingCity()!.cityId}`, { ...payload, isActive: this.cityForm.isActive() }),
      );
      this.toast.success('City updated');
    } else {
      await firstValueFrom(this.http.post('/api/cities', payload));
      this.toast.success('City created');
    }
  }

  protected async removeCountry(item: Country): Promise<void> {
    if (!confirm(`Delete country "${item.name}"? This cannot be undone.`)) return;
    try {
      await firstValueFrom(this.http.delete(`/api/countries/${item.countryId}`));
      this.toast.success('Country deleted');
      await this.loadAll();
    } catch {
      /* handled by interceptor */
    }
  }

  protected async removeState(item: State): Promise<void> {
    if (!confirm(`Delete state "${item.name}"? This cannot be undone.`)) return;
    try {
      await firstValueFrom(this.http.delete(`/api/states/${item.stateId}`));
      this.toast.success('State deleted');
      await this.loadAll();
    } catch {
      /* handled by interceptor */
    }
  }

  protected async removeCity(item: City): Promise<void> {
    if (!confirm(`Delete city "${item.name}"? This cannot be undone.`)) return;
    try {
      await firstValueFrom(this.http.delete(`/api/cities/${item.cityId}`));
      this.toast.success('City deleted');
      await this.loadAll();
    } catch {
      /* handled by interceptor */
    }
  }

  private async loadAll(): Promise<void> {
    this.loading.set(true);
    try {
      const [countries, states, cities] = await Promise.all([
        firstValueFrom(this.http.get<Country[]>('/api/countries?includeInactive=true')),
        firstValueFrom(this.http.get<State[]>('/api/states?includeInactive=true')),
        firstValueFrom(this.http.get<City[]>('/api/cities?includeInactive=true')),
      ]);
      this.countries.set(countries);
      this.states.set(states);
      this.cities.set(cities);
    } catch {
      this.toast.error('Failed to load locations');
    } finally {
      this.loading.set(false);
    }
  }
}
