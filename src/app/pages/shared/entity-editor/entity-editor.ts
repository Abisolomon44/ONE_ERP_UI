import { Component, Input, Output, EventEmitter, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { LucideAngularModule } from 'lucide-angular';

interface LabelOption {
  value: any;
  label: string;
}

@Component({
  selector: 'app-entity-editor',
  standalone: true,
  imports: [FormsModule, LucideAngularModule],
  templateUrl: './entity-editor.html',
  styleUrl: './entity-editor.css',
})
export class EntityEditorComponent implements OnInit {
  private readonly http = inject(HttpClient);

  @Input() model: Record<string, any> = {};

  /** Stable id of the owning entity; children are saved against it. */
  @Input() entityId: number | null = null;

  /** Restrict which sections are shown. Empty/undefined shows all sections. */
  @Input() sections: string[] = [];

  /** Entity type used when the editor has to create the owning entity. */
  @Input() entityType: string = 'COMPANY';

  /** Emitted when a tab save creates the entity (returns the new EntityId). */
  @Output() entityCreated = new EventEmitter<number>();

  private static readonly ALL_SECTIONS: { key: string; label: string; icon: string }[] = [
    { key: 'address', label: 'Address', icon: 'MapPin' },
    { key: 'contact', label: 'Contact', icon: 'UserRound' },
    { key: 'files', label: 'Files', icon: 'Paperclip' },
    { key: 'notes', label: 'Notes', icon: 'StickyNote' },
    { key: 'tags', label: 'Tags', icon: 'Tags' },
  ];

  activeSection = 'address';

  visibleSections(): { key: string; label: string; icon: string }[] {
    const allowed = this.sections?.length
      ? this.sections
      : EntityEditorComponent.ALL_SECTIONS.map((s) => s.key);
    return EntityEditorComponent.ALL_SECTIONS.filter((t) => allowed.includes(t.key));
  }

  addressTypeOptions: LabelOption[] = [];
  contactTypeOptions: LabelOption[] = [];
  countryOptions: LabelOption[] = [];

  private countries: any[] = [];
  private states: any[] = [];
  private cities: any[] = [];

  savingSection: string | null = null;

  async ngOnInit(): Promise<void> {
    await this.loadLookups();
    if (!this.sections.includes(this.activeSection)) {
      const first = this.visibleSections()[0];
      if (first) this.activeSection = first.key;
    }
  }

  private async loadLookups(): Promise<void> {
    const load = async (url: string): Promise<any[]> => {
      try {
        const res: any = await firstValueFrom(this.http.get(url));
        return Array.isArray(res) ? res : (res?.items ?? res?.data ?? []);
      } catch {
        return [];
      }
    };

    this.countries = await load('/api/countries');
    this.states = await load('/api/states');
    this.cities = await load('/api/cities');
    this.addressTypeOptions = (await load('/api/address-types')).map(x => ({ value: x.addressTypeId, label: x.name }));
    this.contactTypeOptions = (await load('/api/contact-types')).map(x => ({ value: x.contactTypeId, label: x.name }));
    this.countryOptions = this.countries.map(c => ({ value: c.countryId, label: c.name }));
  }

  statesFor(row: any): LabelOption[] {
    const cid = row?.countryId;
    return this.states.filter(s => s.countryId === cid).map(s => ({ value: s.stateId, label: s.name }));
  }

  citiesFor(row: any): LabelOption[] {
    const sid = row?.stateId;
    return this.cities.filter(c => c.stateId === sid).map(c => ({ value: c.cityId, label: c.name }));
  }

  onCountryChange(row: any): void {
    row.stateId = null;
    row.cityId = null;
  }

  onStateChange(row: any): void {
    row.cityId = null;
  }

  setSection(section: string): void {
    this.activeSection = section;
  }

  //===========================
  // Independent per-tab save
  //===========================

  private cleanRows(rows: any[]): any[] {
    return (rows ?? []).filter(r => JSON.stringify(r ?? {}).replace(/null|""|false|0/g, '').trim().length > 0);
  }

  private async saveSection(key: string, urlKey: string): Promise<void> {
    if (this.savingSection) return;
    this.savingSection = key;
    try {
      const rows = this.cleanRows(this.model[key]);

      let body: any;
      if (this.entityId != null) {
        body = await firstValueFrom(this.http.put(`/api/entities/${this.entityId}/${urlKey}`, rows));
      } else {
        const entityName = this.model['entityName'] ?? this.model['companyName'] ?? this.model['productName'] ?? this.model['branchName'] ?? '';
        const entityCode = this.model['entityCode'] ?? this.model['companyCode'] ?? this.model['productCode'] ?? '';
        body = await firstValueFrom(this.http.post('/api/entities', {
          entityType: this.entityType || 'COMPANY',
          entityCode: entityCode?.trim(),
          entityName: entityName?.trim(),
          isActive: true,
          [key]: rows,
        }));
        const createdId = body?.entityId ?? body?.EntityId ?? null;
        if (createdId != null) {
          this.entityId = createdId;
          this.entityCreated.emit(createdId);
        }
      }

      const children = body?.[key] ?? body?.[urlKey] ?? null;
      if (Array.isArray(children)) {
        this.model[key] = children;
      } else if (this.entityId != null) {
        const reload = await this.loadEntity(this.entityId);
        if (reload) this.model[key] = reload[key] ?? [];
      }
    } finally {
      this.savingSection = null;
    }
  }

  private async loadEntity(entityId: number): Promise<any | null> {
    try {
      const res: any = await firstValueFrom(this.http.get(`/api/entities/${entityId}`));
      return res ?? null;
    } catch {
      return null;
    }
  }

  async saveAddresses(): Promise<void> { await this.saveSection('addresses', 'addresses'); }
  async saveContacts(): Promise<void> { await this.saveSection('contacts', 'contacts'); }
  async saveFiles(): Promise<void> { await this.saveSection('files', 'files'); }
  async saveNotes(): Promise<void> { await this.saveSection('notes', 'notes'); }
  async saveTags(): Promise<void> { await this.saveSection('tags', 'tags'); }

  //===========================
  // Addresses
  //===========================

  addresses(): any[] {
    if (!Array.isArray(this.model['addresses'])) this.model['addresses'] = [];
    return this.model['addresses'];
  }

  addAddress(): void {
    this.addresses().push({
      addressTypeId: null,
      addressLine1: '',
      addressLine2: '',
      addressLine3: '',
      addressLine4: '',
      addressLine5: '',
      landmark: '',
      countryId: null,
      stateId: null,
      cityId: null,
      postalCode: '',
      isPrimary: false,
    });
  }

  removeAddress(index: number): void {
    this.addresses().splice(index, 1);
  }

  //===========================
  // Contacts
  //===========================

  contacts(): any[] {
    if (!Array.isArray(this.model['contacts'])) this.model['contacts'] = [];
    return this.model['contacts'];
  }

  addContact(): void {
    this.contacts().push({
      contactTypeId: null,
      contactName: '',
      designation: '',
      email: '',
      mobile: '',
      phone: '',
      website: '',
      isPrimary: false,
    });
  }

  removeContact(index: number): void {
    this.contacts().splice(index, 1);
  }

  //===========================
  // Files
  //===========================

  files(): any[] {
    if (!Array.isArray(this.model['files'])) this.model['files'] = [];
    return this.model['files'];
  }

  addFile(): void {
    this.files().push({
      fileName: '',
      originalFileName: '',
      bucketName: 'oneerp',
      objectKey: '',
      contentType: '',
      extension: '',
      fileSize: 0,
      storageProvider: 'MINIO',
      fileType: '',
      isPrimary: this.files().length === 0,
    });
  }

  removeFile(index: number): void {
    this.files().splice(index, 1);
  }

  //===========================
  // Notes
  //===========================

  notes(): any[] {
    if (!Array.isArray(this.model['notes'])) this.model['notes'] = [];
    return this.model['notes'];
  }

  addNote(): void {
    this.notes().push({ noteText: '', noteType: 'GENERAL' });
  }

  removeNote(index: number): void {
    this.notes().splice(index, 1);
  }

  //===========================
  // Tags
  //===========================

  tags(): any[] {
    if (!Array.isArray(this.model['tags'])) this.model['tags'] = [];
    return this.model['tags'];
  }

  addTag(): void {
    this.tags().push({ tagId: null, tagName: '', color: '' });
  }

  removeTag(index: number): void {
    this.tags().splice(index, 1);
  }
}