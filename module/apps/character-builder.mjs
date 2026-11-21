import {
  HOW_TO_BE_A_HERO,
  TEARS_DEFAULT_TALENTS,
  TEARS_SPECIFICA,
  TEARS_SPECIAL_ABILITIES
} from "../helpers/config.mjs";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const ATTRIBUTE_KEYS = Object.keys(HOW_TO_BE_A_HERO.attributes);
const GROUP_KEYS = Object.keys(HOW_TO_BE_A_HERO.talentGroups);

function attributeCost(startValue, finalValue) {
  let cost = 0;
  for (let value = Number(startValue) + 1; value <= Number(finalValue); value++) {
    if (value <= 14) cost += 1;
    else if (value <= 17) cost += 2;
    else if (value <= 19) cost += 3;
    else return Infinity;
  }
  return cost;
}

function findSpecificum(name, kind = "positive") {
  for (const [group, data] of Object.entries(TEARS_SPECIFICA)) {
    const option = (data[kind] ?? []).find(entry => entry.name === name);
    if (option) return { ...option, group };
  }
  return null;
}

function baseAttributesForProfession(category) {
  const values = Object.fromEntries(ATTRIBUTE_KEYS.map(key => [key, 8]));
  const profile = HOW_TO_BE_A_HERO.professionAttributeProfiles[category] ?? {};
  for (const [key, value] of Object.entries(profile)) values[key] = Number(value);
  return values;
}

function calculateAttributeSpend(category, attributes) {
  const base = baseAttributesForProfession(category);
  return ATTRIBUTE_KEYS.reduce((sum, key) => sum + attributeCost(base[key], Number(attributes[key] ?? base[key])), 0);
}

function calculateTalentBudgets(state) {
  const bonuses = HOW_TO_BE_A_HERO.professionTalentBonuses[state.professionCategory] ?? {};
  const budgets = Object.fromEntries(GROUP_KEYS.map(key => [key, 10 + (Number(bonuses[key]) || 0)]));
  if (state.variableTalentGroup && budgets[state.variableTalentGroup] !== undefined) budgets[state.variableTalentGroup] += Number(bonuses.variable) || 0;

  // Positive specifica are purchased by sacrificing Talentpunkte from the
  // same rubric (rulebook p. 31); the printed +3/+5 is the sacrifice amount.
  const positive = findSpecificum(state.positiveSpecificum, "positive");
  if (positive && budgets[positive.group] !== undefined) budgets[positive.group] -= Math.abs(positive.points);
  // The profession determines one negative specificum. A first hobby can
  // require an additional disadvantage from the hobby talent's own rubric.
  const negative = findSpecificum(state.negativeSpecificum, "negative");
  if (negative && budgets[negative.group] !== undefined) budgets[negative.group] += negative.points;
  const hobbyNegative = findSpecificum(state.hobbyNegativeSpecificum, "negative");
  if (hobbyNegative && budgets[hobbyNegative.group] !== undefined) budgets[hobbyNegative.group] += hobbyNegative.points;
  // Keep negative budgets visible: validation must catch a positive
  // specificum whose same-rubric purchase cost exceeds the available pool.
  return budgets;
}

function calculateTalentSpend(state) {
  const spent = Object.fromEntries(GROUP_KEYS.map(key => [key, 0]));
  TEARS_DEFAULT_TALENTS.forEach((talent, index) => {
    const value = Math.max(0, Number(state.talentValues[index]) || 0);
    spent[talent.talentGroup] += value * (talent.isWeaponTalent ? 2 : 1);
  });
  return spent;
}

function calculateSpecialAbilityCost(state) {
  return TEARS_SPECIAL_ABILITIES.reduce((sum, ability) => sum + (state.specialAbilities[ability.key] ? ability.points : 0), 0);
}

function label(key) {
  const path = HOW_TO_BE_A_HERO.talentGroups[key]?.label ?? HOW_TO_BE_A_HERO.professionCategories[key] ?? key;
  return game.i18n.localize(path);
}

function responsiveApplicationPosition(targetWidth = 1080, targetHeight = 820) {
  const viewportWidth = Math.max(360, Number(window.innerWidth) || 1280);
  const viewportHeight = Math.max(420, Number(window.innerHeight) || 900);
  const width = Math.max(340, Math.min(targetWidth, viewportWidth - 24));
  const height = Math.max(420, Math.min(targetHeight, viewportHeight - 28));
  return {
    width,
    height,
    left: Math.max(8, Math.round((viewportWidth - width) / 2)),
    top: Math.max(24, Math.round((viewportHeight - height) / 2))
  };
}

export class TearsCharacterBuilder extends HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2) {
  constructor(options = {}) {
    const requested = options.position ?? {};
    const fitted = responsiveApplicationPosition(
      Math.min(Number(requested.width) || 1080, 1080),
      Math.min(Number(requested.height) || 820, 820)
    );
    super({ ...options, position: { ...fitted, ...requested, ...responsiveApplicationPosition(Math.min(Number(requested.width) || 1080, 1080), Math.min(Number(requested.height) || 820, 820)) } });
    this.step = 0;
    this.builderData = {
      name: "",
      professionCategory: "",
      profession: "",
      professionTalent: "",
      hobbyOne: "",
      hobbyOneTalent: "",
      hobbyTwo: "",
      hobbyTwoTalent: "",
      hobbyNegativeSpecificum: "",
      variableTalentGroup: "",
      positiveSpecificum: "",
      negativeSpecificum: "",
      attributes: baseAttributesForProfession(""),
      talentValues: TEARS_DEFAULT_TALENTS.map(() => 0),
      specialAbilities: Object.fromEntries(TEARS_SPECIAL_ABILITIES.map(option => [option.key, false]))
    };
  }

  static DEFAULT_OPTIONS = {
    id: "tears-character-builder",
    tag: "dialog",
    window: { title: "T.E.A.R.S. – Charaktererschaffung", minimizable: false, resizable: true },
    position: { width: 1080, height: 820 },
    classes: ["tears", "tears-character-builder"],
    actions: {
      cancel: this.prototype._onCancel,
      previous: this.prototype._onPrevious,
      next: this.prototype._onNext,
      create: this.prototype._onCreateCharacter,
      submit: this.prototype._onFormSubmit
    }
  };

  static PARTS = {
    form: { template: "systems/tears/templates/dialogs/character-builder.hbs" }
  };

  async _prepareContext() {
    const baseAttributes = baseAttributesForProfession(this.builderData.professionCategory);
    const attributeRows = ATTRIBUTE_KEYS.map(key => ({
      key,
      abbreviation: HOW_TO_BE_A_HERO.attributes[key].abbreviation,
      label: game.i18n.localize(HOW_TO_BE_A_HERO.attributes[key].label),
      value: Number(this.builderData.attributes[key] ?? baseAttributes[key]),
      base: baseAttributes[key]
    }));
    const attributePointsSpent = calculateAttributeSpend(this.builderData.professionCategory, this.builderData.attributes);
    const talentBudgets = calculateTalentBudgets(this.builderData);
    const talentSpent = calculateTalentSpend(this.builderData);
    const talentRemaining = Object.fromEntries(GROUP_KEYS.map(key => [key, talentBudgets[key] - talentSpent[key]]));
    const freeTalentPoints = GROUP_KEYS.reduce((sum, key) => sum + Math.max(0, talentRemaining[key]), 0);
    const specialAbilityCost = calculateSpecialAbilityCost(this.builderData);
    const professionKeys = Object.keys(HOW_TO_BE_A_HERO.professionCategories);
    const professionOptions = professionKeys.map(key => ({ key, label: game.i18n.localize(HOW_TO_BE_A_HERO.professionCategories[key]), selected: this.builderData.professionCategory === key }));
    const talentOptions = TEARS_DEFAULT_TALENTS.map((talent, index) => ({
      index,
      name: talent.name,
      group: label(talent.talentGroup),
      selectedHobbyOne: this.builderData.hobbyOneTalent === talent.name,
      selectedHobbyTwo: this.builderData.hobbyTwoTalent === talent.name
    }));
    const groupData = GROUP_KEYS.map(key => ({
      key,
      label: label(key),
      abbreviation: HOW_TO_BE_A_HERO.talentGroups[key].abbreviation,
      budget: talentBudgets[key],
      spent: talentSpent[key],
      remaining: talentRemaining[key],
      talents: TEARS_DEFAULT_TALENTS.map((talent, index) => ({ talent, index }))
        .filter(entry => entry.talent.talentGroup === key)
        .map(({ talent, index }) => ({
          index,
          name: talent.name,
          value: Number(this.builderData.talentValues[index]) || 0,
          professionFloor: this.builderData.professionCategory !== "unemployed" && this.builderData.professionTalent === talent.name ? 5 : 0,
          hobbyBonus: (this.builderData.hobbyOneTalent === talent.name ? 5 : 0) + (this.builderData.hobbyTwoTalent === talent.name ? 3 : 0),
          effectiveValue: Math.max(Number(this.builderData.talentValues[index]) || 0, this.builderData.professionCategory !== "unemployed" && this.builderData.professionTalent === talent.name ? 5 : 0)
            + (this.builderData.hobbyOneTalent === talent.name ? 5 : 0) + (this.builderData.hobbyTwoTalent === talent.name ? 3 : 0),
          cost: talent.isWeaponTalent ? 2 : 1,
          weapon: talent.isWeaponTalent,
          attributes: talent.isWeaponTalent ? "Waffentalent" : talent.attributes?.join(" / ") || [talent.attribute1, talent.attribute2, talent.attribute3].filter(Boolean).map(a => HOW_TO_BE_A_HERO.attributes[a]?.abbreviation).join(" / ")
        }))
    }));
    const positiveOptions = Object.entries(TEARS_SPECIFICA).flatMap(([group, data]) => data.positive.map(option => ({
      name: option.name, group: label(group), groupKey: group, points: option.points,
      selected: this.builderData.positiveSpecificum === option.name
    })));
    const professionNegativeGroup = HOW_TO_BE_A_HERO.professionTalentBonuses[this.builderData.professionCategory]?.negativeGroup ?? null;
    const hobbyOneDefinition = TEARS_DEFAULT_TALENTS.find(talent => talent.name === this.builderData.hobbyOneTalent);
    const hobbyTwoDefinition = TEARS_DEFAULT_TALENTS.find(talent => talent.name === this.builderData.hobbyTwoTalent);
    const hobbyOneGroup = hobbyOneDefinition?.talentGroup ?? null;
    const hobbyTwoGroup = hobbyTwoDefinition?.talentGroup ?? null;
    const selectedProfessionNegative = findSpecificum(this.builderData.negativeSpecificum, "negative");
    const selectedNegativeGroup = selectedProfessionNegative?.group ?? null;
    const hobbyRequiresSeparateNegative = Boolean(hobbyOneGroup && selectedNegativeGroup && hobbyOneGroup !== selectedNegativeGroup);
    // Employed professions have a fixed negative-spec rubric. The unemployed/
    // student profile explicitly allows choosing that rubric freely.
    const requiredNegativeGroup = professionNegativeGroup || null;
    const negativeOptions = Object.entries(TEARS_SPECIFICA)
      .filter(([group]) => !requiredNegativeGroup || group === requiredNegativeGroup)
      .flatMap(([group, data]) => data.negative.map(option => ({
        name: option.name, group: label(group), groupKey: group, points: option.points,
        selected: this.builderData.negativeSpecificum === option.name
      })));
    const hobbyNegativeOptions = Object.entries(TEARS_SPECIFICA)
      .filter(([group]) => hobbyRequiresSeparateNegative && group === hobbyOneGroup)
      .flatMap(([group, data]) => data.negative.map(option => ({
        name: option.name, group: label(group), groupKey: group, points: option.points,
        selected: this.builderData.hobbyNegativeSpecificum === option.name
      })));
    const specialAbilityRows = TEARS_SPECIAL_ABILITIES.map(option => ({
      ...option,
      selected: Boolean(this.builderData.specialAbilities[option.key]),
      disabled: option.key === "motorcycleLicence" && !this.builderData.specialAbilities.carLicence
    }));
    const profile = HOW_TO_BE_A_HERO.professionAttributeProfiles[this.builderData.professionCategory] ?? {};
    const professionBonuses = HOW_TO_BE_A_HERO.professionTalentBonuses[this.builderData.professionCategory] ?? {};
    const professionTalentProfile = GROUP_KEYS
      .filter(key => Number(professionBonuses[key]) > 0)
      .map(key => ({ label: label(key), points: Number(professionBonuses[key]) }));
    if (Number(professionBonuses.variable) > 0) {
      professionTalentProfile.push({ label: "Frei zugeordnet", points: Number(professionBonuses.variable), variable: true });
    }

    return {
      step: this.step,
      steps: ["Beruf & Identität", "Attribute", "Talente & Spezifika", "Kontrolle"].map((name, index) => ({ name, index, number: index + 1, active: this.step === index, completed: this.step > index })),
      state: this.builderData,
      professionLabel: this.builderData.professionCategory ? game.i18n.localize(HOW_TO_BE_A_HERO.professionCategories[this.builderData.professionCategory]) : "",
      reviewLifeEnergy: (Number(this.builderData.attributes.kk) * 2 + Number(this.builderData.attributes.au)) * 3,
      reviewMentalHealth: (Number(this.builderData.attributes.au) + Number(this.builderData.attributes.in) + Number(this.builderData.attributes.mb) * 2) * 3,
      professionOptions,
      attributeRows,
      attributePointsSpent,
      attributePointsRemaining: 14 - attributePointsSpent,
      attributeValid: attributePointsSpent === 14,
      professionProfile: Object.entries(profile).map(([key, value]) => ({ abbreviation: HOW_TO_BE_A_HERO.attributes[key].abbreviation, value })),
      professionTalentProfile,
      professionNegativeGroupLabel: professionBonuses.negativeGroup ? label(professionBonuses.negativeGroup) : "freie Wahl",
      groupData,
      talentOptions,
      positiveOptions,
      negativeOptions,
      professionNegativeGroup: professionNegativeGroup ? label(professionNegativeGroup) : "freie Wahl",
      requiredNegativeGroup: requiredNegativeGroup ? label(requiredNegativeGroup) : "freie Wahl",
      requiresProfessionTalent: this.builderData.professionCategory !== "unemployed",
      hobbyOneGroup: hobbyOneGroup ? label(hobbyOneGroup) : "",
      hobbyTwoGroup: hobbyTwoGroup ? label(hobbyTwoGroup) : "",
      hobbyRequiresSeparateNegative,
      hobbyNegativeOptions,
      specialAbilityRows,
      specialAbilityCost,
      freeTalentPoints,
      specialAbilityValid: specialAbilityCost <= freeTalentPoints,
      talentPoolsValid: GROUP_KEYS.every(key => talentRemaining[key] >= 0),
      talentRemainingTotal: GROUP_KEYS.reduce((sum, key) => sum + talentRemaining[key], 0),
      selectedPositive: findSpecificum(this.builderData.positiveSpecificum, "positive"),
      selectedNegative: findSpecificum(this.builderData.negativeSpecificum, "negative")
    };
  }

  _onRender(context, options) {
    super._onRender(context, options);
    if (this.element && !this.element.open) this.element.showModal();
    if (!this.element) return;

    this.element.querySelectorAll("[data-builder-step]").forEach(button => {
      button.addEventListener("click", () => {
        const targetStep = Number(button.dataset.builderStep);
        if (!Number.isInteger(targetStep) || targetStep > this.step || targetStep < 0) return;
        this._captureForm();
        this.step = targetStep;
        this.render(true);
      });
    });

    this.element.querySelectorAll("[data-field]").forEach(input => {
      input.addEventListener("input", () => {
        this._captureForm();
        this._updateLiveNumbers();
      });
      input.addEventListener("change", () => {
        const field = input.dataset.field;
        this._captureForm();
        if (field === "professionCategory") {
          this.builderData.attributes = baseAttributesForProfession(this.builderData.professionCategory);
          this.builderData.variableTalentGroup = "";
          this.builderData.professionTalent = "";
          this.builderData.positiveSpecificum = "";
          this.builderData.negativeSpecificum = "";
          this.builderData.hobbyNegativeSpecificum = "";
          this.render(true);
          return;
        }
        if (field === "negativeSpecificum") {
          const negativeGroup = findSpecificum(this.builderData.negativeSpecificum, "negative")?.group;
          const requiredGroup = HOW_TO_BE_A_HERO.professionTalentBonuses[this.builderData.professionCategory]?.negativeGroup;
          if (requiredGroup && negativeGroup !== requiredGroup) this.builderData.negativeSpecificum = "";
          const hobbyTalent = TEARS_DEFAULT_TALENTS.find(talent => talent.name === this.builderData.hobbyOneTalent);
          if (!hobbyTalent || negativeGroup === hobbyTalent.talentGroup) this.builderData.hobbyNegativeSpecificum = "";
          this.render(true);
          return;
        }
        if (field === "hobbyOneTalent" || (field === "hobbyOne" && !String(input.value ?? "").trim())) {
          this.builderData.hobbyNegativeSpecificum = "";
          this.render(true);
          return;
        }
        if (field === "specialAbilities.carLicence" && !this.builderData.specialAbilities.carLicence) {
          this.builderData.specialAbilities.motorcycleLicence = false;
          this.render(true);
          return;
        }
        this._updateLiveNumbers();
      });
    });
  }

  _captureForm() {
    if (!this.element) return;
    for (const input of this.element.querySelectorAll("[data-field]")) {
      const field = input.dataset.field;
      let value = input.type === "checkbox" ? input.checked : input.value;
      if (input.type === "number") value = Number(value || 0);
      if (field.startsWith("attributes.")) this.builderData.attributes[field.split(".")[1]] = value;
      else if (field.startsWith("talents.")) this.builderData.talentValues[Number(field.split(".")[1])] = value;
      else if (field.startsWith("specialAbilities.")) this.builderData.specialAbilities[field.split(".")[1]] = Boolean(value);
      else this.builderData[field] = value;
    }
  }

  _updateLiveNumbers() {
    if (!this.element) return;
    const ap = calculateAttributeSpend(this.builderData.professionCategory, this.builderData.attributes);
    const apNode = this.element.querySelector("[data-live-attribute-points]");
    if (apNode) {
      apNode.textContent = `${ap} / 14 AP`;
      apNode.classList.toggle("is-valid", ap === 14);
      apNode.classList.toggle("is-invalid", ap > 14 || !Number.isFinite(ap));
    }
    const apRemainingNode = this.element.querySelector("[data-live-attribute-remaining]");
    if (apRemainingNode) apRemainingNode.textContent = String(14 - ap);
    const budgets = calculateTalentBudgets(this.builderData);
    const spent = calculateTalentSpend(this.builderData);
    for (const key of GROUP_KEYS) {
      const node = this.element.querySelector(`[data-live-group-remaining="${key}"]`);
      if (!node) continue;
      const remaining = budgets[key] - spent[key];
      node.textContent = `${spent[key]} / ${budgets[key]} TP · ${remaining} übrig`;
      node.classList.toggle("is-invalid", remaining < 0);
      node.classList.toggle("is-valid", remaining >= 0);
      const budgetNode = this.element.querySelector(`[data-live-group-budget="${key}"]`);
      if (budgetNode) budgetNode.textContent = `${budgets[key]} TP`;
    }
    const totalRemaining = GROUP_KEYS.reduce((sum, key) => sum + budgets[key] - spent[key], 0);
    const specialCost = calculateSpecialAbilityCost(this.builderData);
    const specialNode = this.element.querySelector("[data-live-special-points]");
    if (specialNode) {
      specialNode.textContent = `${specialCost} / ${Math.max(0, totalRemaining)} TP`;
      specialNode.classList.toggle("is-invalid", specialCost > totalRemaining);
      specialNode.classList.toggle("is-valid", specialCost <= totalRemaining);
    }
  }

  _validateCurrentStep() {
    this._captureForm();
    if (this.step === 0) {
      if (!this.builderData.name.trim()) return this._warn("Bitte gib einen Charakternamen ein.");
      if (!this.builderData.professionCategory) return this._warn("Bitte wähle eine Berufsgruppe.");
      if (!this.builderData.profession.trim()) return this._warn("Bitte trage die konkrete Berufsbezeichnung ein.");
      if (this.builderData.professionCategory !== "unemployed" && !this.builderData.professionTalent) {
        return this._warn("Bitte wähle ein zum Beruf passendes Talent für den Berufsbonus von +5 TP.");
      }
      if (this.builderData.professionCategory === "unemployed" && this.builderData.professionTalent) {
        return this._warn("Für Arbeitslose/Schüler/Studenten ist im Berufsprofil kein berufstypisches Einzeltalent vorgesehen.");
      }
      if ((this.builderData.hobbyOne.trim() && !this.builderData.hobbyOneTalent) || (!this.builderData.hobbyOne.trim() && this.builderData.hobbyOneTalent)
        || (this.builderData.hobbyTwo.trim() && !this.builderData.hobbyTwoTalent) || (!this.builderData.hobbyTwo.trim() && this.builderData.hobbyTwoTalent)) {
        return this._warn("Für jedes Hobby müssen sowohl eine Bezeichnung als auch ein passendes Talent eingetragen sein.");
      }
      if (this.builderData.hobbyTwo.trim() && !this.builderData.hobbyOne.trim()) {
        return this._warn("Das zweite Hobby setzt ein erstes Hobby voraus.");
      }
      return true;
    }
    if (this.step === 1) {
      const base = baseAttributesForProfession(this.builderData.professionCategory);
      for (const key of ATTRIBUTE_KEYS) {
        const value = Number(this.builderData.attributes[key]);
        if (!Number.isInteger(value) || value < base[key] || value > 19) {
          return this._warn(`Der Wert für ${HOW_TO_BE_A_HERO.attributes[key].abbreviation} muss zwischen ${base[key]} und 19 liegen.`);
        }
      }
      const spend = calculateAttributeSpend(this.builderData.professionCategory, this.builderData.attributes);
      if (spend !== 14) return this._warn(`Du musst genau 14 Attribut-Steigerungspunkte verteilen. Aktuell verbraucht: ${spend}.`);
      return true;
    }
    if (this.step === 2) {
      if (!this.builderData.variableTalentGroup) return this._warn("Bitte ordne die 5 frei verteilbaren Berufspunkte einer Talentgruppe zu.");
      if (!this.builderData.positiveSpecificum) return this._warn("Bitte wähle ein positives Spezifikum.");
      if (!this.builderData.negativeSpecificum) return this._warn("Bitte wähle ein negatives Spezifikum.");
      const selectedProfessionNegative = findSpecificum(this.builderData.negativeSpecificum, "negative");
      const hobbyTalent = TEARS_DEFAULT_TALENTS.find(talent => talent.name === this.builderData.hobbyOneTalent);
      const hobbyGroup = hobbyTalent?.talentGroup ?? null;
      if (hobbyGroup && selectedProfessionNegative?.group !== hobbyGroup && !this.builderData.hobbyNegativeSpecificum) {
        return this._warn(`Dein erstes Hobby liegt in ${label(hobbyGroup)}. Wähle zusätzlich einen Nachteil aus dieser Rubrik.`);
      }
      if (this.builderData.hobbyNegativeSpecificum && findSpecificum(this.builderData.hobbyNegativeSpecificum, "negative")?.group !== hobbyGroup) {
        return this._warn("Der zusätzliche Hobby-Nachteil muss aus derselben Talentgruppe wie das erste Hobby stammen.");
      }
      if (!this._validateTalentBudgets()) return false;
      if (this.builderData.specialAbilities.motorcycleLicence && !this.builderData.specialAbilities.carLicence) {
        return this._warn("Der Motorradführerschein kostet zusätzlich 2 TP und setzt den Autoführerschein voraus.");
      }
      const budgets = calculateTalentBudgets(this.builderData);
      const spent = calculateTalentSpend(this.builderData);
      const remaining = GROUP_KEYS.reduce((sum, key) => sum + budgets[key] - spent[key], 0);
      const specialCost = calculateSpecialAbilityCost(this.builderData);
      if (specialCost > remaining) return this._warn(`Die gewählten Sonderfähigkeiten kosten ${specialCost} TP, es sind aber nur ${Math.max(0, remaining)} nicht verteilte Talentpunkte übrig.`);
      return true;
    }
    return true;
  }

  _validateTalentBudgets() {
    for (let index = 0; index < this.builderData.talentValues.length; index++) {
      const value = Number(this.builderData.talentValues[index]);
      if (!Number.isInteger(value) || value < 0) {
        return this._warn(`Der Talentwert für „${TEARS_DEFAULT_TALENTS[index]?.name ?? `Talent ${index + 1}`}“ muss eine nichtnegative ganze Zahl sein.`);
      }
    }
    const budgets = calculateTalentBudgets(this.builderData);
    const spent = calculateTalentSpend(this.builderData);
    for (const key of GROUP_KEYS) {
      if (spent[key] > budgets[key]) {
        return this._warn(`${label(key)}: ${spent[key]} TP ausgegeben, aber nur ${budgets[key]} TP vorhanden.`);
      }
    }
    return true;
  }

  _warn(message) {
    ui.notifications.warn(message);
    return false;
  }

  _onCancel() { this.close(); }

  _onPrevious(event) {
    event?.preventDefault?.();
    this._captureForm();
    this.step = Math.max(0, this.step - 1);
    this.render(true);
  }

  _onNext(event) {
    event?.preventDefault?.();
    if (!this._validateCurrentStep()) return;
    this.step = Math.min(3, this.step + 1);
    this.render(true);
  }

  _onFormSubmit(event) {
    event?.preventDefault?.();
    if (this.step < 3) return this._onNext(event);
    return this._onCreateCharacter(event);
  }

  async _onCreateCharacter(event) {
    event?.preventDefault?.();
    this._captureForm();
    for (let step = 0; step <= 2; step++) {
      const oldStep = this.step;
      this.step = step;
      const valid = this._validateCurrentStep();
      this.step = oldStep;
      if (!valid) {
        this.step = step;
        this.render(true);
        return;
      }
    }

    const createButton = this.element?.querySelector('[data-action="create"]');
    if (createButton) createButton.disabled = true;
    try {
      const attributes = { ...this.builderData.attributes };
      const lifeEnergy = (attributes.kk + attributes.kk + attributes.au) * 3;
      const mentalHealth = (attributes.au + attributes.in + attributes.mb + attributes.mb) * 3;
      const talentPools = calculateTalentBudgets(this.builderData);
      const hobbyBonusByTalent = new Map();
      const professionBonusByTalent = new Map();
      if (this.builderData.professionCategory !== "unemployed" && this.builderData.professionTalent) professionBonusByTalent.set(this.builderData.professionTalent, 5);
      if (this.builderData.hobbyOneTalent) hobbyBonusByTalent.set(this.builderData.hobbyOneTalent, (hobbyBonusByTalent.get(this.builderData.hobbyOneTalent) ?? 0) + 5);
      if (this.builderData.hobbyTwoTalent) hobbyBonusByTalent.set(this.builderData.hobbyTwoTalent, (hobbyBonusByTalent.get(this.builderData.hobbyTwoTalent) ?? 0) + 3);
      const specialAbilityNames = TEARS_SPECIAL_ABILITIES.filter(option => this.builderData.specialAbilities[option.key]).map(option => option.name);
      const specialAbilityPointsSpent = calculateSpecialAbilityCost(this.builderData);

      const actor = await Actor.create({
        name: this.builderData.name.trim(),
        type: "character",
        img: "icons/svg/mystery-man.svg",
        system: {
          attributes: {
            ...attributes,
            health: { value: lifeEnergy, max: lifeEnergy, temp: 0, tempmax: 0 },
            mentalHealth: { value: mentalHealth, max: mentalHealth }
          },
          talentPools,
          details: {
            profession: this.builderData.profession.trim(),
            professionTalent: this.builderData.professionTalent,
            professionCategory: this.builderData.professionCategory,
            hobbyOne: this.builderData.hobbyOne.trim(),
            hobbyOneTalent: this.builderData.hobbyOneTalent,
            hobbyTwo: this.builderData.hobbyTwo.trim(),
            hobbyTwoTalent: this.builderData.hobbyTwoTalent,
            variableTalentGroup: this.builderData.variableTalentGroup,
            positiveSpecificum: this.builderData.positiveSpecificum,
            negativeSpecificum: this.builderData.negativeSpecificum,
            hobbyNegativeSpecificum: this.builderData.hobbyNegativeSpecificum,
            specialAbilities: specialAbilityNames.join("; "),
            specialAbilityPointsSpent,
            builderVersion: "0.1.8"
          }
        }
      });
      if (!actor) throw new Error("Foundry hat keinen Charakter zurückgegeben.");

      // Ensure all 50 rulebook talents exist, including on worlds that imported older actors.
      const existingNames = new Set(actor.items.filter(item => item.type === "ability").map(item => item.name));
      const missingTalents = TEARS_DEFAULT_TALENTS.filter(talent => !existingNames.has(talent.name)).map(talent => ({
        name: talent.name,
        type: "ability",
        img: "icons/svg/d20-grey.svg",
        system: {
          description: "",
          talentGroup: talent.talentGroup,
          attribute1: talent.attribute1,
          attribute2: talent.attribute2,
          attribute3: talent.attribute3,
          isWeaponTalent: talent.isWeaponTalent,
          value: 0,
          hobbyBonus: 0,
          professionBonus: 0,
          formula: talent.isWeaponTalent ? "" : "3d20"
        }
      }));
      if (missingTalents.length) await actor.createEmbeddedDocuments("Item", missingTalents);

      const updates = [];
      for (let index = 0; index < TEARS_DEFAULT_TALENTS.length; index++) {
        const definition = TEARS_DEFAULT_TALENTS[index];
        const item = actor.items.find(entry => entry.type === "ability" && entry.name === definition.name);
        if (!item) continue;
        updates.push({
          _id: item.id,
          "system.value": Math.max(0, Number(this.builderData.talentValues[index]) || 0),
          "system.hobbyBonus": hobbyBonusByTalent.get(definition.name) ?? 0,
          "system.professionBonus": professionBonusByTalent.get(definition.name) ?? 0
        });
      }
      if (updates.length) await actor.updateEmbeddedDocuments("Item", updates);
      await actor.update({
        "system.attributes.health.value": lifeEnergy,
        "system.attributes.mentalHealth.value": mentalHealth
      });

      this.close();
      actor.sheet?.render(true);
      ui.notifications.info(`T.E.A.R.S.-Charakter „${actor.name}“ wurde nach dem Regelwerk erstellt.`);
    } catch (error) {
      console.error("T.E.A.R.S. | Character Builder failed:", error);
      ui.notifications.error(`Charakter konnte nicht erstellt werden: ${error.message}`);
      if (createButton) createButton.disabled = false;
    }
  }
}

/** Open the guided builder in a viewport-fitted window. */
let activeTearsCharacterBuilder = null;
function openTearsCharacterBuilder() {
  try {
    if (activeTearsCharacterBuilder?.element?.isConnected) {
      activeTearsCharacterBuilder.bringToTop?.();
      activeTearsCharacterBuilder.element?.focus?.();
      return activeTearsCharacterBuilder;
    }
    activeTearsCharacterBuilder = new TearsCharacterBuilder();
    const app = activeTearsCharacterBuilder;
    const renderResult = app.render(true);
    Promise.resolve(renderResult).catch(error => {
      console.error("T.E.A.R.S. | Character builder could not be opened:", error);
      ui.notifications.error(`T.E.A.R.S.-Charaktereditor konnte nicht geöffnet werden: ${error.message}`);
      if (activeTearsCharacterBuilder === app) activeTearsCharacterBuilder = null;
    });
    return app;
  } catch (error) {
    console.error("T.E.A.R.S. | Character builder launch failed:", error);
    ui.notifications.error(`T.E.A.R.S.-Charaktereditor konnte nicht geöffnet werden: ${error.message}`);
    activeTearsCharacterBuilder = null;
    return null;
  }
}

/**
 * Add a dedicated rulebook builder button to the Actors directory. The native
 * plus button is also routed to the builder, so either entry point works.
 */
export function installTearsCharacterBuilder() {
  if (document.documentElement.dataset.tearsBuilderClickRouting !== "true") {
    document.documentElement.dataset.tearsBuilderClickRouting = "true";
    document.addEventListener("click", event => {
      const elementTarget = event.target instanceof Element ? event.target : null;
      const launch = elementTarget?.closest("[data-tears-builder-launch='true']");
      if (launch) {
        event.preventDefault();
        event.stopPropagation();
        openTearsCharacterBuilder();
        return;
      }
      const nativeCreate = elementTarget?.closest(
        "#actors .directory-header .create-entity, #actors .directory-header .create-button, #actors .directory-header button[data-action='create'], #actors .directory-header button[data-action='createDocument'], #actors .directory-header [data-action='create']"
      );
      if (!nativeCreate) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      openTearsCharacterBuilder();
    }, true);
  }

  const addBuilderAction = (app, html) => {
    const htmlRoot = html instanceof HTMLElement ? html : html?.[0] instanceof HTMLElement ? html[0] : null;
    const roots = [
      htmlRoot?.id === "actors" ? htmlRoot : null,
      htmlRoot?.querySelector?.("#actors"),
      document.querySelector("#actors"),
      app?.element
    ].filter(element => element instanceof HTMLElement);
    const directory = roots.find(element => element.id === "actors") ?? roots.find(element => element.querySelector(".directory-header"));
    if (!directory || directory.querySelector("[data-tears-builder-launch='true']")) return;

    const header = directory.querySelector(".directory-header .header-actions")
      ?? directory.querySelector(".directory-header .header-control")
      ?? directory.querySelector(".directory-header")
      ?? directory.querySelector(".directory-header-actions")
      ?? directory.querySelector(".window-content");
    if (!header) return;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "tears-builder-launch";
    button.dataset.tearsBuilderLaunch = "true";
    button.title = "Geführte Charaktererschaffung nach dem T.E.A.R.S.-Regelwerk öffnen";
    button.setAttribute("aria-label", "T.E.A.R.S.-Charaktereditor öffnen");
    button.innerHTML = '<i class="fas fa-user-plus" aria-hidden="true"></i><span>Charakter erstellen</span>';
    header.prepend(button);

    directory.querySelectorAll(".directory-header .create-entity, .directory-header .create-button, .directory-header button[data-action='create']").forEach(nativeButton => {
      nativeButton.title = "Öffnet den T.E.A.R.S.-Charakter-Builder";
      nativeButton.setAttribute("aria-label", "T.E.A.R.S.-Charakter-Builder öffnen");
    });
  };

  // Foundry's Actors directory has used both hook names across major releases.
  Hooks.on("renderActorDirectory", addBuilderAction);
  Hooks.on("renderActorDirectoryV2", addBuilderAction);
  addBuilderAction(null, document.querySelector("#actors"));

  // The directory can be mounted lazily when its sidebar tab is first opened.
  if (!document.documentElement.dataset.tearsBuilderObserver) {
    document.documentElement.dataset.tearsBuilderObserver = "true";
    const observer = new MutationObserver(() => addBuilderAction(null, document.querySelector("#actors")));
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (game.tears) {
    game.tears.openCharacterBuilder = openTearsCharacterBuilder;
    game.tears.characterBuilder = () => openTearsCharacterBuilder();
  }
}

export { attributeCost, calculateAttributeSpend, calculateTalentBudgets, calculateTalentSpend };
