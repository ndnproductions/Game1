import 'puzzle.dart';

/// What a player has put on a square.
enum Mark { empty, paw, cat }

/// Cats clash when they share a row, a column or a beam, or when they touch —
/// diagonals included. That last clause is the whole character of the puzzle.
bool clash(Cell a, Cell b, List<List<int>> regions) =>
    a.r == b.r ||
    a.c == b.c ||
    regions[a.r][a.c] == regions[b.r][b.c] ||
    ((a.r - b.r).abs() <= 1 && (a.c - b.c).abs() <= 1);

/// Mutable board a player is working on.
class BoardState {
  BoardState(this.puzzle)
      : marks = List.generate(
          puzzle.n,
          (_) => List.filled(puzzle.n, Mark.empty),
        );

  final Puzzle puzzle;
  final List<List<Mark>> marks;

  int get n => puzzle.n;

  Mark markAt(int r, int c) => marks[r][c];

  /// Tap cycles empty → paw print → cat → empty.
  Mark cycle(int r, int c) {
    marks[r][c] = switch (marks[r][c]) {
      Mark.empty => Mark.paw,
      Mark.paw => Mark.cat,
      Mark.cat => Mark.empty,
    };
    return marks[r][c];
  }

  void set(int r, int c, Mark mark) => marks[r][c] = mark;

  void clear() {
    for (final row in marks) {
      row.fillRange(0, row.length, Mark.empty);
    }
  }

  List<Cell> get cats => [
        for (var r = 0; r < n; r++)
          for (var c = 0; c < n; c++)
            if (marks[r][c] == Mark.cat) Cell(r, c),
      ];

  /// Every cat currently crowding another. Shown in red rather than rejected —
  /// seeing the mistake is what teaches the rule.
  Set<Cell> get conflicts {
    final placed = cats;
    final bad = <Cell>{};
    for (var i = 0; i < placed.length; i++) {
      for (var j = i + 1; j < placed.length; j++) {
        if (clash(placed[i], placed[j], puzzle.regions)) {
          bad..add(placed[i])..add(placed[j]);
        }
      }
    }
    return bad;
  }

  bool get isSolved =>
      cats.length == n && conflicts.isEmpty;

  /// The next row still missing its cat, or null when the board is done.
  /// Backing for the paid hint.
  int? nextHintRow() {
    for (var r = 0; r < n; r++) {
      if (marks[r][puzzle.solution[r]] != Mark.cat) return r;
    }
    return null;
  }

  /// Apply one hint: clear the row and settle the cat where it belongs.
  Cell? applyHint() {
    final row = nextHintRow();
    if (row == null) return null;
    for (var c = 0; c < n; c++) {
      if (marks[row][c] == Mark.cat) marks[row][c] = Mark.empty;
    }
    final col = puzzle.solution[row];
    marks[row][col] = Mark.cat;
    return Cell(row, col);
  }

  /// Remove the most recently reachable cat. Cheap stand-in for a full undo
  /// stack, which the screen layers on top.
  bool undoLastCat() {
    for (var r = n - 1; r >= 0; r--) {
      for (var c = n - 1; c >= 0; c--) {
        if (marks[r][c] == Mark.cat) {
          marks[r][c] = Mark.empty;
          return true;
        }
      }
    }
    return false;
  }
}
