/** Single source for the perforated ticket mark (SVG viewBox 0 0 40 40). Keep public/favicon.svg paths in sync or run `npm run sync:favicon`. */
export const JATRI_SWAP_TICK_MARK_VIEWBOX = "0 0 40 40" as const;

export const JATRI_SWAP_TICK_MARK_OUTLINE = "M 7 11 H 33 V 16 L 30 20 L 33 24 V 29 H 7 V 24 L 10 20 L 7 16 Z" as const;

/** Vertical dashed tear line. */
export const JATRI_SWAP_TICK_MARK_TEAR = { x1: 20, y1: 12, x2: 20, y2: 28 } as const;

export const JATRI_SWAP_TICK_MARK_TEAR_DASH = "3 3" as const;

/** Stylised barcode segments on the left stub. */
export const JATRI_SWAP_TICK_MARK_BARCODE = "M12 17v6M14 15v10M16 18v4" as const;

/** Same rotation (degrees) as the logo rail mark and favicon. */
export const JATRI_SWAP_TICK_MARK_ROTATE_DEG = 38 as const;
