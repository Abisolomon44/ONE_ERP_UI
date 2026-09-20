import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import {
  AdministrationService,
  BillingMasterService,
  PriceTypeDto,
  PriceListDto,
  CreatePriceListRequest,
  UpdatePriceListRequest,
  PriceListDetailDto,
  CreatePriceListDetailRequest,
  UpdatePriceListDetailRequest,
  ProductDto,
  ProductCategoryDto,
  ProductUnitDto,
  StockDto,
  StockService,
  PriceMasterProductDto,
  ProductSource,
} from '../../core/services/master_service';
import { Currency } from '../../core/models';
import { OrganizationService, BranchDto, WarehouseDto } from '../../core/services/organization_service';
import { ToastService } from '../../core/services/toast.service';
import { PermissionService } from '../../core/services/permission.service';

export interface DropdownOption {
  value: any;
  label: string;
}

export interface PriceMasterRow {
  productId: number;
  productCode: string;
  productName: string;
  unitId: number | null;
  unitName: string;
  prices: Record<number, number>;
  minimumQuantity: number;
  maximumQuantity: number | null;
  isActive: boolean;
  categoryId?: number | null;
  categoryName?: string | null;
}

interface ProductWithPrice extends ProductDto {
  defaultUnitName?: string;
  defaultUnitId?: number;
  latestPurchasePrice?: number;
  currentStock?: number;
}

@Component({
  selector: 'app-price-master',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './price-master.html',
  styleUrl: './price-master.css',
})
export class PriceMasterPage implements OnInit {
  private readonly admin = inject(AdministrationService);
  private readonly billing = inject(BillingMasterService);
  private readonly stock = inject(StockService);
  private readonly org = inject(OrganizationService);
  private readonly toast = inject(ToastService);
  private readonly perm = inject(PermissionService);

  // ===================== Signals =====================
  protected readonly canView = signal(false);
  protected readonly canEdit = signal(false);
  protected readonly loading = signal(false);
  protected readonly loadingProducts = signal(false);
  protected readonly saving = signal(false);

  protected readonly priceTypes = signal<PriceTypeDto[]>([]);
  protected readonly priceLists = signal<PriceListDto[]>([]);
  protected readonly products = signal<PriceMasterProductDto[]>([]);
  protected readonly categories = signal<ProductCategoryDto[]>([]);
  protected readonly units = signal<ProductUnitDto[]>([]);
  protected readonly companies = signal<any[]>([]);
  protected readonly branches = signal<BranchDto[]>([]);
  protected readonly warehouses = signal<WarehouseDto[]>([]);
  protected readonly currencies = signal<Currency[]>([]);

  protected readonly rows = signal<PriceMasterRow[]>([]);
  protected readonly filteredRows = signal<PriceMasterRow[]>([]);

  // Filter state
  protected companyId: number | null = null;
  protected branchId: number | null = null;
  protected warehouseId: number | null = null;
  protected priceListId: number | null = null;
  protected currencyId: number | null = null;
  protected effectiveDate: string = new Date().toISOString().slice(0, 10);
  protected searchProduct = '';
  protected categoryId: number | null = null;

  // Product Source
  protected productSource: ProductSource = 'direct';

  // ===================== Computed =====================
  protected readonly sortedPriceTypes = computed(() =>
    this.priceTypes()
      .filter((pt) => pt.isActive)
      .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))
  );

  protected readonly hasData = computed(() => this.filteredRows().length > 0);
  protected readonly isEmpty = computed(() => !this.loading() && !this.loadingProducts() && this.filteredRows().length === 0);

  protected readonly isBranchRequired = computed(() => this.productSource === 'purchase');

  // ===================== Init =====================
  ngOnInit(): void {
    this.canView.set(this.perm.has('price-master.view'));
    this.canEdit.set(this.perm.has('price-master.edit'));

    if (!this.canView()) {
      return;
    }

    void this.loadInitialData();
  }

  // ===================== Data Loading =====================
  private async loadInitialData(): Promise<void> {
    this.loading.set(true);
    try {
      await Promise.all([
        this.loadPriceTypes(),
        this.loadPriceLists(),
        this.loadCompanies(),
        this.loadCurrencies(),
        this.loadCategories(),
        this.loadUnits(),
      ]);
    } catch (e: any) {
      this.toast.error('Failed to load initial data', e?.message);
    } finally {
      this.loading.set(false);
    }
  }

  private async loadPriceTypes(): Promise<void> {
    const items = await this.billing.priceTypes.getAll(true);
    this.priceTypes.set(items ?? []);
  }

  private async loadPriceLists(): Promise<void> {
    const res = await this.billing.priceLists.getPaged(1, 200, '');
    this.priceLists.set(res.items ?? []);
  }

  private async loadCompanies(): Promise<void> {
    const items = await this.admin.company.getPaged(1, 100, '');
    this.companies.set(items.items ?? []);
  }

  private async loadBranches(companyId: number): Promise<void> {
    const res = await this.org.branches.getPaged({ companyId, page: 1, size: 200, search: '' });
    this.branches.set(res.items ?? []);
  }

  private async loadWarehouses(companyId: number, branchId?: number | null): Promise<void> {
    try {
      const res = await this.org.warehouses.getPaged({ 
        companyId, 
        branchId: branchId ?? undefined, 
        page: 1, 
        size: 200, 
        search: '' 
      });
      this.warehouses.set(res.items ?? []);
    } catch (e: any) {
      console.error('[PriceMaster] loadWarehouses error:', e);
      this.warehouses.set([]);
    }
  }

  private async loadCurrencies(): Promise<void> {
    const items = await this.admin.currency.getAll(false);
    this.currencies.set(items ?? []);
  }

  private async loadCategories(): Promise<void> {
    const res = await this.admin.productCategories.getPaged(1, 200, '');
    this.categories.set(res.items ?? []);
  }

  private async loadUnits(): Promise<void> {
    const res = await this.admin.productUnits.getPaged(1, 200, '');
    this.units.set(res.items ?? []);
  }

  protected async onProductSourceChange(): Promise<void> {
    // Clear product-dependent state when source changes
    this.rows.set([]);
    this.filteredRows.set([]);
    this.products.set([]);
    this.priceListId = null;
    // Keep company, branch, warehouse, search, category
    await this.loadProductsBySource();
  }

  protected async loadProductsBySource(): Promise<void> {
    if (!this.companyId) {
      this.toast.error('Please select a company.');
      return;
    }

    // Branch is optional for direct products, but if provided, we'll send it
    // For purchase products, branch is still optional (can be null for company-level)
    // Never send branchId = 0

    if (this.productSource === 'direct') {
      await this.loadDirectProducts();
    } else {
      await this.loadPurchaseProducts();
    }
  }

  private async loadDirectProducts(): Promise<void> {
    this.loadingProducts.set(true);
    try {
      console.log('[PriceMaster] loadDirectProducts started, companyId:', this.companyId, 'branchId:', this.branchId, 'warehouseId:', this.warehouseId);

      const res = await this.admin.products.getPriceMasterDirectProducts(
        this.companyId!,
        this.branchId,
        this.warehouseId,
        this.searchProduct || undefined,
        this.categoryId
      );

      console.log('[PriceMaster] direct products API response:', res);
      const products = (res.items ?? []) as PriceMasterProductDto[];
      console.log('[PriceMaster] direct products loaded:', products.length);

      // Map to internal product format (PriceMasterProductDto)
      const mapped: PriceMasterProductDto[] = products.map((p) => ({
        productId: p.productId,
        productCode: p.productCode,
        productName: p.productName,
        categoryId: p.categoryId,
        categoryName: p.categoryName,
        unitId: p.unitId,
        unitName: p.unitName,
        latestPurchasePrice: p.latestPurchasePrice,
        currentStock: p.currentStock,
        isActive: p.isActive,
        branchId: p.branchId ?? null,
        warehouseId: p.warehouseId ?? null,
      }));

      this.products.set(mapped);
      console.log('[PriceMaster] products signal set, count:', this.products().length);
      // Convert products to rows for table display
      this.rows.set(mapped.map(p => ({
        productId: p.productId,
        productCode: p.productCode,
        productName: p.productName,
        unitId: p.unitId ?? null,
        unitName: p.unitName ?? '',
        prices: {},
        minimumQuantity: 1,
        maximumQuantity: null,
        isActive: p.isActive,
        categoryId: p.categoryId ?? null,
        categoryName: p.categoryName ?? null,
      })));
      this.applyProductFilters();
    } catch (e: any) {
      console.error('[PriceMaster] loadDirectProducts error:', e);
      this.toast.error('Failed to load direct products', e?.message);
    } finally {
      this.loadingProducts.set(false);
    }
  }

  private async loadPurchaseProducts(): Promise<void> {
    this.loadingProducts.set(true);
    try {
      console.log('[PriceMaster] loadPurchaseProducts started, companyId:', this.companyId, 'branchId:', this.branchId, 'warehouseId:', this.warehouseId);

      const res = await this.stock.getPriceMasterPurchaseProducts(
        this.companyId!,
        this.branchId,
        this.warehouseId,
        this.searchProduct || undefined,
        this.categoryId
      );

      console.log('[PriceMaster] purchase products API response:', res);
      const products = (res.items ?? []) as PriceMasterProductDto[];
      console.log('[PriceMaster] purchase products loaded:', products.length);

      // Map to internal product format (PriceMasterProductDto)
      const mapped: PriceMasterProductDto[] = products.map((p) => ({
        productId: p.productId,
        productCode: p.productCode,
        productName: p.productName,
        categoryId: p.categoryId,
        categoryName: p.categoryName,
        unitId: p.unitId,
        unitName: p.unitName,
        latestPurchasePrice: p.latestPurchasePrice,
        currentStock: p.currentStock,
        isActive: p.isActive,
        branchId: p.branchId ?? null,
        warehouseId: p.warehouseId ?? null,
      }));

      this.products.set(mapped);
      console.log('[PriceMaster] products signal set, count:', this.products().length);
      // Convert products to rows for table display
      this.rows.set(mapped.map(p => ({
        productId: p.productId,
        productCode: p.productCode,
        productName: p.productName,
        unitId: p.unitId ?? null,
        unitName: p.unitName ?? '',
        prices: {},
        minimumQuantity: 1,
        maximumQuantity: null,
        isActive: p.isActive,
        categoryId: p.categoryId ?? null,
        categoryName: p.categoryName ?? null,
      })));
      this.applyProductFilters();
    } catch (e: any) {
      console.error('[PriceMaster] loadPurchaseProducts error:', e);
      this.toast.error('Failed to load purchase products', e?.message);
    } finally {
      this.loadingProducts.set(false);
    }
  }

  private async loadProductDetails(productIds: number[]): Promise<any[]> {
    if (!productIds.length) return [];
    try {
      const allProducts = [];
      for (const id of productIds) {
        try {
          const product = await this.admin.products.getById(id);
          if (product) allProducts.push(product);
        } catch {
          // Skip failed
        }
      }
      return allProducts;
    } catch (e) {
      console.error('[PriceMaster] loadProductDetails error:', e);
      return [];
    }
  }

  protected async onCompanyChange(): Promise<void> {
    this.branchId = null;
    this.warehouseId = null;
    this.priceListId = null;
    this.rows.set([]);
    this.filteredRows.set([]);
    this.products.set([]);
    // Reset to all price types
    const allPriceTypes = await this.billing.priceTypes.getAll(true);
    this.priceTypes.set(allPriceTypes ?? []);

    if (this.companyId) {
      await this.loadBranches(this.companyId);
      await this.loadWarehouses(this.companyId);
      await this.loadPriceListsForCompany();
      await this.loadProductsBySource();
    } else {
      this.branches.set([]);
      this.warehouses.set([]);
    }
  }

  protected async onBranchChange(): Promise<void> {
    this.warehouseId = null;
    this.priceListId = null;
    this.rows.set([]);
    this.filteredRows.set([]);
    this.products.set([]);

    if (this.companyId && this.branchId) {
      await this.loadWarehouses(this.companyId, this.branchId);
      await this.loadPriceListsForCompany();
    } else if (this.companyId) {
      await this.loadWarehouses(this.companyId);
    }
  }

  protected async onWarehouseChange(): Promise<void> {
    this.priceListId = null;
    this.rows.set([]);
    this.filteredRows.set([]);
    this.products.set([]);

    if (this.companyId) {
      await this.loadPriceListsForCompany();
    }
  }

  private async loadPriceListsForCompany(): Promise<void> {
    if (!this.companyId) return;
    try {
      const res = await this.billing.priceLists.getPaged(1, 200, '');
      const filtered = (res.items ?? []).filter((pl) => pl.companyId === this.companyId);
      this.priceLists.set(filtered);
    } catch (e: any) {
      this.toast.error('Failed to load price lists', e?.message);
    }
  }

  protected async onPriceListChange(): Promise<void> {
    this.rows.set([]);
    this.filteredRows.set([]);

    if (!this.priceListId) {
      // Reset to all price types when no price list selected
      const allPriceTypes = await this.billing.priceTypes.getAll(true);
      this.priceTypes.set(allPriceTypes ?? []);
      return;
    }

    // Filter price types to only show the one associated with this price list
    const selectedPriceList = this.priceLists().find(pl => pl.priceListId === this.priceListId);
    if (selectedPriceList) {
      this.priceTypes.set(this.priceTypes().filter(pt => pt.priceTypeId === selectedPriceList.priceTypeId));
    }

    await this.loadPriceListDetails(this.priceListId);
  }

  private async loadPriceListDetails(priceListId: number): Promise<void> {
    try {
      console.log('[PriceMaster] loadPriceListDetails started, priceListId:', priceListId);
      const details = await this.billing.priceLists.getDetails(priceListId);
      console.log('[PriceMaster] details loaded:', details);
      const priceTypes = this.sortedPriceTypes();
      const products = this.products();

      // Build rows mapping product -> price type -> price
      const productMap = new Map<number, PriceMasterRow>();

      for (const product of products) {
        productMap.set(product.productId, {
          productId: product.productId,
          productCode: product.productCode,
          productName: product.productName,
          unitId: product.unitId ?? null,
          unitName: product.unitName ?? '',
          prices: {},
          minimumQuantity: 1,
          maximumQuantity: null,
          isActive: true,
          categoryId: product.categoryId ?? null,
        });
      }

      for (const detail of details ?? []) {
        const row = productMap.get(detail.productId);
        if (row) {
          // Map detail to its price type using priceTypeId from backend
          const priceTypeId = (detail as any).priceTypeId;
          if (priceTypeId) {
            row.prices[priceTypeId] = detail.price;
            row.minimumQuantity = detail.minimumQuantity ?? row.minimumQuantity;
            row.maximumQuantity = detail.maximumQuantity ?? row.maximumQuantity;
          }
        }
      }

      this.rows.set(Array.from(productMap.values()));
      console.log('[PriceMaster] rows set, count:', this.rows().length);
      this.applyProductFilters();
    } catch (e: any) {
      console.error('[PriceMaster] loadPriceListDetails error:', e);
      this.toast.error('Failed to load price list details', e?.message);
    }
  }

  protected applyProductFilters(): void {
    let filtered = this.rows();

    if (this.searchProduct) {
      const term = this.searchProduct.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.productCode.toLowerCase().includes(term) ||
          r.productName.toLowerCase().includes(term)
      );
    }

    if (this.categoryId) {
      filtered = filtered.filter((r) => r.categoryId === this.categoryId);
    }

    console.log('[PriceMaster] applyProductFilters - filtered count:', filtered.length, 'search:', this.searchProduct, 'category:', this.categoryId);
    this.filteredRows.set(filtered);
  }

  // ===================== Save =====================
  protected async savePriceType(priceTypeId: number): Promise<void> {
    if (!this.canEdit()) {
      this.toast.error('Permission denied', 'You do not have permission to edit prices');
      return;
    }

    if (!this.companyId) {
      this.toast.warning('Validation', 'Please select a company');
      return;
    }
    if (!this.priceListId) {
      this.toast.warning('Validation', 'Please select a price list');
      return;
    }

    // Validate rows for this price type
    const rowsToSave = this.filteredRows();
    for (const row of rowsToSave) {
      if (!row.unitId) {
        this.toast.error('Validation', `Unit is required for product ${row.productCode}`);
        return;
      }
      const price = row.prices[priceTypeId] ?? 0;
      if (price < 0) {
        this.toast.error('Validation', `Price cannot be negative for ${row.productCode}`);
        return;
      }
    }

    this.saving.set(true);
    try {
      const items: CreatePriceListDetailRequest[] = [];

      for (const row of rowsToSave) {
        const price = row.prices[priceTypeId] ?? 0;
        if (price > 0) { // Only save if price is entered
          items.push({
            priceListId: this.priceListId!,
            productId: row.productId,
            unitId: row.unitId,
            price,
            minimumQuantity: row.minimumQuantity ?? 1,
            maximumQuantity: row.maximumQuantity ?? null,
            priceTypeId: priceTypeId,
          });
        }
      }

      if (items.length === 0) {
        this.toast.info('Nothing to save', 'No prices entered for this price type');
        return;
      }

      await this.billing.priceLists.replaceDetails(this.priceListId!, items);
      this.toast.success('Prices saved', `Saved ${items.length} ${this.sortedPriceTypes().find(pt => pt.priceTypeId === priceTypeId)?.name ?? ''} prices`);
      await this.loadPriceListDetails(this.priceListId!);
    } catch (e: any) {
      this.toast.error('Save failed', e?.message);
    } finally {
      this.saving.set(false);
    }
  }

  protected async saveAllPrices(): Promise<void> {
    if (!this.canEdit()) {
      this.toast.error('Permission denied', 'You do not have permission to edit prices');
      return;
    }

    if (!this.companyId) {
      this.toast.warning('Validation', 'Please select a company');
      return;
    }
    if (!this.priceListId) {
      this.toast.warning('Validation', 'Please select a price list');
      return;
    }

    // Validate rows
    const rowsToSave = this.filteredRows();
    for (const row of rowsToSave) {
      if (!row.unitId) {
        this.toast.error('Validation', `Unit is required for product ${row.productCode}`);
        return;
      }
      for (const [ptId, price] of Object.entries(row.prices)) {
        if (price < 0) {
          this.toast.error('Validation', `Price cannot be negative for ${row.productCode}`);
          return;
        }
      }
    }

    this.saving.set(true);
    try {
      const priceTypes = this.sortedPriceTypes();
      const items: CreatePriceListDetailRequest[] = [];

      for (const row of rowsToSave) {
        for (const priceType of priceTypes) {
          const price = row.prices[priceType.priceTypeId] ?? 0;
          items.push({
            priceListId: this.priceListId!,
            productId: row.productId,
            unitId: row.unitId,
            price,
            minimumQuantity: row.minimumQuantity ?? 1,
            maximumQuantity: row.maximumQuantity ?? null,
            priceTypeId: priceType.priceTypeId,
          });
        }
      }

      await this.billing.priceLists.replaceDetails(this.priceListId!, items);
      this.toast.success('Prices saved', `Saved ${items.length} price entries`);
      await this.loadPriceListDetails(this.priceListId!);
    } catch (e: any) {
      this.toast.error('Failed to save prices', e?.error?.message ?? e?.message);
    } finally {
      this.saving.set(false);
    }
  }

  // ===================== Helpers =====================
  protected getCurrencyCode(currencyId: number | null): string {
    if (!currencyId) return '';
    const c = this.currencies().find((cur) => cur.id === currencyId);
    return c?.currencyCode ?? '';
  }

  protected getPriceListCurrency(priceList: PriceListDto): string {
    const c = this.currencies().find((cur) => cur.id === priceList.currencyId);
    return c?.currencyCode ?? '';
  }

  protected getCurrentStock(productId: number): number {
    const product = this.products().find(p => p.productId === productId);
    return product?.currentStock ?? 0;
  }

  protected getPrice(row: PriceMasterRow, priceTypeId: number): number {
    return row.prices[priceTypeId] ?? 0;
  }

  protected onPriceChange(row: PriceMasterRow, priceTypeId: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = parseFloat(input.value) || 0;
    if (value < 0) {
      input.value = '0';
      row.prices[priceTypeId] = 0;
    } else {
      row.prices[priceTypeId] = value;
    }
  }

  protected onMinQtyChange(row: PriceMasterRow, event: Event): void {
    const input = event.target as HTMLInputElement;
    row.minimumQuantity = parseInt(input.value) || 1;
  }

  protected onMaxQtyChange(row: PriceMasterRow, event: Event): void {
    const input = event.target as HTMLInputElement;
    const val = parseInt(input.value);
    row.maximumQuantity = isNaN(val) ? null : val;
  }

  protected trackByProductId(index: number, row: PriceMasterRow): number {
    return row.productId;
  }

  protected trackByPriceTypeId(index: number, pt: PriceTypeDto): number {
    return pt.priceTypeId;
  }

  protected refresh(): void {
    if (this.priceListId) {
      void this.loadPriceListDetails(this.priceListId);
    }
  }

  protected formatNumber(value: number): string {
    return new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
  }

  protected getPriceTypeIcon(code: string): string {
    const codeLower = code.toLowerCase();
    if (codeLower.includes('purchase')) return 'ShoppingBag';
    if (codeLower.includes('retail')) return 'Store';
    if (codeLower.includes('wholesale')) return 'Package';
    if (codeLower.includes('dealer')) return 'Users';
    if (codeLower.includes('online')) return 'Globe';
    if (codeLower.includes('mrp')) return 'Tag';
    return 'DollarSign';
  }
}