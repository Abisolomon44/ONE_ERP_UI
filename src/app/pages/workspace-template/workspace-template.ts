import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';

interface MenuItem {
  id: number;
  title: string;
  icon: string;
  route: string;
  badge?: number;
}

interface ShortcutCard {
  id: number;
  title: string;
  description: string;
  icon: string;
  count: number;
  color: string;
  route: string;
}

interface Activity {
  title: string;
  description: string;
  time: string;
  icon: string;
}

@Component({
  selector: 'app-workspace-template',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './workspace-template.html',
  styleUrl: './workspace-template.css'
})
export class WorkspaceTemplate {

  workspaceTitle = signal('Administration');
  workspaceDescription = signal('Administration Workspace');

  sidebarCollapsed = signal(false);

  selectedMenu = signal('Administration');

  menus = signal<MenuItem[]>([
    {
      id: 1,
      title: 'Dashboard',
      icon: 'bi-speedometer2',
      route: '/dashboard'
    },
    {
      id: 2,
      title: 'Administration',
      icon: 'bi-gear',
      route: '/administration'
    },
    {
      id: 3,
      title: 'System Masters',
      icon: 'bi-database',
      route: '/system-masters'
    },
    {
      id: 4,
      title: 'Business Masters',
      icon: 'bi-boxes',
      route: '/business-masters'
    },
    {
      id: 5,
      title: 'Purchase',
      icon: 'bi-cart-check',
      route: '/purchase'
    },
    {
      id: 6,
      title: 'Sales',
      icon: 'bi-receipt',
      route: '/sales'
    },
    {
      id: 7,
      title: 'Inventory',
      icon: 'bi-box-seam',
      route: '/inventory'
    },
    {
      id: 8,
      title: 'Finance',
      icon: 'bi-cash-stack',
      route: '/finance'
    },
    {
      id: 9,
      title: 'CRM',
      icon: 'bi-people',
      route: '/crm'
    },
    {
      id: 10,
      title: 'HRMS',
      icon: 'bi-person-workspace',
      route: '/hrms'
    },
    {
      id: 11,
      title: 'Reports',
      icon: 'bi-bar-chart',
      route: '/reports'
    },
    {
      id: 12,
      title: 'Settings',
      icon: 'bi-sliders',
      route: '/settings'
    }
  ]);

  shortcuts = signal<ShortcutCard[]>([
    {
      id: 1,
      title: 'Company',
      description: 'Manage Companies',
      icon: 'bi-building',
      count: 5,
      color: 'primary',
      route: '/administration/company'
    },
    {
      id: 2,
      title: 'Branch',
      description: 'Manage Branches',
      icon: 'bi-shop',
      count: 18,
      color: 'success',
      route: '/administration/branch'
    },
    {
      id: 3,
      title: 'Department',
      description: 'Manage Departments',
      icon: 'bi-diagram-3',
      count: 35,
      color: 'warning',
      route: '/administration/department'
    },
    {
      id: 4,
      title: 'Designation',
      description: 'Manage Designations',
      icon: 'bi-person-badge',
      count: 25,
      color: 'danger',
      route: '/administration/designation'
    },
    {
      id: 5,
      title: 'Warehouse',
      description: 'Manage Warehouses',
      icon: 'bi-box-seam',
      count: 10,
      color: 'info',
      route: '/administration/warehouse'
    },
    {
      id: 6,
      title: 'Financial Year',
      description: 'Manage Financial Years',
      icon: 'bi-calendar-range',
      count: 3,
      color: 'secondary',
      route: '/administration/financial-year'
    },
    {
      id: 7,
      title: 'Users',
      description: 'Manage Users',
      icon: 'bi-people-fill',
      count: 150,
      color: 'dark',
      route: '/administration/users'
    },
    {
      id: 8,
      title: 'Roles',
      description: 'Manage Roles',
      icon: 'bi-shield-lock',
      count: 12,
      color: 'primary',
      route: '/administration/roles'
    },
    {
      id: 9,
      title: 'Permissions',
      description: 'Manage Permissions',
      icon: 'bi-key',
      count: 250,
      color: 'success',
      route: '/administration/permissions'
    }
  ]);

  recentActivities = signal<Activity[]>([
    {
      title: 'Company Created',
      description: 'ABC Mobiles Pvt Ltd',
      time: '5 mins ago',
      icon: 'bi-building'
    },
    {
      title: 'Branch Updated',
      description: 'Chennai Head Office',
      time: '15 mins ago',
      icon: 'bi-shop'
    },
    {
      title: 'Warehouse Added',
      description: 'Main Warehouse',
      time: '30 mins ago',
      icon: 'bi-box-seam'
    },
    {
      title: 'User Created',
      description: 'John Peter',
      time: '1 hour ago',
      icon: 'bi-person-plus'
    }
  ]);

  toggleSidebar(): void {
    this.sidebarCollapsed.update(value => !value);
  }

  selectMenu(menu: MenuItem): void {
    this.selectedMenu.set(menu.title);
  }

  openShortcut(card: ShortcutCard): void {
    console.log('Navigate to :', card.route);

    // Later
    // this.router.navigate([card.route]);
  }

}