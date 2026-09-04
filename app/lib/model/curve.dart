import 'puzzle.dart';

class Chapter {
  const Chapter(this.name, this.from, this.n);

  final String name;
  final int from;
  final int n;
}

/// Board size steps 6 → 8 → 10, and each size restarts its own tier climb.
/// A bigger grid is already a step up, so pairing it with the hardest
/// deductions in the same stage would spike the curve.
const chapters = <Chapter>[
  Chapter('The Sunroom', 1, 6),
  Chapter('The Garden', 26, 8),
  Chapter('The Attic', 91, 10),
];

Chapter chapterFor(int level) {
  var found = chapters.first;
  for (final chapter in chapters) {
    if (level >= chapter.from) found = chapter;
  }
  return found;
}

/// Mirrors specFor() in the TypeScript engine. Kept in sync by hand — the pack
/// carries its own size and tier, so this is only used for stages not yet baked.
({int n, Tier tier}) specFor(int level) {
  if (level <= 10) return (n: 6, tier: Tier.gentle);
  if (level <= 25) return (n: 6, tier: Tier.warm);
  if (level <= 40) return (n: 8, tier: Tier.warm);
  if (level <= 65) return (n: 8, tier: Tier.bright);
  if (level <= 90) return (n: 8, tier: Tier.blazing);
  if (level <= 110) return (n: 10, tier: Tier.warm);
  if (level <= 140) return (n: 10, tier: Tier.bright);
  return (n: 10, tier: Tier.blazing);
}
