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
