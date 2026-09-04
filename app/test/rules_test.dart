import 'package:flutter_test/flutter_test.dart';
import 'package:sunspot/model/puzzle.dart';
import 'package:sunspot/model/rules.dart';

Puzzle _tiny() => Puzzle.fromJson({
      'level': 1,
      'n': 6,
      'tier': 'warm',
      'chapter': 'The Sunroom',
      'regions': ['DAABBB', 'DACCBB', 'DCCCBB', 'DCCEEB', 'DCEEEB', 'FFEEEB'],
      'solution': [2, 5, 3, 0, 4, 1],
      'score': 15,
      'steps': 9,
    });

void main() {
  group('clash', () {
    final puzzle = _tiny();

    test('same row, column or beam clashes', () {
      expect(clash(const Cell(0, 0), const Cell(0, 4), puzzle.regions), isTrue);
      expect(clash(const Cell(0, 3), const Cell(4, 3), puzzle.regions), isTrue);
      // (0,1) and (0,2) are both beam A
      expect(clash(const Cell(0, 1), const Cell(0, 2), puzzle.regions), isTrue);
    });

    test('touching squares clash, diagonals included', () {
      expect(clash(const Cell(2, 2), const Cell(3, 3), puzzle.regions), isTrue);
    });

    test('a legal pair does not clash', () {
      expect(clash(const Cell(0, 2), const Cell(1, 5), puzzle.regions), isFalse);
    });
  });

  group('BoardState', () {
    test('tapping cycles empty to paw to cat and back', () {
      final board = BoardState(_tiny());
      expect(board.markAt(0, 0), Mark.empty);
      expect(board.cycle(0, 0), Mark.paw);
      expect(board.cycle(0, 0), Mark.cat);
      expect(board.cycle(0, 0), Mark.empty);
    });

    test('conflicts name both offending cats, not one', () {
      final board = BoardState(_tiny())
        ..set(2, 2, Mark.cat)
        ..set(3, 3, Mark.cat);
      expect(board.conflicts, {const Cell(2, 2), const Cell(3, 3)});
    });

    test('the intended solution is conflict free and wins', () {
      final puzzle = _tiny();
      final board = BoardState(puzzle);
      for (var r = 0; r < puzzle.n; r++) {
        board.set(r, puzzle.solution[r], Mark.cat);
      }
      expect(board.conflicts, isEmpty);
      expect(board.isSolved, isTrue);
    });

    test('a full board with a clash is not solved', () {
      final puzzle = _tiny();
      final board = BoardState(puzzle);
      for (var r = 0; r < puzzle.n; r++) {
        board.set(r, puzzle.solution[r], Mark.cat);
      }
      // move one cat onto a square that clashes with its neighbour
      board
        ..set(0, puzzle.solution[0], Mark.empty)
        ..set(0, puzzle.solution[1], Mark.cat);
      expect(board.isSolved, isFalse);
    });

    test('hints fill rows in order and stop when done', () {
      final puzzle = _tiny();
      final board = BoardState(puzzle);
      for (var i = 0; i < puzzle.n; i++) {
        expect(board.applyHint(), isNotNull);
      }
      expect(board.nextHintRow(), isNull);
      expect(board.applyHint(), isNull);
      expect(board.isSolved, isTrue);
    });

    test('a hint clears a wrong cat already in that row', () {
      final puzzle = _tiny();
      final wrongCol = (puzzle.solution[0] + 2) % puzzle.n;
      final board = BoardState(puzzle)..set(0, wrongCol, Mark.cat);
      board.applyHint();
      expect(board.markAt(0, wrongCol), Mark.empty);
      expect(board.markAt(0, puzzle.solution[0]), Mark.cat);
    });

    test('undo removes a cat and reports when none are left', () {
      final board = BoardState(_tiny())..set(1, 1, Mark.cat);
      expect(board.undoLastCat(), isTrue);
      expect(board.undoLastCat(), isFalse);
    });
  });
}
