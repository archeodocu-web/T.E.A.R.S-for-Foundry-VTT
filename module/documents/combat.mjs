/**
 * T.E.A.R.S. combat document. The rulebook uses a lower initiative value
 * as an earlier action. Store/display the real positive INI and sort ascending.
 */
export class TearsCombat extends Combat {
  setupTurns() {
    const turns = super.setupTurns();
    return turns.sort((a, b) => {
      const aValue = a.initiative == null || a.initiative === '' ? Number.POSITIVE_INFINITY : Number(a.initiative);
      const bValue = b.initiative == null || b.initiative === '' ? Number.POSITIVE_INFINITY : Number(b.initiative);
      const difference = aValue - bValue;
      if (difference !== 0) return difference;
      return String(a.name ?? '').localeCompare(String(b.name ?? ''), 'de');
    });
  }
}
