import 'package:flutter/material.dart';

import '../theme/palette.dart';

/// Heavy display type the way the genre draws it: a thick stroked copy behind,
/// a gradient-filled copy in front. Never one flat colour — the gradient is
/// what stops it reading as a web heading. Stroke weight scales with the type
/// size, or it swallows the fill.
class OutlinedTitle extends StatelessWidget {
  const OutlinedTitle(
    this.text, {
    super.key,
    this.size = 22,
    this.stroke = const Color(0xFF6B3B17),
    this.fill = const [Color(0xFFFFFAE6), Color(0xFFFFC33F)],
    this.strokeRatio = 0.26,
  });

  final String text;
  final double size;
  final Color stroke;
  final List<Color> fill;
  final double strokeRatio;

  @override
  Widget build(BuildContext context) {
    final base = TextStyle(
      fontFamily: displayFont,
      fontSize: size,
      fontWeight: FontWeight.w800,
      height: 1.15,
      letterSpacing: 0.2,
    );
    return Stack(
      children: [
        Text(
          text,
          style: base.copyWith(
            foreground: Paint()
              ..style = PaintingStyle.stroke
              ..strokeWidth = size * strokeRatio
              ..strokeJoin = StrokeJoin.round
              ..color = stroke,
          ),
        ),
        ShaderMask(
          shaderCallback: (rect) => LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: fill,
            stops: const [0.3, 1],
          ).createShader(rect),
          child: Text(text, style: base.copyWith(color: Colors.white)),
        ),
      ],
    );
  }
}
