import 'package:flutter/material.dart';

import '../theme/palette.dart';
import 'game_button.dart';

/// A HUD counter — heart or coin, a value, and the green plus that every
/// casual game uses to mean "tap to buy more".
class HudPill extends StatelessWidget {
  const HudPill({
    super.key,
    required this.value,
    required this.icon,
    this.showPlus = true,
  });

  final String value;
  final Widget icon;
  final bool showPlus;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.fromLTRB(5, 5, 13, 5),
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [P.hudTop, P.hudBottom],
          ),
          borderRadius: BorderRadius.circular(999),
          border: Border.all(color: P.hudRim, width: 2.5),
          boxShadow: const [
            BoxShadow(color: P.hudBase, offset: Offset(0, 3), blurRadius: 0),
            BoxShadow(
              color: Color(0x5C000000),
              offset: Offset(0, 7),
              blurRadius: 12,
            ),
          ],
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            icon,
            const SizedBox(width: 6),
            Text(
              value,
              style: const TextStyle(
                fontFamily: displayFont,
                fontSize: 15,
                fontWeight: FontWeight.w800,
                color: P.cream,
                fontFeatures: [FontFeature.tabularFigures()],
                shadows: [Shadow(offset: Offset(0, 2), color: Color(0x73000000))],
              ),
            ),
            if (showPlus) ...[
              const SizedBox(width: 5),
              Container(
                width: 17,
                height: 17,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [P.greenTop, Color(0xFF4FA82F)],
                  ),
                  shape: BoxShape.circle,
                  border: Border.all(color: P.greenRim, width: 2),
                ),
                child: const Text(
                  '+',
                  style: TextStyle(
                    fontSize: 11,
                    height: 1,
                    fontWeight: FontWeight.w900,
                    color: Colors.white,
                  ),
                ),
              ),
            ],
          ],
        ),
      );
}

class HeartIcon extends StatelessWidget {
  const HeartIcon({super.key, this.size = 22});

  final double size;

  @override
  Widget build(BuildContext context) => Icon(
        Icons.favorite,
        size: size,
        color: const Color(0xFFE8556B),
        shadows: const [Shadow(color: Color(0x88000000), offset: Offset(0, 1))],
      );
}

class HudBar extends StatelessWidget {
  const HudBar({
    super.key,
    required this.lives,
    required this.coins,
    this.onSettings,
    this.coinsKey,
  });

  final int lives;
  final int coins;
  final VoidCallback? onSettings;
  final Key? coinsKey;

  @override
  Widget build(BuildContext context) => Row(
        children: [
          HudPill(value: '$lives', icon: const HeartIcon()),
          const SizedBox(width: 7),
          HudPill(
            key: coinsKey,
            value: _grouped(coins),
            icon: const CoinIcon(size: 23),
          ),
          const Spacer(),
          GestureDetector(
            onTap: onSettings,
            child: Container(
              width: 40,
              height: 40,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [P.hudTop, P.hudBottom],
                ),
                borderRadius: BorderRadius.circular(13),
                border: Border.all(color: P.hudRim, width: 2.5),
                boxShadow: const [
                  BoxShadow(color: P.hudBase, offset: Offset(0, 3), blurRadius: 0),
                ],
              ),
              child: const Icon(Icons.settings, size: 21, color: Color(0xFFFFE9BC)),
            ),
          ),
        ],
      );

  static String _grouped(int value) {
    final digits = value.toString();
    final buffer = StringBuffer();
    for (var i = 0; i < digits.length; i++) {
      if (i > 0 && (digits.length - i) % 3 == 0) buffer.write(',');
      buffer.write(digits[i]);
    }
    return buffer.toString();
  }
}
