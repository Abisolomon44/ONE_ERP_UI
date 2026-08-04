import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { WorkspaceTemplate } from '../../workspace-template/workspace-template';
import { WorkspaceModel } from '../../workspace-template/workspace.model';

@Component({
  selector: 'app-administration-workspace',
  standalone: true,
  imports: [
    WorkspaceTemplate,
    RouterOutlet
  ],
  templateUrl: './administration-workspace.html'
})
export class AdministrationWorkspace {

  workspace: WorkspaceModel = {

    id: 1,
    title: 'Administration',
    icon: 'Settings',
    description: 'Manage company structure, users, roles and administration.',
    route: '/administration',

    quickActions: [
      {
        id: 1,
        title: 'Create',
        icon: 'Plus',
        route: '/company',
        color: 'primary'
      },
      {
        id: 2,
        title: 'Import',
        icon: 'Upload',
        color: 'success'
      },
      {
        id: 3,
        title: 'Export',
        icon: 'Download',
        color: 'warning'
      },
      {
        id: 4,
        title: 'Reports',
      icon: 'ChartColumn',
        route: '/reports',
        color: 'info'
      }
    ],

    shortcuts: [
      {
        id: 1,
        title: 'Company',
        description: 'Manage Companies',
        icon: 'Building2',
        count: 5,
        route: '/company',
        color: 'primary'
      },
      {
        id: 2,
        title: 'Branch',
        description: 'Manage Branches',
        icon: 'Store',
        count: 18,
        route: '/branch',
        color: 'success'
      },
      {
        id: 3,
        title: 'Department',
        description: 'Manage Departments',
        icon: 'Network',
        count: 24,
        route: '/department',
        color: 'warning'
      },
      {
        id: 4,
        title: 'Designation',
        description: 'Manage Designations',
        icon: 'IdCard',
        count: 14,
        route: '/designation',
        color: 'danger'
      },
      {
        id: 5,
        title: 'Warehouse',
        description: 'Manage Warehouses',
        icon: 'Warehouse',
        count: 12,
        route: '/warehouse',
        color: 'info'
      },
      {
        id: 6,
        title: 'Financial Year',
        description: 'Manage Financial Years',
        icon: 'CalendarRange',
        count: 3,
        route: '/financial-year',
        color: 'secondary'
      },
      {
        id: 7,
        title: 'Users',
        description: 'Manage Users',
        icon: 'Users',
        count: 125,
        route: '/users',
        color: 'primary'
      },
      {
        id: 8,
        title: 'Roles',
        description: 'Manage Roles',
        icon: 'ShieldCheck',
        count: 10,
        route: '/roles',
        color: 'success'
      },
      {
        id: 9,
        title: 'Permissions',
        description: 'Manage Permissions',
        icon: 'KeyRound',
        count: 250,
        route: '/permissions',
        color: 'danger'
      }
    ],

    recentActivities: [
      {
        id: 1,
        title: 'Company Created',
        description: 'ABC Mobiles Pvt Ltd',
        time: '10 minutes ago',
        icon: 'Building2'
      },
      {
        id: 2,
        title: 'Branch Updated',
        description: 'Chennai Head Office',
        time: '30 minutes ago',
        icon: 'Store'
      },
      {
        id: 3,
        title: 'User Added',
        description: 'John Peter',
        time: '1 hour ago',
        icon: 'UserPlus'
      }
    ],

    favorites: [
      {
        id: 1,
        title: 'Company',
        icon: 'Building2',
        route: '/company'
      },
      {
        id: 2,
        title: 'Branch',
        icon: 'Store',
        route: '/branch'
      },
      {
        id: 3,
        title: 'Users',
        icon: 'Users',
        route: '/users'
      },
      {
        id: 4,
        title: 'Roles',
        icon: 'ShieldCheck',
        route: '/roles'
      }
    ]

  };

}