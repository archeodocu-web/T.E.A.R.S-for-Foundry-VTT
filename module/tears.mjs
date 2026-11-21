// HowToBeAHero v0.1 — Foundry initialization, based on the HTBAH architecture.

// Import document classes.
import { HowToBeAHeroActor } from './documents/actor.mjs';
import { HowToBeAHeroItem } from './documents/item.mjs';
import { HowToBeAHeroActiveEffect } from './documents/active-effect.mjs';
import { TearsCombat } from './documents/combat.mjs';
// Import sheet classes.
import { HowToBeAHeroActorSheet } from './sheets/actor-sheet.mjs'
import { HowToBeAHeroItemSheet } from './sheets/item-sheet.mjs';
// Import manager classes
import { conditionManager } from './managers/condition-manager.mjs';
import { effectsManager } from './managers/effects-manager.mjs';
// Import helper/utility classes and constants.
import { preloadHandlebarsTemplates } from './helpers/templates.mjs';
import { registerHandlebarsHelpers } from './helpers/utils.mjs';
import { Tooltips } from './helpers/tooltips.mjs';
import { HOW_TO_BE_A_HERO, SYSTEM_ID } from './helpers/config.mjs';
import { registerSystemSettings, enforceDarkMode } from './helpers/settings.mjs';
import { registerDamageApplicationContextMenu } from "./helpers/damage-application.mjs";
import { installTearsCharacterBuilder } from "./apps/character-builder.mjs";

// Register chat context hooks at module load, before the core ChatLog builds
// its ApplicationV2 context menu during startup.
registerDamageApplicationContextMenu();
// Import DataModel classes
import * as models from './data/_module.mjs';
// Import Dice class
import { D10Roll } from './dice/rolls.mjs';
// Import Html custom element classes with enhanced AppV2 support
import * as element from './components/_module.mjs';
import { initializeCustomElements, upgradeExistingElements } from './components/_module.mjs';

var _module$c = /*#__PURE__*/Object.freeze({
  __proto__: null,
  SlideToggleElement: element.config.slidetoggle,
  IconElement: element.config.icon,
  FiligreeBoxElement: element.config.filigree,
  EffectsElement: element.config.effects,
  InventoryElement: element.config.inventory,
  ItemListControlsElement: element.config.itemlistcontrol
});

/* -------------------------------------------- */
/*  Init Hook                                   */
/* -------------------------------------------- */

Hooks.once('init', function () {

  // Add utility classes to the global game object so that they're more easily
  // accessible in global contexts.
  game.tears = {
    HowToBeAHeroActor,
    HowToBeAHeroItem,
    HowToBeAHeroActiveEffect,
    rollItemMacro: async (itemUuid) => {
      const item = await fromUuid(itemUuid);
      if (!item) {
        return ui.notifications.warn(game.i18n.localize("HTBAH.MacroItemNotFound"));
      }
      return item.roll();
    },
    rollAbilityMacro: async (itemUuid) => {
      const item = await fromUuid(itemUuid);
      if (!item || item.type !== 'ability') {
        return ui.notifications.warn(game.i18n.format("HTBAH.MacroItemMissing", {item: itemUuid}));
      }
      return item.roll();
    },
  };

  //Add managers  
  game.tears.managers = {
    effects: new effectsManager(),
    conditions: new conditionManager()
  }
  // Set the condition manager for the effects manager
  game.tears.managers.effects.setConditionManager(game.tears.managers.conditions);

  // Initialize custom elements early with enhanced error handling
  try {
    const customElementResults = initializeCustomElements();
    game.tears.customElements = {
      status: customElementResults,
      upgrade: upgradeExistingElements
    };
    
    // Report initialization status
    const successful = Object.values(customElementResults).filter(r => r.success).length;
    const total = Object.keys(customElementResults).length;
    console.log(`HowToBeAHero | Custom elements initialized: ${successful}/${total} successful`);
    
    if (successful < total) {
      console.warn("HowToBeAHero | Some custom elements failed - fallbacks will be used");
    }
  } catch (error) {
    console.error("HowToBeAHero | Critical error initializing custom elements:", error);
    game.tears.customElements = { status: {}, upgrade: () => {} };
  }
  
  // Add custom constants for configuration.
  CONFIG.TEARS = HOW_TO_BE_A_HERO;

  // Set default token configuration for different actor types
  CONFIG.Actor.defaultTypes = ["character", "npc"];
  
  // Set default token configuration for all actor types
  CONFIG.Actor.prototypeToken = {
    actorLink: true,  // Changed from false to true to ensure all tokens are linked by default
    displayName: CONST.TOKEN_DISPLAY_MODES.OWNER_HOVER,
    displayBars: CONST.TOKEN_DISPLAY_MODES.OWNER_HOVER,
    disposition: CONST.TOKEN_DISPOSITIONS.NEUTRAL,
    bar1: { attribute: "attributes.health" },
    bar2: { attribute: "attributes.mentalHealth" }
  };

  // Set type-specific prototype token settings
  CONFIG.Actor.typeDefaults = {
    character: {
      prototypeToken: {
        actorLink: true,
        disposition: CONST.TOKEN_DISPOSITIONS.FRIENDLY,
        displayName: CONST.TOKEN_DISPLAY_MODES.OWNER_HOVER,
        displayBars: CONST.TOKEN_DISPLAY_MODES.OWNER_HOVER
      }
    },
    npc: {
      prototypeToken: {
        actorLink: true,
        disposition: CONST.TOKEN_DISPOSITIONS.NEUTRAL,
        displayName: CONST.TOKEN_DISPLAY_MODES.HOVER,
        displayBars: CONST.TOKEN_DISPLAY_MODES.OWNER_HOVER
      }
    }
  };

  /**
   * Set an initiative formula for the system
   * @type {String}
   */
  CONFIG.Combat.initiative = {
    formula: '@combatData.initiative',
    decimals: 2,
  };

  // Define custom Document and DataModel classes
  CONFIG.Combat.documentClass = TearsCombat;
  CONFIG.Actor.documentClass = HowToBeAHeroActor;
  CONFIG.Actor.dataModels = {
    character: models.HowToBeAHeroCharacter,
    npc: models.HowToBeAHeroNPC
  }
  CONFIG.Item.documentClass = HowToBeAHeroItem;
  CONFIG.Item.dataModels = {
    item: models.HowToBeAHeroItem,
    consumable: models.HowToBeAHeroConsumable,
    weapon: models.HowToBeAHeroWeapon,
    armor: models.HowToBeAHeroArmor,
    tool: models.HowToBeAHeroTool,
    ability: models.HowToBeAHeroAbility,
    magic: models.HowToBeAHeroMagic
  }
  CONFIG.Item.typeLabels ??= {};
  CONFIG.Item.typeLabels.magic = "HTBAH.MagicAbility";
  CONFIG.Item.typeLabels.ability = "TEARS.Talents.Talent";
  CONFIG.Item.typeLabels.weapon = "TEARS.Combat.Weapon";
  
  // Verify that all data models are defined
  for (let [key, model] of Object.entries(CONFIG.Actor.dataModels)) {
    if (!model) console.error(`Actor data model for "${key}" is not defined.`);
  }
  for (let [key, model] of Object.entries(CONFIG.Item.dataModels)) {
    if (!model) console.error(`Item data model for "${key}" is not defined.`);
  }

  CONFIG.Dice.D10Roll = D10Roll;
  
  // Register the retained HTBAH damage die. HowToBeAHero checks use the core W20.
  CONFIG.Dice.rolls.push(D10Roll);

  // Initialize tooltips
  game.tears.tooltips = new Tooltips();
  game.tears.tooltips.observe();

  // Activate tooltip listeners
  Tooltips.activateListeners();

  // Register sheet application classes
  foundry.documents.collections.Actors.unregisterSheet('core', foundry.appv1.sheets.ActorSheet);
  foundry.documents.collections.Actors.registerSheet('tears', HowToBeAHeroActorSheet, {
    makeDefault: true,
    label: 'TEARS.SheetLabels.Actor',
  });
  foundry.documents.collections.Items.unregisterSheet('core', foundry.appv1.sheets.ItemSheet);
  foundry.documents.collections.Items.registerSheet('tears', HowToBeAHeroItemSheet, {
    makeDefault: true,
    label: 'TEARS.SheetLabels.Item',
  });

  // Register system settings
  game.settings.register("tears", "showManaBar", {
    name: "TEARS.Settings.ShowManaBar.Name",
    hint: "TEARS.Settings.ShowManaBar.Hint",
    scope: "world",
    config: false,
    type: Boolean,
    default: false
  });

  game.settings.register("tears", "showEureka", {
    name: "TEARS.Settings.ShowEureka.Name",
    hint: "TEARS.Settings.ShowEureka.Hint",
    scope: "world",
    config: false,
    type: Boolean,
    default: false
  });

  // Register additional system settings
  registerSystemSettings();

  // Preload Handlebars helpers & partials
  preloadHandlebarsTemplates();
  registerHandlebarsHelpers();
  
  console.log("HowToBeAHero | System initialization completed");
});

// Enhanced Handlebars helpers for AppV2
Handlebars.registerHelper('toLowerCase', function (str) {
  return str.toLowerCase();
});

Handlebars.registerHelper('HTBAH-dataset', function(dataset) {
  return Object.entries(dataset || {}).map(([k, v]) => `data-${k}="${v}"`).join(" ");
});

// Enhanced helpers for AppV2 compatibility
Handlebars.registerHelper('eq', function (a, b) {
  return a === b;
});

Handlebars.registerHelper('filterJoin', function(array, separator) {
  if (!Array.isArray(array)) return '';
  return array.filter(Boolean).join(separator || ' ');
});

Handlebars.registerHelper('localize', function(key) {
  // Templates sometimes localize optional labels that are absent for legacy or custom entries.
  // Return an empty string for an absent key rather than logging a warning on every render.
  if (key === undefined || key === null || key === '') return '';
  // Handle different key formats.
  let localizationKey;
  if (typeof key === 'string') localizationKey = key;
  else if (key && typeof key === 'object' && key.string) localizationKey = key.string;
  else {
    console.warn('HowToBeAHero | Invalid localization key:', key);
    return key || '';
  }

  if (!localizationKey) return '';

  const localized = game.i18n.localize(localizationKey);
  // Foundry returns the key itself when a translation is unavailable. Older
  // HTBAH language packs contain a mix of key casing; resolve those case-
  // insensitively before falling back to a clean label.
  if (localized && localized !== localizationKey && !/^HTBAH\./i.test(localized)) return localized;

  if (/^HTBAH\./i.test(localizationKey)) {
    const normalizedKey = localizationKey.toLocaleLowerCase();
    const findCaseInsensitive = (node, prefix = '') => {
      if (!node || typeof node !== 'object') return undefined;
      for (const [part, value] of Object.entries(node)) {
        const fullKey = prefix ? `${prefix}.${part}` : part;
        if (typeof value === 'string' && fullKey.toLocaleLowerCase() === normalizedKey) return value;
        if (value && typeof value === 'object') {
          const nested = findCaseInsensitive(value, fullKey);
          if (nested !== undefined) return nested;
        }
      }
      return undefined;
    };

    const alternate = findCaseInsensitive(game.i18n.translations);
    if (alternate && !/^HTBAH\./i.test(alternate)) return alternate;

    const german = String(game.i18n.lang || '').toLowerCase().startsWith('de');
    const fallbackLabels = {
      'htbah.initiative': ['Initiative', 'Initiative'],
      'htbah.skill': ['Fähigkeit', 'Skill'],
      'htbah.weapon': ['Waffe', 'Weapon'],
      'htbah.parry': ['Parade', 'Parry'],
      'htbah.skilldrop': ['Fähigkeit ablegen', 'Drop Skill'],
      'htbah.weapondrop': ['Waffe ablegen', 'Drop Weapon'],
      'htbah.hitpoints': ['Lebenspunkte', 'Hit Points'],
      'htbah.manapoints': ['Manapunkte', 'Mana Points'],
      'htbah.favorites': ['Favoriten', 'Favorites'],
      'htbah.newaction': ['Neue Handlung', 'New Action'],
      'htbah.newknowledge': ['Neues Wissen', 'New Knowledge'],
      'htbah.newsocial': ['Neue soziale Fähigkeit', 'New Social']
    };
    const known = fallbackLabels[normalizedKey];
    if (known) return known[german ? 0 : 1];

    // Never expose the internal HTBAH namespace to players. Keep unknown labels
    // readable by removing the prefix and splitting camel-case identifiers.
    return localizationKey.replace(/^HTBAH\./i, '')
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2')
      .replace(/[._]/g, ' ')
      .trim();
  }

  return localized || localizationKey;
});

Handlebars.registerHelper('numberFormat', function(number, options = {}) {
  return new Intl.NumberFormat(game.i18n.lang, options.hash || {}).format(number);
});

Handlebars.registerHelper('gt', function (a, b) {
  return a > b;
});

Handlebars.registerHelper('lt', function (a, b) {
  return a < b;
});

Handlebars.registerHelper('and', function (a, b) {
  return a && b;
});

Handlebars.registerHelper('or', function (a, b) {
  return a || b;
});

Handlebars.registerHelper('not', function (a) {
  return !a;
});

// Helper for safe property access
Handlebars.registerHelper('safe', function(obj, path) {
  if (!obj || !path) return '';
  return path.split('.').reduce((o, p) => o && o[p], obj) || '';
});

// Helper for conditional classes
Handlebars.registerHelper('addClass', function(condition, className) {
  return condition ? className : '';
});

// Helper for debug output in development
Handlebars.registerHelper('debug', function(obj) {
  if (game.settings.get('core', 'noCanvas')) {
    console.log('Handlebars Debug:', obj);
  }
  return '';
});

/* -------------------------------------------- */
/*  Ready Hook                                  */
/* -------------------------------------------- */

Hooks.once('ready', async function () {
  console.log("HowToBeAHero | System ready - setting up final configurations");

  // Enforce dark mode if the setting is enabled
  if (game.settings.get("tears", "forceDarkMode")) {
    enforceDarkMode();
    
    // Set up continuous monitoring to prevent light mode
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes') {
          const target = mutation.target;
          const forceDarkMode = game.settings.get("tears", "forceDarkMode");
          
          if (forceDarkMode) {
            // Check if light mode was set and revert it
            if (target.getAttribute('data-color-scheme') === 'light' || 
                target.classList.contains('light')) {
              console.log("HowToBeAHero | Light mode detected - reverting to dark mode");
              enforceDarkMode();
            }
          }
        }
      });
    });
    
    // Observe document changes
    observer.observe(document.documentElement, { 
      attributes: true, 
      attributeFilter: ['data-color-scheme', 'class'] 
    });
    observer.observe(document.body, { 
      attributes: true, 
      attributeFilter: ['data-color-scheme', 'class'] 
    });
  }

  // Enhanced hotbar handling
  Hooks.on('hotbarDrop', (bar, data, slot) => {
    if (data.type === 'Item') {
      createItemMacro(data, slot);
      return false;
    }
  }, { priority: -1 }); // Lower priority to run first

  Hooks.on("preCreateToken", (document, data, options, userId) => {
    // Force actorLink to true for all new tokens
    document.updateSource({actorLink: true});
  });

  // Enhanced item update hook with error handling
  Hooks.on("updateItem", (item, changes, options, userId) => {
    try {
      if (item instanceof CONFIG.Item.dataModels.armor && "system.equipped" in changes) {
        if (item.parent instanceof CONFIG.Actor.dataModels.character) {
          item.parent.prepareData();
        }
      }
    } catch (error) {
      console.warn("HowToBeAHero | Error in updateItem hook:", error);
    }
  });
  
  // Register conditions
  game.tears.managers.conditions.registerAllConditions();

  // Migrate existing condition effects so their icons are visible on Tokens in Foundry V14.
  // Older effects may have been created without an explicit showIcon setting.
  const conditionActors = new Set(game.actors.contents);
  for (const scene of game.scenes.contents) {
    for (const tokenDocument of scene.tokens) {
      if (!tokenDocument.actorLink && tokenDocument.actor) conditionActors.add(tokenDocument.actor);
    }
  }

  for (const actor of conditionActors) {
    for (const effect of actor.effects) {
      const effectFlags = effect.flags?.[SYSTEM_ID] ?? effect.flags?.htbah;
      if (!effectFlags?.isCondition) continue;

      const condition = game.tears.managers.conditions.getConditionData(effectFlags.conditionId);
      const icon = effect.img || effect.icon || condition?.icon;
      const updateData = {};

      // Foundry V14 uses img and showIcon; V13 continues to use the legacy icon field.
      if ("img" in effect && !effect.img && icon) updateData.img = icon;
      if ("showIcon" in effect && effect.showIcon !== CONST.ACTIVE_EFFECT_SHOW_ICON.ALWAYS) {
        updateData.showIcon = CONST.ACTIVE_EFFECT_SHOW_ICON.ALWAYS;
      }

      if (Object.keys(updateData).length) {
        try {
          await effect.update(updateData);
        } catch (error) {
          console.warn(`HowToBeAHero | Could not migrate token icon for condition ${effect.name}:`, error);
        }
      }
    }
  }

  // Set up enhanced sheet context for custom elements
  Hooks.on('renderHowToBeAHeroActorSheet', (sheet, html) => {
    try {
      // Store sheet reference on the element for custom elements to access
      if (html instanceof HTMLElement) {
        html._sheet = sheet;
        
        // Upgrade any custom elements in the rendered content
        if (game.tears.customElements?.upgrade) {
          setTimeout(() => {
            game.tears.customElements.upgrade(html);
          }, 0);
        }
      }
    } catch (error) {
      console.warn("HowToBeAHero | Error setting up sheet context:", error);
    }
  });

  // Enhanced error handling for sheet renders
  Hooks.on('renderActorSheet', (sheet, html, data) => {
    if (sheet instanceof HowToBeAHeroActorSheet) {
      try {
        // Ensure custom elements have proper context
        if (html instanceof HTMLElement) {
          html._sheet = sheet;
        }
      } catch (error) {
        console.warn("HowToBeAHero | Error in renderActorSheet hook:", error);
      }
    }
  });

  installTearsCharacterBuilder();
  console.log("T.E.A.R.S. | System fully ready and character builder registered");
});

/* -------------------------------------------- */
/*  Hotbar Macros - Enhanced for AppV2         */
/* -------------------------------------------- */

/**
 * Create a Macro from an Item drop.
 * @param {Object} data     The dropped data
 * @param {number} slot     The hotbar slot to use
 * @returns {Promise<boolean>}
 */
async function createItemMacro(data, slot) {
  if (data.type !== 'Item') return true;
  
  try {
    event.preventDefault(); // Prevent default handling
    
    const item = await fromUuid(data.uuid);
    if (!item) return false;

    let command;
    switch (item.type) {
      case 'ability':
        command = `game.tears.rollAbilityMacro("${data.uuid}");`;
        break;
      default:
        command = `game.tears.rollItemMacro("${data.uuid}");`;
    }

    let macro = game.macros.find(m => (m.name === item.name) && (m.command === command));
    if (!macro) {
      macro = await Macro.create({
        name: item.name,
        type: 'script',
        img: item.img,
        command: command,
        flags: { 
          'tears': {
            itemMacro: true,
            itemType: item.type,
            itemId: data.uuid
          }
        }
      });
    }
    
    if (macro) {
      await game.user.assignHotbarMacro(macro, slot);
    }
    
    return false;
  } catch (error) {
    console.error("HowToBeAHero | Error creating item macro:", error);
    ui.notifications.error("Failed to create macro. Check console for details.");
    return false;
  }
}

/**
 * Execute a macro from an Item.
 * @param {string} itemUuid
 */
async function rollItemMacro(itemUuid) {
  try {
    const item = await fromUuid(itemUuid);
    if (!item) {
      return ui.notifications.warn(game.i18n.localize("HTBAH.MacroItemNotFound"));
    }

    if (!item.parent) {
      const actor = _getMacroSpeaker();
      if (!actor) return ui.notifications.warn(game.i18n.localize("HTBAH.MacroNoActor"));
      return;
    }

    return item.roll();
  } catch (error) {
    console.error("HowToBeAHero | Error executing item macro:", error);
    ui.notifications.error("Failed to execute macro. Check console for details.");
  }
}

/**
 * Execute a macro for an ability item.
 * @param {string} itemUuid
 */
async function rollAbilityMacro(itemUuid) {
  try {
    const item = await fromUuid(itemUuid);
    if (!item || item.type !== 'ability') {
      return ui.notifications.warn(game.i18n.format("HTBAH.MacroItemMissing", {item: itemUuid}));
    }
    return item.roll();
  } catch (error) {
    console.error("HowToBeAHero | Error executing ability macro:", error);
    ui.notifications.error("Failed to execute ability macro. Check console for details.");
  }
}

/**
 * Get the actor for macro execution context
 * @returns {Actor|null}
 * @private
 */
function _getMacroSpeaker() {
  const speaker = ChatMessage.getSpeaker();
  let actor;
  if (speaker.token) actor = game.actors.tokens[speaker.token];
  if (!actor) actor = game.actors.get(speaker.actor);
  return actor;
}

/** Convert initiative values saved by versions <= 0.1.11. Those versions
 * stored -INI only to reverse Foundry sorting; T.E.A.R.S. now stores real INI.
 */
async function migrateLegacyTearsInitiativeValues() {
  let migrated = 0;
  for (const combat of game.combats ?? []) {
    const currentCombatantId = combat.turns?.[combat.turn]?.id ?? null;
    for (const combatant of combat.combatants ?? []) {
      const isTearsActor = combatant.actor?.system?.attributes
        && (combatant.actor.type === 'character' || combatant.actor.type === 'npc');
      const oldValue = Number(combatant.initiative);
      if (!isTearsActor || !Number.isFinite(oldValue) || oldValue >= 0) continue;
      await combatant.update({ initiative: Math.abs(oldValue) });
      migrated += 1;
    }
    if (currentCombatantId) {
      const nextTurns = combat.setupTurns();
      const nextTurn = nextTurns.findIndex(turn => turn.id === currentCombatantId);
      if (nextTurn >= 0 && nextTurn !== combat.turn) await combat.update({ turn: nextTurn });
    }
  }
  if (migrated) console.info(`T.E.A.R.S. | ${migrated} alte negative INI-Werte in positive T.E.A.R.S.-Werte umgewandelt.`);
}

Hooks.once('ready', () => migrateLegacyTearsInitiativeValues().catch(error => {
  console.error('T.E.A.R.S. | Initiative-Migration fehlgeschlagen:', error);
}));
