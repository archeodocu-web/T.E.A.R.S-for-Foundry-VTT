/** Shared, compact category icon gallery for T.E.A.R.S. items. */
const ITEM_ICON_ROOT = "systems/tears/ui/icons/svg/items/";

export const ITEM_ICON_CATALOG = [
  // Waffen – drei allgemeine Kategorien statt eines eigenen Bildes pro Waffe.
  { type: "weapon", name: "Nahkampfwaffe", slug: "melee", path: `${ITEM_ICON_ROOT}sword.svg` },
  { type: "weapon", name: "Fernwaffe", slug: "ranged", path: `${ITEM_ICON_ROOT}bow.svg` },
  { type: "weapon", name: "Schusswaffe", slug: "firearm", path: `${ITEM_ICON_ROOT}pistol.svg` },

  // Verbrauchsgüter
  { type: "consumable", name: "Nahrung", slug: "food", path: `${ITEM_ICON_ROOT}food.svg` },
  { type: "consumable", name: "Medizin und Erste Hilfe", slug: "medical", path: `${ITEM_ICON_ROOT}bandage.svg` },
  { type: "consumable", name: "Chemikalien und Flüssigkeiten", slug: "chemical", path: `${ITEM_ICON_ROOT}vial.svg` },

  // Schutz und Kleidung
  { type: "armor", name: "Rüstung und Schutzkleidung", slug: "armor", path: `${ITEM_ICON_ROOT}armor-vest.svg` },
  { type: "armor", name: "Kopf- und Gesichtsschutz", slug: "headgear", path: `${ITEM_ICON_ROOT}helmet.svg` },
  { type: "armor", name: "Schuhe und Beinschutz", slug: "footwear", path: `${ITEM_ICON_ROOT}boots.svg` },
  { type: "armor", name: "Kleidung und Umhänge", slug: "clothing", path: `${ITEM_ICON_ROOT}cloak.svg` },

  // Werkzeuge und Ausrüstung
  { type: "tool", name: "Handwerkzeug", slug: "hand-tool", path: `${ITEM_ICON_ROOT}hammer-tool.svg` },
  { type: "tool", name: "Mechanik und Technik", slug: "mechanics", path: `${ITEM_ICON_ROOT}gear.svg` },
  { type: "tool", name: "Optik und Beobachtung", slug: "optics", path: `${ITEM_ICON_ROOT}binoculars.svg` },
  { type: "tool", name: "Orientierung und Navigation", slug: "navigation", path: `${ITEM_ICON_ROOT}compass.svg` },
  { type: "tool", name: "Seile und Überleben", slug: "survival", path: `${ITEM_ICON_ROOT}rope.svg` },

  // Allgemeine Gegenstände
  { type: "item", name: "Dokumente und Wissen", slug: "documents", path: `${ITEM_ICON_ROOT}book-cover.svg` },
  { type: "item", name: "Behälter und Taschen", slug: "containers", path: `${ITEM_ICON_ROOT}backpack.svg` },
  { type: "item", name: "Wertgegenstände", slug: "valuables", path: `${ITEM_ICON_ROOT}gem.svg` },
  { type: "item", name: "Geld und Zahlungsmittel", slug: "currency", path: `${ITEM_ICON_ROOT}coin.svg` },
  { type: "item", name: "Freizeit und Kultur", slug: "leisure", path: `${ITEM_ICON_ROOT}playing-cards.svg` },
  { type: "item", name: "Zeitmesser", slug: "timekeeping", path: `${ITEM_ICON_ROOT}hourglass.svg` },
  { type: "item", name: "Persönliche Gegenstände", slug: "personal", path: `${ITEM_ICON_ROOT}amulet.svg` },
  { type: "item", name: "Sonstige Gegenstände", slug: "misc", path: `${ITEM_ICON_ROOT}box.svg` }
];

const DEFAULT_ITEM_ICONS = {
  weapon: `${ITEM_ICON_ROOT}sword.svg`,
  consumable: `${ITEM_ICON_ROOT}vial.svg`,
  armor: `${ITEM_ICON_ROOT}armor-vest.svg`,
  tool: `${ITEM_ICON_ROOT}hammer-tool.svg`,
  item: `${ITEM_ICON_ROOT}box.svg`,
  ability: "systems/tears/ui/icons/svg/brainstorm.svg",
  magic: "systems/tears/ui/icons/svg/brainstorm.svg"
};

const LEGACY_ICON_CATEGORIES = {
  weapon: {
    pistol: "pistol.svg", revolver: "pistol.svg", musket: "pistol.svg",
    bow: "bow.svg", crossbow: "bow.svg", arrow: "bow.svg", slingshot: "bow.svg",
    dart: "bow.svg", javelin: "bow.svg", "throwing-knife": "sword.svg"
  },
  consumable: {
    food: "food.svg", bread: "food.svg", cheese: "food.svg", "chicken-leg": "food.svg",
    "meat-leg": "food.svg", pear: "food.svg", mushroom: "food.svg", "stew-bowl": "food.svg",
    bandage: "bandage.svg", "medicine-jar": "bandage.svg", syringe: "bandage.svg",
    "salve-jar": "bandage.svg", antidote: "bandage.svg"
  },
  armor: {
    helmet: "helmet.svg", hood: "helmet.svg", "face-mask": "helmet.svg", "chain-coif": "helmet.svg",
    boots: "boots.svg", greaves: "boots.svg", "knee-pads": "boots.svg", cloak: "cloak.svg"
  },
  tool: {
    binoculars: "binoculars.svg", telescope: "binoculars.svg", "magnifying-glass": "binoculars.svg",
    spectacles: "binoculars.svg", compass: "compass.svg", "fishing-rod": "rope.svg", rope: "rope.svg",
    lantern: "compass.svg", "hammer-tool": "hammer-tool.svg", wrench: "hammer-tool.svg",
    pliers: "hammer-tool.svg", saw: "hammer-tool.svg", scissors: "hammer-tool.svg",
    lockpick: "hammer-tool.svg", tongs: "hammer-tool.svg", pickaxe: "hammer-tool.svg",
    shovel: "hammer-tool.svg", chisel: "hammer-tool.svg", "needle-thread": "hammer-tool.svg",
    "balance-scale": "gear.svg", abacus: "gear.svg", gear: "gear.svg", padlock: "gear.svg",
    ruler: "gear.svg", thermometer: "gear.svg", bellows: "gear.svg", "test-tube": "binoculars.svg"
  },
  item: {
    key: "box.svg", scroll: "book-cover.svg", letter: "book-cover.svg", book: "book-cover.svg",
    "book-cover": "book-cover.svg", "white-book": "book-cover.svg", journal: "book-cover.svg",
    "quill-ink": "book-cover.svg", map: "compass.svg", coin: "coin.svg", "coin-stack": "coin.svg",
    wallet: "coin.svg", pouch: "backpack.svg", backpack: "backpack.svg", satchel: "backpack.svg",
    "treasure-chest": "backpack.svg", crate: "backpack.svg", barrel: "backpack.svg", box: "backpack.svg",
    "gem": "gem.svg", ring: "gem.svg", necklace: "gem.svg", amulet: "amulet.svg", crown: "gem.svg",
    "playing-cards": "playing-cards.svg", dice: "playing-cards.svg", flute: "playing-cards.svg",
    lute: "playing-cards.svg", bell: "playing-cards.svg", "pocket-watch": "hourglass.svg",
    "wall-clock": "hourglass.svg", hourglass: "hourglass.svg", "hand-mirror": "amulet.svg"
  }
};

/** Resolve removed v0.1 per-object artwork to a retained category icon without touching custom images. */
export function resolveItemIconPath(path, type = "item") {
  const value = typeof path === "string" ? path : "";
  const prefix = "systems/tears/ui/icons/svg/items/";
  const legacyMagicPrefix = "systems/tears/ui/icons/svg/magic/";
  if (value.startsWith(legacyMagicPrefix)) return "systems/tears/ui/icons/svg/brainstorm.svg";
  if (!value || !value.startsWith(prefix)) return value || DEFAULT_ITEM_ICONS[type] || DEFAULT_ITEM_ICONS.item;
  const file = value.slice(prefix.length).split(/[?#]/)[0];
  const retained = new Set(ITEM_ICON_CATALOG.map(icon => icon.path));
  if (retained.has(value)) return value;
  const slug = file.replace(/\.svg$/i, "");
  const mapped = LEGACY_ICON_CATEGORIES[type]?.[slug];
  if (mapped) return `${prefix}${mapped}`;
  return DEFAULT_ITEM_ICONS[type] || DEFAULT_ITEM_ICONS.item;
}
