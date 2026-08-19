// On-screen controls and saved filters, taken verbatim from a known-good backup. Each checkbox includes one entry's
// keys in the synthesized backup: a control's x/y are fixed Java Floats, and a filter (the radar's, the feed list's) is
// a plain string. The values are not user-editable. The floating control and both fast-snipe buttons sit in one row
// along the bottom of the screen, so they share a Y. Dragging each into place by hand left them a pixel or so apart
// (the floating control was higher still, at 535.75); naming the row's Y once keeps them level.
const CONTROL_ROW_Y = 785.09375;
const SNIPE2 = {
  x: 916.2529296875,
  y: CONTROL_ROW_Y,
};

// The radar's filter — the one control value PGSharp stores as a JSON string rather than a Float. Kept as an object so
// each field reads and diffs on its own; JSON.stringify re-emits it as the compact string PGSharp wrote, so the fields
// must stay in this order. Taken verbatim from a known-good backup and not user-editable.
const SCAN_CONFIG = {
  shiny: true,
  minlv: 1,
  maxlv: 36,
  miniv: 0,
  maxiv: 100,
  checkAll: true,
  onlyShiny: true,
  name: 'Nearby Radar',
  birds: true,
  attrMode: 0,
  minatk: 0,
  maxatk: 15,
  mindef: 0,
  maxdef: 15,
  minsta: 0,
  maxsta: 15,
  showShinyOnly: false,
  loadShiny: true,
  notify: true,
  stop: true,
  pgp: true,
};

// The Nearby feed's filter list — the named filters the feed matches spawns against, stored as one JSON string under
// "hlfeeds". Kept as objects for the same reason as SCAN_CONFIG, and with the same constraint: JSON.stringify re-emits
// the compact string PGSharp wrote, so the fields must stay in this order. "Shiny Hunting" watches its own list of
// species for a shiny within 5 km; "100%" watches every species for a perfect one within 10 km and is the only one
// that notifies. Taken verbatim from a known-good backup and not user-editable.
const FEED_FILTERS = [
  {
    checkAll: false,
    level: 1,
    lvmax: 36,
    minIV: 0,
    maxIV: 100,
    onlyShiny: true,
    attrMode: 0,
    minatk: 0,
    maxatk: 15,
    mindef: 0,
    maxdef: 15,
    minsta: 0,
    maxsta: 15,
    gender: 0,
    form: 0,
    size: 0,
    notif: false,
    name: 'Shiny Hunting',
    distance: 5,
    priority: 0,
    pokemons: [
      515, 519, 520, 521, 524, 525, 526, 527, 529, 530, 531, 535, 536, 537, 540, 541, 542, 543, 544, 546, 547, 556, 46,
      559, 560, 561, 562, 563, 564, 566, 568, 569, 570, 585, 586, 588, 79, 592, 593, 595, 596, 84, 602, 603, 605, 606,
      610, 612, 616, 619, 620, 622, 627, 628, 118, 119, 632, 120, 121, 653, 143, 656, 658, 659, 660, 669, 670, 671, 672,
      673, 674, 676, 677, 679, 682, 684, 688, 690, 692, 693, 694, 696, 697, 698, 701, 702, 703, 704, 705, 707, 708, 710,
      712, 713, 714, 715, 203, 722, 723, 724, 725, 726, 727, 728, 729, 731, 732, 222, 223, 736, 737, 741, 742, 743, 234,
      755, 756, 761, 762, 763, 765, 766, 767, 769, 770, 775, 777, 779, 782, 810, 299, 811, 812, 813, 814, 815, 816, 817,
      818, 820, 821, 822, 823, 831, 832, 322, 323, 324, 336, 850, 851, 339, 340, 341, 342, 856, 857, 858, 859, 860, 861,
      357, 358, 369, 903, 906, 907, 908, 909, 910, 911, 912, 913, 914, 915, 916, 919, 408, 920, 921, 922, 412, 926, 927,
      928, 929, 417, 418, 930, 419, 420, 421, 422, 423, 935, 937, 938, 939, 948, 960, 961, 455, 975, 983, 998, 509, 510,
    ],
  },
  {
    checkAll: false,
    level: 1,
    lvmax: 36,
    minIV: 100,
    maxIV: 100,
    onlyShiny: false,
    attrMode: 0,
    minatk: 0,
    maxatk: 15,
    mindef: 0,
    maxdef: 15,
    minsta: 0,
    maxsta: 15,
    gender: 0,
    form: 0,
    size: 0,
    notif: true,
    name: '100%',
    distance: 10,
    priority: 0,
  },
];

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
