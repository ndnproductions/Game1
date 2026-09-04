/// The tier a board's hardest required deduction puts it in.
enum Tier { gentle, warm, bright, blazing }

Tier _tierFrom(String name) => switch (name) {
      'gentle' => Tier.gentle,
      'warm' => Tier.warm,
      'bright' => Tier.bright,
      _ => Tier.blazing,
    };

/// A square on the board. Value type so it can live in a Set.
class Cell {
  const Cell(this.r, this.c);

  final int r;
  final int c;

  @override
  bool operator ==(Object other) => other is Cell && other.r == r && other.c == c;

  @override
  int get hashCode => Object.hash(r, c);

  @override
  String toString() => 'Cell($r,$c)';
}

/// One baked level. Beams arrive as one letter per square, which keeps the
/// shipped pack small and readable; they are widened to ids on load.
class Puzzle {
  const Puzzle({
    required this.level,
    required this.n,
    required this.tier,
    required this.chapter,
    required this.regions,
    required this.solution,
    required this.score,
    required this.steps,
  });

  final int level;
  final int n;
  final Tier tier;
  final String chapter;

  /// Beam id per square, indexed [row][col].
  final List<List<int>> regions;

  /// Column holding the cat, per row.
  final List<int> solution;

  final int score;
  final int steps;

  factory Puzzle.fromJson(Map<String, dynamic> json) {
    final rows = (json['regions'] as List).cast<String>();
    return Puzzle(
      level: json['level'] as int,
      n: json['n'] as int,
      tier: _tierFrom(json['tier'] as String),
      chapter: json['chapter'] as String? ?? '',
      regions: [
        for (final row in rows) [for (final code in row.codeUnits) code - 65],
      ],
      solution: (json['solution'] as List).cast<int>(),
      score: json['score'] as int,
      steps: json['steps'] as int,
    );
  }

  int beamAt(int r, int c) => regions[r][c];

  /// The squares making up one beam — used to outline it on the board.
  List<Cell> beamCells(int id) => [
        for (var r = 0; r < n; r++)
          for (var c = 0; c < n; c++)
            if (regions[r][c] == id) Cell(r, c),
      ];
}
