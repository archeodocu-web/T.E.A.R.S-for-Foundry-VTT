import HowToBeAHeroItemBase from "./item-base.mjs";

export default class HowToBeAHeroAbility extends HowToBeAHeroItemBase {
  /**
   * System data definition for abilities.
   *
   * @property {object} description                           Description of the ability
   * @property {object} type                                  Type of the ability
   * @property {object} value                                 Type of the ability
   * @property {object} calculatedValue                       Type of the ability
   * @property {object} roll                                  
   * @property {object} roll.diceNum                          Type of the ability
   * @property {object} roll.diceSize                         Type of the ability
   * @property {object} roll.diceBonus                        Type of the ability
   * @property {object} formula                               Type of the ability
   */
  
  static defineSchema() {
    const fields = foundry.data.fields;
    const requiredInteger = { required: true, nullable: false, integer: true };
    const schema = super.defineSchema();

    schema.type = new fields.StringField({label: "TEARS.TalentType"});
    schema.talentGroup = new fields.StringField({ initial: 'physical' });
    schema.attribute1 = new fields.StringField({ initial: 'kk' });
    schema.attribute2 = new fields.StringField({ initial: 'au' });
    schema.attribute3 = new fields.StringField({ initial: 'ge' });
    schema.isWeaponTalent = new fields.BooleanField({ initial: false });
    // Talentpunkte are the shared pool used to compensate the combined
    // deficits of all three W20 results. They are not spent by a successful roll.
    schema.value = new fields.NumberField({...requiredInteger, initial: 0, min: 0});
    // Hobby bonuses are granted to one matching talent and do not consume the group's TP budget.
    schema.hobbyBonus = new fields.NumberField({...requiredInteger, initial: 0, min: 0});
    schema.professionBonus = new fields.NumberField({...requiredInteger, initial: 0, min: 0});
    // Additional, freely invested profession points; unlike the fixed profession
    // baseline these are additive to the effective talent value.
    schema.professionVariableBonus = new fields.NumberField({...requiredInteger, initial: 0, min: 0});
  
    // Break down roll formula into three independent fields
    schema.roll = new fields.SchemaField({
      diceNum: new fields.NumberField({ ...requiredInteger, initial: 1, min: 1 }),
      diceSize: new fields.StringField({ initial: "d100" }),
      diceBonus: new fields.NumberField({ initial: 0 })
    })

    schema.rollType = new fields.StringField({
      required: true,
      initial: "check",
      label: "HOW_TO_BE_A_HERO.RollType"
    });
    
    schema.formula = new fields.StringField({ initial: "3d20", label: "TEARS.TalentFormula"});
  
    return schema
  }
}