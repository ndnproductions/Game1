import 'package:flutter/material.dart';

import 'model/levels.dart';
import 'theme/palette.dart';
import 'screens/board_screen.dart';
import 'screens/map_screen.dart';

void main() => runApp(const SunspotApp());

class SunspotApp extends StatelessWidget {
  const SunspotApp({super.key});

  @override
  Widget build(BuildContext context) => MaterialApp(
        title: 'Sunspot',
        debugShowCheckedModeBanner: false,
        theme: ThemeData(
          useMaterial3: true,
          fontFamily: uiFont,
          colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFFF0A62A)),
        ),
        home: const _Boot(),
      );
}

class _Boot extends StatefulWidget {
  const _Boot();

  @override
  State<_Boot> createState() => _BootState();
}

class _BootState extends State<_Boot> {
  late final Future<LevelPack> _pack = LevelPack.load();
  int _current = 34;
  int _coins = 1240;

  @override
  Widget build(BuildContext context) => FutureBuilder<LevelPack>(
        future: _pack,
        builder: (context, snapshot) {
          if (snapshot.hasError) {
            return Scaffold(
              body: Center(child: Text('Could not load levels: ${snapshot.error}')),
            );
          }
          final pack = snapshot.data;
          if (pack == null) {
            return const Scaffold(
              backgroundColor: Color(0xFF86D5EC),
              body: Center(child: CircularProgressIndicator()),
            );
          }
          return MapScreen(
            pack: pack,
            current: _current,
            coins: _coins,
            onPlay: (level) => _play(pack, level),
          );
        },
      );

  Future<void> _play(LevelPack pack, int level) async {
    final puzzle = pack.tryLevel(level);
    if (puzzle == null) return;
    await Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (context) => BoardScreen(
          puzzle: puzzle,
          coins: _coins,
          onCoinsChanged: (value) => _coins = value,
        ),
      ),
    );
    if (mounted) {
      setState(() {
        if (level == _current) _current = level + 1;
      });
    }
  }
}
