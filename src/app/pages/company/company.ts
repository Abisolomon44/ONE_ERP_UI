import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { LucideAngularModule } from 'lucide-angular';
import { Company, BusinessType, IndustryType, GstRegistrationType, Currency, Language, TimeZone } from '../../core/models';
import { PermissionService } from '../../core/services/permission.service';
import { ToastService } from '../../core/services/toast.service';
import { BaseButton } from '../../shared/base-button';
import { BaseEmpty, BasePill } from '../../shared/base-data';

@Component({
  selector: 'app-company',
  standalone: true,
  imports: [FormsModule, LucideAngularModule],
  templateUrl: './company.html',
  styleUrl: './company.css',
})
export class CompanyPage {
}
