import { Component, Input, Output, EventEmitter, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';

export interface MultiSelectOption {
  value: any;
  label: string;
  disabled?: boolean;
}

@Component({
  selector: 'app-multi-select',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './multi-select.html',
  styleUrl: './multi-select.css',
})
export class MultiSelectComponent {
  @Input() options: MultiSelectOption[] = [];
  @Input() selectedValues: any[] = [];
  @Input() placeholder = 'Select...';
  @Input() label = '';
  @Input() required = false;
  @Input() disabled = false;
  @Input() searchable = true;
  @Input() maxDisplay = 3;
  @Input() displayProperty = 'label';

  @Output() selectedValuesChange = new EventEmitter<any[]>();

  protected readonly isOpen = signal(false);
  protected readonly searchText = signal('');

  protected readonly filteredOptions = computed(() => {
    const text = this.searchText().toLowerCase();
    return this.options.filter((o) =>
      o.label.toLowerCase().includes(text) && !o.disabled
    );
  });

  protected readonly displayText = computed(() => {
    const selected = this.options.filter((o) => this.selectedValues.includes(o.value));
    if (selected.length === 0) return this.placeholder;
    if (selected.length <= this.maxDisplay) {
      return selected.map((s) => s.label).join(', ');
    }
    return `${selected.length} selected`;
  });

  protected toggleOpen(): void {
    if (this.disabled) return;
    this.isOpen.update((v) => !v);
    if (!this.isOpen()) this.searchText.set('');
  }

  protected toggleOption(value: any): void {
    const current = [...this.selectedValues];
    const idx = current.indexOf(value);
    if (idx >= 0) {
      current.splice(idx, 1);
    } else {
      current.push(value);
    }
    this.selectedValuesChange.emit(current);
  }

  protected isSelected(value: any): boolean {
    return this.selectedValues.includes(value);
  }

  protected onDropdownClick(event: MouseEvent): void {
    event.stopPropagation();
  }

  protected onSearchChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchText.set(input.value);
  }
}