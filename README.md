# T.E.A.R.S. Foundry VTT — Version 0.1.11

## Character builder fixes
The wizard no longer attaches an ApplicationV2 `data-action="submit"` to the whole form. That parent action could capture clicks on hobby and select fields; real submission is now handled through the form submit event only. Hobby names are free text and each is linked to a matching T.E.A.R.S. talent through a separate selector.

## Profession-point allocation
The five variable profession points can be split among all five talent groups. Enter integer values from 0–5; the total must equal exactly 5. The allocation is saved on the character sheet details.

Positive specifica add their printed +3/+5 points to the corresponding group's budget. Negative specifica apply the printed -5/-10 malus. Waffentalente still cost 2 TP per talent point. Hobby bonuses remain separate talent bonuses (+5 for the first hobby, +3 for the second) and are not paid from the group pools.

## Background and Conditions UI
The Background and Conditions tabs now use the forest-green/sage palette, rounded cards and high-contrast dark text.

## Install
1. Back up `FoundryVTT/Data/systems/tears` and your world data.
2. Extract this ZIP.
3. Copy the contained `tears` folder into `FoundryVTT/Data/systems/`.
4. Restart Foundry and reopen your test world.

The release was checked for JavaScript syntax, JSON validity, template references and ZIP integrity. The hobby event path and point-budget calculations also have focused logic checks. This was not live-tested inside your Foundry installation.


## Version 0.1.11 updates

- The character builder uses the native Foundry ApplicationV2 window header again, so the wizard can be dragged.
- The 5 variable profession points are invested directly into individual talents, as described on rulebook pp. 20-22. Each normal talent increase costs 1 TP; each weapon-talent increase costs 2 TP. The selection is shown as five talent selectors with a live weighted total.
- Group budgets now contain the base 10 TP, fixed profession rubric bonuses, and specificum adjustments. The 5 variable profession points no longer inflate a group budget.
- Talent effective values separately show the fixed profession floor, variable profession bonus, and hobby bonuses.
- The biography/background tab now uses the same forest-green, sage and parchment styling as the rest of the sheet; inherited burgundy bars and dark fields are overridden.
- The attribute step shows the per-attribute AP cost and an explicit 13→18 example (10 AP).


## Version 0.1.12 – Initiative handling

T.E.A.R.S. initiative is now stored and displayed as the positive rulebook value. The custom Combat document sorts values ascending, so INI 8 acts before INI 11. On startup, negative initiative values saved by older T.E.A.R.S. builds are converted to their positive values.


<img width="1714" height="1351" alt="grafik" src="https://github.com/user-attachments/assets/87302b90-d97a-4d9c-ac7c-33dff5b76613" />
<img width="1513" height="1231" alt="grafik" src="https://github.com/user-attachments/assets/279351af-7f41-4698-8232-ddc6a6b64944" />

