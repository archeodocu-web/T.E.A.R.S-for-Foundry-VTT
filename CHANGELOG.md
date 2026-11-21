# Changelog

## 0.1.9 — Top navigation, restored inventory/conditions, talent register
- Replaced the legacy off-canvas side rail with a horizontal rounded top tab bar.
- Added a dedicated Talents tab; attribute and character details remain in Character.
- Restored visible Inventory and Conditions tab routes using the existing HTBAH templates and components.
- Renamed the inventory tab to “Inventar” and combat tab to “Kampf & Waffen”.
- Removed the repeated “Kampf” marker from individual weapon talents; they now show “Waffentalent”.
- Fixed the Character Builder crash caused by writing to ApplicationV2’s getter-only `state` property; builder data now lives in `builderData`.
- Consolidated duplicate canonical talents without adding duplicate point values; highest saved values/bonuses are retained.
- Replaced the missing hand-bag icon dependency with a built-in Font Awesome box icon.
