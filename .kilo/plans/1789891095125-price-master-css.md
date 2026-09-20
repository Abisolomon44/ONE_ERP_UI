/* ============================================================
   Price Master Page — Design 3: Left Sidebar + Right Grid
   Dark ERP Professional Style
   ============================================================ */

/* ---------- Page Root ---------- */
.price-master-page {
  padding: 20px 24px;
  min-height: 100vh;
  background: var(--bg, #f3f5fb);
}

/* ---------- Page Header ---------- */
.price-master-page .page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border);
}

.price-master-page .header-left h1 {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 22px;
  font-weight: 800;
  letter-spacing: -0.01em;
  color: var(--text);
  margin: 0 0 4px;
}

.price-master-page .header-left h1 i-lucide {
  color: var(--accent);
  flex-shrink: 0;
}

.price-master-page .header-description {
  margin: 0;
  font-size: 13.5px;
  color: var(--text-3);
}

.price-master-page .header-right {
  display: flex;
  gap: 10px;
}

/* ---------- Main Layout: Two Column ---------- */
.price-master-page .main-layout {
  display: flex;
  gap: 20px;
  align-items: flex-start;
}

/* ---------- Filter Sidebar (Left) ---------- */
.price-master-page .filter-sidebar {
  width: 300px;
  flex-shrink: 0;
  position: sticky;
  top: 0;
  height: 100vh;
  overflow-y: auto;
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 10px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.price-master-page .filter-card {
  background: #273248;
  border: 1px solid #334155;
  border-radius: 8px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.price-master-page .sidebar-section {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #94a3b8;
  margin: 0 0 2px;
  padding: 0;
  border: none;
  background: transparent;
}

.price-master-page .sidebar-field {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.price-master-page .sidebar-field label {
  font-size: 11.5px;
  font-weight: 600;
  color: #94a3b8;
  letter-spacing: 0.02em;
}

.price-master-page .sidebar-field .required {
  color: #f87171;
  margin-left: 2px;
}

.price-master-page .sidebar-input {
  width: 100%;
  height: 36px;
  padding: 0 10px;
  font-size: 13px;
  font-family: var(--font-family);
  color: #e2e8f0;
  background: #1e293b;
  border: 1px solid #475569;
  border-radius: 6px;
  transition: border-color 160ms cubic-bezier(0.4, 0, 0.2, 1), box-shadow 160ms cubic-bezier(0.4, 0, 0.2, 1);
}

.price-master-page .sidebar-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
}

.price-master-page .sidebar-input:focus-visible {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.25);
}

.price-master-page .sidebar-input:disabled {
  background: #1a2332;
  color: #64748b;
  cursor: not-allowed;
  opacity: 0.6;
}

.price-master-page .sidebar-input::placeholder {
  color: #64748b;
}

.price-master-page .sidebar-input-display {
  height: 36px;
  padding: 0 10px;
  font-size: 13px;
  font-weight: 500;
  color: #94a3b8;
  background: #1a2332;
  border: 1px solid #334155;
  border-radius: 6px;
  display: flex;
  align-items: center;
}

.price-master-page .sidebar-search-wrapper {
  position: relative;
}

.price-master-page .sidebar-search-icon {
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  color: #64748b;
  pointer-events: none;
}

.price-master-page .sidebar-search-input {
  padding-left: 32px !important;
}

.price-master-page .sidebar-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 4px;
}

.price-master-page .sidebar-actions .btn {
  height: 38px;
  width: 100%;
  font-size: 13px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border-radius: 6px;
  border: 1px solid transparent;
  cursor: pointer;
  transition: background 160ms cubic-bezier(0.4, 0, 0.2, 1), border-color 160ms cubic-bezier(0.4, 0, 0.2, 1), box-shadow 160ms cubic-bezier(0.4, 0, 0.2, 1);
  white-space: nowrap;
}

.price-master-page .sidebar-actions .btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.price-master-page .sidebar-actions .btn:focus-visible {
  outline: 2px solid rgba(59, 130, 246, 0.3);
  outline-offset: 1px;
}

.price-master-page .sidebar-actions .btn-primary {
  background: #2563eb;
  color: #ffffff;
  box-shadow: 0 1px 2px rgba(16, 24, 40, 0.3);
}

.price-master-page .sidebar-actions .btn-primary:hover:not(:disabled) {
  background: #1d4ed8;
}

.price-master-page .sidebar-actions .btn-success {
  background: #16a34a;
  color: #ffffff;
}

.price-master-page .sidebar-actions .btn-success:hover:not(:disabled) {
  background: #15803d;
}

/* ---------- Product Content (Right) ---------- */
.price-master-page .product-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* ---------- Price Type Legend ---------- */
.price-master-page .price-type-legend {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: #f1f5f9;
  border: 1px solid var(--border);
  border-radius: 8px;
}

.price-master-page .legend-label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-3);
  white-space: nowrap;
  margin-right: 4px;
}

.price-master-page .legend-item {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 10px;
  font-size: 12px;
  font-weight: 500;
  color: var(--text-2);
  background: var(--surface, #fff);
  border: 1px solid var(--border);
  border-radius: 999px;
  white-space: nowrap;
  transition: border-color 160ms cubic-bezier(0.4, 0, 0.2, 1), color 160ms cubic-bezier(0.4, 0, 0.2, 1);
}

.price-master-page .legend-item:hover {
  border-color: var(--accent);
  color: var(--accent);
}

.price-master-page .legend-item i-lucide {
  flex-shrink: 0;
}

/* ---------- Table Section ---------- */
.price-master-page .table-section {
  background: var(--surface, #fff);
  border: 1px solid var(--border);
  border-radius: 10px;
  overflow: hidden;
}

.price-master-page .table-wrapper {
  overflow-x: auto;
  overflow-y: visible;
}

.price-master-page .price-table {
  width: 100%;
  min-width: 1200px;
  border-collapse: collapse;
  font-size: 13px;
}

.price-master-page .price-table thead th {
  position: sticky;
  top: 0;
  z-index: 10;
  padding: 11px 8px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-3);
  background: #f8fafc;
  border-bottom: 2px solid var(--border);
  white-space: nowrap;
  text-align: left;
}

.price-master-page .price-table tbody tr {
  transition: background 160ms cubic-bezier(0.4, 0, 0.2, 1);
}

.price-master-page .price-table tbody tr:hover {
  background: #f8fafc;
}

.price-master-page .price-table td {
  padding: 9px 8px;
  vertical-align: middle;
  border-bottom: 1px solid var(--border);
}

/* Column widths */
.price-master-page .col-product {
  width: 80px;
  min-width: 80px;
}

.price-master-page .col-code {
  font-family: monospace;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-2);
  white-space: nowrap;
}

.price-master-page .col-name {
  min-width: 200px;
  max-width: 300px;
  font-weight: 500;
  color: var(--text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.price-master-page .col-unit {
  width: 80px;
  min-width: 80px;
  font-size: 12px;
  color: var(--text-2);
  white-space: nowrap;
}

.price-master-page .col-price {
  width: 120px;
  min-width: 110px;
  max-width: 140px;
  text-align: right;
}

.price-master-page .price-th-inner {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.price-master-page .price-input {
  width: 100%;
  min-width: 100px;
  padding: 5px 8px;
  font-size: 13px;
  font-variant-numeric: tabular-nums;
  text-align: right;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--surface, #fff);
  color: var(--text);
  transition: border-color 160ms cubic-bezier(0.4, 0, 0.2, 1), box-shadow 160ms cubic-bezier(0.4, 0, 0.2, 1);
}

.price-master-page .price-input:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-soft);
}

.price-master-page .price-input:focus-visible {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-soft);
}

.price-master-page .price-input:disabled {
  background: #f8fafc;
  color: var(--text-3);
  cursor: not-allowed;
}

.price-master-page .col-qty {
  width: 80px;
  min-width: 75px;
  text-align: right;
}

.price-master-page .qty-input {
  width: 100%;
  min-width: 65px;
  padding: 5px 8px;
  font-size: 13px;
  font-variant-numeric: tabular-nums;
  text-align: right;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--surface, #fff);
  color: var(--text);
  transition: border-color 160ms cubic-bezier(0.4, 0, 0.2, 1), box-shadow 160ms cubic-bezier(0.4, 0, 0.2, 1);
}

.price-master-page .qty-input:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-soft);
}

.price-master-page .qty-input:focus-visible {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-soft);
}

.price-master-page .qty-input:disabled {
  background: #f8fafc;
  color: var(--text-3);
  cursor: not-allowed;
}

.price-master-page .col-status {
  width: 100px;
  min-width: 90px;
  text-align: center;
}

.price-master-page .status-badge {
  display: inline-block;
  padding: 3px 10px;
  font-size: 11.5px;
  font-weight: 600;
  border-radius: 999px;
  text-transform: uppercase;
  letter-spacing: 0.02em;
}

.price-master-page .status-badge.active {
  color: var(--success);
  background: var(--success-soft, #e6f7ee);
  border: 1px solid var(--success-border, #a3e6c1);
}

.price-master-page .status-badge.inactive {
  color: var(--danger);
  background: var(--danger-soft, #fdeaea);
  border: 1px solid var(--danger-border, #f5b7b7);
}

.price-master-page .empty-row {
  text-align: center;
  padding: 40px 20px !important;
  color: var(--text-3);
  font-style: italic;
}

/* ---------- Loading / Empty States ---------- */
.price-master-page .table-loading,
.price-master-page .table-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 60px 20px;
  color: var(--text-3);
  font-size: 13.5px;
  text-align: center;
}

.price-master-page .table-loading .spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--border);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.price-master-page .table-empty i-lucide {
  opacity: 0.4;
}

.price-master-page .table-empty h5 {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--text-2);
}

.price-master-page .table-empty p {
  margin: 4px 0 0;
  max-width: 400px;
  line-height: 1.5;
}

.price-master-page .empty-hint {
  font-size: 12.5px !important;
  color: var(--text-3) !important;
}

/* ---------- Table Footer ---------- */
.price-master-page .table-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  margin-top: 0;
  background: #f8fafc;
  border-top: 1px solid var(--border);
  border-radius: 0 0 10px 10px;
  font-size: 12.5px;
  color: var(--text-2);
}

.price-master-page .footer-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: center;
}

.price-master-page .pl-badge {
  padding: 2px 10px;
  font-size: 11.5px;
  font-weight: 600;
  color: var(--accent);
  background: var(--accent-soft);
  border-radius: 999px;
}

/* ---------- Permission Denied ---------- */
.price-master-page .permission-denied {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  padding: 40px;
  text-align: center;
  background: var(--surface, #fff);
  border: 1px solid var(--border);
  border-radius: 10px;
  box-shadow: var(--shadow-sm);
}

.price-master-page .permission-icon {
  color: var(--danger);
  margin-bottom: 16px;
  opacity: 0.8;
}

.price-master-page .permission-denied h4 {
  margin: 0 0 8px;
  font-size: 18px;
  font-weight: 700;
  color: var(--text);
}

.price-master-page .permission-denied p {
  margin: 0 0 12px;
  color: var(--text-2);
}

.price-master-page .permission-hint {
  font-size: 13px;
  color: var(--text-3);
  font-family: monospace;
  background: #f1f5f9;
  padding: 8px 16px;
  border-radius: 6px;
}

/* ---------- Spinner for buttons ---------- */
.price-master-page .spin {
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* ---------- Responsive: Tablet ---------- */
@media (max-width: 1200px) {
  .price-master-page {
    padding: 16px 18px;
  }

  .price-master-page .filter-sidebar {
    width: 260px;
  }

  .price-master-page .product-content {
    gap: 12px;
  }
}

/* ---------- Responsive: Small Tablet ---------- */
@media (max-width: 900px) {
  .price-master-page .filter-sidebar {
    width: 240px;
  }
}

/* ---------- Responsive: Mobile ---------- */
@media (max-width: 768px) {
  .price-master-page {
    padding: 12px 14px;
  }

  .price-master-page .main-layout {
    flex-direction: column;
  }

  .price-master-page .filter-sidebar {
    width: 100%;
    height: auto;
    position: static;
    max-height: none;
  }

  .price-master-page .product-content {
    min-width: 0;
  }

  .price-master-page .sidebar-actions .btn {
    width: 100%;
  }
}

/* ---------- Responsive: Small Mobile ---------- */
@media (max-width: 480px) {
  .price-master-page {
    padding: 10px 12px;
  }

  .price-master-page .filter-sidebar {
    padding: 12px;
  }

  .price-master-page .filter-card {
    padding: 10px;
  }

  .price-master-page .table-footer {
    flex-direction: column;
    gap: 8px;
    text-align: center;
  }

  .price-master-page .footer-stats {
    justify-content: center;
  }
}

/* ---------- Print ---------- */
@media print {
  .price-master-page .filter-sidebar,
  .price-master-page .sidebar-actions {
    display: none !important;
  }

  .price-master-page .main-layout {
    display: block;
  }

  .price-master-page .product-content {
    width: 100%;
  }

  .price-master-page .price-table {
    min-width: 100%;
  }

  .price-master-page .price-table thead th {
    position: static;
    background: #f3f4f6 !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .price-master-page .price-input,
  .price-master-page .qty-input {
    border: none;
    background: transparent;
  }
}