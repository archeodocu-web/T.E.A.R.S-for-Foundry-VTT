import HowToBeAHeroPhysical from "./physical.mjs";

/**
 * A character-owned magical ability. Physical supplies the optional rollable
 * configuration; magic adds mana cost and an optional target effect.
 */
export default class HowToBeAHeroMagic extends HowToBeAHeroPhysical {
  static defineSchema() {
    const fields = foundry.data.fields;
    const requiredInteger = { required: true, nullable: false, integer: true };
    const schema = super.defineSchema();

    schema.manaCost = new fields.NumberField({
      ...requiredInteger,
      initial: 0,
      min: 0,
      label: "HTBAH.Magic.ManaCost"
    });
    schema.effectType = new fields.StringField({
      required: true,
      initial: "none",
      choices: ["none", "armor"],
      label: "HTBAH.Magic.EffectType"
    });
    schema.effectValue = new fields.NumberField({
      ...requiredInteger,
      initial: 0,
      min: 0,
      label: "HTBAH.Magic.EffectValue"
    });
    // 0 means indefinite until manually removed. Positive values are combat rounds.
    schema.durationRounds = new fields.NumberField({
      ...requiredInteger,
      initial: 0,
      min: 0,
      label: "HTBAH.Magic.DurationRounds"
    });
    return schema;
  }
}
