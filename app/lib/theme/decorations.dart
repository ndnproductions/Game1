import 'package:flutter/material.dart';

import 'palette.dart';

/// The layer stack every surface in this genre uses: a gradient face, a rim,
/// a base sitting underneath, and a cast shadow. Flutter has no inset shadow,
/// so the top highlight is painted as an overlay by [Glossy].
BoxDecoration raised({
  required Color top,
  required Color bottom,
  required Color rim,
  required Color base,
  double radius = 18,
  double rimWidth = 3,
  double drop = 6,
}) =>
    BoxDecoration(
      gradient: LinearGradient(
        begin: Alignment.topCenter,
        end: Alignment.bottomCenter,
        colors: [top, bottom],
      ),
      borderRadius: BorderRadius.circular(radius),
      border: Border.all(color: rim, width: rimWidth),
      boxShadow: [
        BoxShadow(color: base, offset: Offset(0, drop), blurRadius: 0),
        BoxShadow(
          color: Colors.black.withValues(alpha: 0.34),
          offset: Offset(0, drop + 5),
          blurRadius: 16,
        ),
      ],
    );

/// A surface carved *into* its parent — the meter track, the board well.
BoxDecoration recessed({
  required Color top,
  required Color bottom,
  double radius = 18,
  Color rim = P.rim,
  double rimWidth = 2.5,
}) =>
    BoxDecoration(
      gradient: LinearGradient(
        begin: Alignment.topCenter,
        end: Alignment.bottomCenter,
        colors: [top, bottom],
      ),
      borderRadius: BorderRadius.circular(radius),
      border: Border.all(color: rim, width: rimWidth),
    );

/// Paints the white top highlight and dark bottom edge that sell a moulded
/// surface. Wrap it around anything using [raised].
class Glossy extends StatelessWidget {
  const Glossy({
    super.key,
    required this.child,
    this.radius = 18,
    this.strength = 0.5,
  });

  final Widget child;
  final double radius;
  final double strength;

  @override
  Widget build(BuildContext context) => Stack(
        // without this the overlay Stack pushes its content to the top-left
        alignment: Alignment.center,
        children: [
          child,
          Positioned.fill(
            child: IgnorePointer(
              child: DecoratedBox(
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(radius),
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [
                      Colors.white.withValues(alpha: strength),
                      Colors.white.withValues(alpha: 0),
                      Colors.black.withValues(alpha: 0.16),
                    ],
                    stops: const [0, 0.34, 1],
                  ),
                ),
              ),
            ),
          ),
        ],
      );
}

/// The blurred specular blob in a tile's top-left corner. This one detail is
/// what turns a flat square into something that looks lit.
class Specular extends StatelessWidget {
  const Specular({super.key, this.opacity = 0.55});

  final double opacity;

  @override
  Widget build(BuildContext context) => LayoutBuilder(
        builder: (context, constraints) {
          final w = constraints.maxWidth;
          return IgnorePointer(
            child: Padding(
              padding: EdgeInsets.only(top: w * 0.08, left: w * 0.10),
              child: Align(
                alignment: Alignment.topLeft,
                child: Container(
                  width: w * 0.40,
                  height: w * 0.24,
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: opacity),
                    borderRadius: BorderRadius.all(
                      Radius.elliptical(w * 0.20, w * 0.12),
                    ),
                  ),
                ),
              ),
            ),
          );
        },
      );
}
