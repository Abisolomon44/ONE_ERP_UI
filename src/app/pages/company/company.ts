import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, WritableSignal, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { LucideAngularModule } from 'lucide-angular';
import { Company } from '../../core/models';
import { PermissionService } from '../../core/services/permission.service';
import { ToastService } from '../../core/services/toast.service';
import { BaseButton } from '../../shared/base-button';
import { BaseEmpty, BasePill } from '../../shared/base-data';

export interface SelectOption {
  value: string;
  label: string;
}

type FormField =
  | 'companyName'
  | 'companyType'
  | 'currency'
  | 'status'
  | 'email'
  | 'phone'
  | 'website'
  | 'gst'
  | 'address';

@Component({
  selector: 'app-company',
  standalone: true,
  imports: [DatePipe, FormsModule, RouterLink, LucideAngularModule, BaseButton, BaseEmpty, BasePill],
  templateUrl: './company.html',
  styleUrl: './company.css',
})
export class CompanyPage {
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);
  private readonly perms = inject(PermissionService);

  protected readonly canEdit = computed(() => this.perms.has('companies.edit'));

  protected readonly data = signal<Company | null>(null);
  protected readonly loading = signal(true);
  protected readonly loadFailed = signal(false);
  protected readonly saving = signal(false);
  protected readonly submitted = signal(false);

  protected readonly form = {
    companyName: signal(''),
    companyCode: signal(''),
    companyType: signal(''),
    currency: signal('USD'),
    status: signal('Active'),
    email: signal(''),
    phone: signal(''),
    website: signal(''),
    gst: signal(''),
    address: signal(''),
  };

  protected readonly touched: Record<FormField, WritableSignal<boolean>> = {
    companyName: signal(false),
    companyType: signal(false),
    currency: signal(false),
    status: signal(false),
    email: signal(false),
    phone: signal(false),
    website: signal(false),
    gst: signal(false),
    address: signal(false),
  };

  protected readonly companyTypeOptions: SelectOption[] = [
    { value: 'Private Limited', label: 'Private Limited' },
    { value: 'Public Limited', label: 'Public Limited' },
    { value: 'LLP', label: 'Limited Liability Partnership (LLP)' },
    { value: 'Partnership', label: 'Partnership' },
    { value: 'Sole Proprietorship', label: 'Sole Proprietorship' },
    { value: 'Non-Profit', label: 'Non-Profit Organization' },
    { value: 'Government', label: 'Government Entity' },
  ];

  protected readonly currencyOptions: SelectOption[] = [
    { value: 'USD', label: 'USD — US Dollar' },
    { value: 'EUR', label: 'EUR — Euro' },
    { value: 'GBP', label: 'GBP — British Pound' },
    { value: 'INR', label: 'INR — Indian Rupee' },
    { value: 'AUD', label: 'AUD — Australian Dollar' },
    { value: 'CAD', label: 'CAD — Canadian Dollar' },
    { value: 'SGD', label: 'SGD — Singapore Dollar' },
    { value: 'AED', label: 'AED — UAE Dirham' },
  ];

  protected readonly statusOptions: SelectOption[] = [
    { value: 'Active', label: 'Active' },
    { value: 'Inactive', label: 'Inactive' },
  ];

  constructor() {
    void this.load();
  }

  protected readonly dirty = computed(() => {
    const d = this.data();
    if (!d) return false;
    return (
      this.form.companyName() !== d.companyName ||
      this.form.companyType() !== (d.companyType ?? '') ||
      this.form.currency() !== d.currency ||
      this.form.status() !== d.status ||
      this.form.email() !== (d.email ?? '') ||
      this.form.phone() !== (d.phone ?? '') ||
      this.form.website() !== (d.website ?? '') ||
      this.form.gst() !== (d.gst ?? '') ||
      this.form.address() !== (d.address ?? '')
    );
  });

  protected readonly isActive = computed(() => this.data()?.status?.toLowerCase() === 'active');

  protected initials(name: string): string {
    const parts = (name || 'A').trim().split(/\s+/);
    return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || 'A';
  }

  protected companyTypeLabel(value: string): string {
    if (!value) return '';
    return this.companyTypeOptions.find((o) => o.value === value)?.label ?? value;
  }

  protected onInput(event: Event, field: FormField): void {
    this.form[field].set((event.target as HTMLInputElement).value);
  }

  protected onSelect(event: Event, field: FormField): void {
    this.form[field].set((event.target as HTMLSelectElement).value);
    this.touched[field].set(true);
  }

  protected onTouch(field: FormField): void {
    this.touched[field].set(true);
  }

  protected errorFor(field: FormField): string {
    if (!this.touched[field]() && !this.submitted()) return '';
    const value = this.form[field]();
    switch (field) {
      case 'companyName':
        return this.required(value);
      case 'currency':
        return this.required(value);
      case 'status':
        return this.required(value);
      case 'email':
        return this.emailError(value);
      case 'website':
        return this.websiteError(value);
      default:
        return '';
    }
  }

  protected retry(): void {
    void this.load();
  }

  protected reset(): void {
    const saved = this.data();
    if (!saved) return;
    this.applyForm(saved);
    this.clearTouched();
    this.submitted.set(false);
    this.toast.info('Changes reverted', 'The form has been reset to the saved values.');
  }

  protected cancel(): void {
    this.clearTouched();
    this.submitted.set(false);
    if (!this.dirty()) return;
    this.toast.info('Changes discarded', 'Your edits were not saved.');
    void this.load();
  }

  protected async save(): Promise<void> {
    if (this.saving()) return;
    this.submitted.set(true);
    if (this.hasErrors()) {
      this.toast.warning('Check the highlighted fields', 'Please fix the errors before saving.');
      return;
    }
    this.saving.set(true);
    try {
      await firstValueFrom(
        this.http.put('/api/companies/current', {
          companyName: this.form.companyName().trim(),
          address: this.form.address() || null,
          email: this.form.email() || null,
          phone: this.form.phone() || null,
          gst: this.form.gst() || null,
          website: this.form.website() || null,
          companyType: this.form.companyType() || null,
          currency: this.form.currency() || 'USD',
          status: this.form.status() || 'Active',
        }),
      );
      this.toast.success('Company updated', 'Your company profile has been saved.');
      await this.load();
    } catch {
      /* handled by interceptor */
    } finally {
      this.saving.set(false);
    }
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    this.loadFailed.set(false);
    try {
      const res = await firstValueFrom(this.http.get<Company>('/api/companies/current'));
      const merged: Company = {
        ...res,
        website: res.website ?? this.form.website(),
        companyType: res.companyType ?? this.form.companyType(),
      };
      this.data.set(merged);
      this.applyForm(merged);
      this.clearTouched();
      this.submitted.set(false);
    } catch {
      this.loadFailed.set(true);
    } finally {
      this.loading.set(false);
    }
  }

  private applyForm(company: Company): void {
    this.form.companyName.set(company.companyName);
    this.form.companyCode.set(company.companyCode);
    this.form.companyType.set(company.companyType ?? '');
    this.form.currency.set(company.currency || 'USD');
    this.form.status.set(company.status || 'Active');
    this.form.email.set(company.email ?? '');
    this.form.phone.set(company.phone ?? '');
    this.form.website.set(company.website ?? '');
    this.form.gst.set(company.gst ?? '');
    this.form.address.set(company.address ?? '');
  }

  private clearTouched(): void {
    (Object.keys(this.touched) as FormField[]).forEach((key) => this.touched[key].set(false));
  }

  private hasErrors(): boolean {
    return (
      this.required(this.form.companyName()) !== '' ||
      this.required(this.form.currency()) !== '' ||
      this.required(this.form.status()) !== '' ||
      this.emailError(this.form.email()) !== '' ||
      this.websiteError(this.form.website()) !== ''
    );
  }

  private required(value: string): string {
    return value.trim() ? '' : 'This field is required';
  }

  private emailError(value: string): string {
    if (!value.trim()) return '';
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
      ? ''
      : 'Enter a valid email address';
  }

  private websiteError(value: string): string {
    if (!value.trim()) return '';
    return /^(https?:\/\/)?([\w-]+\.)+[a-z]{2,}([/?#]\S*)?$/i.test(value.trim())
      ? ''
      : 'Enter a valid website URL';
  }
}
