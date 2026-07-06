// Matches the CHECK constraint on batches.asset_type / assets.asset_type
// (supabase/migrations/0002_assets_catalog_sharing.sql) — the 8 categories from
// PRD.md Section 4.1/Appendix A, stored as snake_case identifiers with display
// labels mapped here rather than in the database.

export type AssetType =
  | "website_product"
  | "stock_plants"
  | "stock_pots_jars"
  | "customer_sends"
  | "social"
  | "raw_clips"
  | "plantscaping_projects"
  | "event_coverage";

export const ASSET_TYPES: { value: AssetType; label: string }[] = [
  { value: "website_product", label: "Website / Product" },
  { value: "stock_plants", label: "Stock — Plants" },
  { value: "stock_pots_jars", label: "Stock — Pots/Jars" },
  { value: "customer_sends", label: "Customer Sends" },
  { value: "social", label: "Social" },
  { value: "raw_clips", label: "Raw Clips" },
  { value: "plantscaping_projects", label: "Plantscaping Projects" },
  { value: "event_coverage", label: "Event Coverage" },
];

const VALID_ASSET_TYPES = new Set(ASSET_TYPES.map((t) => t.value));

export function isAssetType(value: string): value is AssetType {
  return VALID_ASSET_TYPES.has(value as AssetType);
}
