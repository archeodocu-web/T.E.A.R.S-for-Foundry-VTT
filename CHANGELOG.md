# Changelog

## 0.1.4
- Fixed inventory quantity adjustment and resource value editing for the current Foundry runtime by replacing unsupported `Math.clamped` calls with portable numeric clamping.
- Defaulted new item creation to the first available category and matching icon; users can still select a different category/icon.
- Added required item-name validation to the creation form.
- Replaced free-text weapon category input with a dropdown of the exact T.E.A.R.S. weapon-talent names. Existing common short values such as `Klinge` are recognized as `Klingenwaffen` for rolls and shown as the canonical dropdown selection.
- Suppressed repetitive console warnings when an optional localization key is genuinely absent.
- Preserved the compact UI asset count and the forest-green / high-contrast theme.


## 0.1.3 — Forest / Sage UI and point guide
- Harmonized the character sheet, combat, inventory, effects, item sheets and dialogs around a forest-green / sage palette.
- Added a very subtle crosshatched background texture while keeping all data panels nearly solid for legibility.
- Forced numeric readouts and editable values to high-contrast black on light surfaces, including LE/GG, attributes, talents, combat values and inventory quantities.
- Added a collapsible German/English point-distribution guide to the character tab.
- Kept the compact `ui/` asset directory unchanged at 84 files.
- No actor data, item data or rule-resolution code changed.


## 0.1.2 – Charakterbogen: volle Inhaltsbreite

- Korrigiert die CSS-Grid-Aufteilung des Charakterbogens: Der alte HTBAH-Sidebar-Platzhalter belegte weiterhin die erste Spalte, obwohl die T.E.A.R.S.-Vorlage keine Sidebar mehr enthält.
- Das aktive Tab-Panel nutzt jetzt die gesamte verfügbare Breite.
- Charakter-, Kampf-, Inventar-, Zustände- und Hintergrundansichten erhalten dieselbe korrigierte Inhaltsbreite.
- Ergänzt kompakte responsive Raster für Attribute, Ressourcen, Talente und Kampfwerte bei schmalen Fenstern.
- Die Regelmechanik, Talentdaten, Inventartypen und Icon-Anzahl bleiben unverändert.

## 0.1.0 – T.E.A.R.S. Version 0.1

- Forked the supplied How to Be a Hero Foundry architecture into a distinct `tears` system package.
- Replaced the player-facing HTBAH skill-set layout with the six T.E.A.R.S. attributes and five talent groups.
- Added the 50 standard talents and their attribute triplets from core-rulebook pages 24–27.
- Implemented three-W20 talent checks using one shared, non-consumed TP buffer.
- Implemented single-attribute checks and automatic LE/GG penalties, including the GG panic lockout.
- Added LE/GG derived maxima and the ATN, PA, ATD and INI base calculations.
- Added weapon attack/parry W20 checks, per-weapon TP allocation, attack/parry stance modifiers, weapon-specific initiative modifiers and damage formulas.
- Added DSA-inspired sheet tabs, parchment-and-forest visual styling, combat action buttons and T.E.A.R.S. chat cards.
- Retained the HTBAH inventory, equipment, item, effect, condition and Foundry document infrastructure.
- Documented features that remain manual or provisional in v0.1.


## 0.1.1 – Kompakte UI-Assets

- Reduced `ui/` from 201 to 84 files, leaving 15 files of headroom below the 99-file limit.
- Replaced the 106-entry item-specific SVG gallery with 23 broad category icons for weapons, consumables, armor, tools and general items.
- Consolidated legacy magic artwork to one generic special-ability symbol.
- Added a display-path resolver so existing item documents that reference removed per-item SVGs render with a suitable category symbol.
- Kept distinct damage and status icons to preserve clear feedback for rules states.
