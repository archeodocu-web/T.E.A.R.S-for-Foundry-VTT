import { SYSTEM_ID } from '../helpers/config.mjs';


// Not yet used in the system!
export class effectsManager {
    constructor(conditionManager = null) {
      this.conditionManager = conditionManager;
  }

  setConditionManager(conditionManager) {
      this.conditionManager = conditionManager;
  }
  
  prepareActiveEffectCategories(effects) {
    const categories = {
      temporary: { type: 'temporary', label: 'HOW_TO_BE_A_HERO.Effect.Temporary', effects: [] },
      passive: { type: 'passive', label: 'HOW_TO_BE_A_HERO.Effect.Passive', effects: [] },
      inactive: { type: 'inactive', label: 'HOW_TO_BE_A_HERO.Effect.Inactive', effects: [] }
    };

    for (let e of effects) {
      if (e.flags?.[SYSTEM_ID]?.isCondition ?? e.flags?.htbah?.isCondition) continue;
      if (e.disabled) categories.inactive.effects.push(e);
      else if (e.isTemporary) categories.temporary.effects.push(e);
      else categories.passive.effects.push(e);
    }

    return categories;
  }

  async onManageActiveEffect(event, owner) {
    event.preventDefault();
    const a = event.currentTarget;
    const li = a.closest('li');
    const effect = li.dataset.effectId ? owner.effects.get(li.dataset.effectId) : null;
    
    switch (a.dataset.action) {
      case 'create':
        return this.createEffect(owner, li.dataset.effectType);
      case 'edit':
        return effect.sheet.render(true);
      case 'delete':
        return effect.delete();
      case 'toggle':
        return effect.update({ disabled: !effect.disabled });
    }
  }

  async createEffect(owner, effectType) {
    return owner.createEmbeddedDocuments('ActiveEffect', [{
      name: game.i18n.localize('HTBAH.NewEffect'),
      label: game.i18n.localize('HTBAH.NewEffect'), // Foundry V13 compatibility
      img: 'icons/svg/aura.svg',
      icon: 'icons/svg/aura.svg', // Foundry V13 compatibility
      showIcon: CONST.ACTIVE_EFFECT_SHOW_ICON?.ALWAYS ?? 2,
      origin: owner.uuid,
      'duration.rounds': effectType === 'temporary' ? 1 : undefined,
      disabled: effectType === 'inactive'
    }]);
  }
}