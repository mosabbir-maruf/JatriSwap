import {
  JATRI_SWAP_TICK_MARK_BARCODE,
  JATRI_SWAP_TICK_MARK_OUTLINE,
  JATRI_SWAP_TICK_MARK_ROTATE_DEG,
  JATRI_SWAP_TICK_MARK_TEAR,
  JATRI_SWAP_TICK_MARK_TEAR_DASH,
} from "./jatriSwapTicketMarkGeometry";

/** sRGB hex for :root --primary (see src/index.css); favicon cannot read CSS variables. */
const FAVICON_PRIMARY_FILL = "#1c69e3";
const FAVICON_TICKET_STROKE = "#fcfcfc";
const FAVICON_CORNER_RX = 12;

/**
 * SVG favicon document: rounded tile + rotated ticket mark only (no wordmark).
 * Written to `public/favicon.svg` from Vite `buildStart` so geometry stays single-sourced.
 */
export function getJatriSwapFaviconSvgDocument(): string {
  const t = JATRI_SWAP_TICK_MARK_TEAR;
  const r = JATRI_SWAP_TICK_MARK_ROTATE_DEG;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40">
  <defs>
    <clipPath id="favicon-round">
      <rect width="40" height="40" rx="${FAVICON_CORNER_RX}" ry="${FAVICON_CORNER_RX}" />
    </clipPath>
  </defs>
  <g clip-path="url(#favicon-round)">
    <rect width="40" height="40" fill="${FAVICON_PRIMARY_FILL}" />
    <g transform="translate(20,20) rotate(-${r}) translate(-20,-20)">
      <path
        d="${JATRI_SWAP_TICK_MARK_OUTLINE}"
        fill="none"
        stroke="${FAVICON_TICKET_STROKE}"
        stroke-width="2"
        stroke-linejoin="miter"
        vector-effect="non-scaling-stroke"
      />
      <line
        x1="${t.x1}"
        y1="${t.y1}"
        x2="${t.x2}"
        y2="${t.y2}"
        stroke="${FAVICON_TICKET_STROKE}"
        stroke-width="2"
        stroke-dasharray="${JATRI_SWAP_TICK_MARK_TEAR_DASH}"
        stroke-linecap="square"
        vector-effect="non-scaling-stroke"
      />
      <path
        d="${JATRI_SWAP_TICK_MARK_BARCODE}"
        stroke="${FAVICON_TICKET_STROKE}"
        stroke-width="1.5"
        stroke-linecap="square"
        vector-effect="non-scaling-stroke"
      />
    </g>
  </g>
</svg>
`;
}
