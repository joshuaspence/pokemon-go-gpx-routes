// On-screen controls, taken verbatim from a known-good backup. Each checkbox includes one entry's keys in the
// synthesized backup: a control's x/y are fixed Java Floats, and a filter from pgsharp-filters.js is the JSON string
// PGSharp stores. The values are not user-editable. The floating control and both fast-snipe buttons sit in one row
// along the bottom of the screen, so they share a Y. Dragging each into place by hand left them a pixel or so apart
// (the floating control was higher still, at 535.75); naming the row's Y once keeps them level.
import { FEED_FILTERS, SCAN_CONFIG } from './pgsharp-filters.js';

const CONTROL_ROW_Y = 785.09375;
const SNIPE2 = {
  x: 916.2529296875,
  y: CONTROL_ROW_Y,
};

// Keyed by the checkbox's DOM id, so each control appears once and its ticked state is a direct lookup. Iteration order
// is preserved (these ids are non-integer string keys), and it decides the order the keys land in the backup, so the
// entries stay in the order PGSharp wrote them.
export const CONTROL_RESETS = {
  resetIcon: {
    iconX: 0.0,
    iconY: CONTROL_ROW_Y,
  },

  resetSnipe1: {
    hlfastsnipex: 816.33203125,
    hlfastsnipey: CONTROL_ROW_Y,
  },

  resetSnipe2: {
    hlfastsnipe2x: SNIPE2.x,
    hlfastsnipe2y: SNIPE2.y,
  },

  resetCdpos: {
    hlcdposx: 0.0,
    hlcdposy: 306.25,
  },

  // The radar button shares fast-snipe button 2's position; hlscan is its filter, serialized to the string PGSharp stores.
  resetScan: {
    hlscanx: SNIPE2.x,
    hlscany: SNIPE2.y,
    hlscan: JSON.stringify(SCAN_CONFIG),
  },

  // The feed's filter list has no on-screen position of its own, so it ticks separately from the radar button above —
  // including it replaces whatever filters the profile already has.
  resetFeeds: {
    hlfeeds: JSON.stringify(FEED_FILTERS),
  },
};
