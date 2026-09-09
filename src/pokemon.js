/**
 * One species, or one of its forms — a dex number wearing a name. Naming a form or a region asks for one the species
 * actually has and hands back the Pokemon that form is, so a filter can say which form it means and still write the
 * one number PGSharp stores: `toJSON` sees to that, leaving `JSON.stringify` to emit the dex number and nothing else.
 *
 * Whether a shiny exists, whether the wild turns one up at all, and whether it is in Pokémon GO yet, are properties of
 * the form rather than of the species, since a species can have a shiny where its regional variant does not. Declaring
 * them walks with the entry: `isShinyEligible`, `notShinyEligible`, `doesSpawn`, `doesNotSpawn`, `isReleased`,
 * `isNotReleased`, `isLegendary`, `isMythical`, `isBaby` and `isUltraBeast` apply to whatever was declared last — the
 * species itself before any form is named, and the forms or regions of the declaration just above otherwise.
 * Undeclared reads as eligible, so a species says nothing until it has something to say. A Legendary, Mythical, Baby
 * or Ultra Beast is one the wild never turns up, so `isLegendary`, `isMythical`, `isBaby` and `isUltraBeast` stop it
 * spawning as well — Meltan the lone Mythical that does, saying `doesSpawn` after to put it back.
 *
 * ```js
 * const ZORUA = new Pokemon(570).isShinyEligible().withRegions(HISUI).notShinyEligible();
 * ```
 */
export default class Pokemon {
  #dex;
  #name;

  #forms = new Map();
  #regions = new Map();

  #released = true;
  #shinyEligible = true;
  #spawns = true;

  #baby = false;
  #legendary = false;
  #mythical = false;
  #ultraBeast = false;

  // What the next `isShinyEligible` or `notShinyEligible` applies to: the species until a form or a region is declared.
  #declared;

  constructor(dex) {
    this.#dex = dex;
    this.#name = `#${dex}`;
    this.#declared = [this];
  }

  /**
   * One form this species comes in, settled on the spot.
   *
   * The callback is handed that form, so what is true of it is said where it is declared rather than by what came last:
   *
   * ```js
   * new Pokemon(999).notShinyEligible().withForm('SPEED', (form) => form.isShinyEligible());
   * ```
   *
   * Left off, this is `withForms` with one form, and what follows applies to that form as it would there.
   */
  withForm(name, configure) {
    this.withForms(name);

    if (configure) {
      configure(this.#forms.get(name));
    }

    return this;
  }

  /**
   * The forms this species comes in, spelled as the games spell them. Each is a Pokemon of its own.
   */
  withForms(...names) {
    this.#declared = names.map((name) => this.#variant(`${this.#name} (${name})`));
    names.forEach((name, i) => this.#forms.set(name, this.#declared[i]));
    return this;
  }

  /**
   * One region this species has a variant in, settled on the spot.
   *
   * The callback is handed that variant, so what is true of it is said where it is declared rather than by what came
   * last:
   *
   * ```js
   * new Pokemon(999).notShinyEligible().withRegion(ALOLA, (alolan) => alolan.isShinyEligible());
   * ```
   *
   * Left off, this is `withRegions` with one region, and what follows applies to that region as it would there.
   */
  withRegion(region, configure) {
    this.withRegions(region);

    if (configure) {
      configure(this.#regions.get(region));
    }

    return this;
  }

  /**
   * The regions this species has a variant in. Each is a Pokemon of its own.
   */
  withRegions(...regions) {
    this.#declared = regions.map((region) => this.#variant(`${region} ${this.#name}`));
    regions.forEach((region, i) => this.#regions.set(region, this.#declared[i]));
    return this;
  }

  /**
   * Marks what was declared last as out in Pokémon GO — in the game to be had at all.
   */
  isReleased() {
    for (const variant of this.#declared) {
      variant.#released = true;
    }

    return this;
  }

  /**
   * Marks what was declared last as not in Pokémon GO yet, which keeps it out of a filter for what you can get.
   */
  isNotReleased() {
    for (const variant of this.#declared) {
      variant.#released = false;
    }

    return this;
  }

  /**
   * Marks what was declared last as having a shiny in the game.
   */
  isShinyEligible() {
    for (const variant of this.#declared) {
      variant.#shinyEligible = true;
    }

    return this;
  }

  /**
   * Marks what was declared last as having none, which keeps it out of a filter that hunts shinies.
   */
  isNotShinyEligible() {
    for (const variant of this.#declared) {
      variant.#shinyEligible = false;
    }

    return this;
  }

  /**
   * Marks what was declared last as something the wild turns up, which is what the feed filters watch for.
   */
  doesSpawn() {
    for (const variant of this.#declared) {
      variant.#spawns = true;
    }

    return this;
  }

  /**
   * Marks what was declared last as something the wild never turns up — a raid, a trade or an egg only.
   */
  doesNotSpawn() {
    for (const variant of this.#declared) {
      variant.#spawns = false;
    }

    return this;
  }

  /**
   * Marks what was declared last as a Baby — hatched from an egg, never met in the wild, so it stops spawning too.
   */
  isBaby() {
    for (const variant of this.#declared) {
      variant.#baby = true;
      variant.#spawns = false;
    }

    return this;
  }

  /**
   * Marks what was declared last as a Legendary; the wild never turns one up, so it stops spawning too.
   */
  isLegendary() {
    for (const variant of this.#declared) {
      variant.#legendary = true;
      variant.#spawns = false;
    }

    return this;
  }

  /**
   * The same for a Mythical — Meltan the one that spawns anyway, saying `doesSpawn` after to put it back.
   */
  isMythical() {
    for (const variant of this.#declared) {
      variant.#mythical = true;
      variant.#spawns = false;
    }

    return this;
  }

  /**
   * Marks what was declared last as an Ultra Beast; the wild never turns one up, so it stops spawning too.
   */
  isUltraBeast() {
    for (const variant of this.#declared) {
      variant.#ultraBeast = true;
      variant.#spawns = false;
    }

    return this;
  }

  /**
   * Names this species for the errors below, from the constant it is bound to, and renames its forms with it.
   */
  as(name) {
    this.#name = name;

    for (const [form, variant] of this.#forms) {
      variant.as(`${name} (${form})`);
    }

    for (const [region, variant] of this.#regions) {
      variant.as(`${region} ${name}`);
    }

    return this;
  }

  /**
   * One of this species' forms.
   *
   * A name it does not have stops here rather than reaching the backup as a null.
   */
  form(name) {
    if (!this.#forms.has(name)) {
      throw new Error(`${this.#name} has no ${name} form — check it against pokedex.js`);
    }

    return this.#forms.get(name);
  }

  /**
   * Several of this species' forms at once, in the order named — a list to spread into a filter's species list, where
   * naming each one by hand would say the species over and over.
   */
  forms(...names) {
    return names.map((name) => this.form(name));
  }

  /**
   * This species as one region sees it.
   *
   * A region it has no variant in stops here for the same reason.
   */
  region(region) {
    if (!this.#regions.has(region)) {
      throw new Error(`${this.#name} has no ${region} form — check it against pokedex.js`);
    }

    return this.#regions.get(region);
  }

  /**
   * Whether this one is a Baby.
   */
  get baby() {
    return this.#baby;
  }

  /**
   * Whether this one is a Legendary.
   */
  get legendary() {
    return this.#legendary;
  }

  /**
   * Whether this one is Mythical.
   */
  get mythical() {
    return this.#mythical;
  }

  /**
   * Whether this one is in Pokémon GO yet.
   */
  get released() {
    return this.#released;
  }

  /**
   * Whether a shiny of this one exists to be hunted.
   */
  get shinyEligible() {
    return this.#shinyEligible;
  }

  /**
   * Whether the wild turns this one up at all.
   */
  get spawns() {
    return this.#spawns;
  }

  /**
   * Whether this one is an Ultra Beast.
   */
  get ultraBeast() {
    return this.#ultraBeast;
  }

  /** A form of this species, starting from where the species stands. */
  #variant(name) {
    const variant = new Pokemon(this.#dex);
    variant.#name = name;
    variant.#shinyEligible = this.#shinyEligible;
    variant.#spawns = this.#spawns;
    variant.#released = this.#released;
    variant.#legendary = this.#legendary;
    variant.#mythical = this.#mythical;
    variant.#baby = this.#baby;
    variant.#ultraBeast = this.#ultraBeast;
    return variant;
  }

  toJSON() {
    return this.#dex;
  }

  /**
   * Its name, for reading in a message or a log — a string coercion, where valueOf below hands back the number.
   */
  toString() {
    return this.#name;
  }

  valueOf() {
    return this.#dex;
  }
}
