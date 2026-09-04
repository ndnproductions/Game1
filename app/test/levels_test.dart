import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:sunspot/model/curve.dart';
import 'package:sunspot/model/puzzle.dart';
import 'package:sunspot/model/rules.dart';

/// Re-audits the shipped pack from the app's own side. The TypeScript engine
/// proves uniqueness when a level is baked; this proves the app parses that
/// same file into a board that actually holds together.
void main() {
  final levels = LevelPackFixture.load();

  test('the pack loads every level', () {
    expect(levels, isNotEmpty);
    expect(levels.length, greaterThanOrEqualTo(100));
  });

  test('levels are numbered 1..n with no gaps', () {
    for (var i = 0; i < levels.length; i++) {
      expect(levels[i].level, i + 1);
    }
  });

  test('every board is square and fully covered by n beams', () {
    for (final puzzle in levels) {
      expect(puzzle.regions.length, puzzle.n, reason: 'level ${puzzle.level}');
      final seen = <int>{};
      for (final row in puzzle.regions) {
        expect(row.length, puzzle.n, reason: 'level ${puzzle.level}');
        seen.addAll(row);
      }
      expect(seen.length, puzzle.n, reason: 'level ${puzzle.level}');
    }
  });

  test('every solution settles cleanly and wins', () {
    for (final puzzle in levels) {
      final board = BoardState(puzzle);
      for (var r = 0; r < puzzle.n; r++) {
        board.set(r, puzzle.solution[r], Mark.cat);
      }
      expect(board.conflicts, isEmpty, reason: 'level ${puzzle.level}');
      expect(board.isSolved, isTrue, reason: 'level ${puzzle.level}');
    }
  });

  test('board sizes follow the stage ladder', () {
    for (final puzzle in levels) {
      expect(
        puzzle.n,
        specFor(puzzle.level).n,
        reason: 'level ${puzzle.level} size disagrees with the curve',
      );
      expect(
        puzzle.chapter,
        chapterFor(puzzle.level).name,
        reason: 'level ${puzzle.level} chapter disagrees with the curve',
      );
    }
  });

  test('the ladder ships all three board sizes', () {
    final sizes = levels.map((p) => p.n).toSet();
    expect(sizes, containsAll(<int>[6, 8, 10]));
  });
}

abstract final class LevelPackFixture {
  /// Reads the asset straight off disk so the test needs no Flutter binding.
  static List<Puzzle> load() {
    final text = File('assets/levels.json').readAsStringSync();
    final root = jsonDecode(text) as Map<String, dynamic>;
    final raw = (root['levels'] as List).cast<Map<String, dynamic>>();
    return [for (final entry in raw) Puzzle.fromJson(entry)];
  }
}
