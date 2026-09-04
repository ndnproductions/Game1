import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sunspot/model/puzzle.dart';
import 'package:sunspot/screens/board_screen.dart';

Puzzle _fixture() => Puzzle.fromJson({
      'level': 34,
      'n': 6,
      'tier': 'warm',
      'chapter': 'The Garden',
      'regions': ['DAABBB', 'DACCBB', 'DCCCBB', 'DCCEEB', 'DCEEEB', 'FFEEEB'],
      'solution': [2, 5, 3, 0, 4, 1],
      'score': 15,
      'steps': 9,
    });

Future<void> _pump(WidgetTester tester, {int coins = 1240}) =>
    tester.pumpWidget(
      MaterialApp(
        home: BoardScreen(
          puzzle: _fixture(),
          coins: coins,
          onCoinsChanged: (_) {},
        ),
      ),
    );

void main() {
  testWidgets('the board screen renders the level and an empty goal',
      (tester) async {
    await _pump(tester);
    // OutlinedTitle paints the text twice on purpose — a stroked copy behind
    // and a gradient-filled copy in front — so both matches are expected.
    expect(find.text('Level 34'), findsNWidgets(2));
    expect(find.text('0 of 6'), findsOneWidget);
    expect(find.text('Undo'), findsOneWidget);
    expect(find.text('Hint'), findsOneWidget);
  });

  testWidgets('two taps on a square settle a cat and move the goal',
      (tester) async {
    await _pump(tester);
    final square = find.bySemanticsLabel('Row 1, column 1');
    await tester.tap(square);
    await tester.pump();
    // first tap is a paw print, so the count has not moved
    expect(find.text('0 of 6'), findsOneWidget);

    await tester.tap(square);
    await tester.pump();
    expect(find.text('1 of 6'), findsOneWidget);
  });

  testWidgets('a hint costs coins and settles a cat', (tester) async {
    var coins = 1240;
    await tester.pumpWidget(
      MaterialApp(
        home: BoardScreen(
          puzzle: _fixture(),
          coins: coins,
          onCoinsChanged: (value) => coins = value,
        ),
      ),
    );
    await tester.tap(find.text('Hint'));
    await tester.pump();
    expect(coins, 1240 - hintCost);
    expect(find.text('1 of 6'), findsOneWidget);
  });

  testWidgets('a hint is refused when the wallet is short', (tester) async {
    var coins = 5;
    await tester.pumpWidget(
      MaterialApp(
        home: BoardScreen(
          puzzle: _fixture(),
          coins: coins,
          onCoinsChanged: (value) => coins = value,
        ),
      ),
    );
    await tester.tap(find.text('Hint'));
    await tester.pump();
    expect(coins, 5);
    expect(find.text('0 of 6'), findsOneWidget);
  });
}
