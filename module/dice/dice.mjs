import { SYSTEM_ID } from "../helpers/config.mjs";

/* -------------------------------------------- */
/* D10 Roll                                     */
/* -------------------------------------------- */


export async function d10Roll({
  formula = "1d10",
  data = {},
  critical = false,
  bonusValue = 0,
  target = null,
  chatMessage = true,
  messageData = {},
  flavor,
  ...options
} = {}) {
  // Create the roll instance
  const roll = new CONFIG.Dice.D10Roll(formula, data, {
    flavor: options.title || flavor,
    critical,
    bonusValue,
    target
  });

  // Evaluate the roll
  await roll.evaluate();

  // Preserve the final computed damage on damage messages so the ChatLog action
  // can apply exactly the same critical and bonus-adjusted total.
  const damageRollFlag = foundry.utils.getProperty(messageData, `flags.${SYSTEM_ID}.roll`);
  if (damageRollFlag?.type === "damage") {
    foundry.utils.setProperty(messageData, `flags.${SYSTEM_ID}.damage`, {
      amount: Math.max(0, Number(roll.total) || 0),
      formula,
      source: damageRollFlag.data?.label || flavor || "",
      targetActorUuids: damageRollFlag.data?.targetActorUuids || []
    });
  }

  // Send chat message if requested
  if (chatMessage) {
    await roll.toMessage(messageData);
  }

  return roll;
}