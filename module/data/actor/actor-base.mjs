import { AbstractHowToBeAHeroActorDataModel } from '../abstract.mjs';

export default class HowToBeAHeroActorBase extends AbstractHowToBeAHeroActorDataModel {
/**
 * System data definition for actors.
 *
 * @property {object} attributes
 * @property {object} attributes.armor
 * @property {number} attributes.armor.value                  Current hit points.
 * @property {object} attributes.health
 * @property {number} attributes.health.value                 Current hit points.
 * @property {number} attributes.health.max                   Override for maximum HP.
 * @property {number} attributes.health.temp                  Temporary HP applied on top of value.
 * @property {number} attributes.health.tempmax               Temporary change to the maximum HP.
 * @property {object} attributes.skillSets                      
 * @property {number} attributes.skillSets.knowledge            Contains actors total knowledge value
 * @property {number} attributes.skillSets.action              Contains actors total action value
 * @property {number} attributes.skillSets.social               Contains actors total social value
 * @property {object} details
 * @property {string} details.background                      Character's background.
 * @property {string} details.alignment                       Character's alignment.
 * @property {string} details.appearance                      Description of character's appearance.
 * @property {number} details.wealth                          Character's wealth.
 * @property {number} details.age                             Character's age.
 */

static defineSchema() {
  const fields = foundry.data.fields;
  const requiredInteger = { required: true, nullable: false, integer: true };
  const schema = {};

  // T.E.A.R.S. core attributes and derived resources.
  schema.attributes = new fields.SchemaField({
    kk: new fields.NumberField({...requiredInteger, initial: 8, min: 0, label: "TEARS.Attributes.KK"}),
    au: new fields.NumberField({...requiredInteger, initial: 8, min: 0, label: "TEARS.Attributes.AU"}),
    ge: new fields.NumberField({...requiredInteger, initial: 8, min: 0, label: "TEARS.Attributes.GE"}),
    in: new fields.NumberField({...requiredInteger, initial: 8, min: 0, label: "TEARS.Attributes.IN"}),
    ch: new fields.NumberField({...requiredInteger, initial: 8, min: 0, label: "TEARS.Attributes.CH"}),
    mb: new fields.NumberField({...requiredInteger, initial: 8, min: 0, label: "TEARS.Attributes.MB"}),
    armor: new fields.SchemaField({
      value: new fields.NumberField({...requiredInteger, initial: 0, min: 0, label: "HOW_TO_BE_A_HERO.Attributes.Armor"})
    }),
    health: new fields.SchemaField({
      value: new fields.NumberField({...requiredInteger, initial: 72, min: 0, label: "TEARS.Resources.LifeEnergy"}),
      max: new fields.NumberField({...requiredInteger, initial: 72, min: 0, label: "TEARS.Resources.LifeEnergyMax"}),
      temp: new fields.NumberField({...requiredInteger, initial: 0, min: 0, label: "HOW_TO_BE_A_HERO.Attributes.HitPointsTemp"}),
      tempmax: new fields.NumberField({...requiredInteger, initial: 0, label: "HOW_TO_BE_A_HERO.Attributes.HitPointsTempMax"})
    }),
    mentalHealth: new fields.SchemaField({
      value: new fields.NumberField({...requiredInteger, initial: 96, min: 0, label: "TEARS.Resources.MentalHealth"}),
      max: new fields.NumberField({...requiredInteger, initial: 96, min: 0, label: "TEARS.Resources.MentalHealthMax"})
    }),
    combat: new fields.SchemaField({
      attackMelee: new fields.NumberField({...requiredInteger, initial: 0, label: "TEARS.Combat.ATN"}),
      parry: new fields.NumberField({...requiredInteger, initial: 0, label: "TEARS.Combat.PA"}),
      attackRanged: new fields.NumberField({...requiredInteger, initial: 0, label: "TEARS.Combat.ATD"}),
      initiative: new fields.NumberField({...requiredInteger, initial: 0, label: "TEARS.Combat.INI"}),
      attackModifier: new fields.NumberField({required: true, initial: 0, label: "TEARS.Combat.StanceAttackModifier"}),
      parryModifier: new fields.NumberField({required: true, initial: 0, label: "TEARS.Combat.StanceParryModifier"})
    }),
    // Retained only to keep older imported actor data readable; not used by T.E.A.R.S. rules.
    mana: new fields.SchemaField({
      value: new fields.NumberField({...requiredInteger, initial: 0, min: 0}),
      max: new fields.NumberField({...requiredInteger, initial: 0})
    })
  });

  // Starting talent budget: 10 points per group from the core rulebook.
  // Profession/hobby bonuses can be incorporated by adjusting these budgets in v0.1.
  schema.talentPools = new fields.SchemaField({
    physical: new fields.NumberField({...requiredInteger, initial: 10, min: 0}),
    combat: new fields.NumberField({...requiredInteger, initial: 10, min: 0}),
    motor: new fields.NumberField({...requiredInteger, initial: 10, min: 0}),
    mental: new fields.NumberField({...requiredInteger, initial: 10, min: 0}),
    social: new fields.NumberField({...requiredInteger, initial: 10, min: 0})
  });

  // Character background and advancement metadata.
  schema.details = new fields.SchemaField({
    background: new fields.StringField({required: true, blank: true, label: "HOW_TO_BE_A_HERO.Details.Background"}),
    alignment: new fields.StringField({label: "HOW_TO_BE_A_HERO.Details.Alignment"}),
    appearance: new fields.StringField({required: true, blank: true, label: "HOW_TO_BE_A_HERO.Details.Appearance"}),
    profession: new fields.StringField({blank: true, label: "TEARS.Details.Profession"}),
    professionCategory: new fields.StringField({blank: true, label: "TEARS.Details.ProfessionCategory"}),
    hobbyOne: new fields.StringField({blank: true, label: "TEARS.Details.HobbyOne"}),
    hobbyTwo: new fields.StringField({blank: true, label: "TEARS.Details.HobbyTwo"}),
    positiveSpecificum: new fields.StringField({blank: true, label: "TEARS.Details.PositiveSpecificum"}),
    negativeSpecificum: new fields.StringField({blank: true, label: "TEARS.Details.NegativeSpecificum"}),
    wealth: new fields.NumberField({...requiredInteger, initial: 0, label: "HOW_TO_BE_A_HERO.Details.Wealth"}),
    age: new fields.NumberField({label: "HOW_TO_BE_A_HERO.Details.Age"})
  });

  return schema;
}
  // Override the richTooltip method if you need specific behavior for HowToBeAHeroActorBase
  async richTooltip() {
    const content = await foundry.applications.handlebars.renderTemplate("systems/tears/templates/actor/parts/actor-tooltip.hbs", {
      name: this.parent.name,
      img: this.parent.img,
      health: this.attributes.health,
      armor: this.attributes.armor,
      attributes: {
        kk: this.attributes.kk, au: this.attributes.au, ge: this.attributes.ge,
        in: this.attributes.in, ch: this.attributes.ch, mb: this.attributes.mb
      },
      mentalHealth: this.attributes.mentalHealth
    });

    return {
      content,
      classes: ['htbah-tooltip', 'htbah-actor-tooltip']
    };
  }
}