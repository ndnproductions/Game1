import 'package:flutter/material.dart';

/// The cat, drawn rather than loaded. On the board it has to read at 40px
/// against ten different beam colours, so it stays a flat shape with a strong
/// silhouette; colour and detail belong on the bigger hero screens.
class CatPainter extends CustomPainter {
  const CatPainter({
    required this.fur,
    required this.furShade,
    required this.ear,
    this.eye = const Color(0xFF2B1F14),
    this.shadow = true,
  });

  final Color fur;
  final Color furShade;
  final Color ear;
  final Color eye;
  final bool shadow;

  // Authored in a 100 x 104 box and scaled, so weights hold at any size.
  static const _w = 100.0;
  static const _h = 104.0;

  @override
  void paint(Canvas canvas, Size size) {
    final s = size.width / _w;
    canvas.save();
    canvas.scale(s, size.height / _h);

    final body = Paint()
      ..shader = LinearGradient(
        begin: Alignment.topCenter,
        end: Alignment.bottomCenter,
        colors: [fur, furShade],
      ).createShader(const Rect.fromLTWH(0, 0, _w, _h));

    if (shadow) {
      canvas.drawOval(
        const Rect.fromLTWH(23, 94.5, 54, 9),
        Paint()..color = Colors.black.withValues(alpha: 0.22),
      );
    }

    // tail
    canvas.drawPath(
      Path()
        ..moveTo(70, 90)
        ..cubicTo(88, 88, 95, 73, 87, 62),
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 8
        ..strokeCap = StrokeCap.round
        ..shader = body.shader,
    );

    // body
    canvas.drawPath(
      Path()
        ..moveTo(50, 50)
        ..cubicTo(32, 50, 25, 70, 25, 87)
        ..cubicTo(25, 93, 29, 96, 35, 96)
        ..lineTo(65, 96)
        ..cubicTo(71, 96, 75, 93, 75, 87)
        ..cubicTo(75, 70, 68, 50, 50, 50)
        ..close(),
      body,
    );

    // ears, outer then inner
    void triangle(List<Offset> pts, Paint paint) {
      final path = Path()..moveTo(pts.first.dx, pts.first.dy);
      for (final p in pts.skip(1)) {
        path.lineTo(p.dx, p.dy);
      }
      canvas.drawPath(path..close(), paint);
    }

    final earPaint = Paint()..color = ear;
    triangle(const [Offset(27, 28), Offset(30, 5), Offset(49, 18)], body);
    triangle(const [Offset(73, 28), Offset(70, 5), Offset(51, 18)], body);
    triangle(const [Offset(32, 25), Offset(34, 12), Offset(44, 19)], earPaint);
    triangle(const [Offset(68, 25), Offset(66, 12), Offset(56, 19)], earPaint);

    // head
    canvas.drawOval(const Rect.fromLTWH(24.5, 18.5, 51, 45), body);
    // a soft top light so the head reads as round
    canvas.drawOval(
      const Rect.fromLTWH(31, 19, 38, 16),
      Paint()..color = Colors.white.withValues(alpha: 0.18),
    );
    // cheeks
    final blush = Paint()..color = ear.withValues(alpha: 0.55);
    canvas.drawOval(const Rect.fromLTWH(24.6, 44.9, 10.8, 6.2), blush);
    canvas.drawOval(const Rect.fromLTWH(64.6, 44.9, 10.8, 6.2), blush);

    // face
    final eyePaint = Paint()..color = eye;
    canvas.drawOval(const Rect.fromLTWH(36.4, 34.2, 7.2, 9.6), eyePaint);
    canvas.drawOval(const Rect.fromLTWH(56.4, 34.2, 7.2, 9.6), eyePaint);
    final shine = Paint()..color = Colors.white;
    canvas.drawCircle(const Offset(41.3, 37.2), 1.3, shine);
    canvas.drawCircle(const Offset(61.3, 37.2), 1.3, shine);
    triangle(
      const [Offset(46.2, 47.6), Offset(53.8, 47.6), Offset(50, 52)],
      Paint()..color = const Color(0xFFE08A93),
    );

    canvas.restore();
  }

  @override
  bool shouldRepaint(CatPainter old) =>
      old.fur != fur || old.furShade != furShade || old.ear != ear || old.eye != eye;
}

class CatIcon extends StatelessWidget {
  const CatIcon({
    super.key,
    this.size = 40,
    this.fur = const Color(0xFFFFDDA6),
    this.furShade = const Color(0xFFE9A45F),
    this.ear = const Color(0xFFE4908C),
    this.shadow = true,
  });

  final double size;
  final Color fur;
  final Color furShade;
  final Color ear;
  final bool shadow;

  @override
  Widget build(BuildContext context) => SizedBox(
        width: size,
        height: size * 1.04,
        child: CustomPaint(
          painter: CatPainter(
            fur: fur,
            furShade: furShade,
            ear: ear,
            shadow: shadow,
          ),
        ),
      );
}

/// The "a cat cannot go here" mark.
class PawPainter extends CustomPainter {
  const PawPainter(this.color);

  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final s = size.width / 24;
    canvas.save();
    canvas.scale(s);
    final paint = Paint()..color = color;
    canvas.drawOval(const Rect.fromLTWH(5.8, 11.5, 12.4, 10), paint);
    canvas.drawOval(const Rect.fromLTWH(2.4, 6.5, 5, 6.2), paint);
    canvas.drawOval(const Rect.fromLTWH(6.9, 2.9, 5.2, 6.6), paint);
    canvas.drawOval(const Rect.fromLTWH(11.9, 2.9, 5.2, 6.6), paint);
    canvas.drawOval(const Rect.fromLTWH(16.6, 6.5, 5, 6.2), paint);
    canvas.restore();
  }

  @override
  bool shouldRepaint(PawPainter old) => old.color != color;
}
