<div class="price-master-page">
  <header class="page-header">
    <div class="header-left">
      <h1><i-lucide name="Tag" [size]="24"></i-lucide> Price Master</h1>
      <p class="header-description">Manage branch-wise product prices across all price types.</p>
    </div>
    <div class="header-right">
      <button class="btn btn-secondary" type="button" (click)="refresh()" [disabled]="loading() || loadingProducts()">
        <i-lucide name="RotateCw" [size]="16"></i-lucide> Refresh
      </button>
    </div>
  </header>

  <div class="main-layout">
    <aside class="filter-sidebar">
      <section class="filter-card">
        <h3 class="sidebar-section">Location</h3>
        <div class="sidebar-field">
          <label for="companyId">Company <span class="required">*</span></label>
          <select id="companyId" class="sidebar-input" [(ngModel)]="companyId" (ngModelChange)="onCompanyChange()" [disabled]="loading()">
            <option [ngValue]="null" disabled>Select Company</option>
            @for (c of companies(); track c.id) { <option [ngValue]="c.id">{{ c.companyName }} ({{ c.companyCode }})</option> }
          </select>
        </div>
        <div class="sidebar-field">
          <label for="branchId">Branch <span class="required" *ngIf="isBranchRequired()">*</span></label>
          <select id="branchId" class="sidebar-input" [(ngModel)]="branchId" (ngModelChange)="onBranchChange()" [disabled]="!companyId || loading()">
            <option [ngValue]="null">All Branches (Company Level)</option>
            @for (b of branches(); track b.id) { <option [ngValue]="b.id">{{ b.branchName }} ({{ b.branchCode }})</option> }
          </select>
        </div>
        <div class="sidebar-field">
          <label for="warehouseId">Warehouse</label>
          <select id="warehouseId" class="sidebar-input" [(ngModel)]="warehouseId" (ngModelChange)="onWarehouseChange()" [disabled]="!companyId || loading()">
            <option [ngValue]="null">All Warehouses</option>
            @for (w of warehouses(); track w.id) { <option [ngValue]="w.id">{{ w.warehouseName }} ({{ w.warehouseCode }})</option> }
          </select>
        </div>
      </section>

      <section class="filter-card">
        <h3 class="sidebar-section">Product Source</h3>
        <div class="sidebar-field">
          <label for="productSource">Product Source <span class="required">*</span></label>
          <select id="productSource" class="sidebar-input" [(ngModel)]="productSource" (ngModelChange)="onProductSourceChange()" [disabled]="loadingProducts()">
            <option value="direct">Direct Products</option>
            <option value="purchase">Purchase Products</option>
          </select>
        </div>
      </section>

      <section class="filter-card">
        <h3 class="sidebar-section">Price Configuration</h3>
        <div class="sidebar-field">
          <label for="priceListId">Price List <span class="required">*</span></label>
          <select id="priceListId" class="sidebar-input" [(ngModel)]="priceListId" (ngModelChange)="onPriceListChange()" [disabled]="!companyId || loading()">
            <option [ngValue]="null" disabled>Select Price List</option>
            @for (pl of priceLists(); track pl.priceListId) { <option [ngValue]="pl.priceListId">{{ pl.name }} ({{ pl.code }}) — {{ getPriceListCurrency(pl) }}</option> }
          </select>
        </div>
        <div class="sidebar-field">
          <label>Currency</label>
          <div class="sidebar-input-display">{{ getCurrencyCode(currencyId) || (priceListId ? getPriceListCurrency(priceLists().find(p => p.priceListId === priceListId)!) : '—') }}</div>
        </div>
        <div class="sidebar-field">
          <label for="effectiveDate">Effective Date</label>
          <input id="effectiveDate" type="date" class="sidebar-input" [(ngModel)]="effectiveDate" [disabled]="loading()" />
        </div>
      </section>

      <section class="filter-card">
        <h3 class="sidebar-section">Product Filter</h3>
        <div class="sidebar-field">
          <label for="searchProduct">Search Product</label>
          <div class="sidebar-search-wrapper"><i-lucide name="Search" [size]="14" class="sidebar-search-icon"></i-lucide>
            <input id="searchProduct" type="text" class="sidebar-input sidebar-search-input" placeholder="Search by code or name..." [(ngModel)]="searchProduct" (ngModelChange)="applyProductFilters()" [disabled]="loadingProducts()" />
          </div>
        </div>
        <div class="sidebar-field">
          <label for="categoryId">Category</label>
          <select id="categoryId" class="sidebar-input" [(ngModel)]="categoryId" (ngModelChange)="applyProductFilters()" [disabled]="loadingProducts()">
            <option [ngValue]="null">All Categories</option>
            @for (cat of categories(); track cat.id) { <option [ngValue]="cat.id">{{ cat.categoryName }}</option> }
          </select>
        </div>
      </section>

      <div class="sidebar-actions">
        <button class="btn btn-primary btn-block" type="button" (click)="loadProductsBySource()" [disabled]="!companyId || loadingProducts()">
          <i-lucide name="RefreshCw" [size]="16"></i-lucide> Load Products
        </button>
        <button class="btn btn-success btn-block" type="button" (click)="saveAllPrices()" [disabled]="saving() || !canEdit() || !priceListId || filteredRows().length === 0">
          <i-lucide name="Save" [size]="16"></i-lucide> Save All Prices
        </button>
      </div>
    </aside>

    <main class="product-content">
      @if (sortedPriceTypes().length > 0) {
        <div class="price-type-legend card">
          <span class="legend-label">Price Types:</span>
          @for (pt of sortedPriceTypes(); track pt.priceTypeId) {
            <span class="legend-item" [title]="pt.description || ''"><i-lucide [name]="getPriceTypeIcon(pt.code)" [size]="14"></i-lucide> {{ pt.name }}</span>
          }
        </div>
      }

      <section class="table-section card">
        @if (loadingProducts() || loading()) {
          <div class="table-loading"><div class="spinner"></div><span>Loading products and prices…</span></div>
        }
        @else if (isEmpty()) {
          <div class="table-empty"><i-lucide name="PackageSearch" [size]="48"></i-lucide><h5>No Products Found</h5><p>Select a Company, Product Source, then click <strong>Load Products</strong> to populate the price grid.</p><p class="empty-hint">Direct Products: from Products table (PurchasePrice). Purchase Products: from Stock table (LastPurchaseRate).</p></div>
        }
        @else {
          <div class="table-wrapper" #tableWrapper>
            <table class="price-table">
              <thead>
                <tr>
                  <th class="col-product" colspan="2">Product</th>
                  <th class="col-unit">Unit</th>
                  <th class="col-stock" *ngIf="productSource === 'purchase'">Current Stock</th>
                  @for (pt of sortedPriceTypes(); track pt.priceTypeId) {
                    <th class="col-price" [title]="pt.description || ''">
                      <div class="price-th-inner">
                        <i-lucide [name]="getPriceTypeIcon(pt.code)" [size]="14"></i-lucide>
                        <span>{{ pt.name }}</span>
                      </div>
                      <div class="price-th-actions">
                        <button class="btn btn-sm btn-primary" type="button"
                          (click)="savePriceType(pt.priceTypeId)"
                          [disabled]="!canEdit() || saving() || !priceListId || filteredRows().length === 0"
                          [title]="'Save ' + pt.name">
                          <i-lucide name="Save" [size]="12"></i-lucide>
                        </button>
                      </div>
                    </th>
                  }
                  <th class="col-qty" style="display: none">Min Qty</th><th class="col-qty" style="display: none">Max Qty</th><th class="col-status">Status</th>
                </tr>
              </thead>
              <tbody>
                @for (row of filteredRows(); track row.productId) {
                  <tr>
                    <td class="col-code">{{ row.productCode }}</td>
                    <td class="col-name">{{ row.productName }}</td>
                    <td class="col-unit">{{ row.unitName }}</td>
                    <td class="col-stock" *ngIf="productSource === 'purchase'">{{ formatNumber(getCurrentStock(row.productId)) }}</td>
                    @for (pt of sortedPriceTypes(); track pt.priceTypeId) {
                      <td class="col-price"><input type="number" class="price-input" [value]="getPrice(row, pt.priceTypeId) | number:'1.2-2'" (change)="onPriceChange(row, pt.priceTypeId, $event)" [disabled]="!canEdit() || saving()" step="0.01" min="0"></td>
                    }
                    <td class="col-qty" style="display: none"><input type="number" class="qty-input" [value]="row.minimumQuantity" (change)="onMinQtyChange(row, $event)" [disabled]="!canEdit() || saving()" min="1"></td>
                    <td class="col-qty" style="display: none"><input type="number" class="qty-input" [value]="row.maximumQuantity ?? ''" (change)="onMaxQtyChange(row, $event)" [disabled]="!canEdit() || saving()" min="1" placeholder="∞"></td>
                    <td class="col-status"><span class="status-badge" [class.active]="row.isActive" [class.inactive]="!row.isActive">{{ row.isActive ? 'Active' : 'Inactive' }}</span></td>
                  </tr>
                } @empty {
                  <tr><td [attr.colspan]="3 + sortedPriceTypes().length + 4" class="empty-row">No products match the current filters.</td></tr>
                }
              </tbody>
            </table>
          </div>
          <div class="table-footer"><div class="footer-stats"><span>{{ filteredRows().length }} product{{ filteredRows().length !== 1 ? 's' : '' }} displayed</span><span>{{ sortedPriceTypes().length }} price type{{ sortedPriceTypes().length !== 1 ? 's' : '' }}</span>@if (priceListId) {<span class="pl-badge">Price List: {{ priceLists().find(p => p.priceListId === priceListId)?.name }}</span></div></div>
        }
      </section>
    </main>
  </div>

  <ng-template #noPermission>
    <div class="permission-denied"><i-lucide name="ShieldAlert" [size]="48" class="permission-icon"></i-lucide><h4>Access Denied</h4><p>You do not have permission to view Price Master.</p><p class="permission-hint">Required permission: <code>price-master.view</code></p></div>
  </ng-template>
</div>