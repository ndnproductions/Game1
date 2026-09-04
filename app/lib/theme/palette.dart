import 'package:flutter/material.dart';

/// Bundled rather than fetched. A game that waits on a font CDN renders its
/// first frame with no text at all, and on a plane it never renders it.
const displayFont = 'Baloo2';
const uiFont = 'Nunito';

/// The production palette. High chroma with a hard dark rim on every piece —
/// that rim is what stops saturated colours vibrating against each other.
abstract final class P {
  // world
  static const skyTop = Color(0xFF4FBCE6);
  static const skyMid = Color(0xFF86D5EC);
  static const horizon = Color(0xFFC9E7E6);
  static const floorTop = Color(0xFFE8BC85);
  static const floorBottom = Color(0xFFA9682F);
  static const sun = Color(0xFFFFE6AE);

  // frames
  static const rim = Color(0xFF6B3B17);
  static const rimDeep = Color(0xFF8A5522);
  static const goldTop = Color(0xFFFFE07A);
  static const goldBottom = Color(0xFFF0A62A);
  static const faceTop = Color(0xFFFFF7E7);
  static const faceBottom = Color(0xFFFBE6C2);
  static const woodTop = Color(0xFFEDBC74);
  static const woodBottom = Color(0xFFB67736);
  static const wellTop = Color(0xFF6E4419);
  static const wellBottom = Color(0xFF8A5828);

  // buttons
  static const greenTop = Color(0xFF96E663);
  static const greenBottom = Color(0xFF54B333);
  static const greenRim = Color(0xFF2C6A1B);
  static const greenLip = Color(0xFF3D8A24);
  static const amberTop = Color(0xFFFFCE5C);
  static const amberBottom = Color(0xFFF09622);
  static const amberRim = Color(0xFF8F4E12);
  static const amberLip = Color(0xFFC46F0F);
  static const blueTop = Color(0xFF8ADAF8);
  static const blueBottom = Color(0xFF3E9BD6);
  static const blueRim = Color(0xFF1F5C87);
  static const blueLip = Color(0xFF2C7CAE);

  // HUD
  static const hudTop = Color(0xFF5A3A78);
  static const hudBottom = Color(0xFF2E1B41);
  static const hudRim = Color(0xFF8B67B8);
  static const hudBase = Color(0xFF1B0F28);
  static const cream = Color(0xFFFFF3D6);
  static const bezel = Color(0xFFFFF6E2);

  /// Beam colours, light and dark for the gloss gradient. Eight, so a 10x10
  /// board reuses two — the outline is what separates them.
  static const beams = <(Color, Color)>[
    (Color(0xFFFF8FA0), Color(0xFFE85F78)),
    (Color(0xFFFFC94A), Color(0xFFEFA019)),
    (Color(0xFFA6DE6B), Color(0xFF6FB742)),
    (Color(0xFF6FD0EE), Color(0xFF3A9DC6)),
    (Color(0xFFB79BF0), Color(0xFF8B6FD4)),
    (Color(0xFFFFA45C), Color(0xFFE87932)),
    (Color(0xFF8FD9C0), Color(0xFF4FA98A)),
    (Color(0xFFF2A0CE), Color(0xFFD46FAA)),
    (Color(0xFFB6C7F0), Color(0xFF7D93D6)),
    (Color(0xFFE0C48A), Color(0xFFBE9A54)),
  ];

  static (Color, Color) beam(int id) => beams[id % beams.length];
}
