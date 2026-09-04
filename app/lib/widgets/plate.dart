import 'package:flutter/material.dart';

import '../theme/decorations.dart';
import '../theme/palette.dart';

/// Two containers, not one: a gold outer frame with its own rim and base,
/// holding a recessed cream face. The inner shadow is what sells the recess.
class Plate extends StatelessWidget {
  const Plate({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.fromLTRB(12, 9, 12, 9),
    this.radius = 22,
  });

  final Widget child;
  final EdgeInsets padding;
  final double radius;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(6),
        decoration: raised(
          top: P.goldTop,
          bottom: P.goldBottom,
          rim: P.rim,
          base: P.rimDeep,
          radius: radius,
        ),
        child: Container(
          padding: padding,
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: [P.faceTop, P.faceBottom],
            ),
            borderRadius: BorderRadius.circular(radius - 6),
            border: Border.all(color: const Color(0xFFC89A5A), width: 2),
          ),
          child: child,
        ),
      );
}

/// The stage ribbon: a banner with swallowtail ends behind it.
class Ribbon extends StatelessWidget {
  const Ribbon({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) => Stack(
        clipBehavior: Clip.none,
        alignment: Alignment.center,
        children: [
          Positioned(left: -27, top: 13, child: _tail(true)),
          Positioned(right: -27, top: 13, child: _tail(false)),
          Container(
            padding: const EdgeInsets.fromLTRB(32, 7, 32, 9),
            decoration: raised(
              top: const Color(0xFFFF7A63),
              bottom: const Color(0xFFD8382F),
              rim: const Color(0xFF8E1F1A),
              base: const Color(0xFFA32620),
              radius: 13,
              rimWidth: 2.5,
              drop: 5,
            ),
            child: child,
          ),
        ],
      );

  Widget _tail(bool left) => ClipPath(
        clipper: _TailClipper(left: left),
        child: Container(
          width: 36,
          height: 25,
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: [Color(0xFFB62A22), Color(0xFF7C1713)],
            ),
          ),
        ),
      );
}

class _TailClipper extends CustomClipper<Path> {
  const _TailClipper({required this.left});

  final bool left;

  @override
  Path getClip(Size size) {
    final w = size.width;
    final h = size.height;
    return left
        ? (Path()
          ..moveTo(w, 0)
          ..lineTo(0, 0)
          ..lineTo(w * 0.30, h / 2)
          ..lineTo(0, h)
          ..lineTo(w, h)
          ..close())
        : (Path()
          ..moveTo(0, 0)
          ..lineTo(w, 0)
          ..lineTo(w * 0.70, h / 2)
          ..lineTo(w, h)
          ..lineTo(0, h)
          ..close());
  }

  @override
  bool shouldReclip(_TailClipper old) => old.left != left;
}

/// Progress carved into the surface with the fill sitting proud of it —
/// opposite shadow directions, which is what makes the track look like a hole.
class Meter extends StatelessWidget {
  const Meter({super.key, required this.value});

  final double value;

  @override
  Widget build(BuildContext context) => Container(
        height: 19,
        decoration: recessed(
          top: const Color(0xFF8A5A2E),
          bottom: const Color(0xFF7A4E26),
          radius: 999,
          rim: const Color(0xFF6B3F17),
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(999),
          child: Align(
            alignment: Alignment.centerLeft,
            child: FractionallySizedBox(
              widthFactor: value.clamp(0.0, 1.0),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 550),
                curve: Curves.easeOutBack,
                decoration: const BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [P.greenTop, P.greenBottom],
                  ),
                ),
              ),
            ),
          ),
        ),
      );
}
