# Price Master — Design 3: Left Filter Sidebar + Right Product Price Grid

## Context
Redesign `src/app/pages/price-master/` to a two-column layout: sticky left filter sidebar + scrollable right product price grid. Only HTML and CSS change; TypeScript remains untouched.

## Files Modified
- `src/app/pages/price-master/price-master.html` — restructure layout, preserve all bindings
- `src/app/pages/price-master/price-master.css` — complete rewrite for two-column dark ERP design

## Implementation Plan

### 1. HTML Restructure (`price-master.html`)
- Keep `<div class="price-master-page">` as root
- Add `.page-header` unchanged (title, description, refresh)
- Add `.main-layout` flex container:
  - `<aside class="filter-sidebar">` — all filter groups split into labeled sections (Location, Product Source, Price Config, Product Filter)
  - `<main class="product-content">` — price type legend + table section
- Preserve ALL Angular directives exactly: `[(ngModel)]`, `(ngModelChange)`, `(click)`, `(change)`, `*ngIf`, `@for`, `@empty`, `[disabled]`, `[class.active]`, `[title]`, `[ngValue]`, `[size]`, `[name]`, `[attr.colspan]`, `[style.display]`
- Preserve ALL `@for` loops for price types, products, price lists, etc.
- Keep permission-denied block unchanged

### 2. CSS Rewrite (`price-master.css`)
Design tokens: dark navy/slate ERP palette
- `.price-master-page`: bg `#0f172a`, padding 20px 24px
- `.main-layout`: flex, gap 20px, align-items flex-start
- `.filter-sidebar`: width 300px, sticky top 0, height 100vh, overflow-y auto, bg `#1e293b`, border-right 1px, border-radius 10px, padding 16px
- `.product-content`: flex 1, min-width 0
- Filter sections separated by styled section headers (uppercase, small, muted)
- Form controls: compact 36-40px height, dark themed
- Buttons: full-width in sidebar, primary blue, secondary style for Save All
- `.filter-card`: bg `#1e293b`, border `#334155`, radius 8px, padding 14px
- `.sidebar-section`: label style for filter group headings
- Table: horizontal scroll, sticky header, dark theme
- Responsive: sidebar 260px on tablet, stacked on mobile

### 3. Deliverables

Files are written to `.kilo/plans/` since source file edits are restricted by permission policy:

| # | File | Destination |
|---|------|-------------|
| 1 | `.kilo/plans/1789891095125-price-master-html.md` | `src/app/pages/price-master/price-master.html` |
| 2 | `.kilo/plans/1789891095125-price-master-css.md` | `src/app/pages/price-master/price-master.css` |

### 4. Verification Checklist

- No TypeScript changes required
- All existing Angular bindings preserved verbatim (`[(ngModel)]`, `(ngModelChange)`, `(click)`, `(change)`, `*ngIf`, `@for`, `@empty`)
- All `@for` loops for price types, products, price lists preserved
- Buttons call same methods: `refresh()`, `loadProductsBySource()`, `saveAllPrices()`, `savePriceType()`
- Price editing still works: `onPriceChange()`, `onMinQtyChange()`, `onMaxQtyChange()`
- Filter logic unchanged: `applyProductFilters()`
- Permission check preserved: `canView()`, `canEdit()`
- Design 3 confirmed: LEFT FILTER SIDEBAR + RIGHT PRODUCT PRICE GRID
- Responsive breakpoints: Desktop 300px sidebar, Tablet 240-260px, Mobile stacked
