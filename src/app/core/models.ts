export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data: T;
  errors: string[];
}

export interface Paginated<T> {
  items: T[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
  hasPrevious: boolean;
  hasNext: boolean;
}

export interface Company {
  id: number;
  companyCode: string;
  companyName: string;
  shortName?: string;
  abbreviation?: string;
  businessTypeId: number;
  industryTypeId: number;
  gstRegistrationTypeId?: number;
  gstNumber?: string;
  panNumber?: string;
  tanNumber?: string;
  cinNumber?: string;
  registrationNumber?: string;
  currencyId: number;
  languageId: number;
  timeZoneId: number;
  isActive: boolean;
  isBlocked: boolean;
  lastLoginDate?: string;
  createdBy: number;
  createdDate?: string;
  modifiedBy?: number;
  modifiedDate?: string;
}

export interface CreateCompanyRequest {
  companyCode: string;
  companyName: string;
  shortName?: string;
  abbreviation?: string;
  businessTypeId: number;
  industryTypeId: number;
  gstRegistrationTypeId?: number;
  gstNumber?: string;
  panNumber?: string;
  tanNumber?: string;
  cinNumber?: string;
  registrationNumber?: string;
  currencyId: number;
  languageId: number;
  timeZoneId: number;
}

export interface UpdateCompanyRequest {
  companyName: string;
  shortName?: string;
  abbreviation?: string;
  businessTypeId: number;
  industryTypeId: number;
  gstRegistrationTypeId?: number;
  gstNumber?: string;
  panNumber?: string;
  tanNumber?: string;
  cinNumber?: string;
  registrationNumber?: string;
  currencyId: number;
  languageId: number;
  timeZoneId: number;
  isActive: boolean;
  isBlocked: boolean;
}

export interface ErpUser {
  userId: number;
  companyId: number;
  username: string;
  fullName: string;
  email: string;
  mobile?: string;
  status: string;
  isSuperAdmin: boolean;
  roles: string[];
  lastLoginDate?: string;
  createdDate: string;
}

export interface User {
  userId: number;
  companyId: number;
  username: string;
  fullName: string;
  email: string;
  mobile?: string;
  status: string;
  isSuperAdmin: boolean;
  lastLoginDate?: string;
  createdDate: string;
}

export interface UserWithRoles {
  userId: number;
  companyId: number;
  username: string;
  fullName: string;
  email: string;
  mobile?: string;
  status: string;
  isSuperAdmin: boolean;
  lastLoginDate?: string;
  createdDate: string;
  roleIds: number[];
  roleNames: string[];
}

export interface Role {
  roleId: number;
  name: string;
  code: string;
  description?: string;
  isSystem: boolean;
  isActive: boolean;
  permissions: string[];
}

export interface Permission {
  code: string;
  name: string;
  module: string;
}

export interface BusinessType {
  businessTypeId: number;
  name: string;
  description?: string;
  sortOrder: number;
  isActive: boolean;
}

export interface IndustryType {
  industryTypeId: number;
  name: string;
  description?: string;
  sortOrder: number;
  isActive: boolean;
}

export interface CompanyGroup {
  companyGroupId: number;
  groupCode: string;
  groupName: string;
  shortName?: string;
  description?: string;
  parentGroupId?: number;
  parentGroupName?: string;
  isActive: boolean;
}

export interface Country {
  countryId: number;
  name: string;
  isoCode2: string;
  isoCode3: string;
  phoneCode?: string;
  currencyCode?: string;
  nationality?: string;
  isActive: boolean;
  createdBy?: string;
  createdDate: string;
  modifiedBy?: string;
  modifiedDate: string;
}

export interface State {
  stateId: number;
  countryId: number;
  countryName?: string;
  name: string;
  stateCode: string;
  gstStateCode?: string;
  isActive: boolean;
  createdBy?: string;
  createdDate: string;
  modifiedBy?: string;
  modifiedDate: string;
}

export interface City {
  cityId: number;
  countryId: number;
  countryName?: string;
  stateId: number;
  stateName?: string;
  name: string;
  postalCode?: string;
  latitude?: number;
  longitude?: number;
  isActive: boolean;
  createdBy?: string;
  createdDate: string;
  modifiedBy?: string;
  modifiedDate: string;
}

export interface Language {
  languageId: number;
  name: string;
  code: string;
  cultureCode?: string;
  isRTL: boolean;
  isDefault: boolean;
  sortOrder: number;
  isActive: boolean;
}

export interface TimeZone {
  timeZoneId: number;
  name: string;
  timeZoneName: string;
  utcOffset?: string;
  isActive: boolean;
}

export interface GstRegistrationType {
  gstRegistrationTypeId: number;
  name: string;
  description?: string;
  isActive: boolean;
}

export interface AddressType {
  addressTypeId: number;
  name: string;
  description?: string;
  isActive: boolean;
}

export interface ContactType {
  contactTypeId: number;
  name: string;
  description?: string;
  isActive: boolean;
}

export interface DocumentType {
  documentTypeId: number;
  name: string;
  description?: string;
  isActive: boolean;
}

export interface OrganizationType {
  organizationTypeId: number;
  name: string;
  code: string;
  description?: string;
  sortOrder: number;
  isActive: boolean;
}

export interface Currency {
  id: number;
  currencyCode: string;
  currencyName: string;
  symbol: string;
  isoCode?: string;
  decimalPlaces: number;
  isBaseCurrency: boolean;
  sortOrder: number;
  isActive: boolean;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: ErpUser;
  roles: string[];
  permissions: string[];
  company: Company;
  tenantCode: string;
  tenantName: string;
}

export interface DashboardData {
  company: Company;
  user: ErpUser;
  roles: string[];
  permissions: string[];
  tenantCode: string;
  tenantName: string;
  planCode?: string;
  planName?: string;
  subscriptionEnd?: string;
  totalUsers: number;
  activeUsers: number;
  totalRoles: number;
  recentUsers: RecentUser[];
}

export interface RecentUser {
  userId: number;
  username: string;
  fullName: string;
  status: string;
  createdDate: string;
}

export interface ProfileData {
  user: ErpUser;
  roles: string[];
  permissions: string[];
  company: Company;
}

export interface PermissionModule {
  id: number;
  code: string;
  name: string;
  parentId?: number;
  parentName?: string;
  level: string;
  sortOrder: number;
  isVisible: boolean;
  icon?: string;
  routePath?: string;
  createdDate: string;
  modifiedDate?: string;
  isDeleted: boolean;
  children?: PermissionModule[];
}

export interface PermissionAction {
  id: number;
  code: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
}

export interface ModulePermission {
  id: number;
  roleId: number;
  roleName?: string;
  permissionModuleId: number;
  moduleName?: string;
  permissionActionId: number;
  actionName?: string;
  scope: string;
  scopeId?: number;
  grantedBy?: string;
  grantedDate: string;
  isRevoked: boolean;
}

export interface FieldPermission {
  id: number;
  roleId: number;
  permissionModuleId: number;
  fieldName: string;
  canView: boolean;
  canEdit: boolean;
  isMandatory: boolean;
  isHidden: boolean;
  scope: string;
  scopeId?: number;
  createdDate: string;
  modifiedDate?: string;
}

export interface PermissionScopeConfig {
  scope: string;
  label: string;
  icon: string;
  description: string;
}

export const PERMISSION_SCOPES: PermissionScopeConfig[] = [
  { scope: 'Platform', label: 'Platform', icon: 'server', description: 'System-wide access' },
  { scope: 'Tenant', label: 'Tenant', icon: 'building-2', description: 'Tenant-level access' },
  { scope: 'Company', label: 'Company', icon: 'home', description: 'Company-level access' },
  { scope: 'Branch', label: 'Branch', icon: 'git-branch', description: 'Branch-level access' },
  { scope: 'User', label: 'User', icon: 'user', description: 'User-level access' },
];

/* ---------------------------------------------------------------------------
   Enterprise Permission Engine Models
   --------------------------------------------------------------------------- */

export interface Workspace {
  id: number;
  workspaceCode: string;
  workspaceName: string;
  icon?: string;
  route?: string;
  sortOrder: number;
  isActive: boolean;
  createdDate: string;
}

export interface Domain {
  id: number;
  workspaceId: number;
  workspaceName?: string;
  domainCode: string;
  domainName: string;
  icon?: string;
  sortOrder: number;
  isActive: boolean;
  createdDate: string;
}

export interface Module {
  id: number;
  domainId: number;
  domainName?: string;
  moduleCode: string;
  moduleName: string;
  icon?: string;
  routeUrl?: string;
  sortOrder: number;
  isActive: boolean;
  createdDate: string;
}

export interface SubModule {
  id: number;
  moduleId: number;
  moduleName?: string;
  subModuleCode: string;
  subModuleName: string;
  icon?: string;
  routeUrl?: string;
  sortOrder: number;
  isActive: boolean;
  createdDate: string;
}

export interface Screen {
  id: number;
  subModuleId: number;
  subModuleName?: string;
  screenCode: string;
  screenName: string;
  routeUrl?: string;
  componentName?: string;
  sortOrder: number;
  isActive: boolean;
  createdDate: string;
}

export interface Field {
  id: number;
  screenId: number;
  screenName?: string;
  fieldCode: string;
  fieldName: string;
  displayName: string;
  dataType: string;
  displayOrder: number;
  defaultValue?: string;
  isSystemField: boolean;
  isRequired: boolean;
  isActive: boolean;
  createdDate: string;
}

export interface Action {
  id: number;
  actionCode: string;
  actionName: string;
  displayOrder: number;
  isActive: boolean;
}

export interface RolePermissionEntry {
  id: number;
  roleId: number;
  roleName?: string;
  workspaceId: number;
  workspaceName?: string;
  domainId: number;
  domainName?: string;
  moduleId: number;
  moduleName?: string;
  subModuleId: number;
  subModuleName?: string;
  screenId: number;
  screenName?: string;
  actionId: number;
  actionName?: string;
  allow: boolean;
  displayOrder: number;
  isActive: boolean;
  createdDate: string;
}

export interface UserPermissionOverride {
  id: number;
  userId: number;
  userName?: string;
  workspaceId: number;
  workspaceName?: string;
  domainId: number;
  domainName?: string;
  moduleId: number;
  moduleName?: string;
  subModuleId: number;
  subModuleName?: string;
  screenId: number;
  screenName?: string;
  actionId: number;
  actionName?: string;
  permissionType: string;
  allow: boolean;
  effectiveFrom: string;
  effectiveTo?: string;
  remarks?: string;
  isActive: boolean;
  createdDate: string;
}

export interface RoleFieldPermissionEntry {
  id: number;
  roleId: number;
  roleName?: string;
  screenId: number;
  screenName?: string;
  fieldId: number;
  fieldName?: string;
  displayName?: string;
  canView: boolean;
  canEdit: boolean;
  isHidden: boolean;
  isReadOnly: boolean;
  isMandatory: boolean;
  displayOrder: number;
  isActive: boolean;
  createdDate: string;
}

export interface UserFieldPermissionEntry {
  id: number;
  userId: number;
  userName?: string;
  screenId: number;
  screenName?: string;
  fieldId: number;
  fieldName?: string;
  displayName?: string;
  canView: boolean;
  canEdit: boolean;
  isHidden: boolean;
  isReadOnly: boolean;
  isMandatory: boolean;
  isActive: boolean;
  createdDate: string;
}

export interface DataScope {
  id: number;
  roleId: number;
  roleName?: string;
  moduleId?: number;
  moduleName?: string;
  screenId?: number;
  screenName?: string;
  companyId?: number;
  companyName?: string;
  branchId?: number;
  branchName?: string;
  departmentId?: number;
  departmentName?: string;
  warehouseId?: number;
  warehouseName?: string;
  businessUnitId?: number;
  costCenterId?: number;
  profitCenterId?: number;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  isActive: boolean;
  createdDate: string;
}

export interface UserDataScopeOverride {
  id: number;
  userId: number;
  username?: string;
  moduleId?: number;
  moduleName?: string;
  screenId?: number;
  screenName?: string;
  scopeType: string;
  scopeValue: string;
  permissionType: string;
  allow: boolean;
  effectiveFrom: string;
  effectiveTo?: string;
  remarks?: string;
  isActive: boolean;
  createdDate: string;
}

export interface WorkflowPermissionEntry {
  id: number;
  roleId: number;
  roleName?: string;
  moduleId: number;
  moduleName?: string;
  screenId: number;
  screenName?: string;
  canSubmit: boolean;
  canApprove: boolean;
  canReject: boolean;
  canCancel: boolean;
  canClose: boolean;
  isActive: boolean;
  createdDate: string;
}

/* ---------------------------------------------------------------------------
   Permission Tree (for UI rendering)
   --------------------------------------------------------------------------- */

export interface PermissionTreeWorkspace {
  id: number;
  code: string;
  name: string;
  icon?: string;
  domains: PermissionTreeDomain[];
}

export interface PermissionTreeDomain {
  id: number;
  code: string;
  name: string;
  icon?: string;
  modules: PermissionTreeModule[];
}

export interface PermissionTreeModule {
  id: number;
  code: string;
  name: string;
  icon?: string;
  subModules: PermissionTreeSubModule[];
}

export interface PermissionTreeSubModule {
  id: number;
  code: string;
  name: string;
  icon?: string;
  screens: PermissionTreeScreen[];
}

export interface PermissionTreeScreen {
  id: number;
  code: string;
  name: string;
  routeUrl?: string;
  componentName?: string;
  fields: PermissionTreeField[];
}

export interface PermissionTreeField {
  id: number;
  code: string;
  name: string;
  displayName: string;
  dataType: string;
  displayOrder: number;
  isSystemField: boolean;
  isRequired: boolean;
}
