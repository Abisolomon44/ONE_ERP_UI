import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/auth.guard';
import { navigationChildGuard } from './core/navigation.guard';

export const routes: Routes = [
  // Authentication
  {
    path: 'login',
    canActivate: [guestGuard],
    title: 'Login',
    loadComponent: () => import('./pages/login/login').then((m) => m.LoginPage),
  },

  // Shown when the signed-in user has no workspace screens assigned
  {
    path: 'contact-administrator',
    canActivate: [authGuard],
    title: 'Contact Administrator',
    loadComponent: () =>
      import('./pages/contact-administrator/contact-administrator').then(
        (m) => m.ContactAdministratorPage
      ),
  },

  // Shown when a guard blocks direct navigation to an unauthorized screen
  {
    path: 'access-denied',
    canActivate: [authGuard],
    title: 'Access Denied',
    loadComponent: () => import('./pages/access-denied/access-denied').then((m) => m.AccessDeniedPage),
  },

  // Main Layout
  {
    path: '',
    canActivate: [authGuard],
    canActivateChild: [navigationChildGuard],
    loadComponent: () => import('./layout/app-shell').then((m) => m.AppShell),

    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },

      // Dashboard
      {
        path: 'dashboard',
        title: 'Dashboard',
        loadComponent: () => import('./pages/dashboard/dashboard').then((m) => m.DashboardPage),
      },

      // Workspace (drill-down template)
      {
        path: 'workspace/:id',
        title: 'Workspace',
        loadComponent: () => import('./pages/workspace/workspace').then((m) => m.WorkspacePage),
      },

      // Users
      {
        path: 'users',
        title: 'Users',
        loadComponent: () => import('./pages/users/users').then((m) => m.UsersPage),
      },

      // Roles
      {
        path: 'roles',
        title: 'Roles',
        loadComponent: () => import('./pages/roles/roles').then((m) => m.RolesPage),
      },

      // ===========================
      // Administration Workspace
      // ===========================

      {
        path: 'administration',
        title: 'Administration',
        loadComponent: () =>
          import('./pages/adminitration/administration-workspace/administration-workspace').then(
            (m) => m.AdministrationWorkspace,
          ),
      },

      // ===========================
      // Business Masters
      // ===========================

      {
        path: 'business-master',
        title: 'Business Master',
        loadComponent: () =>
          import('./pages/business-master/business-master').then(
            (m) => m.BusinessMasterPage
          ),
      },
      {
        path: 'company',
        title: 'Company',
        loadComponent: () => import('./pages/company/company').then((m) => m.CompanyPage),
      },

      {
        path: 'branch',
        title: 'Branch',
        loadComponent: () => import('./pages/branch/branch').then((m) => m.BranchPage),
      },

      // ===========================
      // Product / Billing Masters
      // ===========================

      {
        path: 'product-categories',
        title: 'Product Categories',
        loadComponent: () => import('./pages/category/category').then((m) => m.CategoryPage),
      },
      {
        path: 'product-subcategories',
        title: 'Product Sub Categories',
        loadComponent: () => import('./pages/subcategory/subcategory').then((m) => m.SubCategoryPage),
      },
      {
        path: 'brands',
        title: 'Brands',
        loadComponent: () => import('./pages/brand/brand').then((m) => m.BrandPage),
      },
      {
        path: 'units',
        title: 'Units',
        loadComponent: () => import('./pages/unit/unit').then((m) => m.UnitPage),
      },
      {
        path: 'products',
        title: 'Products',
        loadComponent: () => import('./pages/product/product').then((m) => m.ProductPage),
      },
      {
        path: 'tax-type-systems',
        title: 'Tax Type Systems',
        loadComponent: () => import('./pages/tax-type-system/tax-type-system').then((m) => m.TaxTypeSystemPage),
      },
      {
        path: 'taxes',
        title: 'Taxes',
        loadComponent: () => import('./pages/tax/tax').then((m) => m.TaxPage),
      },

      // ===========================
      // Billing Masters
      // ===========================

      {
        path: 'price-types',
        title: 'Price Types',
        loadComponent: () => import('./pages/price-type/price-type').then((m) => m.PriceTypePage),
      },
      {
        path: 'unit-conversions',
        title: 'Unit Conversions',
        loadComponent: () => import('./pages/unit-conversion/unit-conversion').then((m) => m.UnitConversionPage),
      },
      {
        path: 'barcodes',
        title: 'Barcodes',
        loadComponent: () => import('./pages/barcode/barcode').then((m) => m.BarcodePage),
      },
      {
        path: 'hsn-sacs',
        title: 'HSN / SAC',
        loadComponent: () => import('./pages/hsn-sac/hsn-sac').then((m) => m.HsnSacPage),
      },
      {
        path: 'service-categories',
        title: 'Service Categories',
        loadComponent: () => import('./pages/service-category/service-category').then((m) => m.ServiceCategoryPage),
      },
      {
        path: 'services',
        title: 'Services',
        loadComponent: () => import('./pages/service/service').then((m) => m.ServicePage),
      },
      {
        path: 'price-lists',
        title: 'Price Lists',
        loadComponent: () => import('./pages/price-list/price-list').then((m) => m.PriceListPage),
      },
      {
        path: 'discount-rules',
        title: 'Discount Rules',
        loadComponent: () => import('./pages/discount-rule/discount-rule').then((m) => m.DiscountRulePage),
      },
      {
        path: 'offers',
        title: 'Offers',
        loadComponent: () => import('./pages/offer/offer').then((m) => m.OfferPage),
      },
      {
        path: 'coupons',
        title: 'Coupons',
        loadComponent: () => import('./pages/coupon/coupon').then((m) => m.CouponPage),
      },

      {
        path: 'master-import',
        title: 'Master Import',
        loadComponent: () => import('./pages/master-import/master-import').then((m) => m.MasterImportPage),
      },
      {
        path: 'import-logs',
        title: 'Import Logs',
        loadComponent: () => import('./pages/master-import/master-import').then((m) => m.MasterImportPage),
      },
      {
        path: 'tenant-configuration',
        title: 'Tenant Configuration',
        loadComponent: () => import('./pages/tenant-configuration/tenant-configuration').then((m) => m.TenantConfigurationPage),
      },
      {
        path: 'purchase-entry',
        title: 'Purchase Entry',
        loadComponent: () => import('./pages/purchase-entry/purchase-entry').then((m) => m.PurchaseEntryPage),
      },
      {
        path: 'purchase',
        title: 'Purchase Register',
        loadComponent: () => import('./pages/purchase-register/purchase-register').then((m) => m.PurchaseRegisterPage),
      },
      {
        path: 'purchase-view/:id',
        title: 'Purchase View',
        loadComponent: () => import('./pages/purchase-view/purchase-view').then((m) => m.PurchaseViewPage),
      },
      {
        path: 'purchase-edit/:id',
        title: 'Purchase Edit',
        loadComponent: () => import('./pages/purchase-edit/purchase-edit').then((m) => m.PurchaseEditPage),
      },
      {
        path: 'purchase-cancel/:id',
        title: 'Purchase Cancel',
        loadComponent: () => import('./pages/purchase-cancel/purchase-cancel').then((m) => m.PurchaseCancelPage),
      },
      {
        path: 'purchase-delete/:id',
        title: 'Purchase Delete',
        loadComponent: () => import('./pages/purchase-delete/purchase-delete').then((m) => m.PurchaseDeletePage),
      },
      {
        path: 'sales-entry',
        title: 'Sales Entry',
        loadComponent: () => import('./pages/sales-entry/sales-entry').then((m) => m.SalesEntryPage),
      },
      {
        path: 'sales',
        title: 'Sales',
        loadComponent: () => import('./pages/sales/sales').then((m) => m.SalesWorkspace),
      },
      {
        path: 'pos',
        title: 'POS',
        loadComponent: () => import('./pages/pos/pos').then((m) => m.PosPage),
      },
      {
        path: 'purchase',
        title: 'Purchase',
        loadComponent: () => import('./pages/purchase/purchase').then((m) => m.PurchaseWorkspace),
      },
      {
        path: 'purchases/:id',
        title: 'Purchase Management',
        loadComponent: () =>
          import('./pages/purchase-management/purchase-management').then((m) => m.PurchaseManagementPage),
      },
      {
        path: 'purchase-returns',
        title: 'Purchase Returns',
        loadComponent: () =>
          import('./pages/purchase-return/purchase-return').then((m) => m.PurchaseReturnPage),
      },
      {
        path: 'purchase-returns/new',
        title: 'Purchase Return Entry',
        loadComponent: () =>
          import('./pages/purchase-return-entry/purchase-return-entry').then((m) => m.PurchaseReturnEntryPage),
      },
      {
        path: 'purchase-returns/:id',
        title: 'Purchase Return Management',
        loadComponent: () =>
          import('./pages/purchase-return-management/purchase-return-management').then(
            (m) => m.PurchaseReturnManagementPage
          ),
      },
      {
        path: 'stock',
        title: 'Stock',
        loadComponent: () => import('./pages/stock/stock').then((m) => m.StockPage),
      },
      {
        path: 'reports',
        title: 'Reports',
        loadComponent: () => import('./pages/reports/reports-workspace').then((m) => m.ReportsWorkspace),
      },
      {
        path: 'payment-type',
        title: 'Payment Types',
        loadComponent: () => import('./pages/payment-type/payment-type').then((m) => m.PaymentTypePage),
      },
      {
        path: 'payment-method',
        title: 'Payment Methods',
        loadComponent: () => import('./pages/payment-method/payment-method').then((m) => m.PaymentMethodPage),
      },
      {
        path: 'payment-method-detail/:paymentMethodId',
        title: 'Payment Method Details',
        loadComponent: () =>
          import('./pages/payment-method-detail/payment-method-detail').then((m) => m.PaymentMethodDetailPage),
      },
      {
        path: 'payment-entry',
        title: 'Payment Entry',
        loadComponent: () => import('./pages/payment-entry/payment-entry').then((m) => m.PaymentEntryPage),
      },
      {
        path: 'payment',
        title: 'Payment',
        loadComponent: () => import('./pages/payment/payment').then((m) => m.PaymentWorkspace),
      },

      {
        path: 'department',
        title: 'Department',
        loadComponent: () =>
          import('./pages/adminitration/business-master/department/department').then(
            (m) => m.Department,
          ),
      },

    
      {
        path: 'warehouse',
        title: 'Warehouse',
        loadComponent: () =>
          import('./pages/adminitration/business-master/warehouse/warehouse').then(
            (m) => m.Warehouse,
          ),
      },

      {
        path: 'employee',
        title: 'Employees',
        loadComponent: () =>
          import('./pages/adminitration/business-master/employee/employee').then(
            (m) => m.Employee,
          ),
      },

      {
        path: 'stores',
        title: 'Stores',
        loadComponent: () =>
          import('./pages/adminitration/business-master/stores/stores').then(
            (m) => m.StoresPage,
          ),
      },

      {
        path: 'counters',
        title: 'Counters',
        loadComponent: () =>
          import('./pages/adminitration/business-master/counters/counters').then(
            (m) => m.CountersPage,
          ),
      },

      {
        path: 'pos-sessions',
        title: 'POS Sessions',
        loadComponent: () =>
          import('./pages/adminitration/business-master/pos-sessions/pos-sessions').then(
            (m) => m.PosSessionsPage,
          ),
      },

      {
        path: 'designation',
        title: 'Designation',
        loadComponent: () =>
          import('./pages/adminitration/business-master/designation/designation').then(
            (m) => m.Designation,
          ),
        },
  {
  path: 'finance-year',
  title: 'Financial Year',
  loadComponent: () =>
    import('./pages/adminitration/business-master/finance-year/finance-year')
      .then(m => m.FinanceYear),
},
      // ===========================
      // System Master
      // ===========================

      {
        path: 'system-master',
        title: 'System Master',
        loadComponent: () =>
          import('./pages/system-master/system-master').then((m) => m.SystemMasterPage),
      },

      // ===========================
      // Settings
      // ===========================

      {
        path: 'settings',
        title: 'Settings',
        loadComponent: () => import('./pages/settings/settings').then((m) => m.SettingsPage),
      },

      // ===========================
      // Permission System
      // ===========================

      {
        path: 'role-permission-matrix',
        title: 'Role Permission Matrix',
        loadComponent: () =>
          import('./pages/role-permission-matrix/role-permission-matrix').then(
            (m) => m.RolePermissionMatrixPage
          ),
      },

      // ===========================
      // Enterprise Permission Engine
      // ===========================

      {
        path: 'enterprise-permissions',
        title: 'Enterprise Permissions',
        loadComponent: () =>
          import('./pages/enterprise-permissions/enterprise-permissions').then(
            (m) => m.EnterprisePermissionsPage
          ),
      },
      {
        path: 'workspaces',
        title: 'Workspaces',
        loadComponent: () =>
          import('./pages/workspaces/workspaces').then((m) => m.WorkspacesPage),
      },
      {
        path: 'domains',
        title: 'Domains',
        loadComponent: () =>
          import('./pages/domains/domains').then((m) => m.DomainsPage),
      },
      {
        path: 'modules',
        title: 'Modules',
        loadComponent: () =>
          import('./pages/modules/modules').then((m) => m.ModulesPage),
      },
      {
        path: 'submodules',
        title: 'Sub Modules',
        loadComponent: () =>
          import('./pages/submodules/submodules').then((m) => m.SubModulesPage),
      },
      {
        path: 'screens',
        title: 'Screens',
        loadComponent: () =>
          import('./pages/screens/screens').then((m) => m.ScreensPage),
      },
      {
        path: 'fields',
        title: 'Fields',
        loadComponent: () =>
          import('./pages/fields/fields').then((m) => m.FieldsPage),
      },
      {
        path: 'permission-actions-list',
        title: 'Actions',
        loadComponent: () =>
          import('./pages/actions/actions').then((m) => m.ActionsPage),
      },
      {
        path: 'user-permission-overrides',
        title: 'User Permission Overrides',
        loadComponent: () =>
          import('./pages/user-permission-overrides/user-permission-overrides').then(
            (m) => m.UserPermissionOverridesPage
          ),
      },
      {
        path: 'role-field-permissions',
        title: 'Role Field Permissions',
        loadComponent: () =>
          import('./pages/role-field-permissions/role-field-permissions').then(
            (m) => m.RoleFieldPermissionsPage
          ),
      },
      {
        path: 'data-scopes',
        title: 'Data Scopes',
        loadComponent: () =>
          import('./pages/data-scopes/data-scopes').then((m) => m.DataScopesPage),
      },
      {
        path: 'user-data-scope-overrides',
        title: 'User Data Scope Overrides',
        loadComponent: () =>
          import('./pages/user-data-scope-overrides/user-data-scope-overrides').then(
            (m) => m.UserDataScopeOverridesPage
          ),
      },
      {
        path: 'workflow-permissions',
        title: 'Workflow Permissions',
        loadComponent: () =>
          import('./pages/workflow-permissions/workflow-permissions').then(
            (m) => m.WorkflowPermissionsPage
          ),
      },
      {
        path: 'business-partner-roles',
        title: 'Business Partner Roles',
        loadComponent: () =>
          import('./pages/business-partner-roles/business-partner-roles').then(
            (m) => m.BusinessPartnerRolesPage
          ),
      },
      {
        path: 'business-partners',
        title: 'Business Partners',
        loadComponent: () =>
          import('./pages/business-partners/business-partners').then(
            (m) => m.BusinessPartnersPage
          ),
      },
      {
        path: 'invoice-templates',
        title: 'Invoice Design',
        loadComponent: () =>
          import('./pages/invoice-template/invoice-template').then(
            (m) => m.InvoiceTemplatePage
          ),
      },
    ],
  },

  {
    path: '**',
    redirectTo: 'dashboard',
  },
];
