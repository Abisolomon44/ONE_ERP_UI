export interface ScopeOptions {
  companies?: { id: any; name: string }[];
  branches?: { id: any; name: string }[];
  warehouses?: { id: any; name: string }[];
}

export function buildScopeLabel(
  opts: ScopeOptions,
): { scopeLabel: string; noAccess: boolean } {
  const parts: string[] = [];

  if (opts.companies?.length) {
    parts.push(opts.companies.map((c) => c.name).join(', '));
  }
  if (opts.branches?.length) {
    parts.push(`Branches: ${opts.branches.map((b) => b.name).join(', ')}`);
  }
  if (opts.warehouses?.length) {
    parts.push(`Warehouses: ${opts.warehouses.map((w) => w.name).join(', ')}`);
  }

  if (!parts.length) {
    return { scopeLabel: 'No Access', noAccess: true };
  }
  return { scopeLabel: `Data Scope: ${parts.join('  |  ')}`, noAccess: false };
}