# AI Stock Radar Flutter V1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first iOS/Android Flutter client for AI 趨勢雷達 that consumes a public-safe `/api/radar` contract, renders Top 10/watch/overheated signals, supports stock detail and refresh/error states, and keeps all scoring logic server-side.

**Architecture:** First harden the existing HTTP read model so the public API exposes only aggregate institutional/technical score groups and never sends the detailed internal scoring breakdown. Then add a new `app/` Flutter project beside `functions/`, using immutable domain models, `http`, a repository boundary, built-in `ChangeNotifier`, Material 3 widgets, and compile-time `RADAR_API_BASE_URL` configuration. Flutter displays server output only; it never calculates KD, MACD, institutional scoring, risk classification, or Top 10 ranking.

**Tech Stack:** Firebase Functions TypeScript backend, Flutter stable, Dart 3.4+, `http ^1.6.0`, Material 3, `flutter_test`, Vitest, GitHub Actions with `subosito/flutter-action@v2`.

**Spec:** `docs/superpowers/specs/2026-09-08-ai-stock-radar-flutter-v1-design.md`

## Global Constraints

- Target iOS and Android from one Flutter codebase.
- Keep all proprietary scoring, KD/MACD computation, institutional-flow analysis, risk classification, and Top 10 generation server-side.
- Primary endpoint is `GET /api/radar`; optional query is `?date=YYYY-MM-DD`.
- Public stock payload may expose only `symbol`, `date`, `score`, `signal`, `riskFlags`, and aggregate `breakdown.institutional` / `breakdown.technical`.
- Do not expose raw breakdown keys such as `foreign`, `trust`, `synchronized`, `kdGoldenCross`, `kdLowZone`, `macdSignal`, `oscImprovement`, `macdZeroAxis`, `volumePrice`, or `preGoldenCross` through `/api/radar`.
- User-facing signals: `RISE_CONFIRMED` → `起漲確認`, `EARLY_RISE` → `起漲預警`, `WATCH` → `觀察`, `WEAK` → `偏弱`.
- User-facing risks: `OVERHEATED_KD` → `KD 過熱`, `EXTENDED_PRICE` → `股價乖離偏大`, `LONG_UPPER_SHADOW` → `長上影壓力`, `VOLUME_EXHAUSTION` → `爆量耗竭`, `INSTITUTIONAL_DIVERGENCE` → `法人分歧`, `LOW_LIQUIDITY` → `流動性偏低`.
- Unknown signal/risk values must not crash parsing or rendering.
- No Firebase Admin credentials, service-account JSON, private keys, or provider secrets in Flutter code or GitHub.
- No high-frequency polling in V1; refresh is manual pull-to-refresh.
- V1 excludes authentication, personal watchlists, push notifications, brokerage integration, payments, full charting, and store-release automation.
- Public UI copy must not promise returns or guaranteed appreciation.

---

## File Map

```text
functions/
  src/api/getDailyRadar.ts                  # public-safe read-model conversion
  test/api/getDailyRadar.test.ts            # verifies internal breakdown is stripped
app/
  lib/
    main.dart
    app.dart
    config/app_config.dart
    domain/radar_models.dart
    domain/radar_labels.dart
    data/radar_failure.dart
    data/radar_api_client.dart
    data/radar_repository.dart
    features/radar/dashboard_controller.dart
    features/radar/dashboard_screen.dart
    features/radar/stock_detail_screen.dart
    features/radar/widgets/signal_badge.dart
    features/radar/widgets/risk_chips.dart
    features/radar/widgets/radar_stock_card.dart
    features/radar/widgets/summary_strip.dart
  test/
    config/app_config_test.dart
    domain/radar_models_test.dart
    domain/radar_labels_test.dart
    data/radar_api_client_test.dart
    features/radar/dashboard_controller_test.dart
    features/radar/radar_widgets_test.dart
    features/radar/dashboard_screen_test.dart
    features/radar/stock_detail_screen_test.dart
    data/radar_contract_test.dart
    fixtures/radar_latest.json
  pubspec.yaml
  android/
  ios/
.github/workflows/flutter-ci.yml
```

---

### Task 1: Harden `/api/radar` to a public-safe stock DTO

**Files:**
- Modify: `functions/src/api/getDailyRadar.ts`
- Modify: `functions/test/api/getDailyRadar.test.ts`

**Interfaces:**
- Consumes internal `RadarAnalysis` containing full `breakdown`.
- Produces public `RadarStockReadModel` containing only aggregate `breakdown.institutional` and `breakdown.technical`.
- `DailyRadarReadModel.top10/watchlist/overheated/weakSignals` become `RadarStockReadModel[]`.

- [ ] **Step 1: Write the failing API privacy test**

Change the test fixture to contain real internal keys:

```ts
const topPick: RadarAnalysis = {
  symbol: "2330",
  date: "2026-09-07",
  score: 88,
  signal: "RISE_CONFIRMED",
  riskFlags: [],
  breakdown: {
    institutionalScore: 36,
    technicalScore: 52,
    foreign: 15,
    trust: 11,
    synchronized: 10,
    kdGoldenCross: 15,
    kdLowZone: 5,
    macdSignal: 15,
    oscImprovement: 10,
    macdZeroAxis: 2,
    volumePrice: 5,
    preGoldenCross: 1,
  },
};
```

Add assertions:

```ts
expect(result.top10[0]?.breakdown).toEqual({
  institutional: 36,
  technical: 52,
});
expect(result.top10[0]).not.toHaveProperty("breakdown.foreign");
expect(result.top10[0]).not.toHaveProperty("breakdown.kdGoldenCross");
expect(JSON.stringify(result)).not.toContain("preGoldenCross");
```

- [ ] **Step 2: Run the focused test and verify RED**

```bash
cd functions
npm test -- --run test/api/getDailyRadar.test.ts
```

Expected: FAIL because the current read model returns the full internal breakdown.

- [ ] **Step 3: Implement the public DTO conversion**

In `functions/src/api/getDailyRadar.ts`, add:

```ts
export interface RadarStockReadModel {
  symbol: string;
  date: string;
  score: number;
  signal: RadarAnalysis["signal"];
  riskFlags: RadarAnalysis["riskFlags"];
  breakdown: {
    institutional: number;
    technical: number;
  };
}

function toPublicRadarStock(analysis: RadarAnalysis): RadarStockReadModel {
  return {
    symbol: analysis.symbol,
    date: analysis.date,
    score: analysis.score,
    signal: analysis.signal,
    riskFlags: [...analysis.riskFlags],
    breakdown: {
      institutional: analysis.breakdown.institutionalScore ?? 0,
      technical: analysis.breakdown.technicalScore ?? 0,
    },
  };
}
```

Change the read model construction so all four buckets are mapped with `toPublicRadarStock` before returning. Keep `date`, `generatedAt`, and `source` behavior unchanged.

- [ ] **Step 4: Verify backend GREEN**

```bash
cd functions
npm test -- --run test/api/getDailyRadar.test.ts
npm run typecheck
npm run build
```

Expected: all commands exit 0.

- [ ] **Step 5: Commit**

```bash
git add functions/src/api/getDailyRadar.ts functions/test/api/getDailyRadar.test.ts
git commit -m "feat: sanitize public radar API breakdown"
```

---

### Task 2: Scaffold Flutter and establish configuration

**Files:**
- Create: `app/` Flutter scaffold
- Create: `app/lib/config/app_config.dart`
- Modify: `app/pubspec.yaml`
- Test: `app/test/config/app_config_test.dart`

**Interfaces:**
- Produces `AppConfig.radarApiBaseUrl`.

- [ ] **Step 1: Scaffold the project**

```bash
flutter create --platforms=android,ios --org com.aistockradar app
cd app
flutter pub add http:^1.6.0
```

- [ ] **Step 2: Write failing config tests**

```dart
import 'package:app/config/app_config.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('normalizes a trailing slash', () {
    expect(
      AppConfig.fromRawBaseUrl('https://example.com/').radarApiBaseUrl,
      'https://example.com',
    );
  });

  test('rejects an empty URL', () {
    expect(() => AppConfig.fromRawBaseUrl('  '), throwsArgumentError);
  });
}
```

- [ ] **Step 3: Verify RED**

```bash
cd app
flutter test test/config/app_config_test.dart
```

- [ ] **Step 4: Implement config**

```dart
class AppConfig {
  const AppConfig._(this.radarApiBaseUrl);

  final String radarApiBaseUrl;

  factory AppConfig.fromRawBaseUrl(String raw) {
    final value = raw.trim();
    if (value.isEmpty) {
      throw ArgumentError('RADAR_API_BASE_URL must not be empty');
    }
    return AppConfig._(
      value.endsWith('/') ? value.substring(0, value.length - 1) : value,
    );
  }

  factory AppConfig.fromEnvironment() {
    const raw = String.fromEnvironment('RADAR_API_BASE_URL');
    return AppConfig.fromRawBaseUrl(raw);
  }
}
```

- [ ] **Step 5: Verify GREEN**

```bash
cd app
flutter test test/config/app_config_test.dart
flutter analyze
```

- [ ] **Step 6: Commit**

```bash
git add app
git commit -m "feat: scaffold Flutter radar app"
```

---

### Task 3: Add defensive domain models and Traditional Chinese labels

**Files:**
- Create: `app/lib/domain/radar_models.dart`
- Create: `app/lib/domain/radar_labels.dart`
- Test: `app/test/domain/radar_models_test.dart`
- Test: `app/test/domain/radar_labels_test.dart`

**Interfaces:**
- Produces `RadarSignal`, `RadarSource`, `RadarBreakdown`, `RadarStock`, `DailyRadar`.
- Produces `signalLabel`, `signalDescription`, `riskLabel`, `riskDescription`, `sourceLabel`.

- [ ] **Step 1: Write failing model tests**

Use a payload containing:

```dart
{
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
      'futureField': true,
    }
  ],
  'watchlist': [],
  'overheated': [],
  'weakSignals': [],
}
```

Assert exact parsing plus a second stock where `signal: 'FUTURE_SIGNAL'`, `riskFlags: ['FUTURE_RISK']`, and no `breakdown`; expect `RadarSignal.unknown`, raw unknown risk preservation, and nullable breakdown.

- [ ] **Step 2: Verify RED**

```bash
cd app
flutter test test/domain/radar_models_test.dart
```

- [ ] **Step 3: Implement models**

Use:

```dart
enum RadarSignal { riseConfirmed, earlyRise, watch, weak, unknown }
enum RadarSource { requested, latest, latestFallback, unknown }

class RadarBreakdown {
  const RadarBreakdown({required this.institutional, required this.technical});
  final int institutional;
  final int technical;
}
```

`RadarStock.fromJson` must read only `breakdown.institutional` and `breakdown.technical`; it must ignore all other keys. `DailyRadar.fromJson` must treat missing bucket arrays as empty and ignore unknown top-level fields.

- [ ] **Step 4: Write and implement label tests**

Assertions:

```dart
expect(signalLabel(RadarSignal.riseConfirmed), '起漲確認');
expect(signalLabel(RadarSignal.earlyRise), '起漲預警');
expect(signalLabel(RadarSignal.watch), '觀察');
expect(signalLabel(RadarSignal.weak), '偏弱');
expect(sourceLabel(RadarSource.latestFallback), '最新資料替代');
expect(riskLabel('OVERHEATED_KD'), 'KD 過熱');
expect(riskLabel('FUTURE_RISK'), 'FUTURE_RISK');
```

Descriptions must be factual and non-promissory; unknown signal description is `尚未支援的雷達訊號`.

- [ ] **Step 5: Verify domain GREEN**

```bash
cd app
flutter test test/domain/radar_models_test.dart test/domain/radar_labels_test.dart
```

- [ ] **Step 6: Commit**

```bash
git add app/lib/domain app/test/domain
git commit -m "feat: add Flutter radar domain models"
```

---

### Task 4: Implement typed HTTP client and repository boundary

**Files:**
- Create: `app/lib/data/radar_failure.dart`
- Create: `app/lib/data/radar_api_client.dart`
- Create: `app/lib/data/radar_repository.dart`
- Test: `app/test/data/radar_api_client_test.dart`

**Interfaces:**
- `RadarApiClient.fetchLatestRadar()` → `Future<DailyRadar>`.
- `RadarApiClient.fetchRadarByDate(DateTime date)` → `Future<DailyRadar>`.
- `RadarRepository.fetchLatest()` / `fetchByDate(DateTime)` are the controller-facing methods.
- Failures: `RadarNotFoundFailure`, `RadarServerFailure`, `RadarNetworkFailure`, `RadarDecodeFailure`.

- [ ] **Step 1: Write failing transport tests with an injected `http.Client`**

Cover 200 valid JSON, 404, 500, malformed JSON, client exception, and requested-date URL `?date=2026-09-08`.

- [ ] **Step 2: Verify RED**

```bash
cd app
flutter test test/data/radar_api_client_test.dart
```

- [ ] **Step 3: Implement typed failures**

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

- [ ] **Step 4: Implement API client**

Constructor:

```dart
RadarApiClient({
  required String baseUrl,
  required http.Client client,
  Duration timeout = const Duration(seconds: 10),
});
```

Build `Uri.parse(baseUrl).resolve('/api/radar')`, add `date=YYYY-MM-DD` with `replace(queryParameters: ...)`, apply `.timeout(timeout)`, require a JSON object, then call `DailyRadar.fromJson`. Map 404/5xx/network/decode errors to the typed failures.

- [ ] **Step 5: Implement repository**

```dart
abstract interface class RadarRepository {
  Future<DailyRadar> fetchLatest();
  Future<DailyRadar> fetchByDate(DateTime date);
}

class HttpRadarRepository implements RadarRepository {
  HttpRadarRepository(this._api);
  final RadarApiClient _api;
  @override
  Future<DailyRadar> fetchLatest() => _api.fetchLatestRadar();
  @override
  Future<DailyRadar> fetchByDate(DateTime date) => _api.fetchRadarByDate(date);
}
```

- [ ] **Step 6: Verify GREEN**

```bash
cd app
flutter test test/data/radar_api_client_test.dart
flutter analyze
```

- [ ] **Step 7: Commit**

```bash
git add app/lib/data app/test/data/radar_api_client_test.dart
git commit -m "feat: add radar HTTP data layer"
```

---

### Task 5: Implement dashboard state controller

**Files:**
- Create: `app/lib/features/radar/dashboard_controller.dart`
- Test: `app/test/features/radar/dashboard_controller_test.dart`

**Interfaces:**
- Consumes `RadarRepository`.
- Produces `DashboardController extends ChangeNotifier`.
- Exposes `DashboardStatus { initial, loading, loaded, empty, error }`, `DailyRadar? radar`, `RadarFailure? failure`, `loadLatest()`, `loadDate(DateTime)`, and `refresh()`.

- [ ] **Step 1: Write failing controller tests**

Cover:

```text
initial -> loading -> loaded
initial -> loading -> empty when top10/watchlist/overheated are all empty
loading -> error on RadarFailure
error -> retry -> loaded
refresh retains last successful radar during transient failure
loadDate forwards the requested DateTime
```

- [ ] **Step 2: Verify RED**

```bash
cd app
flutter test test/features/radar/dashboard_controller_test.dart
```

- [ ] **Step 3: Implement controller rules**

`loadLatest()` sets full-screen loading only if no cached radar exists. `refresh()` keeps cached radar until a successful replacement. Any displayed date/source always comes from the backend `DailyRadar`, never from the request parameter.

- [ ] **Step 4: Verify GREEN**

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

### Task 6: Build reusable radar cards, badges, risks, and summary widgets

**Files:**
- Create: `app/lib/features/radar/widgets/signal_badge.dart`
- Create: `app/lib/features/radar/widgets/risk_chips.dart`
- Create: `app/lib/features/radar/widgets/radar_stock_card.dart`
- Create: `app/lib/features/radar/widgets/summary_strip.dart`
- Test: `app/test/features/radar/radar_widgets_test.dart`

**Interfaces:**
- `RadarStockCard` accepts `rank`, `RadarStock`, and `VoidCallback onTap`.
- `SummaryStrip` accepts Top 10/watch/overheated counts.

- [ ] **Step 1: Write failing widget tests**

Assert that rank `1`, symbol `2330`, score `86`, `起漲確認`, `KD 過熱`, unknown risks, and all summary counts render.

- [ ] **Step 2: Verify RED**

```bash
cd app
flutter test test/features/radar/radar_widgets_test.dart
```

- [ ] **Step 3: Implement widgets**

Use Material 3 `Card` and `Chip`-style components. Signal state must include readable text and not rely on color alone. The score is visually prominent. Do not use language such as `必漲`, `穩賺`, or `保證`.

- [ ] **Step 4: Verify GREEN**

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

### Task 7: Build dashboard screen with filters and resilient states

**Files:**
- Create: `app/lib/features/radar/dashboard_screen.dart`
- Test: `app/test/features/radar/dashboard_screen_test.dart`

**Interfaces:**
- Consumes `DashboardController`.
- Produces the primary screen and accepts `void Function(RadarStock) onStockTap`.

- [ ] **Step 1: Write failing dashboard tests**

Cover loading indicator, backend date, source labels (`最新`, `指定日期`, `最新資料替代`), Top 10/觀察/過熱 segmented switching, empty-state text `當日沒有符合條件的雷達訊號`, full error with retry button, and pull-to-refresh invoking `controller.refresh()`.

- [ ] **Step 2: Verify RED**

```bash
cd app
flutter test test/features/radar/dashboard_screen_test.dart
```

- [ ] **Step 3: Implement screen**

Layout:

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

If a refresh fails while cached data exists, keep the list visible and show a compact error/SnackBar rather than replacing the entire screen.

- [ ] **Step 4: Verify GREEN**

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

### Task 8: Build stock detail and app navigation/wiring

**Files:**
- Create: `app/lib/features/radar/stock_detail_screen.dart`
- Create: `app/lib/app.dart`
- Modify: `app/lib/main.dart`
- Test: `app/test/features/radar/stock_detail_screen_test.dart`
- Test: `app/test/app_test.dart`

**Interfaces:**
- `StockDetailScreen({required RadarStock stock, required String dataDate})`.
- `RadarApp` receives a `DashboardController` and owns dashboard-to-detail navigation.

- [ ] **Step 1: Write failing detail tests**

Assert symbol, `score / 100`, signal label/description, known and unknown risks, aggregate `法人 35 / 40` and `技術 51 / 60` only when breakdown exists, and disclaimer `雷達分數為資料分析結果，不代表未來報酬保證`.

- [ ] **Step 2: Verify detail RED**

```bash
cd app
flutter test test/features/radar/stock_detail_screen_test.dart
```

- [ ] **Step 3: Implement detail screen**

Render only the two aggregate breakdown fields already provided by the API. Do not reconstruct or mention detailed internal weight components.

- [ ] **Step 4: Write failing app wiring test**

Pump `RadarApp` with a fake controller/repository and assert `AI 趨勢雷達` is initial, first load occurs once, and tapping a stock pushes `StockDetailScreen`.

- [ ] **Step 5: Implement `RadarApp` and `main()`**

Dependency order:

```text
AppConfig.fromEnvironment()
http.Client()
RadarApiClient
HttpRadarRepository
DashboardController
RadarApp
```

Use Material 3 and standard Navigator push. Do not add Firebase client SDKs in V1.

- [ ] **Step 6: Verify GREEN**

```bash
cd app
flutter test test/features/radar/stock_detail_screen_test.dart test/app_test.dart
flutter analyze
```

- [ ] **Step 7: Commit**

```bash
git add app/lib app/test/features/radar/stock_detail_screen_test.dart app/test/app_test.dart
git commit -m "feat: add radar detail and app navigation"
```

---

### Task 9: Add an API contract fixture that matches the sanitized backend

**Files:**
- Create: `app/test/fixtures/radar_latest.json`
- Create: `app/test/data/radar_contract_test.dart`
- Reference: `functions/src/api/getDailyRadar.ts`

**Interfaces:**
- Guards the JSON contract between backend and Flutter without a live network dependency.

- [ ] **Step 1: Create the fixture**

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

- [ ] **Step 2: Write the fixture parse test**

Load with `File('test/fixtures/radar_latest.json').readAsStringSync()`, decode, parse `DailyRadar`, and assert date/source/symbol/score/breakdown.

- [ ] **Step 3: Verify GREEN**

```bash
cd app
flutter test test/data/radar_contract_test.dart
```

- [ ] **Step 4: Commit**

```bash
git add app/test/fixtures/radar_latest.json app/test/data/radar_contract_test.dart
git commit -m "test: add Flutter radar API contract fixture"
```

---

### Task 10: Add Flutter CI and perform final V1 verification

**Files:**
- Create: `.github/workflows/flutter-ci.yml`

**Interfaces:**
- Produces a CI gate for format, analysis, and Flutter tests while preserving the existing Functions CI.

- [ ] **Step 1: Add workflow**

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

- [ ] **Step 2: Run complete backend verification**

```bash
cd functions
npm run audit:prod
npm run typecheck
npm test
npm run build
```

Expected: all exit 0.

- [ ] **Step 3: Run complete Flutter verification**

```bash
cd app
flutter pub get
dart format --output=none --set-exit-if-changed lib test
flutter analyze
flutter test
```

Expected: all exit 0.

- [ ] **Step 4: Verify no scoring implementation leaked into Flutter**

```bash
grep -RInE "EMA12|EMA26|RSV|calculateKD|calculateMACD|foreignNet|trustNet|dealerNet|kdGoldenCross|macdSignal|preGoldenCross" app/lib || true
```

Expected: no backend scoring/indicator implementation or detailed weight names.

- [ ] **Step 5: Verify no secrets were added**

```bash
grep -RInE "private_key|service_account|firebase-adminsdk|BEGIN PRIVATE KEY" app .github/workflows/flutter-ci.yml || true
```

Expected: no credential material.

- [ ] **Step 6: Commit CI**

```bash
git add .github/workflows/flutter-ci.yml
git commit -m "ci: add Flutter checks"
```

- [ ] **Step 7: Push and confirm both CI workflows**

```bash
git push origin feature/radar-core-v1
```

Do not claim V1 complete until Functions CI and Flutter CI are green on the same branch head.

---

## Final Acceptance Checklist

- [ ] `/api/radar` strips detailed internal scoring breakdown and exposes only aggregate institutional/technical values.
- [ ] App launches with `--dart-define=RADAR_API_BASE_URL=<public-host>`.
- [ ] Latest radar renders Top 10.
- [ ] Cards show rank, symbol, score, signal, and applicable risk flags.
- [ ] Dashboard switches among Top 10, 觀察, and 過熱.
- [ ] `source` visibly distinguishes 最新 / 指定日期 / 最新資料替代.
- [ ] Stock detail shows only public-safe aggregate breakdown.
- [ ] Pull-to-refresh retains cached data on transient failure.
- [ ] Loading, empty, 404, network/server error, retry, unknown signal, and unknown risk behavior are tested.
- [ ] No KD/MACD/institutional scoring logic is duplicated in Flutter.
- [ ] No server secrets exist in `app/`.
- [ ] `dart format --output=none --set-exit-if-changed lib test` passes.
- [ ] `flutter analyze` passes.
- [ ] `flutter test` passes.
- [ ] Functions CI remains green.
- [ ] Flutter CI is green.
