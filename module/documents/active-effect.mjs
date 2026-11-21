import HowToBeAHeroActiveEffectData from '../data/effect/active-effect.mjs';
import { SYSTEM_ID } from '../helpers/config.mjs';

export class HowToBeAHeroActiveEffect extends foundry.documents.BaseActiveEffect {

  /** @override */
  static async create(data, context={}) {
    // If this is a condition, ensure it has the correct properties
    const systemFlags = data.flags?.[SYSTEM_ID] ?? data.flags?.htbah;
    if (systemFlags?.isCondition) {
      data.transfer = false;
      data.disabled = false;
    }
    return super.create(data, context);
  }

  /** @override */
  async _preCreate(data, options, user) {
    await super._preCreate(data, options, user);
    if (this.isCondition && this.parent?.effects) {
      const conditionId = this.conditionId;
      const existing = this.parent.effects.find(e => (e.flags?.[SYSTEM_ID]?.conditionId ?? e.flags?.htbah?.conditionId) === conditionId);
      if (existing) {
        console.warn(`${this.name} condition is already applied to ${this.parent.name}. Preventing creation of duplicate.`);
        return false;
      }
    }
  }

  get isCondition() {
    return (this.flags?.[SYSTEM_ID]?.isCondition ?? this.flags?.htbah?.isCondition) ?? false;
  }

  get conditionId() {
    return this.flags?.[SYSTEM_ID]?.conditionId ?? this.flags?.htbah?.conditionId;
  }
}