// On-screen controls, taken verbatim from a known-good backup. Each checkbox
// includes one control's keys in the synthesized backup: x/y are fixed Java
// Floats, and the radar also carries its filter config (a plain string). The
// values are not user-editable.
// The floating control and both fast-snipe buttons sit in one row along the
// bottom of the screen, so they share a Y. Dragging each into place by hand
// left them a pixel or so apart (the floating control was higher still, at
// 535.75); naming the row's Y once keeps them level.
const CONTROL_ROW_Y = 785.09375;
const SNIPE2 = { x: 916.2529296875, y: CONTROL_ROW_Y }; // fast-snipe button 2
const SCAN_CONFIG =
  '{"shiny":true,"minlv":1,"maxlv":36,"miniv":0,"maxiv":100,"checkAll":true,"onlyShiny":true,"name":"Nearby Radar","birds":true,"attrMode":0,"minatk":0,"maxatk":15,"mindef":0,"maxdef":15,"minsta":0,"maxsta":15,"showShinyOnly":false,"loadShiny":true,"notify":true,"stop":true,"pgp":true}';

export const CONTROL_RESETS = [
  { id: 'resetIcon', keys: { iconX: 0.0, iconY: CONTROL_ROW_Y } },
  { id: 'resetSnipe1', keys: { hlfastsnipex: 816.33203125, hlfastsnipey: CONTROL_ROW_Y } },
  { id: 'resetSnipe2', keys: { hlfastsnipe2x: SNIPE2.x, hlfastsnipe2y: SNIPE2.y } },
  { id: 'resetCdpos', keys: { hlcdposx: 0.0, hlcdposy: 306.25 } },
  // The radar button shares fast-snipe button 2's position; hlscan is its filter.
  { id: 'resetScan', keys: { hlscanx: SNIPE2.x, hlscany: SNIPE2.y, hlscan: SCAN_CONFIG } },
];
