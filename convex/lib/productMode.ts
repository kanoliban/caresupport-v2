export type ProductMode = "solo_beta" | "family_coordination";

export function getEffectiveProductMode(
  productMode: string | undefined,
): ProductMode {
  if (productMode === "family_coordination") return "family_coordination";
  return "solo_beta";
}

export function isSoloBetaMode(
  productMode: string | undefined,
): boolean {
  return getEffectiveProductMode(productMode) === "solo_beta";
}
