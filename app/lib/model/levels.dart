import 'dart:convert';

import 'package:flutter/services.dart' show rootBundle;

import 'puzzle.dart';

/// The baked level pack. Generation is far too slow to run on a phone at
/// launch, so stages ship as data; only the daily puzzle is made on device.
class LevelPack {
  const LevelPack(this.levels);

  final List<Puzzle> levels;

  /// Parses the pack from raw JSON. Kept separate from [load] so tests can run
  /// without a Flutter binding.
  static LevelPack parse(String jsonText) {
    final root = jsonDecode(jsonText) as Map<String, dynamic>;
    final raw = (root['levels'] as List).cast<Map<String, dynamic>>();
    return LevelPack([for (final entry in raw) Puzzle.fromJson(entry)]);
  }

  static Future<LevelPack> load() async =>
      parse(await rootBundle.loadString('assets/levels.json'));

  int get length => levels.length;

  Puzzle? tryLevel(int level) {
    for (final puzzle in levels) {
      if (puzzle.level == level) return puzzle;
    }
    return null;
  }

  Puzzle byLevel(int level) {
    final found = tryLevel(level);
    if (found == null) throw StateError('level $level is not in the pack');
    return found;
  }
}
