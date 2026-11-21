# T.E.A.R.S. – Foundry VTT System (Version 0.1.3)

T.E.A.R.S. v0.1.3 is a separate Foundry VTT system package built on the supplied How to Be a Hero (HTBAH) codebase. HTBAH remains the technical foundation for Foundry documents, actor/item sheets, inventory, equipment, effects, conditions, drag-and-drop and chat integration. The player-facing rules and character sheet are converted to T.E.A.R.S. The character sheet uses an independently implemented, DSA-inspired tab and dossier layout; no DSA5 code, rules text or artwork is included.

## Installation

1. Extract the `tears` directory from the archive into Foundry's `Data/systems/` directory.
2. Restart Foundry VTT or refresh the system list.
3. Create a **new world** and select **T.E.A.R.S. - Version 0.1.3**.
4. Create a character. The system adds the 50 standard talents from the supplied core rulebook, arranged in five groups.

**Important:** The package has its own Foundry system ID (`tears`). It is not an in-place update to an existing HTBAH world, and it does not automatically migrate existing HTBAH world data. Keep the original HTBAH system and world as they are; test T.E.A.R.S. in a separate world.

## T.E.A.R.S. rules represented in v0.1.1

### Attributes and resources

- Six attributes: KK (Körperkraft), AU (Ausdauer), GE (Geschicklichkeit), IN (Intelligenz), CH (Charme), MB (Mentale Belastbarkeit).
- Maximum Life Energy: `LE = (KK + KK + AU) × 3`.
- Maximum Mental Health: `GG = (AU + IN + MB + MB) × 3`.
- Low LE applies −2 to checks below half the maximum; below 20 LE the penalty is −5 instead.
- Low GG applies −1 below 40, −2 below 30 and −3 below 20. Below 10 GG the character is in panic and cannot make checks.

### Five talent groups

The system uses the five groups in the supplied core rulebook, not the four-column variant in one of the spreadsheets:

1. Körperliche Talente
2. Kampf/Waffen-Talente
3. Motorische Talente
4. Geistige Talente
5. Soziale/Gesellschaftliche Talente

All 50 talents from the core rulebook are pre-created with the listed three-attribute combinations. Talents without three attributes are classified as combat/weapon talents and are not rolled as ordinary skill checks. Each group starts with a 10-TP budget; the UI allows the GM/player to adjust the budget manually.

### Talent checks

A regular talent check rolls three W20 one after another, each against the corresponding attribute in the prescribed order. Any amount by which a roll exceeds its attribute is added to one combined deficit. The talent's TP value is a single shared buffer for all three dice. The check succeeds when the combined deficit is no greater than the talent value. Talent points are not spent by a check.

### Combat and weapons

The combat chapter gives these base values (rounded to the nearest whole number):

- `ATN = (KK + KK + GE) / 3`
- `PA = (KK + AU + GE) / 3`
- `ATD = (GE + GE + AU) / 3`
- `INI = (KK + 5) − (GE / 2)`

Weapon-talents without a regular attribute triplet are allocated between attack (ATN or ATD) and parry (PA). The weapon editor stores the weapon's category, melee/ranged mode, TP assigned to attack and parry, weapon initiative modifier, range and damage formula. When a weapon category exactly matches a weapon-talent name, the system checks that the allocated TP do not exceed the learned talent value.

Attack and parry actions roll a W20 against the calculated target. A 1 is a critical success; a 20 is a critical failure. The sheet includes editable attack/parry stance modifiers based on the combat example in the rulebook. Damage formulas accept standard Foundry dice notation (such as `1d6+2`) and German `W` notation (such as `1W6+2`). The ×2 damage action is available for a critical hit when the hit was not parried.

T.E.A.R.S. initiative is an action interval, not a single DSA-style initiative roll: the lower INI value acts more frequently as the combat counter advances from 0 and reaches the INI value or its multiples. The system writes the inverted INI value into Foundry's descending combat tracker so lower T.E.A.R.S. INI appears earlier. The weapon-specific initiative modifier is applied when the corresponding weapon's INI action is used.

## Version 0.1 boundaries

The following items are deliberately not presented as fully automated yet:

- Automatic character creation using profession-specific attribute targets, the 14-point attribute-buy cost curve, profession/hobby talent bonuses, specificum bonuses/maluses and the full advancement rules.
- Complete multi-action initiative clock: Foundry's standard combat tracker is sorted using the T.E.A.R.S. INI value, but acting again at INI multiples still requires the GM to advance/track the counter manually.
- Fully integrated attack → parry → damage interaction. Attack, parry and damage are separate sheet actions; the GM/player resolves whether the target can parry. Critical damage must be triggered manually with the ×2 action when the critical hit was not parried.
- Distance-class allocation and range penalties, hit-location rolls, detailed wound/armor/virus consequences, unarmed Ringen/Kampfsport special rules, and the knockdown rule for heavy blunt weapons.
- The user-provided documents contain differences between the five-group core rulebook, a four-group spreadsheet, and some reconstructed documents. v0.1 uses the five-group layout and talent combinations on printed core-rulebook pages 24–27. The mismatching spreadsheet data is not silently substituted.

## Source and attribution

- The technical Foundry architecture is based on the user-provided **How to Be a Hero** system. Upstream attribution and license notices are retained in `CREDITS.md` and `LICENSE.txt`.
- T.E.A.R.S. rules and data are based on the user's supplied T.E.A.R.S. materials. The license terms stated in those materials must be respected for redistributed derivative rule content.
- DSA5 Foundry is a visual/interaction reference only. No DSA rules, DSA code or DSA artwork is included.


## Compact UI asset library (v0.1.1)

The `ui/` directory is deliberately kept below the 99-file limit. The item image gallery uses 23 shared category silhouettes instead of a separate SVG for every object. Weapons, consumables, protective equipment, tools and general equipment are represented by broader image categories. This changes only icon selection and presentation; it does not remove or merge the underlying inventory item types or item records.

The distinct condition/status and damage icons are retained because they communicate different game states. The ten separate magic icons were consolidated into one generic special-ability symbol. Legacy item records that still point to the previous per-object item SVG paths receive a category-based display fallback.

## Layout correction (v0.1.2)

The character-sheet tabs now use the full available content width. The previous HTBAH two-column layout reserved a narrow left column for a sidebar that is no longer present in the T.E.A.R.S. sheet, leaving most of the window blank. Version 0.1.2 changes this to a single full-width tab column and adds responsive inner grids for smaller windows. No rules, actor data, item types or UI asset counts are changed.


## Character creation and point allocation (source-based quick guide)

The character sheet includes a collapsible point-allocation guide. The rules distinguish two separate budgets:

### Attributes
- All six attributes start at 8. Add the attribute bonuses for the selected profession.
- The player then distributes 14 additional attribute advancement points. The rules' cost table increases the cost as an attribute enters higher value bands: 1 point per increase in the 1–14 band, 2 points in the 14–17 band and 3 points in the 17–19 band. The original table overlaps at the 14 and 17 boundary labels; the exact boundary treatment should be clarified by the table/rules author before we automate the cost calculation.

### Talents
- At character creation, allocate 10 TP within each of the five talent groups.
- Add profession bonuses in the listed talent groups. Profession tables include a further 5 TP that are assigned by agreement.
- The first hobby grants +5 TP to a suitable hobby talent; the second hobby grants +3 TP to a suitable hobby talent.
- Weapon talents cost 2 TP for each +1 talent value.
- TP is not spent when a regular three-W20 talent check is rolled; it is the shared buffer against the combined excess over the three attributes.

### Current v0.1.3 automation boundary
The group budget fields begin at 10 TP each. Profession and hobby point bonuses are still entered manually by increasing the relevant group budget and assigning the resulting TP to talents. The interface guide explains this; automatic profession/hobby point calculation is not yet implemented.

## Visual system (v0.1.3)
- Forest-green header and controls, sage navigation and a muted pale-green sheet canvas.
- A low-opacity diagonal crosshatch sits behind panels; forms and number cards remain solid for legibility.
- Numeric values and inputs use near-black text on light backgrounds, including inventory quantities and item fields.
- The `ui/` directory remains at 84 files (under the 99-file limit).


## Version 0.1.4 – runtime fixes

This build fixes the `Math.clamped is not a function` runtime failure in inventory quantity controls and resource editing. The item creation dialog now starts with a valid category and icon selected, requires a name, and weapon categories are selected from the exact T.E.A.R.S. weapon-talent names rather than free text. Common existing short labels such as `Klinge` are normalized to `Klingenwaffen`. Optional missing localization values no longer produce repeated console warnings. The UI folder remains below the 99-file limit.
