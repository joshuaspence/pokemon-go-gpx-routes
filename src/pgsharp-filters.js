/**
 * The filters PGSharp saves — which spawns the radar and the nearby feed are looking for. Unlike a control's position,
 * which is a Java Float, each of these is stored as one JSON string; they are kept as objects here so every field
 * reads and diffs on its own, and JSON.stringify re-emits the compact string PGSharp wrote where they are put in the
 * backup. That re-emission goes field by field in source order, so the order below is part of the value and must not
 * be rearranged.
 */

import POKEMON, { Pokemon, filterShinyEligible, filterWildSpawns, GALAR, HISUI, PALDEA } from './pokemon.js';

/**
 * A filter's species list, checked, narrowed and collapsed to one entry per species. A form or a region the species
 * does not have has already thrown by the time we are called, so what is left to catch is a name pokemon.js does not
 * define at all, which reads as undefined and would reach the backup as a null where a species should be. The value is
 * all we are handed — the constant's name is gone by then — so the error gives the position to look at.
 *
 * Every `keep` given has to hold for an entry to stay, which is how a filter drops what has no shiny to find or what
 * the wild never turns up. They run before the list collapses, so a species listed twice — once as a form that
 * survives them and once as one that does not — keeps the form that survives rather than whichever came first.
 *
 * A form is a Pokemon of its own carrying the dex number of the species it belongs to, since that number is all
 * PGSharp stores, so a list naming several forms of one species names that number several times. The names are worth
 * keeping — they say which forms the list is for — but the repeats are not, so the first of each number survives and
 * the rest go, leaving the list PGSharp itself would write.
 */
function species(entries, ...keep) {
  const at = entries.findIndex((entry) => !(entry instanceof Pokemon));

  if (at !== -1) {
    throw new Error(`species #${at + 1} is not a POKEMON constant — check it against pokemon.js`);
  }

  const kept = entries.filter((entry) => keep.every((predicate) => predicate(entry)));

  return [...new Map(kept.map((entry) => [Number(entry), entry])).values()];
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
      POKEMON.GROWLITHE.region(HISUI), POKEMON.ARCANINE.region(HISUI),
      POKEMON.PONYTA.region(GALAR), POKEMON.RAPIDASH.region(GALAR),
      POKEMON.SLOWPOKE.region(GALAR), POKEMON.SLOWBRO.region(GALAR), POKEMON.SLOWKING.region(GALAR),
      POKEMON.DODUO, POKEMON.DODRIO,
      POKEMON.SEEL,
      POKEMON.VOLTORB.region(HISUI), POKEMON.ELECTRODE.region(HISUI),
      POKEMON.WEEZING.region(GALAR),
      POKEMON.HORSEA, POKEMON.SEADRA,
      POKEMON.MR_MIME.region(GALAR),
      POKEMON.TAUROS.region(PALDEA),
      POKEMON.SNORLAX,
      POKEMON.ZAPDOS.region(GALAR),
      POKEMON.MOLTRES.region(GALAR),

      // Generation 2
      POKEMON.TYPHLOSION.region(HISUI),
      ...[
        POKEMON.UNOWN.form('A'),
        POKEMON.UNOWN.form('B'),
        POKEMON.UNOWN.form('C'),
        POKEMON.UNOWN.form('D'),
        POKEMON.UNOWN.form('E'),
        POKEMON.UNOWN.form('F'),
        POKEMON.UNOWN.form('H'),
        POKEMON.UNOWN.form('I'),
        POKEMON.UNOWN.form('J'),
        POKEMON.UNOWN.form('K'),
        POKEMON.UNOWN.form('L'),
        POKEMON.UNOWN.form('M'),
        POKEMON.UNOWN.form('N'),
        POKEMON.UNOWN.form('P'),
        POKEMON.UNOWN.form('Q'),
        POKEMON.UNOWN.form('R'),
        POKEMON.UNOWN.form('S'),
        POKEMON.UNOWN.form('T'),
        POKEMON.UNOWN.form('U'),
        POKEMON.UNOWN.form('V'),
        POKEMON.UNOWN.form('W'),
        POKEMON.UNOWN.form('X'),
        POKEMON.UNOWN.form('Y'),
        POKEMON.UNOWN.form('Z'),
        POKEMON.UNOWN.form('EXCLAMATION_MARK'),
        POKEMON.UNOWN.form('QUESTION_MARK'),
      ],
      POKEMON.GIRAFARIG,
      POKEMON.SNEASEL.region(HISUI),
      POKEMON.CORSOLA.region(GALAR),
      POKEMON.REMORAID, POKEMON.OCTILLERY,
      POKEMON.MANTINE,
      POKEMON.STANTLER,
      POKEMON.SMEARGLE,
      POKEMON.TYROGUE,

      // Generation 3
      POKEMON.ZIGZAGOON.region(GALAR), POKEMON.LINOONE.region(GALAR),
      POKEMON.NINCADA, POKEMON.NINJASK, POKEMON.SHEDINJA,
      ...[
        POKEMON.SPINDA.form('PATTERN_1'),
        POKEMON.SPINDA.form('PATTERN_2'),
        POKEMON.SPINDA.form('PATTERN_3'),
        POKEMON.SPINDA.form('PATTERN_5'),
        POKEMON.SPINDA.form('PATTERN_6'),
        POKEMON.SPINDA.form('PATTERN_7'),
        POKEMON.SPINDA.form('PATTERN_9'),
      ],
      POKEMON.BARBOACH, POKEMON.WHISCASH,
      ...[
        POKEMON.CASTFORM.form('SUNNY'),
        POKEMON.CASTFORM.form('SNOWY'),
      ],
      POKEMON.TROPIUS,
      POKEMON.RELICANTH,
      POKEMON.JIRACHI,

      // Generation 4
      POKEMON.CRANIDOS, POKEMON.RAMPARDOS,
      ...[
        POKEMON.BURMY.form('PLANT_CLOAK'), POKEMON.WORMADAM.form('PLANT_CLOAK'),
        POKEMON.BURMY.form('SANDY_CLOAK'), POKEMON.WORMADAM.form('SANDY_CLOAK'),
        POKEMON.BURMY.form('TRASH_CLOAK'), POKEMON.WORMADAM.form('TRASH_CLOAK'),
        POKEMON.MOTHIM,
      ],
      POKEMON.PACHIRISU,
      POKEMON.BUIZEL, POKEMON.FLOATZEL,
      POKEMON.CHERUBI, ...[POKEMON.CHERRIM.form('OVERCAST'), POKEMON.CHERRIM.form('SUNNY')],
      POKEMON.CHINGLING,
      POKEMON.MIME_JR,
      POKEMON.HAPPINY,
      POKEMON.SPIRITOMB,
      POKEMON.MUNCHLAX,
      POKEMON.CARNIVINE,
      POKEMON.MANTYKE,
      ...[
        POKEMON.ROTOM.form('NORMAL'),
        POKEMON.ROTOM.form('HEAT'),
        POKEMON.ROTOM.form('WASH'),
        POKEMON.ROTOM.form('FROST'),
        POKEMON.ROTOM.form('FAN'),
        POKEMON.ROTOM.form('MOW'),
      ],
      POKEMON.PHIONE, POKEMON.MANAPHY,
      ...[
        POKEMON.SHAYMIN.form('LAND_FORME'),
        POKEMON.SHAYMIN.form('SKY_FORME'),
      ],
      POKEMON.ARCEUS,

      // Generation 5
      POKEMON.PURRLOIN, POKEMON.LIEPARD,
      POKEMON.PANSAGE, POKEMON.SIMISAGE,
      POKEMON.PANSEAR, POKEMON.SIMISEAR,
      POKEMON.PIDOVE, POKEMON.TRANQUILL, POKEMON.UNFEZANT,
      POKEMON.ROGGENROLA, POKEMON.BOLDORE, POKEMON.GIGALITH,
      POKEMON.PETILIL, ...[POKEMON.LILLIGANT, POKEMON.LILLIGANT.region(HISUI)],
      ...[POKEMON.BASCULIN.form('RED_STRIPED'), POKEMON.BASCULIN.form('BLUE_STRIPED'), POKEMON.BASCULIN.form('WHITE_STRIPED')],
      POKEMON.YAMASK.region(GALAR),
      POKEMON.TIRTOUGA, POKEMON.CARRACOSTA,
      POKEMON.ARCHEN, POKEMON.ARCHEOPS,
      POKEMON.ZORUA.region(HISUI), POKEMON.ZOROARK.region(HISUI),
      POKEMON.SOLOSIS, POKEMON.DUOSION, POKEMON.REUNICLUS,
      ...[
        POKEMON.DEERLING.form('SPRING_FORM'), POKEMON.SAWSBUCK.form('SPRING_FORM'),
        POKEMON.DEERLING.form('AUTUMN_FORM'), POKEMON.SAWSBUCK.form('AUTUMN_FORM'),
        POKEMON.DEERLING.form('WINTER_FORM'), POKEMON.SAWSBUCK.form('WINTER_FORM'),
      ],
      POKEMON.KARRABLAST, POKEMON.ESCAVALIER,
      ...[POKEMON.FRILLISH.form('MALE')], POKEMON.JELLICENT,
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
        POKEMON.FLABEBE.form('RED_FLOWER'), POKEMON.FLOETTE.form('RED_FLOWER'), POKEMON.FLORGES.form('RED_FLOWER'),
        POKEMON.FLABEBE.form('YELLOW_FLOWER'), POKEMON.FLOETTE.form('YELLOW_FLOWER'), POKEMON.FLORGES.form('YELLOW_FLOWER'),
        POKEMON.FLABEBE.form('ORANGE_FLOWER'), POKEMON.FLOETTE.form('ORANGE_FLOWER'), POKEMON.FLORGES.form('ORANGE_FLOWER'),
        POKEMON.FLABEBE.form('BLUE_FLOWER'), POKEMON.FLOETTE.form('BLUE_FLOWER'), POKEMON.FLORGES.form('BLUE_FLOWER'),
        POKEMON.FLABEBE.form('WHITE_FLOWER'), POKEMON.FLOETTE.form('WHITE_FLOWER'), POKEMON.FLORGES.form('WHITE_FLOWER'),
        POKEMON.FLOETTE.form('ETERNAL_FLOWER'),
      ],
      POKEMON.HONEDGE, POKEMON.DOUBLADE, ...[POKEMON.AEGISLASH.form('SHIELD_FORME'), POKEMON.AEGISLASH.form('BLADE_FORME')],
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
        POKEMON.ETERNATUS.form('NORMAL'),
        POKEMON.ETERNATUS.form('ETERNAMAX'),
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
        POKEMON.ENAMORUS.form('INCARNATE_FORME'),
        POKEMON.ENAMORUS.form('THERIAN_FORME'),
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
    ], filterShinyEligible, filterWildSpawns),
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
