/**
 * The filters PGSharp saves — which spawns the radar and the nearby feed are looking for. Unlike a control's position,
 * which is a Java Float, each of these is stored as one JSON string; they are kept as objects here so every field
 * reads and diffs on its own, and JSON.stringify re-emits the compact string PGSharp wrote where they are put in the
 * backup. That re-emission goes field by field in source order, so the order below is part of the value and must not
 * be rearranged.
 */

import POKEMON, {
  AEGISLASH,
  BASCULIN,
  BURMY,
  CASTFORM,
  CHERRIM,
  DEERLING,
  GALARIAN,
  HISUIAN,
  PALDEAN,
  ROTOM,
  SAWSBUCK,
  SHAYMIN,
  SPINDA,
  UNOWN,
  WORMADAM,
} from './pokemon.js';

/**
 * A filter's species list, checked and collapsed to one entry per species. A constant pokemon.js does not define reads
 * as undefined rather than failing, and would reach the backup as a null where a species should be, so it stops here
 * instead. The value is all we are handed — the constant's name is gone by then — so the error gives the position to
 * look at.
 *
 * A form constant carries the dex number of the species it is a form of, since that number is all PGSharp stores, so
 * naming several forms of one species repeats it. The names are worth keeping — they say which forms the list is for —
 * but the repeats are not, so the first of each survives and the rest go, leaving the list PGSharp itself would write.
 */
function species(numbers) {
  const at = numbers.findIndex((n) => !Number.isInteger(n));

  if (at !== -1) {
    throw new Error(`species #${at + 1} is not a POKEMON constant — check it against pokemon.js`);
  }

  return [...new Set(numbers)];
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
      HISUIAN.GROWLITHE, HISUIAN.ARCANINE,
      GALARIAN.PONYTA, GALARIAN.RAPIDASH,
      GALARIAN.SLOWPOKE, GALARIAN.SLOWBRO, GALARIAN.SLOWKING,
      POKEMON.DODUO, POKEMON.DODRIO,
      POKEMON.SEEL,
      HISUIAN.VOLTORB, HISUIAN.ELECTRODE,
      GALARIAN.WEEZING,
      POKEMON.HORSEA, POKEMON.SEADRA,
      GALARIAN.MR_MIME,
      PALDEAN.TAUROS,
      POKEMON.SNORLAX,
      GALARIAN.ZAPDOS,
      GALARIAN.MOLTRES,

      // Generation 2
      HISUIAN.TYPHLOSION,
      ...[
        UNOWN.A,
        UNOWN.B,
        UNOWN.C,
        UNOWN.D,
        UNOWN.E,
        UNOWN.F,
        UNOWN.H,
        UNOWN.I,
        UNOWN.J,
        UNOWN.K,
        UNOWN.L,
        UNOWN.M,
        UNOWN.N,
        UNOWN.P,
        UNOWN.Q,
        UNOWN.R,
        UNOWN.S,
        UNOWN.T,
        UNOWN.U,
        UNOWN.V,
        UNOWN.W,
        UNOWN.X,
        UNOWN.Y,
        UNOWN.Z,
        UNOWN.EXCLAMATION_MARK,
        UNOWN.QUESTION_MARK,
      ],
      POKEMON.GIRAFARIG,
      HISUIAN.SNEASEL,
      GALARIAN.CORSOLA,
      POKEMON.REMORAID, POKEMON.OCTILLERY,
      POKEMON.MANTINE,
      POKEMON.STANTLER,
      POKEMON.SMEARGLE,
      POKEMON.TYROGUE,

      // Generation 3
      GALARIAN.ZIGZAGOON, GALARIAN.LINOONE,
      POKEMON.NINCADA, POKEMON.NINJASK, POKEMON.SHEDINJA,
      ...[
        SPINDA.PATTERN_1,
        SPINDA.PATTERN_2,
        SPINDA.PATTERN_3,
        SPINDA.PATTERN_5,
        SPINDA.PATTERN_6,
        SPINDA.PATTERN_7,
        SPINDA.PATTERN_9,
      ],
      POKEMON.BARBOACH, POKEMON.WHISCASH,
      ...[
        CASTFORM.SUNNY,
        CASTFORM.SNOWY,
      ],
      POKEMON.TROPIUS,
      POKEMON.RELICANTH,
      POKEMON.JIRACHI,

      // Generation 4
      POKEMON.CRANIDOS, POKEMON.RAMPARDOS,
      ...[
        BURMY.PLANT_CLOAK, WORMADAM.PLANT_CLOAK,
        BURMY.SANDY_CLOAK, WORMADAM.SANDY_CLOAK,
        BURMY.TRASH_CLOAK, WORMADAM.TRASH_CLOAK,
        POKEMON.MOTHIM,
      ],
      POKEMON.PACHIRISU,
      POKEMON.BUIZEL, POKEMON.FLOATZEL,
      POKEMON.CHERUBI, ...[CHERRIM.OVERCAST, CHERRIM.SUNNY],
      POKEMON.CHINGLING,
      POKEMON.MIME_JR,
      POKEMON.HAPPINY,
      POKEMON.SPIRITOMB,
      POKEMON.MUNCHLAX,
      POKEMON.CARNIVINE,
      POKEMON.MANTYKE,
      ...[
        ROTOM.NORMAL,
        ROTOM.HEAT,
        ROTOM.WASH,
        ROTOM.FROST,
        ROTOM.FAN,
        ROTOM.MOW,
      ],
      POKEMON.PHIONE, POKEMON.MANAPHY,
      ...[
        SHAYMIN.LAND_FORME,
        SHAYMIN.SKY_FORME,
      ],
      POKEMON.ARCEUS,

      // Generation 5
      POKEMON.PURRLOIN, POKEMON.LIEPARD,
      POKEMON.PANSAGE, POKEMON.SIMISAGE,
      POKEMON.PANSEAR, POKEMON.SIMISEAR,
      POKEMON.PIDOVE, POKEMON.TRANQUILL, POKEMON.UNFEZANT,
      POKEMON.ROGGENROLA, POKEMON.BOLDORE, POKEMON.GIGALITH,
      POKEMON.PETILIL, ...[POKEMON.LILLIGANT, HISUIAN.LILLIGANT],
      ...[BASCULIN.RED_STRIPED, BASCULIN.BLUE_STRIPED, BASCULIN.WHITE_STRIPED],
      GALARIAN.YAMASK,
      POKEMON.TIRTOUGA, POKEMON.CARRACOSTA,
      POKEMON.ARCHEN, POKEMON.ARCHEOPS,
      HISUIAN.ZORUA, HISUIAN.ZOROARK,
      POKEMON.SOLOSIS, POKEMON.DUOSION, POKEMON.REUNICLUS,
      ...[
        DEERLING.SPRING_FORM, SAWSBUCK.SPRING_FORM,
        DEERLING.AUTUMN_FORM, SAWSBUCK.AUTUMN_FORM,
        DEERLING.WINTER_FORM, SAWSBUCK.WINTER_FORM,
      ],
      POKEMON.KARRABLAST, POKEMON.ESCAVALIER,
      ...[FRILLISH.MALE], POKEMON.JELLICENT,
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
      ...[
        FLABEBE.RED_FLOWER, FLOETTE.RED_FLOWER, FLORGES.RED_FLOWER,
        FLABEBE.YELLOW_FLOWER, FLOETTE.YELLOW_FLOWER, FLORGES.YELLOW_FLOWER,
        FLABEBE.ORANGE_FLOWER, FLOETTE.ORANGE_FLOWER, FLORGES.ORANGE_FLOWER,
        FLABEBE.BLUE_FLOWER, FLOETTE.BLUE_FLOWER, FLORGES.BLUE_FLOWER,
        FLABEBE.WHITE_FLOWER, FLOETTE.WHITE_FLOWER, FLORGES.WHITE_FLOWER,
        FLOETTE.ETERNAL_FLOWER,
      ],
      POKEMON.HONEDGE, POKEMON.DOUBLADE, ...[AEGISLASH.SHIELD_FORME, AEGISLASH.BLADE_FORME],
      POKEMON.SWIRLIX, POKEMON.SLURPUFF,
      POKEMON.SKRELP, POKEMON.DRAGALGE,
      POKEMON.HAWLUCHA,
      POKEMON.GOOMY, POKEMON.SLIGGOO, POKEMON.GOODRA,
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
      ...[
        ETERNATUS.NORMAL,
        ETERNATUS.ETERNAMAX,
      ],
      POKEMON.KUBFU, POKEMON.URSHIFU,
      POKEMON.ZARUDE,
      POKEMON.GLASTRIER,
      POKEMON.SPECTRIER,
      POKEMON.CALYREX,
      POKEMON.URSALUNA,
      POKEMON.BASCULEGION,
      POKEMON.SNEASLER,
      ...[
        ENAMORUS.INCARNATE_FORME,
        ENAMORUS.THERIAN_FORME,
      ],

      // Generation 9
      POKEMON.FUECOCO, POKEMON.CROCALOR, POKEMON.SKELEDIRGE,
      POKEMON.QUAXLY, POKEMON.QUAXWELL, POKEMON.QUAQUAVAL,
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
      POKEMON.FLAMIGO,
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
      POKEMON.TROPIUS,
      POKEMON.RELICANTH,

      // Generation 4
      POKEMON.PACHIRISU,
      POKEMON.CARNIVINE,

      // Generation 6
      POKEMON.HAWLUCHA,

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
