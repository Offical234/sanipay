import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:sanipay_mobile/main.dart';

void main() {
  testWidgets('SaniPay smoke test: app builds and shows splash screen branding', (WidgetTester tester) async {
    await tester.pumpWidget(
      const ProviderScope(
        child: SaniPayApp(),
      ),
    );

    expect(find.text('SaniPay'), findsOneWidget);
    expect(find.text('Fast VTU & Digital Bill Settlements'), findsOneWidget);
  });
}
