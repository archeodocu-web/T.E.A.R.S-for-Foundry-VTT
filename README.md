# T.E.A.R.S. Foundry VTT — Version 0.1.9

## Main navigation
The character sheet now uses a horizontal top tab bar: **Charakter**, **Talente**, **Kampf & Waffen**, **Inventar**, **Zustände**, and **Hintergrund**. Inventory and conditions use the original How to Be a Hero data/rendering components and remain part of the same actor document.

## Character and talents
The Character tab contains identity, profession, attributes, Life Energy and Mental Health. The Talents tab contains the five T.E.A.R.S. groups and the canonical 50 talents. Weapon-specific entries are marked **Waffentalent** rather than repeating the generic word “Kampf”.

## Character Builder fix
The builder no longer assigns to `ApplicationV2.state` (a getter-only property). Its editable creation data is stored on `builderData`, so the builder can be instantiated without the `Cannot set property state` exception.

## Legacy duplicate talents
When an owned character is opened, duplicate copies of canonical T.E.A.R.S. talent items are consolidated. Existing custom abilities are not deleted. For duplicate canonical rows, the highest saved talent value and bonuses are retained rather than summed, avoiding accidental double-counting.

## Install
1. Back up `Data/systems/tears`.
2. Extract this ZIP.
3. Copy the contained `tears` folder into `FoundryVTT/Data/systems/`.
4. Restart Foundry and reopen the world.

This build has been checked for JavaScript syntax, JSON validity, template references and ZIP integrity. It has not been live-tested inside the user’s Foundry installation.
