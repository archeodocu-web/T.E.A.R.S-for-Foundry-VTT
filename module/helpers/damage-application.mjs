import { SYSTEM_ID } from "./config.mjs";

let activeDamageMenu = null;
const messageListenerControllers = new WeakMap();
const applyingMagicEffectMessages = new Set();

/**
 * Read message flags using the system's manifest id. The legacy key is read
 * without Document#getFlag so an unregistered scope cannot throw in Foundry.
 */
function getSystemMessageFlags(message) {
  const flags = message?.flags ?? message?._source?.flags ?? {};
  return flags[SYSTEM_ID] ?? flags.howtobeahero ?? {};
}

/** Return the final damage amount stored on a weapon/damage ChatMessage. */
function getDamageAmount(message) {
  if (!message) return null;

  const flags = getSystemMessageFlags(message);
  const damageFlag = flags.damage;
  const flaggedAmount = Number(damageFlag?.amount);
  if (damageFlag?.amount !== undefined && Number.isFinite(flaggedAmount) && flaggedAmount >= 0) {
    return flaggedAmount;
  }

  const rollFlag = flags.roll;
  if (rollFlag?.type === "damage") {
    const total = Number(message.rolls?.[0]?.total);
    if (Number.isFinite(total) && total >= 0) return total;
  }

  // Compatibility with older weapon cards that printed the amount but did
  // not store structured damage flags.
  const content = typeof message.content === "string" ? message.content : "";
  if (/class=["'][^"']*\bhtbah-weapon-roll\b[^"']*["']/i.test(content)) {
    const match = content.match(/<h2\b[^>]*>\s*([0-9]+(?:[.,][0-9]+)?)\s+Damage\b/i);
    if (match) {
      const amount = Number(match[1].replace(",", "."));
      if (Number.isFinite(amount) && amount >= 0) return amount;
    }
  }

  return null;
}

function getStoredTargetActorUuids(message) {
  const flags = getSystemMessageFlags(message);
  const uuids = flags.damage?.targetActorUuids ?? flags.roll?.data?.targetActorUuids;
  return Array.isArray(uuids)
    ? [...new Set(uuids.filter(uuid => typeof uuid === "string" && uuid.length > 0))]
    : [];
}

async function getTargetActors(message) {
  const storedUuids = getStoredTargetActorUuids(message);
  if (storedUuids.length) {
    const documents = await Promise.all(storedUuids.map(async uuid => {
      try {
        return await fromUuid(uuid);
      } catch (error) {
        console.warn(`HowToBeAHero | Could not resolve saved damage target ${uuid}`, error);
        return null;
      }
    }));
    return [...new Map(documents.filter(document => document?.documentName === "Actor")
      .map(actor => [actor.uuid, actor])).values()];
  }

  // Legacy messages without a stored target use the currently T-targeted tokens.
  const actors = Array.from(game.user?.targets ?? [])
    .map(token => token?.actor)
    .filter(Boolean);
  return [...new Map(actors.map(actor => [actor.uuid, actor])).values()];
}

async function applyDamageFromMessage(message) {
  const damage = getDamageAmount(message);
  if (damage === null) {
    ui.notifications.warn(game.i18n.localize("HTBAH.ApplyDamageInvalidMessage"));
    return;
  }

  const targets = await getTargetActors(message);
  if (targets.length === 0) {
    ui.notifications.warn(game.i18n.localize("HTBAH.ApplyDamageNoTarget"));
    return;
  }
  if (targets.length > 1) {
    ui.notifications.warn(game.i18n.localize("HTBAH.ApplyDamageOneTarget"));
    return;
  }

  const actor = targets[0];
  if (!game.user.isGM && !actor.isOwner) {
    ui.notifications.warn(game.i18n.localize("HTBAH.ApplyDamageNoPermission"));
    return;
  }

  const currentHP = Number(actor.system?.attributes?.health?.value);
  if (!Number.isFinite(currentHP)) {
    ui.notifications.error(game.i18n.localize("HTBAH.ApplyDamageNoHealth"));
    return;
  }

  // _prepareArmorClass() totals equipped armor pieces into armorData.total.
  // The system attribute is also read for NPCs/manual armor values.
  const calculatedArmor = Number(actor.armorData?.total);
  const storedArmor = Number(actor.system?.attributes?.armor?.value);
  const armor = Math.max(
    0,
    Number.isFinite(calculatedArmor) ? calculatedArmor : 0,
    Number.isFinite(storedArmor) ? storedArmor : 0
  );

  const rawDamage = Math.max(0, Math.round(damage));
  const appliedDamage = Math.max(0, rawDamage - armor);
  const newHP = Math.max(0, currentHP - appliedDamage);
  const escapedActorName = Handlebars.escapeExpression(actor.name);
  const escapedSource = Handlebars.escapeExpression(message.flavor || game.i18n.localize("HTBAH.Damage"));

  const confirmed = await foundry.applications.api.DialogV2.confirm({
    window: { title: game.i18n.localize("HTBAH.ApplyDamageTitle") },
    content: `
      <p><strong>${escapedActorName}</strong></p>
      <p>${game.i18n.localize("HTBAH.ApplyDamageIncoming")}: <strong>${rawDamage}</strong></p>
      <p>${game.i18n.localize("HTBAH.ApplyDamageArmor")}: <strong>${armor}</strong></p>
      <hr>
      <p>${game.i18n.localize("HTBAH.ApplyDamageFinal")}: <strong>${appliedDamage}</strong></p>
      <p>${game.i18n.localize("HTBAH.ApplyDamageHealth")}: ${currentHP} → <strong>${newHP}</strong></p>
      <small>${escapedSource}</small>
    `,
    yes: { label: game.i18n.localize("HTBAH.ApplyDamageConfirm") },
    no: { label: game.i18n.localize("HTBAH.Cancel") },
    rejectClose: false
  });

  if (confirmed !== true) return;

  await actor.update({ "system.attributes.health.value": newHP });
  ui.notifications.info(game.i18n.format("HTBAH.ApplyDamageSuccess", {
    actor: actor.name,
    damage: appliedDamage,
    hp: newHP
  }));
}

function getMagicUseData(message) {
  const data = getSystemMessageFlags(message).magicUse;
  return data && typeof data === "object" ? data : null;
}

async function resolveMagicActor(magicUse) {
  if (!magicUse?.sourceActorUuid) return null;
  try {
    const actor = await fromUuid(magicUse.sourceActorUuid);
    return actor?.documentName === "Actor" ? actor : null;
  } catch (error) {
    console.warn("HowToBeAHero | Could not resolve magic caster actor.", error);
    return null;
  }
}

async function resolveMagicTargets(magicUse) {
  // New magic-use messages always store the target snapshot taken when the
  // ability was used. An explicitly empty array means that no target was
  // selected at cast time; do not silently apply the effect to a later target.
  if (Array.isArray(magicUse?.targetActorUuids)) {
    if (magicUse.targetActorUuids.length === 0) return [];
    const resolved = await Promise.all(magicUse.targetActorUuids.map(async uuid => {
      try { return await fromUuid(uuid); }
      catch (error) { console.warn(`HowToBeAHero | Could not resolve magic target ${uuid}`, error); return null; }
    }));
    return [...new Map(resolved.filter(actor => actor?.documentName === "Actor").map(actor => [actor.uuid, actor])).values()];
  }

  // Compatibility fallback only for legacy chat messages which predate target snapshots.
  const current = Array.from(game.user?.targets ?? []).map(token => token?.actor).filter(Boolean);
  return [...new Map(current.map(actor => [actor.uuid, actor])).values()];
}

async function applyManaFromMessage(message) {
  const magicUse = getMagicUseData(message);
  if (!magicUse) return;
  if (magicUse.manaSpent) {
    ui.notifications.warn(game.i18n.localize("HTBAH.Magic.ManaAlreadySpent"));
    return;
  }
  const caster = await resolveMagicActor(magicUse);
  if (!caster) {
    ui.notifications.warn(game.i18n.localize("HTBAH.Magic.CasterNotFound"));
    return;
  }
  if (!game.user.isGM && !caster.isOwner) {
    ui.notifications.warn(game.i18n.localize("HTBAH.ApplyDamageNoPermission"));
    return;
  }
  if (message.isOwner === false && !game.user.isGM) {
    ui.notifications.warn(game.i18n.localize("HTBAH.Magic.MessagePermissionDenied"));
    return;
  }
  const cost = Math.max(0, Math.floor(Number(magicUse.manaCost) || 0));
  const currentMana = Number(caster.system?.attributes?.mana?.value);
  if (!Number.isFinite(currentMana)) {
    ui.notifications.error(game.i18n.localize("HTBAH.Magic.ManaPoolMissing"));
    return;
  }
  if (currentMana < cost) {
    ui.notifications.warn(game.i18n.format("HTBAH.Magic.NotEnoughMana", { required: cost, current: currentMana }));
    return;
  }
  if (cost === 0) {
    ui.notifications.info(game.i18n.localize("HTBAH.Magic.NoManaCost"));
    return;
  }
  const remaining = currentMana - cost;
  const confirmed = await foundry.applications.api.DialogV2.confirm({
    window: { title: game.i18n.localize("HTBAH.Magic.ApplyManaTitle") },
    content: `<p><strong>${Handlebars.escapeExpression(caster.name)}</strong></p><p>${game.i18n.localize("HTBAH.Magic.ManaCostShort")}: <strong>${cost}</strong></p><p>${currentMana} → <strong>${remaining}</strong></p>`,
    yes: { label: game.i18n.localize("HTBAH.Magic.DeductMana") },
    no: { label: game.i18n.localize("HTBAH.Cancel") },
    rejectClose: false
  });
  if (confirmed !== true) return;

  // Mark the message first to prevent two rapid clicks from spending twice.
  await message.setFlag(SYSTEM_ID, "magicUse.manaSpent", true);
  try {
    await caster.update({ "system.attributes.mana.value": remaining });
    ui.notifications.info(game.i18n.format("HTBAH.Magic.ManaSpent", { actor: caster.name, cost, remaining }));
  } catch (error) {
    await message.setFlag(SYSTEM_ID, "magicUse.manaSpent", false).catch(() => {});
    throw error;
  }
}

async function applyMagicEffectFromMessage(message) {
  const magicUse = getMagicUseData(message);
  const effect = magicUse?.effect;
  if (!effect || effect.type === "none" || Number(effect.value) <= 0) return;
  const messageKey = message.uuid || message.id;
  if (magicUse.effectApplied || applyingMagicEffectMessages.has(messageKey)) {
    ui.notifications.warn(game.i18n.localize("HTBAH.Magic.EffectAlreadyApplied"));
    return;
  }
  const targets = await resolveMagicTargets(magicUse);
  if (!targets.length) {
    ui.notifications.warn(game.i18n.localize("HTBAH.Magic.NoTarget"));
    return;
  }
  if (targets.length !== 1) {
    ui.notifications.warn(game.i18n.localize("HTBAH.ApplyDamageOneTarget"));
    return;
  }
  const target = targets[0];
  if (!game.user.isGM && !target.isOwner) {
    ui.notifications.warn(game.i18n.localize("HTBAH.ApplyDamageNoPermission"));
    return;
  }

  const effectValue = Math.max(0, Math.floor(Number(effect.value) || 0));
  const durationRounds = Math.max(0, Math.floor(Number(effect.durationRounds) || 0));
  const combat = game.combat;
  const combatStarted = Boolean(combat && ("started" in combat ? combat.started : Number(combat.round) > 0));
  if (durationRounds > 0 && !combatStarted) {
    ui.notifications.warn(game.i18n.localize("HTBAH.Magic.DurationRequiresCombat"));
    return;
  }

  const isV14 = Number.parseInt(String(game.version || "13"), 10) >= 14;
  const effectName = magicUse.itemName || game.i18n.localize("HTBAH.Magic.ProtectiveEffect");
  const effectIcon = magicUse.icon || "icons/svg/shield.svg";
  const effectData = {
    name: effectName,
    label: effectName,
    img: effectIcon,
    icon: effectIcon,
    origin: magicUse.sourceItemUuid || message.uuid,
    disabled: false,
    transfer: false,
    showIcon: CONST.ACTIVE_EFFECT_SHOW_ICON?.ALWAYS ?? 2,
    flags: {
      [SYSTEM_ID]: {
        magicEffect: {
          type: "armor",
          value: effectValue,
          sourceActorUuid: magicUse.sourceActorUuid || null,
          sourceItemUuid: magicUse.sourceItemUuid || null
        }
      }
    }
  };
  if (isV14) {
    effectData.type = CONFIG.ActiveEffect?.defaultType || "base";
    effectData.system = { changes: [] };
    if (durationRounds > 0) {
      effectData.start = foundry.documents.ActiveEffect.getEffectStart(combat);
      effectData.duration = { value: durationRounds, units: "rounds", expiry: "roundStart" };
    }
  } else {
    effectData.changes = [];
    if (durationRounds > 0) {
      effectData.duration = { rounds: durationRounds, startRound: combat.round, startTurn: combat.turn ?? 0 };
    }
  }

  const confirmed = await foundry.applications.api.DialogV2.confirm({
    window: { title: game.i18n.localize("HTBAH.Magic.ApplyEffectTitle") },
    content: `<p><strong>${Handlebars.escapeExpression(target.name)}</strong></p><p>${game.i18n.localize("HTBAH.Magic.ArmorBonus")}: <strong>+${effectValue}</strong></p><p>${durationRounds > 0 ? game.i18n.format("HTBAH.Magic.DurationRoundsValue", { rounds: durationRounds }) : game.i18n.localize("HTBAH.Magic.DurationPermanent")}</p>`,
    yes: { label: game.i18n.localize("HTBAH.Magic.ApplyEffect") },
    no: { label: game.i18n.localize("HTBAH.Cancel") },
    rejectClose: false
  });
  if (confirmed !== true) return;

  applyingMagicEffectMessages.add(messageKey);
  try {
    // Mark first so repeated clicks cannot create duplicate protection effects.
    await message.setFlag(SYSTEM_ID, "magicUse.effectApplied", true);
    await target.createEmbeddedDocuments("ActiveEffect", [effectData]);
    target.prepareData?.();
    if (target.sheet?.rendered) target.sheet.render(false);
    ui.notifications.info(game.i18n.format("HTBAH.Magic.EffectApplied", { actor: target.name, bonus: effectValue }));
  } catch (error) {
    await message.setFlag(SYSTEM_ID, "magicUse.effectApplied", false).catch(() => {});
    throw error;
  } finally {
    applyingMagicEffectMessages.delete(messageKey);
  }
}

function closeDamageActionMenu() {
  if (!activeDamageMenu) return;
  const { element, onPointerDown, onKeyDown, onWindowBlur } = activeDamageMenu;
  document.removeEventListener("pointerdown", onPointerDown, true);
  document.removeEventListener("keydown", onKeyDown, true);
  window.removeEventListener("blur", onWindowBlur);
  element.remove();
  activeDamageMenu = null;
}

/**
 * Show a small native HTML menu at the mouse position. This deliberately does
 * not instantiate Foundry's ContextMenu class: the right-click handler belongs
 * to the ChatMessage HTMLElement supplied by renderChatMessageHTML.
 */
function openDamageActionMenu(event, message) {
  closeDamageActionMenu();

  const menu = document.createElement("div");
  menu.className = "htbah-damage-context-menu";
  menu.setAttribute("role", "menu");
  menu.setAttribute("aria-label", game.i18n.localize("HTBAH.ChatActions"));

  const actions = [];
  if (getDamageAmount(message) !== null) {
    actions.push({ icon: "fa-solid fa-shield-heart", label: game.i18n.localize("HTBAH.ApplyDamage"), run: () => applyDamageFromMessage(message) });
  }
  const magicUse = getMagicUseData(message);
  if (magicUse) {
    if (Number(magicUse.manaCost) > 0 && !magicUse.manaSpent) {
      actions.push({ icon: "fa-solid fa-droplet", label: game.i18n.localize("HTBAH.Magic.DeductMana"), run: () => applyManaFromMessage(message) });
    }
    if (magicUse.effect?.type === "armor" && Number(magicUse.effect.value) > 0 && !magicUse.effectApplied) {
      actions.push({ icon: "fa-solid fa-shield", label: game.i18n.localize("HTBAH.Magic.ApplyEffect"), run: () => applyMagicEffectFromMessage(message) });
    }
  }

  for (const entry of actions) {
    const action = document.createElement("button");
    action.type = "button";
    action.className = "htbah-damage-context-menu__item";
    action.setAttribute("role", "menuitem");
    const icon = document.createElement("i");
    icon.className = entry.icon;
    icon.setAttribute("aria-hidden", "true");
    action.append(icon, document.createTextNode(entry.label));
    action.addEventListener("click", async clickEvent => {
      clickEvent.preventDefault();
      clickEvent.stopPropagation();
      closeDamageActionMenu();
      try {
        await entry.run();
      } catch (error) {
        console.error("HowToBeAHero | Could not execute ChatMessage action.", error);
        ui.notifications.error(game.i18n.localize("HTBAH.ApplyDamageFailed"));
      }
    });
    menu.append(action);
  }

  if (!actions.length) return;
  document.body.append(menu);

  const viewportWidth = document.documentElement.clientWidth || window.innerWidth;
  const viewportHeight = document.documentElement.clientHeight || window.innerHeight;
  const bounds = menu.getBoundingClientRect();
  const left = Math.max(6, Math.min(event.clientX, viewportWidth - bounds.width - 6));
  const top = Math.max(6, Math.min(event.clientY, viewportHeight - bounds.height - 6));
  menu.style.left = `${left}px`;
  menu.style.top = `${top}px`;

  const onPointerDown = pointerEvent => {
    if (!menu.contains(pointerEvent.target)) closeDamageActionMenu();
  };
  const onKeyDown = keyEvent => {
    if (keyEvent.key === "Escape") closeDamageActionMenu();
  };
  const onWindowBlur = () => closeDamageActionMenu();

  activeDamageMenu = { element: menu, onPointerDown, onKeyDown, onWindowBlur };
  document.addEventListener("pointerdown", onPointerDown, true);
  document.addEventListener("keydown", onKeyDown, true);
  window.addEventListener("blur", onWindowBlur);

  menu.querySelector("button")?.focus({ preventScroll: true });
}

/**
 * Modern Foundry hook. Attach the right-click listener directly to each
 * rendered damage or magic-use ChatMessage HTMLElement; no deprecated ChatMessage render
 * hook, ChatLog context-option hook, or Foundry ContextMenu instance is used.
 */
function onRenderChatMessageHTML(message, html) {
  if (!(html instanceof HTMLElement)) return;

  const messageElement = html.matches?.(".chat-message")
    ? html
    : html.querySelector?.(".chat-message") ?? html;

  const previousController = messageListenerControllers.get(messageElement);
  previousController?.abort();
  messageElement.classList.remove("htbah-damage-context-target");

  if (getDamageAmount(message) === null && !getMagicUseData(message)) return;

  messageElement.classList.add("htbah-damage-context-target");
  if (message.id) messageElement.dataset.messageId = message.id;

  const controller = new AbortController();
  messageListenerControllers.set(messageElement, controller);
  messageElement.addEventListener("contextmenu", event => {
    event.preventDefault();
    event.stopPropagation();
    openDamageActionMenu(event, message);
  }, { capture: true, signal: controller.signal });
}

/** Register only the modern HTML rendering hook for damage ChatMessages. */
export function registerDamageApplicationContextMenu() {
  if (!globalThis.Hooks?.on) {
    console.error("HowToBeAHero | Hooks API is unavailable; damage action could not be registered.");
    return;
  }

  Hooks.on("renderChatMessageHTML", onRenderChatMessageHTML);
  console.info("HowToBeAHero | Damage right-click action bound via renderChatMessageHTML.");
}
