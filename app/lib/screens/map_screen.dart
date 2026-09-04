import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../model/curve.dart';
import '../model/levels.dart';
import '../theme/decorations.dart';
import '../theme/palette.dart';
import '../widgets/cat.dart';
import '../widgets/game_button.dart';
import '../widgets/hud.dart';
import '../widgets/outlined_title.dart';

const _spacing = 92.0;
const _shown = 26;

/// The stage map. Levels climb upward, so the earliest stage sits at the bottom
/// and the path runs up through the chapters.
class MapScreen extends StatefulWidget {
  const MapScreen({
    super.key,
    required this.pack,
    required this.current,
    required this.coins,
    required this.onPlay,
  });

  final LevelPack pack;
  final int current;
  final int coins;
  final void Function(int level) onPlay;

  @override
  State<MapScreen> createState() => _MapScreenState();
}

class _MapScreenState extends State<MapScreen> {
  late final ScrollController _scroll;
  late final int _from = math.max(1, widget.current - 14);

  double _worldHeight() => _shown * _spacing + 150;

  double _yAt(int index) => _worldHeight() - 105 - index * _spacing;

  double _xFractionAt(int index) => 0.5 + math.sin(index * 0.72) * 0.25;

  @override
  void initState() {
    super.initState();
    final currentY = _yAt(widget.current - _from);
    _scroll = ScrollController(initialScrollOffset: math.max(0, currentY - 320));
  }

  @override
  void dispose() {
    _scroll.dispose();
    super.dispose();
  }

  /// Deterministic so the map looks the same on every load.
  int _starsFor(int level) => 1 + (level * 2654435761).abs() % 3;

  @override
  Widget build(BuildContext context) {
    final chapter = chapterFor(widget.current);

    return Scaffold(
      body: Stack(
        children: [
          Positioned.fill(
            child: SingleChildScrollView(
              controller: _scroll,
              child: SizedBox(
                height: _worldHeight(),
                child: Stack(children: _world()),
              ),
            ),
          ),
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            child: Container(
              padding: const EdgeInsets.fromLTRB(12, 12, 12, 24),
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [Color(0x8014344A), Color(0x0014344A)],
                ),
              ),
              child: SafeArea(
                bottom: false,
                child: HudBar(lives: 5, coins: widget.coins),
              ),
            ),
          ),
          Positioned(
            left: 0,
            right: 0,
            bottom: 0,
            child: Container(
              padding: const EdgeInsets.fromLTRB(14, 18, 14, 14),
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [Color(0x00502A0C), Color(0xCC502A0C)],
                ),
              ),
              child: SafeArea(
                top: false,
                child: Row(
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          'Level ${widget.current}',
                          style: const TextStyle(
                            fontFamily: displayFont,
                            fontSize: 17,
                            fontWeight: FontWeight.w800,
                            color: P.cream,
                            shadows: [
                              Shadow(offset: Offset(0, 2), color: Color(0x88000000)),
                            ],
                          ),
                        ),
                        Text(
                          '${chapter.name} · ${chapter.n}×${chapter.n}',
                          style: const TextStyle(
                            fontSize: 9.5,
                            fontWeight: FontWeight.w800,
                            letterSpacing: 0.9,
                            color: Color(0xFFF3D9A8),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: GameButton(
                        label: 'Play',
                        stacked: false,
                        onPressed: () => widget.onPlay(widget.current),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  List<Widget> _world() {
    final widgets = <Widget>[
      // The painted plate belongs here. Until real art is bought this is a
      // stand-in gradient banded to the chapters, not a finished background.
      const Positioned.fill(
        child: DecoratedBox(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: [
                Color(0xFF6FB05C),
                Color(0xFF93C56B),
                Color(0xFFB9C87E),
                Color(0xFFE0B678),
                Color(0xFFC98A50),
                Color(0xFFA9682F),
              ],
              stops: [0, 0.4, 0.62, 0.76, 0.92, 1],
            ),
          ),
        ),
      ),
    ];

    // trail
    for (var i = 0; i < _shown - 1; i++) {
      for (var d = 1; d <= 4; d++) {
        final t = d / 5;
        widgets.add(
          _Frac(
            xFraction: _xFractionAt(i) + (_xFractionAt(i + 1) - _xFractionAt(i)) * t,
            y: _yAt(i) + (_yAt(i + 1) - _yAt(i)) * t,
            child: Container(
              width: 9,
              height: 9,
              decoration: BoxDecoration(
                color: const Color(0xE6FFFCEE),
                shape: BoxShape.circle,
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.3),
                    offset: const Offset(0, 1),
                    blurRadius: 2,
                  ),
                ],
              ),
            ),
          ),
        );
      }
    }

    // cats living on the map
    const catSpots = [3, 8, 13, 19, 24];
    for (var i = 0; i < catSpots.length; i++) {
      final index = catSpots[i];
      widgets.add(
        _Frac(
          xFraction: _xFractionAt(index) + (i.isEven ? -0.13 : 0.13),
          y: _yAt(index) + 28,
          child: CatIcon(
            size: 52,
            fur: i.isEven ? const Color(0xFFFFDDA6) : const Color(0xFFEDE3D6),
            furShade: i.isEven ? const Color(0xFFE9A45F) : const Color(0xFFC3B4A4),
          ),
        ),
      );
    }

    // chapter signs where the board size changes
    for (final chapter in chapters) {
      final index = chapter.from - _from;
      if (index <= 0 || index >= _shown) continue;
      widgets.add(
        _Frac(
          xFraction: 0.5,
          y: (_yAt(index) + _yAt(index - 1)) / 2,
          child: Container(
            padding: const EdgeInsets.fromLTRB(22, 7, 22, 9),
            decoration: raised(
              top: const Color(0xFFD69B5D),
              bottom: const Color(0xFF8E5423),
              rim: const Color(0xFF5E3413),
              base: const Color(0xFF6B3F17),
              radius: 12,
              drop: 5,
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  chapter.name,
                  style: const TextStyle(
                    fontFamily: displayFont,
                    fontSize: 15.5,
                    fontWeight: FontWeight.w800,
                    color: Color(0xFFFFEDC6),
                    shadows: [
                      Shadow(offset: Offset(0, 2), color: Color(0x88000000)),
                    ],
                  ),
                ),
                Text(
                  '${chapter.n}×${chapter.n} boards',
                  style: const TextStyle(
                    fontSize: 9.5,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 0.9,
                    color: Color(0xFFF0C88B),
                  ),
                ),
              ],
            ),
          ),
        ),
      );
    }

    // stages
    for (var i = 0; i < _shown; i++) {
      final level = _from + i;
      final done = level < widget.current;
      final now = level == widget.current;
      if (done) {
        widgets.add(
          _Frac(
            xFraction: _xFractionAt(i),
            y: _yAt(i) - 46,
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                for (var s = 1; s <= 3; s++)
                  Icon(
                    Icons.star_rounded,
                    size: 16,
                    color: s <= _starsFor(level)
                        ? const Color(0xFFF5A81C)
                        : const Color(0x66FFFFFF),
                  ),
              ],
            ),
          ),
        );
      }
      widgets.add(
        _Frac(
          xFraction: _xFractionAt(i),
          y: _yAt(i),
          child: _Node(
            level: level,
            done: done,
            current: now,
            onTap: level <= widget.current ? () => widget.onPlay(level) : null,
          ),
        ),
      );
    }
    return widgets;
  }
}

/// Positions a child by fraction of width and absolute y, centred on the point.
class _Frac extends StatelessWidget {
  const _Frac({required this.xFraction, required this.y, required this.child});

  final double xFraction;
  final double y;
  final Widget child;

  @override
  Widget build(BuildContext context) => Positioned(
        left: 0,
        right: 0,
        top: y,
        child: FractionalTranslation(
          translation: const Offset(0, -0.5),
          child: Align(
            alignment: Alignment(xFraction * 2 - 1, 0),
            child: child,
          ),
        ),
      );
}

class _Node extends StatelessWidget {
  const _Node({
    required this.level,
    required this.done,
    required this.current,
    this.onTap,
  });

  final int level;
  final bool done;
  final bool current;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final size = current ? 72.0 : 54.0;
    final (top, bottom, rim, lip) = current
        ? (const Color(0xFFFFDE6E), P.goldBottom, const Color(0xFF8A5210), const Color(0xFFB9750F))
        : done
            ? (P.greenTop, const Color(0xFF4FA82F), P.greenRim, P.greenLip)
            : (const Color(0xFFC0B6AA), const Color(0xFF8A7F74), const Color(0xFF5F564D), const Color(0xFF6E655C));

    return Semantics(
      button: onTap != null,
      label: done || current ? 'Stage $level' : 'Stage $level, locked',
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          width: size,
          height: size,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: [top, bottom],
            ),
            shape: BoxShape.circle,
            border: Border.all(color: rim, width: current ? 3.5 : 3),
            boxShadow: [
              // the cream bezel — without it a green node vanishes into grass
              const BoxShadow(color: P.bezel, spreadRadius: 4),
              BoxShadow(color: lip, offset: Offset(0, current ? 7 : 5)),
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.36),
                offset: Offset(0, current ? 14 : 10),
                blurRadius: 16,
              ),
            ],
          ),
          child: done || current
              ? OutlinedTitle(
                  '$level',
                  size: current ? 23 : 19,
                  strokeRatio: 0.16,
                  stroke: rim,
                  fill: current
                      ? const [Color(0xFFFFFDF0), Color(0xFFFFE9A8)]
                      : const [Colors.white, Color(0xFFE4FFD6)],
                )
              : const Icon(Icons.lock_rounded, size: 24, color: Color(0xFFF2ECE3)),
        ),
      ),
    );
  }
}
