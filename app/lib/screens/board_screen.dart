import 'package:flutter/material.dart';

import '../model/puzzle.dart';
import '../model/rules.dart';
import '../theme/palette.dart';
import '../widgets/board_grid.dart';
import '../widgets/cat.dart';
import '../widgets/game_button.dart';
import '../widgets/hud.dart';
import '../widgets/outlined_title.dart';
import '../widgets/plate.dart';

const hintCost = 25;
const levelReward = 120;

class BoardScreen extends StatefulWidget {
  const BoardScreen({
    super.key,
    required this.puzzle,
    required this.coins,
    required this.onCoinsChanged,
  });

  final Puzzle puzzle;
  final int coins;
  final ValueChanged<int> onCoinsChanged;

  @override
  State<BoardScreen> createState() => _BoardScreenState();
}

class _BoardScreenState extends State<BoardScreen> {
  late final BoardState _board = BoardState(widget.puzzle);
  late int _coins = widget.coins;
  final List<List<List<Mark>>> _history = [];
  Cell? _settled;
  bool _celebrated = false;

  void _snapshot() {
    _history.add([for (final row in _board.marks) [...row]]);
    if (_history.length > 60) _history.removeAt(0);
  }

  void _tap(int r, int c) {
    _snapshot();
    setState(() {
      final now = _board.cycle(r, c);
      _settled = now == Mark.cat ? Cell(r, c) : null;
    });
    _checkWin();
  }

  void _undo() {
    if (_history.isEmpty) return;
    setState(() {
      final previous = _history.removeLast();
      for (var r = 0; r < _board.n; r++) {
        for (var c = 0; c < _board.n; c++) {
          _board.marks[r][c] = previous[r][c];
        }
      }
      _settled = null;
    });
  }

  void _hint() {
    if (_board.nextHintRow() == null) return;
    if (_coins < hintCost) return;
    _snapshot();
    setState(() {
      _coins -= hintCost;
      _settled = _board.applyHint();
    });
    widget.onCoinsChanged(_coins);
    _checkWin();
  }

  void _checkWin() {
    if (_celebrated || !_board.isSolved) return;
    _celebrated = true;
    Future.delayed(const Duration(milliseconds: 520), () {
      if (mounted) _showWin();
    });
  }

  Future<void> _showWin() async {
    await showDialog<void>(
      context: context,
      barrierColor: const Color(0x9E26100A),
      builder: (context) => _WinDialog(
        onContinue: () {
          setState(() => _coins += levelReward);
          widget.onCoinsChanged(_coins);
          Navigator.of(context).pop();
        },
      ),
    );
    if (mounted) Navigator.of(context).maybePop();
  }

  @override
  Widget build(BuildContext context) {
    final placed = _board.cats.length;
    final n = _board.n;
    final canHint = _board.nextHintRow() != null && _coins >= hintCost;

    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [P.skyTop, P.skyMid, P.horizon, P.floorTop, P.floorBottom],
            stops: [0, 0.28, 0.5, 0.57, 1],
          ),
        ),
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(12, 12, 12, 14),
            child: Column(
              children: [
                HudBar(
                  lives: 5,
                  coins: _coins,
                  onSettings: () => Navigator.of(context).maybePop(),
                ),
                const SizedBox(height: 10),
                Ribbon(
                  child: OutlinedTitle(
                    'Level ${widget.puzzle.level}',
                    size: 22,
                    stroke: const Color(0xFF7A1A16),
                    fill: const [Color(0xFFFFF6DE), Color(0xFFFFD05A)],
                  ),
                ),
                const SizedBox(height: 10),
                Plate(
                  child: Row(
                    children: [
                      const CatIcon(size: 34, shadow: false),
                      const SizedBox(width: 10),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            '$placed of $n',
                            style: const TextStyle(
                              fontFamily: displayFont,
                              fontSize: 14,
                              fontWeight: FontWeight.w800,
                              color: P.rim,
                              height: 1.15,
                            ),
                          ),
                          const Text(
                            'CATS SETTLED',
                            style: TextStyle(
                              fontSize: 9.5,
                              fontWeight: FontWeight.w800,
                              letterSpacing: 0.9,
                              color: Color(0xFFA57A44),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(width: 10),
                      Expanded(child: Meter(value: n == 0 ? 0 : placed / n)),
                    ],
                  ),
                ),
                const SizedBox(height: 10),
                Expanded(
                  child: Align(
                    alignment: Alignment.topCenter,
                    child: SingleChildScrollView(
                      child: BoardGrid(
                        board: _board,
                        settled: _settled,
                        onTap: _tap,
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 10),
                Row(
                  children: [
                    Expanded(
                      child: GameButton(
                        label: 'Undo',
                        icon: Icons.undo_rounded,
                        tone: ButtonTone.blue,
                        onPressed: _undo,
                      ),
                    ),
                    const SizedBox(width: 9),
                    Expanded(
                      child: GameButton(
                        label: 'Hint',
                        icon: Icons.lightbulb_outline_rounded,
                        cost: hintCost,
                        enabled: canHint,
                        onPressed: _hint,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _WinDialog extends StatelessWidget {
  const _WinDialog({required this.onContinue});

  final VoidCallback onContinue;

  @override
  Widget build(BuildContext context) => Dialog(
        backgroundColor: Colors.transparent,
        insetPadding: const EdgeInsets.all(24),
        child: Plate(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 18),
          radius: 26,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  for (final big in [false, true, false])
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 3),
                      child: Icon(
                        Icons.star_rounded,
                        size: big ? 58 : 46,
                        color: const Color(0xFFF5A81C),
                        shadows: const [
                          Shadow(color: Color(0xFF8A5210), offset: Offset(0, 2)),
                        ],
                      ),
                    ),
                ],
              ),
              const SizedBox(height: 6),
              const OutlinedTitle(
                'All settled!',
                size: 27,
                strokeRatio: 0.19,
                fill: [Color(0xFFFFF8DE), Color(0xFFFFB524)],
              ),
              const SizedBox(height: 10),
              const Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  CoinIcon(size: 28),
                  SizedBox(width: 7),
                  Text(
                    '+$levelReward',
                    style: TextStyle(
                      fontFamily: displayFont,
                      fontSize: 18,
                      fontWeight: FontWeight.w800,
                      color: P.rim,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 14),
              SizedBox(
                width: double.infinity,
                child: GameButton(
                  label: 'Continue',
                  stacked: false,
                  onPressed: onContinue,
                ),
              ),
            ],
          ),
        ),
      );
}
