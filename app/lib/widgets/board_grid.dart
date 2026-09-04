import 'package:flutter/material.dart';

import '../model/puzzle.dart';
import '../model/rules.dart';
import '../theme/decorations.dart';
import '../theme/palette.dart';
import 'cat.dart';

/// Traces a dark line along every edge where two beams meet.
///
/// The glossy-tile look drops the heavy outline the flat design had, and on a
/// match-3 that is fine because colour is only decoration there. Here the beam
/// boundary *is* the rule, and ten glossy pastels are not distinguishable to a
/// colourblind player — so the grout goes back in, drawn in the gaps.
class BeamOutlinePainter extends CustomPainter {
  const BeamOutlinePainter({required this.puzzle, required this.gap});

  final Puzzle puzzle;
  final double gap;

  @override
  void paint(Canvas canvas, Size size) {
    final n = puzzle.n;
    final cell = (size.width - gap * (n - 1)) / n;
    final paint = Paint()
      ..color = const Color(0xE64A2A10)
      ..strokeWidth = gap * 0.85
      ..strokeCap = StrokeCap.round;

    double x(int c) => c * (cell + gap);
    double y(int r) => r * (cell + gap);

    for (var r = 0; r < n; r++) {
      for (var c = 0; c < n; c++) {
        final id = puzzle.regions[r][c];
        final left = x(c);
        final top = y(r);
        final right = left + cell;
        final bottom = top + cell;
        final half = gap / 2;

        if (r == 0 || puzzle.regions[r - 1][c] != id) {
          canvas.drawLine(
            Offset(left - half, top - half),
            Offset(right + half, top - half),
            paint,
          );
        }
        if (r == n - 1 || puzzle.regions[r + 1][c] != id) {
          canvas.drawLine(
            Offset(left - half, bottom + half),
            Offset(right + half, bottom + half),
            paint,
          );
        }
        if (c == 0 || puzzle.regions[r][c - 1] != id) {
          canvas.drawLine(
            Offset(left - half, top - half),
            Offset(left - half, bottom + half),
            paint,
          );
        }
        if (c == n - 1 || puzzle.regions[r][c + 1] != id) {
          canvas.drawLine(
            Offset(right + half, top - half),
            Offset(right + half, bottom + half),
            paint,
          );
        }
      }
    }
  }

  @override
  bool shouldRepaint(BeamOutlinePainter old) => old.puzzle != puzzle;
}

class BoardGrid extends StatelessWidget {
  const BoardGrid({
    super.key,
    required this.board,
    required this.onTap,
    this.settled,
  });

  final BoardState board;
  final void Function(int r, int c) onTap;

  /// The square just placed, so only that cat plays the drop animation.
  final Cell? settled;

  @override
  Widget build(BuildContext context) {
    final n = board.n;
    final bad = board.conflicts;
    const gap = 4.0;

    return Container(
      padding: const EdgeInsets.all(9),
      decoration: raised(
        top: P.woodTop,
        bottom: P.woodBottom,
        rim: P.rim,
        base: const Color(0xFF82501F),
        radius: 26,
        drop: 8,
      ),
      child: Container(
        padding: const EdgeInsets.all(8),
        decoration: recessed(
          top: P.wellTop,
          bottom: P.wellBottom,
          radius: 18,
          rim: const Color(0x38000000),
          rimWidth: 2,
        ),
        child: AspectRatio(
          aspectRatio: 1,
          child: Stack(
            children: [
              GridView.builder(
                padding: EdgeInsets.zero,
                physics: const NeverScrollableScrollPhysics(),
                gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: n,
                  mainAxisSpacing: gap,
                  crossAxisSpacing: gap,
                ),
                itemCount: n * n,
                itemBuilder: (context, i) {
                  final r = i ~/ n;
                  final c = i % n;
                  return _Tile(
                    beam: board.puzzle.beamAt(r, c),
                    mark: board.markAt(r, c),
                    conflicted: bad.contains(Cell(r, c)),
                    justSettled: settled == Cell(r, c),
                    size: n,
                    onTap: () => onTap(r, c),
                    label: 'Row ${r + 1}, column ${c + 1}',
                  );
                },
              ),
              Positioned.fill(
                child: IgnorePointer(
                  child: CustomPaint(
                    painter: BeamOutlinePainter(puzzle: board.puzzle, gap: gap),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Tile extends StatelessWidget {
  const _Tile({
    required this.beam,
    required this.mark,
    required this.conflicted,
    required this.justSettled,
    required this.size,
    required this.onTap,
    required this.label,
  });

  final int beam;
  final Mark mark;
  final bool conflicted;
  final bool justSettled;
  final int size;
  final VoidCallback onTap;
  final String label;

  @override
  Widget build(BuildContext context) {
    final (top, bottom) = P.beam(beam);
    final radius = size >= 10 ? 8.0 : 12.0;

    return Semantics(
      button: true,
      label: label,
      child: GestureDetector(
        onTap: onTap,
        child: DecoratedBox(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [top, bottom],
            ),
            borderRadius: BorderRadius.circular(radius),
            boxShadow: const [
              BoxShadow(
                color: Color(0x60381800),
                offset: Offset(0, 2),
                blurRadius: 4,
              ),
            ],
          ),
          child: Stack(
            alignment: Alignment.center,
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(radius),
                child: const Specular(),
              ),
              if (conflicted)
                Positioned.fill(
                  child: DecoratedBox(
                    decoration: BoxDecoration(
                      color: const Color(0xFFC2483B).withValues(alpha: 0.36),
                      borderRadius: BorderRadius.circular(radius),
                    ),
                  ),
                ),
              if (mark == Mark.paw)
                LayoutBuilder(
                  builder: (context, box) => SizedBox(
                    width: box.maxWidth * 0.44,
                    height: box.maxWidth * 0.44,
                    child: CustomPaint(
                      painter: PawPainter(
                        const Color(0xFF4A2A10).withValues(alpha: 0.42),
                      ),
                    ),
                  ),
                ),
              if (mark == Mark.cat)
                LayoutBuilder(
                  builder: (context, box) {
                    final cat = CatIcon(size: box.maxWidth * 0.86);
                    if (!justSettled) return cat;
                    return TweenAnimationBuilder<double>(
                      key: const ValueKey('settle'),
                      tween: Tween(begin: 0, end: 1),
                      duration: const Duration(milliseconds: 420),
                      curve: Curves.elasticOut,
                      builder: (context, t, child) => Transform.translate(
                        offset: Offset(0, -16 * (1 - t)),
                        child: Transform.scale(scale: 0.6 + 0.4 * t, child: child),
                      ),
                      child: cat,
                    );
                  },
                ),
            ],
          ),
        ),
      ),
    );
  }
}
