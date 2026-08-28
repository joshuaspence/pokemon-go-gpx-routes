/**
 * The filters PGSharp saves — which spawns the radar and the nearby feed are looking for. Unlike a control's position,
 * which is a Java Float, each of these is stored as one JSON string; they are kept as objects here so every field reads
 * and diffs on its own, and JSON.stringify re-emits the compact string PGSharp wrote where they are put in the backup.
 * That re-emission goes field by field in source order, so the order below is part of the value and must not be
 * rearranged. Every value is a known-good backup's except in "Regional Shiny Hunting", whose distance and priority are
 * set to match "Shiny Hunting" — 80 and 1 where the backup has 0 and 0 — and whose SHELLOS the backup carries only in
 * "Shiny Hunting". None is user-editable.
 */

import POKEMON from './pokemon.js';

/**
 * A filter's species list, checked. A constant pokemon.js does not define reads as undefined rather than failing, and
 * would reach the backup as a null where a species should be, so it stops here instead. The value is all we are handed
 * — the constant's name is gone by then — so the error gives the position to look at.
 */
function species(numbers) {
  const at = numbers.findIndex((n) => !Number.isInteger(n));

  if (at !== -1) {
    throw new Error(`species #${at + 1} is not a POKEMON constant — check it against pokemon.js`);
  }

  return numbers;
}

/**
 * The nearby radar's own filter, stored under "hlscan" — it rides along with the radar button's position rather than
 * ticking separately, since the button is what carries it.
 */
export const SCAN_CONFIG = {
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
  showShinyOnly: true,
  loadShiny: true,
  notify: true,
  stop: true,
  pgp: true,
};

/**
 * The nearby feed's filter list, stored under "hlfeeds" — the named filters the feed matches spawns against, as one
 * JSON array. "Shiny Hunting" watches its own list of species for a shiny and "Regional Shiny Hunting" the ten
 * region-locked ones for any encounter, both within 80 km and both at priority 1; "100%" watches every species for a
 * perfect one within 10 km, at priority 0, and is the only one that notifies. Those species lists are written in dex
 * order; PGSharp wrote them in neither dex nor alphabetical order, and reads them back as the set of species they hold,
 * so the order they are stored in is ours to pick.
 */
export const FEED_FILTERS = [
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
    distance: 80,
    priority: 1,

    // prettier-ignore
    pokemons: species([
      // Generation 1
      POKEMON.PARAS, POKEMON.PARASECT,
      POKEMON.SLOWPOKE, POKEMON.SLOWBRO,
      POKEMON.DODUO, POKEMON.DODRIO,
      POKEMON.STARYU,
      POKEMON.SNORLAX,

      // Generation 2
      POKEMON.UNOWN,
      POKEMON.GIRAFARIG,
      POKEMON.REMORAID, POKEMON.OCTILLERY,
      POKEMON.STANTLER,

      // Generation 3
      POKEMON.NOSEPASS,
      POKEMON.TORKOAL,
      POKEMON.SEVIPER,
      POKEMON.BARBOACH, POKEMON.WHISCASH,
      POKEMON.TROPIUS,
      POKEMON.RELICANTH,

      // Generation 4
      POKEMON.CRANIDOS, POKEMON.RAMPARDOS,
      POKEMON.BURMY, POKEMON.WORMADAM, POKEMON.MOTHIM,
      POKEMON.PACHIRISU,
      POKEMON.BUIZEL, POKEMON.FLOATZEL,
      POKEMON.CHERUBI, POKEMON.CHERRIM,
      POKEMON.CARNIVINE,

      // Generation 5
      POKEMON.PURRLOIN, POKEMON.LIEPARD,
      POKEMON.PANPOUR, POKEMON.SIMIPOUR,
      POKEMON.PIDOVE, POKEMON.TRANQUILL, POKEMON.UNFEZANT,
      POKEMON.ROGGENROLA, POKEMON.BOLDORE, POKEMON.GIGALITH,
      POKEMON.DRILBUR, POKEMON.EXCADRILL,
      POKEMON.AUDINO,
      POKEMON.SEWADDLE, POKEMON.SWADLOON, POKEMON.LEAVANNY,
      POKEMON.COTTONEE, POKEMON.WHIMSICOTT,
      POKEMON.PETILIL, POKEMON.LILLIGANT,
      POKEMON.BASCULIN,
      POKEMON.SCRAGGY, POKEMON.SCRAFTY,
      POKEMON.YAMASK, POKEMON.COFAGRIGUS,
      POKEMON.TIRTOUGA, POKEMON.CARRACOSTA,
      POKEMON.ARCHEN, POKEMON.ARCHEOPS,
      POKEMON.ZORUA, POKEMON.ZOROARK,
      POKEMON.DEERLING, POKEMON.SAWSBUCK,
      POKEMON.KARRABLAST, POKEMON.ESCAVALIER,
      POKEMON.TYNAMO, POKEMON.EELEKTRIK, POKEMON.EELEKTROSS,
      POKEMON.AXEW, POKEMON.FRAXURE, POKEMON.HAXORUS,
      POKEMON.SHELMET, POKEMON.ACCELGOR,
      POKEMON.MIENFOO, POKEMON.MIENSHAO,
      POKEMON.GOLETT, POKEMON.GOLURK,
      POKEMON.PAWNIARD, POKEMON.BISHARP,
      POKEMON.RUFFLET, POKEMON.BRAVIARY,
      POKEMON.LARVESTA, POKEMON.VOLCARONA,

      // Generation 6
      POKEMON.CHESPIN, POKEMON.QUILLADIN, POKEMON.CHESNAUGHT,
      POKEMON.FENNEKIN, POKEMON.BRAIXEN, POKEMON.DELPHOX,
      POKEMON.FROAKIE, POKEMON.FROGADIER, POKEMON.GRENINJA,
      POKEMON.BUNNELBY, POKEMON.DIGGERSBY,
      POKEMON.SCATTERBUG, POKEMON.SPEWPA, POKEMON.VIVILLON,
      POKEMON.FLABEBE, POKEMON.FLOETTE, POKEMON.FLORGES,
      POKEMON.SKIDDO, POKEMON.GOGOAT,
      POKEMON.PANCHAM,
      POKEMON.FURFROU,
      POKEMON.ESPURR, POKEMON.MEOWSTIC,
      POKEMON.HONEDGE, POKEMON.DOUBLADE, POKEMON.AEGISLASH,
      POKEMON.SWIRLIX, POKEMON.SLURPUFF,
      POKEMON.BINACLE, POKEMON.BARBARACLE,
      POKEMON.SKRELP, POKEMON.DRAGALGE,
      POKEMON.CLAUNCHER, POKEMON.CLAWITZER,
      POKEMON.HELIOPTILE, POKEMON.HELIOLISK,
      POKEMON.TYRUNT, POKEMON.TYRANTRUM,
      POKEMON.AMAURA, POKEMON.AURORUS,
      POKEMON.HAWLUCHA,
      POKEMON.DEDENNE,
      POKEMON.CARBINK,
      POKEMON.GOOMY, POKEMON.SLIGGOO, POKEMON.GOODRA,
      POKEMON.KLEFKI,
      POKEMON.PHANTUMP, POKEMON.PUMPKABOO,
      POKEMON.BERGMITE, POKEMON.AVALUGG,
      POKEMON.NOIBAT, POKEMON.NOIVERN,

      // Generation 7
      POKEMON.ROWLET, POKEMON.DARTRIX, POKEMON.DECIDUEYE,
      POKEMON.POPPLIO, POKEMON.BRIONNE, POKEMON.PRIMARINA,
      POKEMON.PIKIPEK, POKEMON.TRUMBEAK, POKEMON.TOUCANNON,
      POKEMON.GRUBBIN, POKEMON.CHARJABUG, POKEMON.VIKAVOLT,
      POKEMON.CRABRAWLER, POKEMON.CRABOMINABLE,
      POKEMON.ORICORIO,
      POKEMON.CUTIEFLY, POKEMON.RIBOMBEE,
      POKEMON.MUDBRAY, POKEMON.MUDSDALE,
      POKEMON.MORELULL, POKEMON.SHIINOTIC,
      POKEMON.BOUNSWEET, POKEMON.STEENEE, POKEMON.TSAREENA,
      POKEMON.ORANGURU, POKEMON.PASSIMIAN,
      POKEMON.SANDYGAST, POKEMON.PALOSSAND,
      POKEMON.KOMALA,
      POKEMON.TOGEDEMARU,
      POKEMON.BRUXISH,
      POKEMON.JANGMO_O, POKEMON.HAKAMO_O, POKEMON.KOMMO_O,

      // Generation 8
      POKEMON.GROOKEY, POKEMON.THWACKEY, POKEMON.RILLABOOM,
      POKEMON.SCORBUNNY, POKEMON.RABOOT, POKEMON.CINDERACE,
      POKEMON.ROOKIDEE, POKEMON.CORVISQUIRE, POKEMON.CORVIKNIGHT,
      POKEMON.WOOLOO, POKEMON.DUBWOOL,
      POKEMON.SIZZLIPEDE, POKEMON.CENTISKORCH,
      POKEMON.HATENNA, POKEMON.HATTREM, POKEMON.HATTERENE,
      POKEMON.IMPIDIMP, POKEMON.MORGREM, POKEMON.GRIMMSNARL,
      POKEMON.SIRFETCHD,
      POKEMON.RUNERIGUS,
      POKEMON.SNOM, POKEMON.FROSMOTH,
      POKEMON.SNEASLER,
      POKEMON.OVERQWIL,

      // Generation 9
      POKEMON.FUECOCO, POKEMON.CROCALOR, POKEMON.SKELEDIRGE,
      POKEMON.QUAXLY, POKEMON.QUAXWELL, POKEMON.QUAQUAVAL,
      POKEMON.LECHONK, POKEMON.OINKOLOGNE,
      POKEMON.NYMBLE, POKEMON.LOKIX,
      POKEMON.PAWMI, POKEMON.PAWMO, POKEMON.PAWMOT,
      POKEMON.FIDOUGH, POKEMON.DACHSBUN,
      POKEMON.SMOLIV, POKEMON.DOLLIV, POKEMON.ARBOLIVA,
      POKEMON.TADBULB, POKEMON.BELLIBOLT,
      POKEMON.TOEDSCOOL, POKEMON.TOEDSCRUEL,
      POKEMON.ANNIHILAPE,
      POKEMON.CLODSIRE,
      POKEMON.FRIGIBAX, POKEMON.ARCTIBAX, POKEMON.BAXCALIBUR,
    ]),
  },
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
    name: 'Regional Shiny Hunting',
    distance: 80,
    priority: 1,

    // prettier-ignore
    pokemons: species([
      // Generation 3
      POKEMON.TORKOAL,
      POKEMON.SEVIPER,
      POKEMON.TROPIUS,
      POKEMON.RELICANTH,

      // Generation 4
      POKEMON.PACHIRISU,
      POKEMON.SHELLOS,
      POKEMON.CARNIVINE,

      // Generation 6
      POKEMON.HAWLUCHA,
      POKEMON.KLEFKI,

      // Generation 7
      POKEMON.ORICORIO,
    ]),
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
