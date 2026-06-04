export const FRU_PER_INCH = 10000;
export const DPI = 96;
export const FRU_TO_PX = DPI / FRU_PER_INCH;

export function fruToPx(fru: number | undefined | null): number {
  return Math.round((fru || 0) * FRU_TO_PX);
}

export function pxToFru(px: number | undefined | null): number {
  if (px == null) return 0;
  return Math.round(px / FRU_TO_PX);
}