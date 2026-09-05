/**
 * The filters PGSharp saves — which spawns the radar and the nearby feed are looking for. Unlike a control's position,
 * which is a Java Float, each of these is stored as one JSON string; they are kept as objects here so every field reads
 * and diffs on its own, and JSON.stringify re-emits the compact string PGSharp wrote where they are put in the backup.
 * That re-emission goes field by field in source order, so the order below is part of the value and must not be
 * rearranged.
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
      POKEMON.DODUO, POKEMON.DODRIO,
      POKEMON.SNORLAX,

      // Generation 2
      POKEMON.UNOWN,
      POKEMON.GIRAFARIG,
      POKEMON.REMORAID, POKEMON.OCTILLERY,
      POKEMON.MANTINE,
      POKEMON.STANTLER,
      POKEMON.SMEARGLE,
      POKEMON.TYROGUE,

      // Generation 3
      POKEMON.NINCADA, POKEMON.NINJASK, POKEMON.SHEDINJA,
      POKEMON.TORKOAL,
      POKEMON.BARBOACH, POKEMON.WHISCASH,
      POKEMON.CASTFORM,
      POKEMON.KECLEON,
      POKEMON.TROPIUS,
      POKEMON.RELICANTH,
      POKEMON.JIRACHI,

      // Generation 4
      POKEMON.CRANIDOS, POKEMON.RAMPARDOS,
      POKEMON.BURMY, POKEMON.WORMADAM, POKEMON.MOTHIM,
      POKEMON.PACHIRISU,
      POKEMON.BUIZEL, POKEMON.FLOATZEL,
      POKEMON.CHERUBI, POKEMON.CHERRIM,
      POKEMON.CHINGLING,
      POKEMON.MIME_JR,
      POKEMON.HAPPINY,
      POKEMON.SPIRITOMB,
      POKEMON.MUNCHLAX,
      POKEMON.CARNIVINE,
      POKEMON.MANTYKE,
      POKEMON.ROTOM,
      POKEMON.PHIONE, POKEMON.MANAPHY,
      POKEMON.SHAYMIN,
      POKEMON.ARCEUS,

      // Generation 5
      POKEMON.PURRLOIN, POKEMON.LIEPARD,
      POKEMON.PANSAGE, POKEMON.SIMISAGE,
      POKEMON.PANSEAR, POKEMON.SIMISEAR,
      POKEMON.PIDOVE, POKEMON.TRANQUILL, POKEMON.UNFEZANT,
      POKEMON.ROGGENROLA, POKEMON.BOLDORE, POKEMON.GIGALITH,
      POKEMON.DRILBUR, POKEMON.EXCADRILL,
      POKEMON.AUDINO,
      POKEMON.PETILIL, POKEMON.LILLIGANT,
      POKEMON.BASCULIN,
      POKEMON.SANDILE, POKEMON.KROKOROK, POKEMON.KROOKODILE,
      POKEMON.SCRAGGY, POKEMON.SCRAFTY,
      POKEMON.YAMASK, POKEMON.COFAGRIGUS,
      POKEMON.TIRTOUGA, POKEMON.CARRACOSTA,
      POKEMON.ARCHEN, POKEMON.ARCHEOPS,
      POKEMON.SOLOSIS, POKEMON.DUOSION, POKEMON.REUNICLUS,
      POKEMON.DEERLING, POKEMON.SAWSBUCK,
      POKEMON.KARRABLAST, POKEMON.ESCAVALIER,
      POKEMON.FRILLISH, POKEMON.JELLICENT,
      POKEMON.AXEW, POKEMON.FRAXURE, POKEMON.HAXORUS,
      POKEMON.CRYOGONAL,
      POKEMON.SHELMET, POKEMON.ACCELGOR,
      POKEMON.MIENFOO, POKEMON.MIENSHAO,
      POKEMON.GOLETT, POKEMON.GOLURK,
      POKEMON.PAWNIARD, POKEMON.BISHARP,
      POKEMON.RUFFLET, POKEMON.BRAVIARY,
      POKEMON.LARVESTA, POKEMON.VOLCARONA,
      POKEMON.TORNADUS,
      POKEMON.RESHIRAM,
      POKEMON.LANDORUS,
      POKEMON.KELDEO,
      POKEMON.MELOETTA,

      // Generation 6
      POKEMON.BUNNELBY, POKEMON.DIGGERSBY,
      POKEMON.SCATTERBUG, POKEMON.SPEWPA, POKEMON.VIVILLON,
      POKEMON.FLABEBE, POKEMON.FLOETTE, POKEMON.FLORGES,
      POKEMON.PANCHAM,
      POKEMON.FURFROU,
      POKEMON.HONEDGE, POKEMON.DOUBLADE, POKEMON.AEGISLASH,
      POKEMON.SWIRLIX, POKEMON.SLURPUFF,
      POKEMON.SKRELP, POKEMON.DRAGALGE,
      POKEMON.TYRUNT, POKEMON.TYRANTRUM,
      POKEMON.HAWLUCHA,
      POKEMON.CARBINK,
      POKEMON.GOOMY, POKEMON.SLIGGOO, POKEMON.GOODRA,
      POKEMON.KLEFKI,
      POKEMON.BERGMITE, POKEMON.AVALUGG,
      POKEMON.NOIBAT, POKEMON.NOIVERN,
      POKEMON.XERNEAS,
      POKEMON.YVELTAL,

      // Generation 7
      POKEMON.ROWLET, POKEMON.DARTRIX, POKEMON.DECIDUEYE,
      POKEMON.POPPLIO, POKEMON.BRIONNE, POKEMON.PRIMARINA,
      POKEMON.PIKIPEK, POKEMON.TRUMBEAK, POKEMON.TOUCANNON,
      POKEMON.GRUBBIN, POKEMON.CHARJABUG, POKEMON.VIKAVOLT,
      POKEMON.CRABRAWLER, POKEMON.CRABOMINABLE,
      POKEMON.ORICORIO,
      POKEMON.CUTIEFLY, POKEMON.RIBOMBEE,
      POKEMON.WISHIWASHI,
      POKEMON.MUDBRAY, POKEMON.MUDSDALE,
      POKEMON.MORELULL, POKEMON.SHIINOTIC,
      POKEMON.SALANDIT, POKEMON.SALAZZLE,
      POKEMON.BOUNSWEET, POKEMON.STEENEE, POKEMON.TSAREENA,
      POKEMON.ORANGURU, POKEMON.PASSIMIAN,
      POKEMON.SANDYGAST, POKEMON.PALOSSAND,
      POKEMON.PYUKUMUKU,
      POKEMON.TYPE_NULL, POKEMON.SILVALLY,
      POKEMON.MINIOR,
      POKEMON.KOMALA,
      POKEMON.TOGEDEMARU,
      POKEMON.BRUXISH,
      POKEMON.DHELMISE,
      POKEMON.JANGMO_O, POKEMON.HAKAMO_O, POKEMON.KOMMO_O,
      POKEMON.TAPU_KOKO,
      POKEMON.TAPU_LELE,
      POKEMON.TAPU_BULU,
      POKEMON.TAPU_FINI,
      POKEMON.COSMOG, POKEMON.COSMOEM,
      POKEMON.NIHILEGO,
      POKEMON.XURKITREE,
      POKEMON.CELESTEELA,
      POKEMON.KARTANA,
      POKEMON.POIPOLE, POKEMON.NAGANADEL,
      POKEMON.STAKATAKA,
      POKEMON.BLACEPHALON,

      // Generation 8
      POKEMON.GROOKEY, POKEMON.THWACKEY, POKEMON.RILLABOOM,
      POKEMON.ROOKIDEE, POKEMON.CORVISQUIRE, POKEMON.CORVIKNIGHT,
      POKEMON.TOXEL, POKEMON.TOXTRICITY,
      POKEMON.SIZZLIPEDE, POKEMON.CENTISKORCH,
      POKEMON.SINISTEA, POKEMON.POLTEAGEIST,
      POKEMON.IMPIDIMP, POKEMON.MORGREM, POKEMON.GRIMMSNARL,
      POKEMON.CURSOLA,
      POKEMON.SIRFETCHD,
      POKEMON.RUNERIGUS,
      POKEMON.SNOM, POKEMON.FROSMOTH,
      POKEMON.INDEEDEE,
      POKEMON.MORPEKO,
      POKEMON.DURALUDON,
      POKEMON.ETERNATUS,
      POKEMON.KUBFU, POKEMON.URSHIFU,
      POKEMON.ZARUDE,
      POKEMON.GLASTRIER,
      POKEMON.SPECTRIER,
      POKEMON.CALYREX,
      POKEMON.URSALUNA,
      POKEMON.BASCULEGION,
      POKEMON.SNEASLER,
      POKEMON.ENAMORUS,

      // Generation 9
      POKEMON.FUECOCO, POKEMON.CROCALOR, POKEMON.SKELEDIRGE,
      POKEMON.QUAXLY, POKEMON.QUAXWELL, POKEMON.QUAQUAVAL,
      POKEMON.LECHONK, POKEMON.OINKOLOGNE,
      POKEMON.TANDEMAUS, POKEMON.MAUSHOLD,
      POKEMON.FIDOUGH, POKEMON.DACHSBUN,
      POKEMON.SMOLIV, POKEMON.DOLLIV, POKEMON.ARBOLIVA,
      POKEMON.CHARCADET, POKEMON.ARMAROUGE, POKEMON.CERULEDGE,
      POKEMON.TADBULB, POKEMON.BELLIBOLT,
      POKEMON.TOEDSCOOL, POKEMON.TOEDSCRUEL,
      POKEMON.TINKATINK, POKEMON.TINKATUFF, POKEMON.TINKATON,
      POKEMON.BOMBIRDIER,
      POKEMON.VAROOM, POKEMON.REVAVROOM,
      POKEMON.ORTHWORM,
      POKEMON.CETODDLE, POKEMON.CETITAN,
      POKEMON.ANNIHILAPE,
      POKEMON.CLODSIRE,
      POKEMON.FRIGIBAX, POKEMON.ARCTIBAX, POKEMON.BAXCALIBUR,
      POKEMON.GIMMIGHOUL, POKEMON.GHOLDENGO,
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
      POKEMON.TROPIUS,
      POKEMON.RELICANTH,

      // Generation 4
      POKEMON.PACHIRISU,
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
