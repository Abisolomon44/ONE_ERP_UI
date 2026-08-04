import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  MasterPage,
  MasterConfig
} from '../../../shared/master-page/master-page';

@Component({
  selector: 'app-branch',
  standalone: true,
  imports: [
    MasterPage,
    FormsModule
  ],
  templateUrl: './branch.html',
  styleUrl: './branch.css'
})
export class Branch {

  showEntry = false;

  loading = false;

  config: MasterConfig = {

    title: 'Branch Master',

    description: 'Manage Company Branches',

     icon: 'Store',
    api: '/api/branch',

    createLabel: 'Create Branch',

    allowCreate: true,

    allowEdit: true,

    allowDelete: true,

    allowImport: true,

    allowExport: true,

    allowRefresh: true,

    stats: [

      {
        label: 'Branches',
        value: 3,
        icon: 'Store',
        description: 'Total Branches'
      }

    ],

    columns: [

      {
        field: 'code',
        header: 'Code'
      },

      {
        field: 'name',
        header: 'Branch Name'
      },

      {
        field: 'city',
        header: 'City'
      },

      {
        field: 'manager',
        header: 'Manager'
      },

      {
        field: 'phone',
        header: 'Phone'
      },

      {
        field: 'status',
        header: 'Status',
        type: 'badge'
      }

    ],

    tabs: [

      {
        name: 'General',
        fields: [
          'code',
          'name',
          'city'
        ]
      },

      {
        name: 'Contact',
        fields: [
          'manager',
          'phone'
        ]
      },

      {
        name: 'Settings',
        fields: [
          'status'
        ]
      }

    ],

    fields: [

      {
        name: 'code',
        label: 'Branch Code',
        type: 'text',
        required: true
      },

      {
        name: 'name',
        label: 'Branch Name',
        type: 'text',
        required: true
      },

      {
        name: 'city',
        label: 'City',
        type: 'text'
      },

      {
        name: 'manager',
        label: 'Manager',
        type: 'text'
      },

      {
        name: 'phone',
        label: 'Phone',
        type: 'text'
      },

      {
        name: 'status',
        label: 'Status',
        type: 'dropdown',
        options: [
          {
            value: 'Active',
            label: 'Active'
          },
          {
            value: 'Inactive',
            label: 'Inactive'
          }
        ]
      }

    ]

  };

  branches = [

    {
      id: 1,
      code: 'BR001',
      name: 'Chennai Head Office',
      city: 'Chennai',
      manager: 'John Peter',
      phone: '9876543210',
      status: 'Active'
    },

    {
      id: 2,
      code: 'BR002',
      name: 'Coimbatore Branch',
      city: 'Coimbatore',
      manager: 'David Raj',
      phone: '9123456789',
      status: 'Active'
    },

    {
      id: 3,
      code: 'BR003',
      name: 'Madurai Branch',
      city: 'Madurai',
      manager: 'Arun Kumar',
      phone: '9988776655',
      status: 'Inactive'
    }

  ];

  userModel: any = {};

  createBranch(): void {

    this.userModel = {

      id: 0,

      code: '',

      name: '',

      city: '',

      manager: '',

      phone: '',

      status: 'Active'

    };

    this.showEntry = true;

  }

  editBranch(branch: any): void {

    this.userModel = {

      ...branch

    };

    this.showEntry = true;

  }

  saveBranch(): void {

    console.log(this.userModel);

    this.showEntry = false;

  }

  deleteBranch(branch: any): void {

    this.branches = this.branches.filter(
      x => x.id !== branch.id
    );

  }

  cancel(): void {

    this.showEntry = false;

  }

  refreshBranch(): void {

    console.log('Refresh');

  }

}