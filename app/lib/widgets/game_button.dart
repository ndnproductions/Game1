import 'package:flutter/material.dart';

import '../theme/decorations.dart';
import '../theme/palette.dart';

enum ButtonTone { green, amber, blue }

/// A button with a base underneath it. Pressing drops the face onto the base —
/// five pixels in seventy milliseconds. That travel is the entire reason it
/// reads as an object rather than a rectangle.
class GameButton extends StatefulWidget {
  const GameButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.icon,
    this.tone = ButtonTone.green,
    this.cost,
    this.enabled = true,
    this.stacked = true,
  });

  final String label;
  final IconData? icon;
  final VoidCallback onPressed;
  final ButtonTone tone;

  /// Coin price shown as a badge on the top-right corner.
  final int? cost;
  final bool enabled;

  /// Icon above label (board actions) versus a single centred line (dialogs).
  final bool stacked;

  @override
  State<GameButton> createState() => _GameButtonState();
}

class _GameButtonState extends State<GameButton>
    with SingleTickerProviderStateMixin {
  bool _down = false;
  late final AnimationController _deny = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 340),
  );

  @override
  void dispose() {
    _deny.dispose();
    super.dispose();
  }

  (Color, Color, Color, Color) get _tone => switch (widget.tone) {
        ButtonTone.green => (P.greenTop, P.greenBottom, P.greenRim, P.greenLip),
        ButtonTone.amber => (P.amberTop, P.amberBottom, P.amberRim, P.amberLip),
        ButtonTone.blue => (P.blueTop, P.blueBottom, P.blueRim, P.blueLip),
      };

  void _fire() {
    if (!widget.enabled) {
      _deny.forward(from: 0);
      return;
    }
    widget.onPressed();
  }

  @override
  Widget build(BuildContext context) {
    final (top, bottom, rim, lip) = _tone;
    const drop = 6.0;

    final face = AnimatedContainer(
      duration: const Duration(milliseconds: 70),
      curve: Curves.easeOut,
      transform: Matrix4.translationValues(0, _down ? drop - 1 : 0, 0),
      decoration: raised(
        top: top,
        bottom: bottom,
        rim: rim,
        base: lip,
        radius: 18,
        drop: _down ? 1 : drop,
      ),
      padding: EdgeInsets.symmetric(
        horizontal: widget.stacked ? 6 : 22,
        vertical: widget.stacked ? 11 : 13,
      ),
      child: Glossy(
        radius: 18,
        strength: 0.55,
        child: _content(),
      ),
    );

    return AnimatedBuilder(
      animation: _deny,
      builder: (context, child) {
        final t = _deny.value;
        final shake = t == 0 ? 0.0 : (t < 0.5 ? -1 : 1) * 5 * (1 - t);
        return Transform.translate(offset: Offset(shake, 0), child: child);
      },
      child: Semantics(
        button: true,
        label: widget.label,
        child: GestureDetector(
          onTapDown: (_) => setState(() => _down = true),
          onTapUp: (_) => setState(() => _down = false),
          onTapCancel: () => setState(() => _down = false),
          onTap: _fire,
          child: widget.cost == null
              ? face
              : Stack(
                  // passthrough, or the Stack sizes to the face and the button
                  // stops filling its Expanded while the badge drifts loose.
                  fit: StackFit.passthrough,
                  clipBehavior: Clip.none,
                  children: [
                    face,
                    Positioned(right: -6, top: -9, child: _CostBadge(widget.cost!)),
                  ],
                ),
        ),
      ),
    );
  }

  Widget _content() {
    final text = Text(
      widget.label,
      style: const TextStyle(
        fontFamily: displayFont,
        fontSize: 15,
        fontWeight: FontWeight.w800,
        color: Colors.white,
        shadows: [Shadow(offset: Offset(0, 2), color: Color(0x5C000000))],
      ),
    );
    if (!widget.stacked || widget.icon == null) {
      return Center(child: text);
    }
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(widget.icon, size: 23, color: Colors.white),
        const SizedBox(height: 2),
        text,
      ],
    );
  }
}

class _CostBadge extends StatelessWidget {
  const _CostBadge(this.cost);

  final int cost;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.fromLTRB(5, 2, 8, 3),
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [P.hudTop, P.hudBottom],
          ),
          borderRadius: BorderRadius.circular(999),
          border: Border.all(color: P.hudRim, width: 2),
          boxShadow: const [
            BoxShadow(color: P.hudBase, offset: Offset(0, 2), blurRadius: 0),
          ],
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            const CoinIcon(size: 15),
            const SizedBox(width: 3),
            Text(
              '$cost',
              style: const TextStyle(
                fontFamily: displayFont,
                fontSize: 12.5,
                fontWeight: FontWeight.w800,
                color: Color(0xFFFFE9BC),
              ),
            ),
          ],
        ),
      );
}

class CoinIcon extends StatelessWidget {
  const CoinIcon({super.key, this.size = 22});

  final double size;

  @override
  Widget build(BuildContext context) => SizedBox(
        width: size,
        height: size,
        child: CustomPaint(painter: _CoinPainter()),
      );
}

class _CoinPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final r = size.width / 2;
    final c = Offset(r, r);
    canvas.drawCircle(
      c,
      r - 1,
      Paint()
        ..shader = const LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [Color(0xFFFFEFA8), Color(0xFFEA9410)],
        ).createShader(Rect.fromCircle(center: c, radius: r)),
    );
    canvas.drawCircle(
      c,
      r - 1,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = size.width * 0.09
        ..color = const Color(0xFF8A5210),
    );
    canvas.drawCircle(
      c,
      r * 0.58,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = size.width * 0.07
        ..color = const Color(0xFFC67F14),
    );
  }

  @override
  bool shouldRepaint(_CoinPainter old) => false;
}
