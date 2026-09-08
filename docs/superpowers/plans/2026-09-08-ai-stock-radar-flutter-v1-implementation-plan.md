# AI Stock Radar Flutter V1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first iOS/Android Flutter client for AI 趨勢雷達 that reads the existing `/api/radar` backend, renders Top 10/watch/overheated signals, supports stock detail and refresh/error states, and keeps all scoring logic server-side.

**Architecture:** Add a new `app/` Flutter project beside the existing `functions/` backend. The app uses immutable domain models, a small HTTP client/repository layer, built-in `ChangeNotifier` state management, feature-scoped widgets/screens, and compile-time `RADAR_API_BASE_URL` configuration. The client only displays public API fields and never recomputes KD, MACD, institutional scores, risk classification, or Top 10 ranking.

**Tech Stack:** Flutter stable, Dart 3.4+, `http ^1.6.0`, Material 3, `flutter_test`, GitHub Actions with `subosito/flutter-action@v2`.

**Spec:** `docs/superpowers/specs/2026-09-08-ai-stock-radar-flutter-v1-design.md`

## Global Constraints

- Target iOS and Android from one Flutter codebase.
- Keep all proprietary scoring, KD/MACD computation, institutional-flow analysis, risk classification, and Top 10 generation server-side.
- Primary endpoint is `GET /api/radar`; optional query is `?date=YYYY-MM-DD`.
- User-facing signal labels: `RISE_CONFIRMED` → `起漲確認`, `EARLY_RISE` → `起漲預警`, `WATCH` → `觀察`, `WEAK` → `偏弱`.
- Risk labels: `OVERHEATED_KD` → `KD 過熱`, `EXTENDED_PRICE` → `股價乖離偏大`, `LONG_UPPER_SHADOW` → `長上影壓力`, `VOLUME_EXHAUSTION` → `爆量耗竭`, `INSTITUTIONAL_DIVERGENCE` → `法人分歧`, `LOW_LIQUIDITY` → `流動性偏低`.
- Unknown signal/risk values must not crash parsing or rendering.
- No Firebase Admin credentials, service-account JSON, or private API secrets in Flutter code or GitHub.
- No high-frequency polling in V1; refresh is manual pull-to-refresh.
- V1 excludes authentication, personal watchlists, push notifications, brokerage integration, payments, full charting, and store-release automation.
- Public UI copy must not promise returns or guaranteed appreciation.

---

## File Map

Create the Flutter project under `app/` and keep the backend under `functions/`.

```text
app/
  lib/
    main.dart                         # process entrypoint and dependency wiring
    app.dart                          # MaterialApp and top-level theme
    config/app_config.dart            # RADAR_API_BASE_URL compile-time config
    domain/radar_models.dart          # DailyRadar, RadarStock, enums, parsing
    domain/radar_labels.dart          # Traditional Chinese presentation labels/descriptions
    data/radar_failure.dart           # typed client failures
    data/radar_api_client.dart        # HTTP transport and JSON decoding
    data/radar_repository.dart        # repository abstraction used by state layer
    features/radar/dashboard_controller.dart
    features/radar/dashboard_screen.dart
    features/radar/stock_detail_screen.dart
    features/radar/widgets/signal_badge.dart
    features/radar/widgets/risk_chips.dart
    features/radar/widgets/radar_stock_card.dart
    features/radar/widgets/summary_strip.dart
  test/
    domain/radar_models_test.dart
    domain/radar_labels_test.dart
    data/radar_api_client_test.dart
    data/radar_repository_test.dart
    features/radar/dashboard_controller_test.dart
    features/radar/dashboard_screen_test.dart
    features/radar/stock_detail_screen_test.dart
  pubspec.yaml
  analysis_options.yaml
  android/
  ios/
.github/workflows/flutter-ci.yml
```

---

### Task 1: Scaffold the Flutter app and configuration boundary

**Files:**
- Create: `app/` via Flutter scaffold
- Create: `app/lib/config/app_config.dart`
- Modify: `app/pubspec.yaml`
- Test: `app/test/config/app_config_test.dart`

**Interfaces:**
- Produces: `AppConfig.radarApiBaseUrl`, a normalized non-empty base URL string.
- Produces: Flutter project with Android and iOS platform folders.

- [ ] **Step 1: Scaffold the project**

Run from repository root:

```bash
flutter create --platforms=android,ios --org com.aistockradar app
cd app
flutter pub add http:^1.6.0
```

Verify `app/android/`, `app/ios/`, and `app/pubspec.yaml` exist.

- [ ] **Step 2: Write the failing config test**

Create `app/test/config/app_config_test.dart`:

```dart
import 'package:app/config/app_config.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('normalizes trailing slash from radar API base URL', () {
    final config = AppConfig.fromRawBaseUrl('https://example.com/');
    expect(config.radarApiBaseUrl, 'https://example.com');
  });

  test('rejects empty radar API base URL', () {
    expect(() => AppConfig.fromRawBaseUrl('  '), throwsArgumentError);
  });
}
```

- [ ] **Step 3: Run the test and verify RED**

Run:

```bash
cd app
flutter test test/config/app_config_test.dart
```

Expected: FAIL because `AppConfig` does not exist.

- [ ] **Step 4: Implement minimal config**

Create `app/lib/config/app_config.dart`:

```dart
class AppConfig {
  const AppConfig._(this.radarApiBaseUrl);

  final String radarApiBaseUrl;

  factory AppConfig.fromRawBaseUrl(String raw) {
    final value = raw.trim();
    if (value.isEmpty) {
      throw ArgumentError('RADAR_API_BASE_URL must not be empty');
    }
    return AppConfig._(value.endsWith('/') ? value.substring(0, value.length - 1) : value);
  }

  factory AppConfig.fromEnvironment() {
    const raw = String.fromEnvironment('RADAR_API_BASE_URL');
    return AppConfig.fromRawBaseUrl(raw);
  }
}
```

- [ ] **Step 5: Verify GREEN and static analysis**

Run:

```bash
cd app
flutter test test/config/app_config_test.dart
flutter analyze
```

Expected: PASS and no analyzer errors.

- [ ] **Step 6: Commit**

```bash
git add app
git commit -m "feat: scaffold Flutter radar app"
```

---

### Task 2: Add defensive radar domain models

**Files:**
- Create: `app/lib/domain/radar_models.dart`
- Test: `app/test/domain/radar_models_test.dart`

**Interfaces:**
- Produces: `RadarSignal`, `RadarSource`, `RadarStock`, `DailyRadar`.
- Produces: `RadarStock.fromJson(Map<String, dynamic>)` and `DailyRadar.fromJson(Map<String, dynamic>)`.
- `RadarStock.breakdown` is nullable and read-only; unknown JSON fields are ignored.

- [ ] **Step 1: Write parsing tests**

Create `app/test/domain/radar_models_test.dart` with these cases:

```dart
import 'package:app/domain/radar_models.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('parses complete daily radar payload', () {
    final radar = DailyRadar.fromJson({
      'date': '2026-09-08',
      'generatedAt': '2026-09-08',
      'source': 'latest',
      'top10': [
        {
          'symbol': '2330',
          'date': '2026-09-08',
          'score': 86,
          'signal': 'RISE_CONFIRMED',
          'riskFlags': ['INSTITUTIONAL_DIVERGENCE'],
          'breakdown': {'institutional': 35, 'technical': 51},
          'ignoredFutureField': true,
        }
      ],
      'watchlist': [],
      'overheated': [],
      'weakSignals': [],
    });

    expect(radar.date, '2026-09-08');
    expect(radar.source, RadarSource.latest);
    expect(radar.top10.single.symbol, '2330');
    expect(radar.top10.single.signal, RadarSignal.riseConfirmed);
    expect(radar.top10.single.breakdown?['institutional'], 35);
  });

  test('tolerates missing optional breakdown and unknown signal/risk values', () {
    final stock = RadarStock.fromJson({
      'symbol': '9999',
      'date': '2026-09-08',
      'score': 50,
      'signal': 'FUTURE_SIGNAL',
      'riskFlags': ['FUTURE_RISK'],
    });

    expect(stock.signal, RadarSignal.unknown);
    expect(stock.riskFlags, ['FUTURE_RISK']);
    expect(stock.breakdown, isNull);
  });
}
```

- [ ] **Step 2: Run test and verify RED**

Run:

```bash
cd app
flutter test test/domain/radar_models_test.dart
```

Expected: FAIL because domain models do not exist.

- [ ] **Step 3: Implement models**

Create `app/lib/domain/radar_models.dart` with:

```dart
enum RadarSignal { riseConfirmed, earlyRise, watch, weak, unknown }
enum RadarSource { requested, latest, latestFallback, unknown }

RadarSignal radarSignalFromJson(Object? value) => switch (value) {
  'RISE_CONFIRMED' => RadarSignal.riseConfirmed,
  'EARLY_RISE' => RadarSignal.earlyRise,
  'WATCH' => RadarSignal.watch,
  'WEAK' => RadarSignal.weak,
  _ => RadarSignal.unknown,
};

RadarSource radarSourceFromJson(Object? value) => switch (value) {
  'requested' => RadarSource.requested,
  'latest' => RadarSource.latest,
  'latest-fallback' => RadarSource.latestFallback,
  _ => RadarSource.unknown,
};

class RadarStock {
  const RadarStock({
    required this.symbol,
    required this.date,
    required this.score,
    required this.signal,
    required this.riskFlags,
    this.breakdown,
  });

  final String symbol;
  final String date;
  final int score;
  final RadarSignal signal;
  final List<String> riskFlags;
  final Map<String, num>? breakdown;

  factory RadarStock.fromJson(Map<String, dynamic> json) {
    final rawBreakdown = json['breakdown'];
    return RadarStock(
      symbol: json['symbol'] as String,
      date: json['date'] as String,
      score: (json['score'] as num).round(),
      signal: radarSignalFromJson(json['signal']),
      riskFlags: (json['riskFlags'] as List<dynamic>? ?? const [])
          .map((value) => value.toString())
          .toList(growable: false),
      breakdown: rawBreakdown is Map
          ? rawBreakdown.map((key, value) => MapEntry(key.toString(), value as num))
          : null,
    );
  }
}

class DailyRadar {
  const DailyRadar({
    required this.date,
    required this.generatedAt,
    required this.source,
    required this.top10,
    required this.watchlist,
    required this.overheated,
    required this.weakSignals,
  });

  final String date;
  final String generatedAt;
  final RadarSource source;
  final List<RadarStock> top10;
  final List<RadarStock> watchlist;
  final List<RadarStock> overheated;
  final List<RadarStock> weakSignals;

  factory DailyRadar.fromJson(Map<String, dynamic> json) {
    List<RadarStock> parseList(String key) =>
        (json[key] as List<dynamic>? ?? const [])
            .map((value) => RadarStock.fromJson(Map<String, dynamic>.from(value as Map)))
            .toList(growable: false);

    return DailyRadar(
      date: json['date'] as String,
      generatedAt: json['generatedAt'] as String,
      source: radarSourceFromJson(json['source']),
      top10: parseList('top10'),
      watchlist: parseList('watchlist'),
      overheated: parseList('overheated'),
      weakSignals: parseList('weakSignals'),
    );
  }
}
```

- [ ] **Step 4: Run model tests**

```bash
cd app
flutter test test/domain/radar_models_test.dart
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/lib/domain/radar_models.dart app/test/domain/radar_models_test.dart
git commit -m "feat: add Flutter radar domain models"
```

---

### Task 3: Add signal and risk presentation mapping

**Files:**
- Create: `app/lib/domain/radar_labels.dart`
- Test: `app/test/domain/radar_labels_test.dart`

**Interfaces:**
- Produces: `signalLabel(RadarSignal)`, `signalDescription(RadarSignal)`, `riskLabel(String)`, `riskDescription(String)`, `sourceLabel(RadarSource)`.

- [ ] **Step 1: Write failing mapping tests**

```dart
import 'package:app/domain/radar_labels.dart';
import 'package:app/domain/radar_models.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('maps public signal labels', () {
    expect(signalLabel(RadarSignal.riseConfirmed), '起漲確認');
    expect(signalLabel(RadarSignal.earlyRise), '起漲預警');
    expect(signalLabel(RadarSignal.watch), '觀察');
    expect(signalLabel(RadarSignal.weak), '偏弱');
  });

  test('keeps unknown risks visible', () {
    expect(riskLabel('FUTURE_RISK'), 'FUTURE_RISK');
  });

  test('maps fallback source explicitly', () {
    expect(sourceLabel(RadarSource.latestFallback), '最新資料替代');
  });
}
```

- [ ] **Step 2: Run test and verify RED**

```bash
cd app
flutter test test/domain/radar_labels_test.dart
```

Expected: FAIL because label functions do not exist.

- [ ] **Step 3: Implement mappings**

Implement exact public labels from Global Constraints and short non-promissory descriptions. Unknown values must fall back to `未知訊號` for signals and raw code for risks.

- [ ] **Step 4: Run test and verify GREEN**

```bash
cd app
flutter test test/domain/radar_labels_test.dart
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/lib/domain/radar_labels.dart app/test/domain/radar_labels_test.dart
git commit -m "feat: add radar presentation labels"
```

---

### Task 4: Implement typed HTTP API client

**Files:**
- Create: `app/lib/data/radar_failure.dart`
- Create: `app/lib/data/radar_api_client.dart`
- Test: `app/test/data/radar_api_client_test.dart`

**Interfaces:**
- Consumes: `AppConfig.radarApiBaseUrl`, `DailyRadar.fromJson`.
- Produces: `RadarApiClient.fetchLatestRadar()` and `fetchRadarByDate(DateTime date)`.
- Produces: `RadarNotFoundFailure`, `RadarServerFailure`, `RadarNetworkFailure`, `RadarDecodeFailure`.

- [ ] **Step 1: Write failing API tests with injected `http.Client`**

Cover:

```text
200 valid JSON -> DailyRadar
404 -> RadarNotFoundFailure
500 -> RadarServerFailure
200 malformed JSON -> RadarDecodeFailure
client exception -> RadarNetworkFailure
requested date -> /api/radar?date=2026-09-08
```

Use a small fake `http.BaseClient` that returns deterministic `http.Response` objects; do not call a live server in unit tests.

- [ ] **Step 2: Run tests and verify RED**

```bash
cd app
flutter test test/data/radar_api_client_test.dart
```

Expected: FAIL because API client/failure classes do not exist.

- [ ] **Step 3: Implement typed failures**

Create `radar_failure.dart`:

```dart
sealed class RadarFailure implements Exception {
  const RadarFailure(this.message);
  final String message;
}

class RadarNotFoundFailure extends RadarFailure {
  const RadarNotFoundFailure() : super('找不到雷達資料');
}

class RadarServerFailure extends RadarFailure {
  const RadarServerFailure() : super('伺服器暫時無法提供資料');
}

class RadarNetworkFailure extends RadarFailure {
  const RadarNetworkFailure() : super('網路連線失敗');
}

class RadarDecodeFailure extends RadarFailure {
  const RadarDecodeFailure() : super('雷達資料格式錯誤');
}
```

- [ ] **Step 4: Implement `RadarApiClient`**

Required constructor and methods:

```dart
RadarApiClient({
  required String baseUrl,
  required http.Client client,
  Duration timeout = const Duration(seconds: 10),
});

Future<DailyRadar> fetchLatestRadar();
Future<DailyRadar> fetchRadarByDate(DateTime date);
```

Build URLs with `Uri.parse(baseUrl).resolve('/api/radar')`, add `date=YYYY-MM-DD` through `replace(queryParameters: ...)`, apply `.timeout(timeout)`, map 404/5xx/network/decode conditions to the typed failures above, and always decode a JSON object before calling `DailyRadar.fromJson`.

- [ ] **Step 5: Verify GREEN**

```bash
cd app
flutter test test/data/radar_api_client_test.dart
flutter analyze
```

Expected: PASS and no analyzer errors.

- [ ] **Step 6: Commit**

```bash
git add app/lib/data app/test/data/radar_api_client_test.dart
git commit -m "feat: add radar HTTP client"
```

---

### Task 5: Add repository boundary

**Files:**
- Create: `app/lib/data/radar_repository.dart`
- Test: `app/test/data/radar_repository_test.dart`

**Interfaces:**
- Consumes: `RadarApiClient`.
- Produces: abstract `RadarRepository` and concrete `HttpRadarRepository`.
- Required methods:

```dart
Future<DailyRadar> fetchLatest();
Future<DailyRadar> fetchByDate(DateTime date);
```

- [ ] **Step 1: Write failing delegation tests**

Use a fake API client interface or narrow transport contract to prove `fetchLatest()` delegates to latest and `fetchByDate()` preserves the requested date.

- [ ] **Step 2: Run RED**

```bash
cd app
flutter test test/data/radar_repository_test.dart
```

- [ ] **Step 3: Implement minimal repository**

`RadarRepository` must be what the controller depends on; widgets must not depend directly on `RadarApiClient`.

- [ ] **Step 4: Run GREEN**

```bash
cd app
flutter test test/data/radar_repository_test.dart
```

- [ ] **Step 5: Commit**

```bash
git add app/lib/data/radar_repository.dart app/test/data/radar_repository_test.dart
git commit -m "feat: add radar repository boundary"
```

---

### Task 6: Implement dashboard state controller

**Files:**
- Create: `app/lib/features/radar/dashboard_controller.dart`
- Test: `app/test/features/radar/dashboard_controller_test.dart`

**Interfaces:**
- Consumes: `RadarRepository`.
- Produces: `DashboardController extends ChangeNotifier`.
- Exposes: `DashboardStatus { initial, loading, loaded, empty, error }`, `DailyRadar? radar`, `RadarFailure? failure`, `Future<void> loadLatest()`, `Future<void> loadDate(DateTime)`, `Future<void> refresh()`.

- [ ] **Step 1: Write failing controller tests**

Cover:

```text
initial -> loading -> loaded
initial -> loading -> empty when all primary buckets are empty
loading -> error on RadarFailure
retry after error -> loaded
refresh preserves last successful radar while request is in progress
loadDate delegates requested date
```

Use a fake `RadarRepository` with queued results/errors.

- [ ] **Step 2: Run RED**

```bash
cd app
flutter test test/features/radar/dashboard_controller_test.dart
```

- [ ] **Step 3: Implement controller**

Rules:

- `loadLatest()` clears stale failure, sets loading when there is no cached radar, fetches latest, then loaded/empty.
- `refresh()` keeps `radar` in memory until replacement succeeds.
- On refresh error, retain cached radar and expose failure for non-destructive error UI.
- `loadDate()` records the requested date only for the request; display truth comes from backend `radar.date` and `radar.source`.

- [ ] **Step 4: Run GREEN**

```bash
cd app
flutter test test/features/radar/dashboard_controller_test.dart
```

- [ ] **Step 5: Commit**

```bash
git add app/lib/features/radar/dashboard_controller.dart app/test/features/radar/dashboard_controller_test.dart
git commit -m "feat: add dashboard radar state"
```

---

### Task 7: Build reusable radar widgets

**Files:**
- Create: `app/lib/features/radar/widgets/signal_badge.dart`
- Create: `app/lib/features/radar/widgets/risk_chips.dart`
- Create: `app/lib/features/radar/widgets/radar_stock_card.dart`
- Create: `app/lib/features/radar/widgets/summary_strip.dart`
- Test: `app/test/features/radar/radar_widgets_test.dart`

**Interfaces:**
- Consumes: `RadarStock`, labels from `radar_labels.dart`.
- Produces: tappable stock card with rank, symbol, score, signal, and risks.

- [ ] **Step 1: Write failing widget tests**

Assert:

```text
rank 1, symbol 2330, score 86, 起漲確認 are visible
OVERHEATED_KD renders KD 過熱
unknown risk code remains visible
summary strip displays Top 10 / 觀察 / 過熱 counts
```

- [ ] **Step 2: Run RED**

```bash
cd app
flutter test test/features/radar/radar_widgets_test.dart
```

- [ ] **Step 3: Implement widgets**

Use Material 3 `Card`, `Chip`, `Badge`/container text where appropriate. Signal state must be represented with text in addition to color. Score should have the strongest numeric hierarchy, but no wording such as `必漲`, `穩賺`, or `保證`.

- [ ] **Step 4: Run GREEN**

```bash
cd app
flutter test test/features/radar/radar_widgets_test.dart
```

- [ ] **Step 5: Commit**

```bash
git add app/lib/features/radar/widgets app/test/features/radar/radar_widgets_test.dart
git commit -m "feat: add radar dashboard widgets"
```

---

### Task 8: Build dashboard screen with filters, refresh, loading, empty, and error states

**Files:**
- Create: `app/lib/features/radar/dashboard_screen.dart`
- Test: `app/test/features/radar/dashboard_screen_test.dart`

**Interfaces:**
- Consumes: `DashboardController`.
- Produces: primary dashboard UI and navigation callback `void Function(RadarStock stock)`.

- [ ] **Step 1: Write failing dashboard tests**

Cover:

```text
loading indicator when no cached data exists
loaded screen shows AI 趨勢雷達 and backend date
source latest -> 最新
source requested -> 指定日期
source latest-fallback -> 最新資料替代
segmented selection switches Top 10 / 觀察 / 過熱 lists
empty state says 當日沒有符合條件的雷達訊號
hard error shows retry button
pull-to-refresh calls controller.refresh()
```

- [ ] **Step 2: Run RED**

```bash
cd app
flutter test test/features/radar/dashboard_screen_test.dart
```

- [ ] **Step 3: Implement dashboard**

Structure:

```text
Scaffold
  AppBar: AI 趨勢雷達
  RefreshIndicator
    ListView
      data date + source label
      SummaryStrip
      SegmentedButton: Top 10 / 觀察 / 過熱
      RadarStockCard list
```

For cached-data refresh errors, retain the list and show a `SnackBar` or inline compact error rather than replacing the entire screen.

- [ ] **Step 4: Run GREEN**

```bash
cd app
flutter test test/features/radar/dashboard_screen_test.dart
```

- [ ] **Step 5: Commit**

```bash
git add app/lib/features/radar/dashboard_screen.dart app/test/features/radar/dashboard_screen_test.dart
git commit -m "feat: add radar dashboard screen"
```

---

### Task 9: Build stock detail screen

**Files:**
- Create: `app/lib/features/radar/stock_detail_screen.dart`
- Test: `app/test/features/radar/stock_detail_screen_test.dart`

**Interfaces:**
- Consumes: `RadarStock stock`, `String dataDate`.
- Produces: read-only detail screen.

- [ ] **Step 1: Write failing detail tests**

Assert:

```text
symbol and score / 100 render
signal label and short description render
all known risk labels render
unknown risk code remains visible
institutional and technical breakdown render only when keys are present
missing breakdown does not render an empty breakdown section
information disclaimer says 雷達分數為資料分析結果，不代表未來報酬保證
```

- [ ] **Step 2: Run RED**

```bash
cd app
flutter test test/features/radar/stock_detail_screen_test.dart
```

- [ ] **Step 3: Implement detail screen**

Use a vertical scroll layout. Only render breakdown values returned by the API; do not derive or reconstruct the 40/60 formula in the client.

- [ ] **Step 4: Run GREEN**

```bash
cd app
flutter test test/features/radar/stock_detail_screen_test.dart
```

- [ ] **Step 5: Commit**

```bash
git add app/lib/features/radar/stock_detail_screen.dart app/test/features/radar/stock_detail_screen_test.dart
git commit -m "feat: add radar stock detail screen"
```

---

### Task 10: Wire app entrypoint, navigation, and Material theme

**Files:**
- Modify: `app/lib/main.dart`
- Create: `app/lib/app.dart`
- Test: `app/test/app_test.dart`

**Interfaces:**
- Consumes: `AppConfig`, `http.Client`, `RadarApiClient`, `HttpRadarRepository`, `DashboardController`.
- Produces: launchable `RadarApp`.

- [ ] **Step 1: Write failing app wiring test**

Pump `RadarApp` with an injected fake repository/controller and assert:

```text
AI 趨勢雷達 is the initial screen
controller loadLatest is triggered once after initial mount
Tapping a radar stock pushes StockDetailScreen
```

- [ ] **Step 2: Run RED**

```bash
cd app
flutter test test/app_test.dart
```

- [ ] **Step 3: Implement `RadarApp` and `main()`**

`main()` must construct dependencies in this order:

```text
AppConfig.fromEnvironment()
http.Client()
RadarApiClient
HttpRadarRepository
DashboardController
RadarApp
```

`RadarApp` uses Material 3, an accessible light theme, and standard Navigator push for stock details. Do not add Firebase SDKs in V1.

- [ ] **Step 4: Verify launch wiring through tests**

```bash
cd app
flutter test test/app_test.dart
flutter analyze
```

- [ ] **Step 5: Commit**

```bash
git add app/lib/main.dart app/lib/app.dart app/test/app_test.dart
git commit -m "feat: wire Flutter radar application"
```

---

### Task 11: Add backend-contract fixture test

**Files:**
- Create: `app/test/fixtures/radar_latest.json`
- Create: `app/test/data/radar_contract_test.dart`
- Reference only: `functions/src/api/getDailyRadar.ts`

**Interfaces:**
- Validates the Flutter model against the current backend read model fields: `generatedAt`, `date`, `source`, `top10`, `watchlist`, `overheated`, `weakSignals`.

- [ ] **Step 1: Create a representative fixture matching the backend contract**

Use:

```json
{
  "generatedAt": "2026-09-08",
  "date": "2026-09-08",
  "source": "latest",
  "top10": [
    {
      "symbol": "2330",
      "date": "2026-09-08",
      "score": 86,
      "signal": "RISE_CONFIRMED",
      "riskFlags": [],
      "breakdown": {"institutional": 35, "technical": 51}
    }
  ],
  "watchlist": [],
  "overheated": [],
  "weakSignals": []
}
```

- [ ] **Step 2: Write fixture parse test**

Load the fixture with `File('test/fixtures/radar_latest.json').readAsStringSync()`, decode it, parse `DailyRadar`, and assert source/date/top10 symbol/score.

- [ ] **Step 3: Run the contract test**

```bash
cd app
flutter test test/data/radar_contract_test.dart
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add app/test/fixtures/radar_latest.json app/test/data/radar_contract_test.dart
git commit -m "test: add Flutter radar API contract fixture"
```

---

### Task 12: Add Flutter CI and final verification

**Files:**
- Create: `.github/workflows/flutter-ci.yml`
- No production-code changes unless verification reveals a defect.

**Interfaces:**
- Produces: CI gate for dependency resolution, formatting, analysis, and Flutter tests.

- [ ] **Step 1: Add Flutter CI workflow**

Create `.github/workflows/flutter-ci.yml`:

```yaml
name: Flutter CI

on:
  pull_request:
    branches: [main]
  push:
    branches: [feature/radar-core-v1]

jobs:
  test:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: app
    steps:
      - uses: actions/checkout@v6
      - uses: subosito/flutter-action@v2
        with:
          channel: stable
          cache: true
      - run: flutter pub get
      - run: dart format --output=none --set-exit-if-changed lib test
      - run: flutter analyze
      - run: flutter test
```

- [ ] **Step 2: Run the complete local verification suite**

```bash
cd app
flutter pub get
dart format --output=none --set-exit-if-changed lib test
flutter analyze
flutter test
```

Expected: all commands exit 0.

- [ ] **Step 3: Verify no scoring algorithm leaked into Flutter**

From repository root:

```bash
grep -RInE "EMA12|EMA26|RSV|calculateKD|calculateMACD|foreignNet|trustNet|dealerNet" app/lib || true
```

Expected: no implementation of backend indicator/scoring calculations. Domain display labels are acceptable; computational formulas are not.

- [ ] **Step 4: Verify no secrets were added**

```bash
grep -RInE "private_key|service_account|firebase-adminsdk|BEGIN PRIVATE KEY|apiKey" app .github/workflows/flutter-ci.yml || true
```

Expected: no credentials or service-account material.

- [ ] **Step 5: Commit CI**

```bash
git add .github/workflows/flutter-ci.yml
git commit -m "ci: add Flutter checks"
```

- [ ] **Step 6: Push branch and confirm GitHub Actions**

```bash
git push origin feature/radar-core-v1
```

Confirm both existing Functions CI and new Flutter CI are green on the same head commit before claiming V1 complete.

---

## Final Acceptance Checklist

- [ ] App launches with `--dart-define=RADAR_API_BASE_URL=<public-host>`.
- [ ] Latest `/api/radar` data renders as Top 10.
- [ ] Top 10 cards show rank, symbol, score, signal, and applicable risk flags.
- [ ] Dashboard switches among Top 10, 觀察, and 過熱.
- [ ] Backend `source` value is visibly distinguished as 最新 / 指定日期 / 最新資料替代.
- [ ] Stock detail shows public-safe breakdown only when returned by backend.
- [ ] Pull-to-refresh works without discarding cached data on transient failure.
- [ ] Loading, empty, 404, network/server error, and retry behavior are tested.
- [ ] Unknown signal/risk values do not crash the app.
- [ ] No KD/MACD/institutional scoring logic is duplicated in Flutter.
- [ ] No server secrets are present in `app/`.
- [ ] `dart format --output=none --set-exit-if-changed lib test` passes.
- [ ] `flutter analyze` passes.
- [ ] `flutter test` passes.
- [ ] Functions CI remains green.
- [ ] Flutter CI is green.
