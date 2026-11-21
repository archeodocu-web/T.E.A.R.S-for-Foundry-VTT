import { SYSTEM_ID, TEARS_DEFAULT_TALENTS, inferTearsWeaponTalentName, normalizeTearsWeaponTalentName } from "../helpers/config.mjs";
import { d10Roll } from "../dice/dice.mjs";


export class HowToBeAHeroActor extends Actor {
  /**
   * Prepare base data before other preparations
   */
  prepareData() {
    super.prepareData();
    const systemData = this.system;
    const flags = this.flags[SYSTEM_ID] || {};

    this._prepareCharacterData();
    this._prepareNpcData(); 
    this._prepareTearsResources();
    this._prepareTearsTalents();
    this._prepareTearsCombatValues();
    this._prepareArmorClass();
  }

  /**
   * Prepare the five T.E.A.R.S. talent groups from owned ability items.
   */
  _prepareTearsTalents() {
    this.talentGroupData = {};
    const talentsByName = new Map();
    for (const item of this.items.filter(item => item.type === "ability")) {
      const key = String(normalizeTearsWeaponTalentName(item.name) || item.name).trim().toLocaleLowerCase("de");
      if (!talentsByName.has(key)) talentsByName.set(key, item);
    }
    const talents = Array.from(talentsByName.values());

    for (const [key, definition] of Object.entries(CONFIG.TEARS.talentGroups)) {
      const groupTalents = talents
        .filter(item => String(item.system?.talentGroup ?? "physical") === key)
        .sort((a, b) => a.name.localeCompare(b.name, "de"));
      const totalPoints = groupTalents.reduce((sum, item) => {
        const value = Math.max(0, Number(item.system?.value) || 0);
        // Weapon talents cost two Talentpunkte for each point of talent value.
        return sum + value * (item.system?.isWeaponTalent === true ? 2 : 1);
      }, 0);
      const poolPoints = Number(this.system?.talentPools?.[key] ?? 10);

      for (const talent of groupTalents) {
        const system = talent.system ?? {};
        talent.tearsHobbyBonus = Math.max(0, Number(system.hobbyBonus) || 0);
        talent.tearsProfessionBonus = Math.max(0, Number(system.professionBonus) || 0);
        talent.tearsProfessionVariableBonus = Math.max(0, Number(system.professionVariableBonus) || 0);
        // Fixed profession base is a floor at 5. The five flexible profession
        // points and hobby bonuses are additive to the final effective value.
        talent.tearsEffectiveValue = Math.max(Math.max(0, Number(system.value) || 0), talent.tearsProfessionBonus)
          + talent.tearsProfessionVariableBonus + talent.tearsHobbyBonus;
        const checkPenalty = this._getTearsCheckPenalty();
        talent.tearsAttributes = system.isWeaponTalent ? [] : [system.attribute1, system.attribute2, system.attribute3]
          .filter(Boolean)
          .map(attribute => {
            const value = Number(this.system?.attributes?.[attribute]) || 0;
            return {
              key: attribute,
              abbreviation: CONFIG.TEARS.attributes[attribute]?.abbreviation ?? String(attribute).toUpperCase(),
              label: game.i18n.localize(CONFIG.TEARS.attributes[attribute]?.label ?? attribute),
              value,
              target: Math.max(0, value - checkPenalty.total),
              penalty: checkPenalty.total
            };
          });
        talent.isTearsWeaponTalent = system.isWeaponTalent === true || talent.tearsAttributes.length !== 3;
      }

      this.talentGroupData[key] = {
        key,
        label: game.i18n.localize(definition.label),
        abbreviation: definition.abbreviation,
        talents: groupTalents,
        totalPoints,
        poolPoints,
        remainingPoints: poolPoints - totalPoints,
        count: groupTalents.length
      };
    }
  }

  /** T.E.A.R.S. combat values derived from the source calculator workbook. */
  _prepareTearsCombatValues() {
    const attributes = this.system?.attributes;
    if (!attributes) return;
    const kk = Number(attributes.kk) || 0;
    const au = Number(attributes.au) || 0;
    const ge = Number(attributes.ge) || 0;
    this.combatData = {
      // The combat chapter explicitly says these calculated values are
      // rounded logically (nearest whole number).
      atn: Math.round((kk + kk + ge) / 3),
      pa: Math.round((kk + au + ge) / 3),
      atd: Math.round((ge + ge + au) / 3),
      baseInitiative: (kk + 5) - (ge / 2),
      weaponInitiativeModifier: 0,
      initiative: (kk + 5) - (ge / 2)
    };
  }

  /** T.E.A.R.S. resource ceilings are derived from the six core attributes. */
  _prepareTearsResources() {
    const attributes = this.system?.attributes;
    if (!attributes) return;

    const kk = Number(attributes.kk) || 0;
    const au = Number(attributes.au) || 0;
    const ge = Number(attributes.ge) || 0;
    const intelligence = Number(attributes.in) || 0;
    const mb = Number(attributes.mb) || 0;

    // Rulebook formulas: LE = (KK + KK + AU) x 3; GG = (AU + IN + MB + MB) x 3.
    if (attributes.health) attributes.health.max = (kk + kk + au) * 3;
    if (attributes.mentalHealth) attributes.mentalHealth.max = (au + intelligence + mb + mb) * 3;
  }

  /**
   * The T.E.A.R.S. penalties from low Life Energy and Mental Health are
   * applied automatically to skill and attribute checks.
   */
  _getTearsCheckPenalty() {
    const attrs = this.system.attributes;
    const le = Number(attrs.health?.value) || 0;
    const leMax = Number(attrs.health?.max) || 0;
    const gg = Number(attrs.mentalHealth?.value) || 0;

    const lifePenalty = le < 20 ? 5 : (leMax > 0 && le < leMax / 2 ? 2 : 0);
    const mentalPenalty = gg < 20 ? 3 : (gg < 30 ? 2 : (gg < 40 ? 1 : 0));
    return { lifePenalty, mentalPenalty, total: lifePenalty + mentalPenalty, panic: gg < 10 };
  }

  async ensureTearsTalentItems() {
    if (!["character", "npc"].includes(this.type) || (!game.user.isGM && !this.isOwner)) return [];
    const existingAbilities = this.items.filter(item => item.type === "ability");
    const canonicalNames = new Set(TEARS_DEFAULT_TALENTS.map(talent => talent.name.toLocaleLowerCase("de")));
    const matchesByName = new Map();

    // Group legacy rows by canonical name. Old migrations sometimes created a second
    // row instead of updating the existing one; keep the highest saved value and
    // remove only duplicate copies of the 50 canonical rulebook talents.
    for (const item of existingAbilities) {
      const normalizedName = normalizeTearsWeaponTalentName(String(item.name ?? "").trim()) || String(item.name ?? "").trim();
      const key = normalizedName.toLocaleLowerCase("de");
      if (!canonicalNames.has(key)) continue;
      if (!matchesByName.has(key)) matchesByName.set(key, []);
      matchesByName.get(key).push(item);
    }

    const details = this.system?.details ?? {};
    const professionTalentName = String(details.professionTalent ?? "").trim();
    const hobbyOneTalentName = String(details.hobbyOneTalent ?? "").trim();
    const hobbyTwoTalentName = String(details.hobbyTwoTalent ?? "").trim();
    const variableProfessionSelections = Array.isArray(details.variableProfessionSelections) ? details.variableProfessionSelections : [];
    const variableProfessionBonusByTalent = new Map();
    for (const name of variableProfessionSelections) {
      if (name) variableProfessionBonusByTalent.set(name, (variableProfessionBonusByTalent.get(name) ?? 0) + 1);
    }
    const hasBuilderMetadata = Boolean(details.builderVersion || professionTalentName || hobbyOneTalentName || hobbyTwoTalentName);
    const additions = [];
    const updates = [];
    const duplicatesToDelete = [];

    for (const talent of TEARS_DEFAULT_TALENTS) {
      const key = talent.name.toLocaleLowerCase("de");
      const matches = matchesByName.get(key) ?? [];
      const existing = matches[0];
      const professionBonus = professionTalentName && normalizeTearsWeaponTalentName(professionTalentName) === talent.name
        && details.professionCategory !== "unemployed" ? 5 : 0;
      const hobbyBonus = (hobbyOneTalentName && normalizeTearsWeaponTalentName(hobbyOneTalentName) === talent.name ? 5 : 0)
        + (hobbyTwoTalentName && normalizeTearsWeaponTalentName(hobbyTwoTalentName) === talent.name ? 3 : 0);

      if (!existing) {
        additions.push({
          name: talent.name, type: "ability", img: "icons/svg/d20-grey.svg",
          system: { description: "", talentGroup: talent.talentGroup, attribute1: talent.attribute1,
            attribute2: talent.attribute2, attribute3: talent.attribute3, isWeaponTalent: talent.isWeaponTalent,
            value: talent.value, hobbyBonus, professionBonus,
            professionVariableBonus: variableProfessionBonusByTalent.get(talent.name) ?? 0,
            formula: talent.isWeaponTalent ? "" : "3d20" }
        });
        continue;
      }

      const mergedValue = Math.max(0, ...matches.map(item => Number(item.system?.value) || 0));
      const mergedHobbyBonus = Math.max(0, ...matches.map(item => Number(item.system?.hobbyBonus) || 0), hobbyBonus);
      const mergedProfessionBonus = Math.max(0, ...matches.map(item => Number(item.system?.professionBonus) || 0), professionBonus);
      const patch = { _id: existing.id };
      if (existing.name !== talent.name) patch.name = talent.name;
      const canonicalFields = { talentGroup: talent.talentGroup, attribute1: talent.attribute1,
        attribute2: talent.attribute2, attribute3: talent.attribute3, isWeaponTalent: talent.isWeaponTalent, value: mergedValue };
      canonicalFields.professionBonus = hasBuilderMetadata ? mergedProfessionBonus : Math.max(0, Number(existing.system?.professionBonus) || 0);
      canonicalFields.professionVariableBonus = hasBuilderMetadata
        ? (variableProfessionBonusByTalent.get(talent.name) ?? Math.max(0, Number(existing.system?.professionVariableBonus) || 0))
        : Math.max(0, Number(existing.system?.professionVariableBonus) || 0);
      canonicalFields.hobbyBonus = hasBuilderMetadata ? mergedHobbyBonus : Math.max(0, Number(existing.system?.hobbyBonus) || 0);
      for (const [field, value] of Object.entries(canonicalFields)) {
        if (existing.system?.[field] !== value) patch[`system.${field}`] = value;
      }
      if (Object.keys(patch).length > 1) updates.push(patch);
      duplicatesToDelete.push(...matches.slice(1).map(item => item.id));
    }

    if (updates.length) await this.updateEmbeddedDocuments("Item", updates);
    if (additions.length) await this.createEmbeddedDocuments("Item", additions);
    if (duplicatesToDelete.length) await this.deleteEmbeddedDocuments("Item", duplicatesToDelete);
    return Array.from(this.items).filter(item => item.type === "ability");
  }

  async _onCreate(data, options, userId) {
    super._onCreate(data, options, userId);
    if (userId !== game.user.id || !["character", "npc"].includes(this.type)) return;
    await this.ensureTearsTalentItems();
  }

  _prepareCharacterData() {
    if (this.type !== 'character') return;
    // Character-specific preparations...
  }

  _prepareNpcData() {
    if (this.type !== 'npc') return;
    // NPC-specific preparations...
  }

  /**
   * Prepare armor class calculation from equipped armor items only
   * @private
   */
  _prepareArmorClass() {
    
    // Get all equipped armor items
    const equippedArmor = this.items.filter(item => 
      item.type === 'armor' && item.system.equipped === true
    );
    
    // Calculate total armor value from equipped items only
    const totalArmorClass = equippedArmor.reduce((total, armor) => {
      const armorValue = armor.system.armor || 0;
      return total + armorValue;
    }, 0);
    
    // Respect both calculated equipped armor and a manually configured base
    // armor value (commonly used on NPCs), then layer temporary magic bonuses.
    const manualArmorValue = Number(this.system?.attributes?.armor?.value) || 0;
    const baseArmorTotal = Math.max(totalArmorClass, manualArmorValue, 0);

    // Temporary armor bonuses granted by applied magic effects are layered
    // on top of the base armor and are not written into the base armor field.
    const magicArmorEffects = Array.from(this.effects ?? []).filter(effect => {
      const magicEffect = effect.flags?.[SYSTEM_ID]?.magicEffect;
      return !effect.disabled && !effect.duration?.expired && magicEffect?.type === "armor";
    });
    const magicArmorBonus = magicArmorEffects.reduce((total, effect) => {
      const value = Number(effect.flags?.[SYSTEM_ID]?.magicEffect?.value) || 0;
      return total + Math.max(0, value);
    }, 0);

    // Store calculated equipment and temporary armor separately for display
    // and damage mitigation. The persistent system.attributes.armor.value
    // remains the base/manual value, preserving existing sheet behavior.
    this.armorData = {
      equipped: totalArmorClass,
      base: baseArmorTotal,
      magicBonus: magicArmorBonus,
      total: baseArmorTotal + magicArmorBonus,
      equippedItems: equippedArmor.map(armor => ({
        id: armor.id,
        name: armor.name,
        armorValue: armor.system.armor || 0
      })),
      magicEffects: magicArmorEffects.map(effect => ({ id: effect.id, name: effect.name, bonus: Number(effect.flags?.[SYSTEM_ID]?.magicEffect?.value) || 0, duration: effect.duration?.label || "" }))
    };
  }

  getRollData() {
    const data = super.getRollData();

    data.talentGroups = this.talentGroupData;
    data.combatData = this.combatData;
    data.tearsCheckPenalty = this._getTearsCheckPenalty();
    
    return this.type === 'character' ? this._getCharacterRollData(data) : this._getNpcRollData(data);
  }

  _getCharacterRollData(data) {
    return this.prepareGeneralRollData(data);
  }

  _getNpcRollData(data) {
    return this.prepareGeneralRollData(data);
  }

  prepareGeneralRollData(data) {
    return data;
  }

  async rollDamage(damageData, options={}) {
    const label = damageData.label || "";
    const data = this.getRollData();
    const critical = damageData.critical || false;
    const bonusValue = damageData.bonus || 0;
    const target = damageData.target || null;
    const targetActorUuids = Array.from(game.user.targets || [])
      .map(token => token?.actor?.uuid)
      .filter(uuid => typeof uuid === "string" && uuid.length > 0);
    const flavor = game.i18n.localize("HTBAH.DamageRollPrompt");
    
    // Use the formula from damageData if provided, otherwise default to 1d10
    const formula = damageData.formula || "1d10";

    const rollData = {
      formula: formula,
      data: {
        actor: data,
        item: null
      },
      title: `${flavor}: ${label}`,
      flavor,
      critical,
      bonusValue,
      target,
      messageData: {
        speaker: options.speaker || ChatMessage.getSpeaker({actor: this}),
        flags: {
          [SYSTEM_ID]: {
            roll: {
            type: "damage",
            data: { ...damageData, targetActorUuids }
          }
          }
        }
      }
    };

    const roll = await d10Roll(rollData);
    Hooks.callAll("howToBeAHeroDamageRolled", this, damageData, roll);
    return roll;
  }

  /**
   * Roll a T.E.A.R.S. talent probe: 3 consecutive W20 checks against the
   * talent's three attributes. The Talentwert is one shared pool of points
   * available to offset the sum of all exceeded attributes.
   */
  async rollTalent(talent, { modifier = 0 } = {}) {
    if (!talent || talent.type !== "ability") return null;
    if (!this.isOwner && !game.user.isGM) return null;

    if (talent.system?.isWeaponTalent) {
      ui.notifications.info(game.i18n.localize("TEARS.CombatOnlyTalentNote"));
      return null;
    }

    const attributeKeys = [talent.system?.attribute1, talent.system?.attribute2, talent.system?.attribute3];
    if (attributeKeys.length !== 3 || attributeKeys.some(key => !CONFIG.TEARS.attributes[key])) {
      ui.notifications.warn(game.i18n.localize("TEARS.TalentNeedsThreeAttributes"));
      return null;
    }

    const penalties = this._getTearsCheckPenalty();
    if (penalties.panic) {
      ui.notifications.warn(game.i18n.localize("TEARS.PanicNoChecks"));
      return null;
    }

    // Health and mental-health penalties lower every checked attribute target.
    // They do not reduce the shared talent-point pool.
    const rawValues = attributeKeys.map(key => Number(this.system.attributes[key]) || 0);
    const values = rawValues.map(value => Math.max(0, value - penalties.total));
    const rolls = [];
    for (let index = 0; index < 3; index++) {
      const die = new Roll("1d20");
      await die.evaluate();
      rolls.push({
        roll: die,
        result: Number(die.total),
        attribute: attributeKeys[index],
        target: values[index],
        rawTarget: rawValues[index],
        deficit: Math.max(0, Number(die.total) - values[index])
      });
    }

    const totalDeficit = rolls.reduce((sum, result) => sum + result.deficit, 0);
    const allocatedTalentPoints = Number(talent.system.value) || 0;
    const hobbyBonus = Number(talent.system.hobbyBonus) || 0;
    const professionBase = Number(talent.system.professionBonus) || 0;
    const professionVariableBonus = Number(talent.system.professionVariableBonus) || 0;
    const talentPoints = Math.max(allocatedTalentPoints, professionBase) + professionVariableBonus + hobbyBonus;
    const effectivePoints = Math.max(0, talentPoints);
    const success = totalDeficit <= effectivePoints;
    const escapedActor = Handlebars.escapeExpression(this.name);
    const escapedTalent = Handlebars.escapeExpression(talent.name);
    const groupLabel = Handlebars.escapeExpression(game.i18n.localize(CONFIG.TEARS.talentGroups[talent.system.talentGroup]?.label ?? ""));
    const rows = rolls.map((entry, index) => {
      const attrLabel = Handlebars.escapeExpression(game.i18n.localize(CONFIG.TEARS.attributes[entry.attribute].label));
      const attrAbbr = Handlebars.escapeExpression(CONFIG.TEARS.attributes[entry.attribute].abbreviation ?? String(entry.attribute).toUpperCase());
      const state = entry.deficit === 0 ? "success" : "failure";
      const targetText = entry.rawTarget === entry.target ? `${entry.target}` : `${entry.rawTarget} → ${entry.target}`;
      return `<div class="tears-roll-row ${state}">
        <span class="tears-roll-index">${index + 1}</span>
        <span class="tears-roll-dieface" aria-label="W20-Ergebnis ${entry.result}"><i class="fas fa-dice-d20" aria-hidden="true"></i><b>${entry.result}</b></span>
        <span class="tears-roll-attribute"><strong>${attrAbbr} · ${attrLabel}</strong><small>Attributwert ${targetText}</small></span>
        <span class="tears-roll-deficit">${entry.deficit ? `+${entry.deficit}` : "✓"}</span>
      </div>`;
    }).join("");

    const penaltyText = penalties.total
      ? `<p class="tears-roll-penalty">${game.i18n.localize("TEARS.ResourcePenalties")}: −${penalties.total} (${game.i18n.localize("TEARS.LifeEnergy")}: −${penalties.lifePenalty}; ${game.i18n.localize("TEARS.MentalHealth")}: −${penalties.mentalPenalty})</p>`
      : "";
    const content = `
      <section class="tears-roll-card">
        <header class="tears-roll-card__header"><span>${escapedActor}</span><strong>${escapedTalent}</strong><small>${groupLabel}</small></header>
        <div class="tears-roll-card__rows">${rows}</div>
        <div class="tears-roll-card__summary">
          <div><small>${game.i18n.localize("TEARS.TotalDeficit")}</small><strong>${totalDeficit}</strong></div>
          <div><small>${game.i18n.localize("TEARS.EffectiveTalentPoints")}</small><strong>${effectivePoints}</strong></div>
          <div><small>${game.i18n.localize("TEARS.PointsLeft")}</small><strong>${effectivePoints - totalDeficit}</strong></div>
        </div>
        ${penaltyText}
        <div class="tears-roll-outcome ${success ? "is-success" : "is-failure"}">${success ? game.i18n.localize("TEARS.ProbeSuccess") : game.i18n.localize("TEARS.ProbeFailure")}</div>
        <p class="tears-roll-footnote">${game.i18n.localize("TEARS.TalentPointsNotSpent")}</p>
      </section>`;

    const message = await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this }),
      flavor: `${game.i18n.localize("TEARS.TalentProbe")}: ${talent.name}`,
      content,
      rolls: rolls.map(entry => entry.roll)
    });
    const result = { success, totalDeficit, talentPoints, effectivePoints, penalties, rolls, message };
    Hooks.callAll("TearsTalentRolled", this, talent, result);
    return result;
  }

  /** Single-attribute checks use one W20; 1 is always critical success and 20 critical failure. */
  async rollAttribute(attributeKey) {
    if (!this.isOwner && !game.user.isGM) return null;
    if (!CONFIG.TEARS.attributes[attributeKey]) return null;

    const penalties = this._getTearsCheckPenalty();
    if (penalties.panic) {
      ui.notifications.warn(game.i18n.localize("TEARS.PanicNoChecks"));
      return null;
    }

    const target = Math.max(0, (Number(this.system.attributes[attributeKey]) || 0) - penalties.total);
    const die = new Roll("1d20");
    await die.evaluate();
    const result = Number(die.total);
    const success = result === 1 || (result !== 20 && result <= target);
    const critical = result === 1 || result === 20;
    const attrLabel = game.i18n.localize(CONFIG.TEARS.attributes[attributeKey].label);
    const outcome = result === 1 ? game.i18n.localize("TEARS.CriticalSuccess")
      : result === 20 ? game.i18n.localize("TEARS.CriticalFailure")
      : success ? game.i18n.localize("TEARS.ProbeSuccess") : game.i18n.localize("TEARS.ProbeFailure");
    const penaltyLine = penalties.total ? `<p>${game.i18n.localize("TEARS.ResourcePenalties")}: −${penalties.total}</p>` : "";
    const content = `<section class="tears-roll-card"><header class="tears-roll-card__header"><span>${Handlebars.escapeExpression(this.name)}</span><strong>${Handlebars.escapeExpression(attrLabel)}</strong></header><div class="tears-roll-single"><span>${result}</span><small>W20 gegen ${target}</small></div>${penaltyLine}<div class="tears-roll-outcome ${success ? "is-success" : "is-failure"}">${outcome}</div></section>`;
    const message = await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor: this }), flavor: `${game.i18n.localize("TEARS.AttributeCheck")}: ${attrLabel}`, content, rolls: [die] });
    return { success, critical, result, target, penalties, message };
  }


  /** Resolve a T.E.A.R.S. attack or parry check with the selected weapon. */
  async rollWeaponCheck(weapon, action = "attack") {
    if (!weapon || weapon.type !== "weapon") return null;
    if (!this.isOwner && !game.user.isGM) return null;
    if (!["attack", "parry"].includes(action)) return null;

    // Older HTBAH/T.E.A.R.S. actors may contain only a partial set of
    // abilities. Repair them before resolving the weapon-to-talent link.
    const talentItems = await this.ensureTearsTalentItems();

    const penalties = this._getTearsCheckPenalty();
    if (penalties.panic) {
      ui.notifications.warn(game.i18n.localize("TEARS.PanicNoChecks"));
      return null;
    }

    const isParry = action === "parry";
    const attackMode = weapon.system?.attackMode === "ranged" ? "ranged" : "melee";
    const base = isParry ? Number(this.combatData?.pa) || 0
      : attackMode === "ranged" ? Number(this.combatData?.atd) || 0 : Number(this.combatData?.atn) || 0;
    const allocation = isParry ? Number(weapon.system?.parryValue) || 0 : Number(weapon.system?.attackValue) || 0;
    const combatSettings = this.system?.attributes?.combat ?? {};
    const stanceModifier = isParry ? Number(combatSettings.parryModifier) || 0 : Number(combatSettings.attackModifier) || 0;
    const target = Math.max(0, base + allocation + stanceModifier - penalties.total);

    // A weapon category can be linked to the corresponding combat talent by
    // using its exact talent name in the weapon category field. This prevents
    // silently allocating more weapon TP than the character has learned.
    const legacyCandidates = [
      weapon.system?.weaponType,
      weapon.system?.weaponTalent,
      weapon.system?.weaponCategory,
      weapon.system?.category
    ].map(value => String(value ?? "").trim()).filter(Boolean);
    let canonicalWeaponType = legacyCandidates.map(inferTearsWeaponTalentName).find(Boolean) ?? "";

    // For older records that used only the item name, infer a category only
    // from unambiguous weapon words. Do not guess for generic names.
    if (!canonicalWeaponType) canonicalWeaponType = inferTearsWeaponTalentName(weapon.name);

    if (!canonicalWeaponType) {
      ui.notifications.warn("Diese Waffe braucht eine T.E.A.R.S.-Waffentalent-Zuordnung. Bitte wähle sie im geöffneten Waffenbogen aus.");
      await weapon.sheet?.render(true);
      await new Promise(resolve => requestAnimationFrame(() => resolve()));
      const selector = weapon.sheet?.element?.querySelector('select[name="system.weaponType"]');
      selector?.classList.add("tears-weapon-needs-talent");
      selector?.focus();
      selector?.scrollIntoView?.({ block: "center", behavior: "smooth" });
      return null;
    }

    if (weapon.system?.weaponType !== canonicalWeaponType) {
      await weapon.update({ "system.weaponType": canonicalWeaponType });
    }
    const weaponTalentName = canonicalWeaponType.toLocaleLowerCase("de");
    const linkedTalent = talentItems.find(item => item.type === "ability" && normalizeTearsWeaponTalentName(item.name).toLocaleLowerCase("de") === weaponTalentName)
      ?? Array.from(this.items).find(item => item.type === "ability" && normalizeTearsWeaponTalentName(item.name).toLocaleLowerCase("de") === weaponTalentName);
    const definition = TEARS_DEFAULT_TALENTS.find(talent => talent.name.toLocaleLowerCase("de") === weaponTalentName);
    const isWeaponTalent = definition?.isWeaponTalent === true || linkedTalent?.system?.isWeaponTalent === true;
    const talentValue = Math.max(Number(linkedTalent?.system?.value) || 0, Number(linkedTalent?.system?.professionBonus) || 0)
      + (Number(linkedTalent?.system?.professionVariableBonus) || 0)
      + (Number(linkedTalent?.system?.hobbyBonus) || 0);
    const allocatedPoints = (Number(weapon.system?.attackValue) || 0) + (Number(weapon.system?.parryValue) || 0);
    if (!linkedTalent || !isWeaponTalent) {
      ui.notifications.warn(game.i18n.localize("TEARS.Combat.WeaponTalentRequired"));
      return null;
    }
    if (allocatedPoints > talentValue) {
      ui.notifications.warn(game.i18n.format("TEARS.Combat.AllocationExceedsTalent", {
        allocated: allocatedPoints,
        talent: talentValue,
        name: linkedTalent.name
      }));
      return null;
    }

    const die = new Roll("1d20");
    await die.evaluate();
    const result = Number(die.total);
    const criticalSuccess = result === 1;
    const criticalFailure = result === 20;
    const success = criticalSuccess || (!criticalFailure && result <= target);
    const outcome = criticalSuccess ? game.i18n.localize("TEARS.CriticalSuccess")
      : criticalFailure ? game.i18n.localize("TEARS.CriticalFailure")
      : success ? game.i18n.localize("TEARS.ProbeSuccess") : game.i18n.localize("TEARS.ProbeFailure");
    const actionLabel = game.i18n.localize(isParry ? "TEARS.Combat.Parry" : "TEARS.Combat.Attack");
    const valueLabel = isParry ? "PA" : (attackMode === "ranged" ? "ATD" : "ATN");
    const penaltyLine = penalties.total
      ? `<p>${game.i18n.localize("TEARS.ResourcePenalties")}: −${penalties.total}</p>` : "";
    const criticalLine = criticalSuccess
      ? `<p>${game.i18n.localize("TEARS.Combat.CriticalHitHint")}</p>` : "";
    const content = `<section class="tears-roll-card"><header class="tears-roll-card__header"><span>${Handlebars.escapeExpression(this.name)}</span><strong>${Handlebars.escapeExpression(weapon.name)} · ${actionLabel}</strong></header><div class="tears-roll-single"><span>${result}</span><small>W20 gegen ${valueLabel} ${target} (Basis ${base} + Waffen-TP ${allocation} ${stanceModifier >= 0 ? "+" : "−"} ${Math.abs(stanceModifier)} − Mali ${penalties.total})</small></div>${penaltyLine}<div class="tears-roll-outcome ${success ? "is-success" : "is-failure"}">${outcome}</div>${criticalLine}</section>`;
    const message = await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this }),
      flavor: `${actionLabel}: ${weapon.name}`,
      content,
      rolls: [die]
    });
    const resultData = { success, criticalSuccess, criticalFailure, result, target, base, allocation, penalties, message };
    Hooks.callAll("TearsWeaponCheckRolled", this, weapon, action, resultData);
    return resultData;
  }

  /** Roll the damage formula recorded on a weapon; critical hits double it. */
  async rollWeaponDamage(weapon, { critical = false } = {}) {
    if (!weapon || weapon.type !== "weapon") return null;
    if (!this.isOwner && !game.user.isGM) return null;
    let formula = String(weapon.system?.formula || "1d6").trim();
    // Accept the book's German W6 notation as well as Foundry's d6 syntax.
    formula = formula.replace(/(\d+)\s*[wW]\s*(\d+)/g, "$1d$2");
    if (!/^[0-9dD+\-*/().\s]+$/.test(formula)) {
      ui.notifications.warn(game.i18n.localize("TEARS.Combat.InvalidDamageFormula"));
      return null;
    }
    const rollFormula = critical ? `(${formula}) * 2` : formula;
    let roll;
    try {
      roll = new Roll(rollFormula);
      await roll.evaluate();
    } catch (error) {
      console.error("T.E.A.R.S. | Invalid weapon damage formula", error);
      ui.notifications.warn(game.i18n.localize("TEARS.Combat.InvalidDamageFormula"));
      return null;
    }
    const content = `<section class="tears-roll-card"><header class="tears-roll-card__header"><span>${Handlebars.escapeExpression(this.name)}</span><strong>${Handlebars.escapeExpression(weapon.name)} · ${game.i18n.localize("TEARS.Combat.Damage")}</strong></header><div class="tears-roll-outcome ${critical ? "is-success" : ""}">${game.i18n.localize("TEARS.Combat.DamageTotal")}: <strong>${Number(roll.total) || 0}</strong>${critical ? ` · ${game.i18n.localize("TEARS.Combat.CriticalDouble")}` : ""}</div></section>`;
    const message = await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor: this }), flavor: `${game.i18n.localize("TEARS.Combat.Damage")}: ${weapon.name}`, content, rolls: [roll] });
    return { roll, message, critical };
  }

  /**
   * Register the positive T.E.A.R.S. initiative score in Foundry's combat tracker.
   * T.E.A.R.S. uses ascending initiative order: lower INI acts earlier. The
   * TearsCombat document class handles that ordering without negating the value.
   * Repeating actions at INI multiples are still a manual GM step in v0.1.
   */
  async rollInitiative(options = {}) {
    const combat = game.combat;
    if (!combat) {
      ui.notifications.warn(game.i18n.localize("TEARS.Combat.NoActiveCombat"));
      return null;
    }

    if (options.createCombatants && !combat.getCombatantsByActor(this.id).length) {
      const activeToken = this.getActiveTokens?.(true, true)
        ?.find(token => !combat.scene || token.scene?.id === combat.scene.id);
      const fallbackToken = this.token;
      const token = activeToken ?? fallbackToken;
      if (!token) {
        ui.notifications.warn(game.i18n.localize("TEARS.Combat.PlaceTokenFirst"));
        return null;
      }
      await combat.createEmbeddedDocuments("Combatant", [{
        actorId: this.id,
        tokenId: token.id,
        sceneId: token.scene?.id ?? combat.scene?.id
      }]);
    }

    const combatant = combat.getCombatantsByActor(this.id)[0];
    if (!combatant) {
      ui.notifications.warn(game.i18n.localize("TEARS.Combat.AddCombatantFirst"));
      return null;
    }

    const availableWeapons = this.items.filter(item => item.type === "weapon" && item.system?.equipped);
    const selectedWeapon = options.weaponId
      ? this.items.get(options.weaponId)
      : (availableWeapons.length === 1 ? availableWeapons[0] : null);
    const weaponModifier = selectedWeapon?.type === "weapon" ? Number(selectedWeapon.system?.initiativeModifier) || 0 : 0;
    if (options.weaponId && selectedWeapon?.type !== "weapon") {
      ui.notifications.warn(game.i18n.localize("TEARS.Combat.WeaponNotFound"));
      return null;
    }
    const baseInitiative = Number(this.combatData?.baseInitiative ?? this.combatData?.initiative) || 0;
    const tearsInitiative = baseInitiative + weaponModifier;
    await combat.setInitiative(combatant.id, tearsInitiative);

    const content = `<section class="tears-roll-card"><header class="tears-roll-card__header"><span>${Handlebars.escapeExpression(this.name)}</span><strong>${game.i18n.localize("TEARS.Combat.Initiative")}</strong></header><div class="tears-roll-single"><span>${tearsInitiative}</span><small>${game.i18n.localize("TEARS.Combat.LowerInitiativeFirst")}</small></div><p>${selectedWeapon ? `${game.i18n.localize("TEARS.Combat.Weapon")}: ${Handlebars.escapeExpression(selectedWeapon.name)} (${weaponModifier >= 0 ? "+" : ""}${weaponModifier})` : game.i18n.localize("TEARS.Combat.BaseInitiativeOnly")}</p><p>${game.i18n.localize("TEARS.Combat.InitiativeTrackerNote")}</p></section>`;
    await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor: this }), flavor: game.i18n.localize("TEARS.Combat.Initiative"), content });
    return combat;
  }
}
