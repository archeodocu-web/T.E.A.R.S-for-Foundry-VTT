# T.E.A.R.S. 0.1.12

- Store and display the positive T.E.A.R.S. INI value in Foundry.
- Sort combatants in ascending initiative order (lower INI acts earlier).
- Migrate legacy negative tracker values (e.g. -11) to their positive values at startup, preserving the current combatant where possible.
- Keep the existing initiative formula and weapon initiative modifier.

---

# Changelog

## 0.1.11
- Restored the ApplicationV2 native window header as a visible drag handle for the character builder.
- Reworked the five variable profession bonus points: they are now invested in individual talents, not added to a group pool. Weapon-talent increases cost 2 TP; other talent increases cost 1 TP.
- Added a separate `professionVariableBonus` item value and applied it to talent checks and weapon allocation calculations.
- Kept group budgets separate from fixed profession talent floor, variable profession bonuses and hobby bonuses.
- Added per-attribute AP cost breakdowns and a clear 13-to-18 cost example.
- Re-themed the biography/background tab, including headers, controls and text fields, to the Forest-Green UI with rounded corners.

# Changelog

## 0.1.10 — Character-builder input and point accounting fix
- Removed the form-level ApplicationV2 `data-action="submit"` that intercepted clicks in child inputs and selects. Real form submission is handled separately.
- Hobby name and associated-talent controls remain independently interactive and have clearer instructions.
- Replaced the single-group variable-profession-points selector with five explicit fields; the 5 points may be split across one or more talent rubrics.
- Persisted the split allocation on the actor details schema.
- Fixed positive specifica: printed +3/+5 TP now increase the appropriate talent-group budget; negative specifica continue to subtract their printed values.
- Added live validation and remaining-point indication for the five flexible profession points.
- Harmonized Background and Conditions tabs with forest-green headers, sage cards, rounded inputs and dark high-contrast text.
- Expanded the character-builder window to show more of the identity and hobby fields without hiding them below the fixed footer.
