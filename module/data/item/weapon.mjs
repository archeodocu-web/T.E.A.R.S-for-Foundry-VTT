import HowToBeAHeroPhysical from "./physical.mjs";

export default class HowToBeAHeroWeapon extends HowToBeAHeroPhysical {
  static defineSchema() {
    const fields = foundry.data.fields;
    const requiredInteger = { required: true, nullable: false, integer: true };
    const schema = super.defineSchema();
    
    schema.weaponType = new fields.StringField({ blank: true, label: "TEARS.Combat.WeaponCategory" });
    schema.attackMode = new fields.StringField({ required: true, initial: "melee", choices: ["melee", "ranged"], label: "TEARS.Combat.AttackMode" });
    // Points of the weapon talent assigned to attack and parry. The sum must
    // not exceed the corresponding weapon-talent value on the actor.
    schema.attackValue = new fields.NumberField({ ...requiredInteger, initial: 0, min: 0, label: "TEARS.Combat.WeaponAttack" });
    schema.parryValue = new fields.NumberField({ ...requiredInteger, initial: 0, min: 0, label: "TEARS.Combat.WeaponParry" });
    schema.initiativeModifier = new fields.NumberField({ required: true, initial: 0, label: "TEARS.Combat.WeaponInitiative" });
    schema.range = new fields.StringField({ blank: true, label: "TEARS.Combat.Range" });
    schema.equipped = new fields.BooleanField({ required: true, label: "HOW_TO_BE_A_HERO.Equipped" });

    // Weapons are rollable by default; they use their damage formula when clicked.
    schema.rollable = new fields.BooleanField({
      required: true,
      initial: true,
      label: "HOW_TO_BE_A_HERO.Item.Rollable"
    });
    
    schema.roll = new fields.SchemaField({
      diceNum: new fields.NumberField({ ...requiredInteger, initial: 1, min: 1 }),
      diceSize: new fields.StringField({ initial: "d6" }),
      diceBonus: new fields.NumberField({ initial: 0 })
    });

    // Override rollType default for weapons
    schema.rollType = new fields.StringField({
      required: true,
      initial: "damage", // Weapons default to damage
      choices: ["check", "damage"],
      label: "HOW_TO_BE_A_HERO.RollType"
    });

    // Add formula field with default value
    schema.formula = new fields.StringField({ 
      required: true, 
      initial: "1d6",
      label: "HOW_TO_BE_A_HERO.Item.Formula" 
    });

    return schema;
  }

  // T.E.A.R.S. v0.1 treats the free-form damage formula as authoritative.
  // The inherited HTBAH dice fields remain in the schema for compatibility,
  // but must not overwrite a formula entered in the T.E.A.R.S. weapon editor.

  async richTooltip() {
    const baseTooltip = await super.richTooltip();
    const weaponContent = await foundry.applications.handlebars.renderTemplate("systems/tears/templates/item/parts/weapon-tooltip.hbs", {
      formula: this.formula,
      quantity: this.quantity
    });
    return {
      content: baseTooltip.content + weaponContent,
      classes: [...baseTooltip.classes]
    };
  }

  async getFavoriteData() {
    return foundry.utils.mergeObject(await super.getFavoriteData(), {
      subtitle: this.weaponType
    });
  }
}