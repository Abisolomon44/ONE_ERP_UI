import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { BaseButton } from '../../shared/base-button';

@Component({
  selector: 'app-access-denied',
  standalone: true,
  imports: [RouterLink, LucideAngularModule, BaseButton],
  templateUrl: './access-denied.html',
  styleUrl: './access-denied.css',
})
export class AccessDeniedPage {}