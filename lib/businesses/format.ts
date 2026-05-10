export function formatOMR(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return "Price on request";
  return new Intl.NumberFormat("en-OM", {
    style: "currency",
    currency: "OMR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatPriceRange(
  forSale: boolean,
  forRent: boolean,
  sellingPrice: number | null,
  rentalPrice: number | null,
): string {
  if (forSale && forRent && sellingPrice && rentalPrice) {
    return `${formatOMR(sellingPrice)} sale  ·  ${formatOMR(rentalPrice)}/mo rent`;
  }
  if (forRent && rentalPrice) return `${formatOMR(rentalPrice)} / month`;
  if (forSale) return formatOMR(sellingPrice);
  return "Price on request";
}

export function statusLabel(status: "available" | "reserved" | "sold"): string {
  switch (status) {
    case "available":
      return "Available";
    case "reserved":
      return "Reserved";
    case "sold":
      return "Sold";
  }
}

export function ageLabel(years: number | null | undefined): string {
  if (years === null || years === undefined) return "—";
  if (years < 1) return "<1 yr";
  if (years === 1) return "1 yr";
  return `${years} yrs`;
}
