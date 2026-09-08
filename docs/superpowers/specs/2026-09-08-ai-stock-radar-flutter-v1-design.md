# AI Stock Radar Flutter V1 Design

Date: 2026-09-08
Status: Approved in chat; pending user review of written spec
Branch: feature/radar-core-v1

## 1. Objective

Build the first user-facing Flutter client for the AI Stock Radar platform so iOS and Android can share one codebase and consume the existing backend radar API.

The V1 client must remain presentation-oriented. All proprietary scoring, KD/MACD computation, institutional-flow analysis, risk classification, and Top 10 generation remain server-side.

## 2. V1 User Goal

A user should be able to open the app and, within a few seconds, understand:

1. Which stocks are currently ranked in the daily Top 10.
2. Whether each stock is classified as confirmed rise, early rise, watch, or weak.
3. The stock's 100-point radar score.
4. Whether risk flags indicate overheat or other caution conditions.
5. The institutional and technical contribution to the score when the backend provides a public-safe breakdown.
6. Whether the screen is showing the requested date, the latest date, or a fallback to the latest available radar.

## 3. Architecture

### 3.1 Client

Flutter application targeting:

- iOS
- Android
- Optional Flutter Web later, without changing domain models

The client responsibilities are:

- HTTP requests
- JSON decoding
- presentation models
- loading/error/empty states
- sorting/display only where explicitly safe
- pull-to-refresh
- navigation between dashboard and stock detail

The client must not calculate radar scores or technical indicators.

### 3.2 Backend Contract

Primary endpoint:

`GET /api/radar`

Optional query:

`GET /api/radar?date=YYYY-MM-DD`

The existing backend returns a daily radar read model containing:

- date
- generatedAt
- source
- top10
- watchlist
- overheated
- weakSignals

Each radar stock item is expected to include at minimum:

- symbol
- score
- signal
- riskFlags

The Flutter client should tolerate additional backend fields without failing.

## 4. Information Architecture

### 4.1 Dashboard Screen

Primary screen shown at app launch.

Sections:

1. App header
   - Product name: AI 趨勢雷達
   - Data date
   - Data-source status label: 最新 / 指定日期 / 最新資料替代

2. Daily summary
   - Top 10 count
   - Watch count
   - Overheated count

3. Top 10 list
   - Rank
   - Stock symbol
   - Score
   - Signal badge
   - Risk badge when applicable

4. Secondary tabs or segmented filter
   - Top 10
   - 觀察
   - 過熱

Weak signals do not need a primary dashboard tab in V1, but the data model should preserve them for future use.

### 4.2 Stock Detail Screen

Tap a stock card to open a detail screen.

Display:

- Symbol
- Radar score / 100
- Signal classification
- Risk flags
- Public-safe score breakdown when available
  - Institutional contribution
  - Technical contribution
- Short explanatory text for each signal/risk code
- Data date

The detail screen must not expose internal proprietary weighting rules beyond fields explicitly returned by the public API.

## 5. Signal Presentation

Mapping:

- `RISE_CONFIRMED` → 起漲確認
- `EARLY_RISE` → 起漲預警
- `WATCH` → 觀察
- `WEAK` → 偏弱

Risk flags:

- `OVERHEATED_KD` → KD 過熱
- `EXTENDED_PRICE` → 股價乖離偏大
- `LONG_UPPER_SHADOW` → 長上影壓力
- `VOLUME_EXHAUSTION` → 爆量耗竭
- `INSTITUTIONAL_DIVERGENCE` → 法人分歧
- `LOW_LIQUIDITY` → 流動性偏低

User-facing language must avoid promises of return or guaranteed stock appreciation.

## 6. Networking Layer

Introduce a small API client abstraction:

- `RadarApiClient`
- `fetchLatestRadar()`
- `fetchRadarByDate(DateTime date)`

Requirements:

- Configurable base URL by build environment
- Request timeout
- Decode errors mapped to typed failures
- HTTP 404 mapped to radar-not-found state
- 5xx/network failures mapped to retryable state

No Firebase Admin credentials or service-account secrets may be included in the app.

## 7. Data Models

Suggested Flutter-side models:

```text
DailyRadar
- date
- generatedAt
- source
- top10
- watchlist
- overheated
- weakSignals

RadarStock
- symbol
- score
- signal
- riskFlags
- breakdown?   // optional/public-safe only
```

Parsing must be defensive:

- unknown signal values fall back to an unknown presentation state
- unknown risk flags remain displayable as generic warnings
- absent optional fields do not crash the UI

## 8. State Management

For V1, use a lightweight approach rather than introducing a large application framework prematurely.

Recommended structure:

- Repository/service layer for API calls
- `ChangeNotifier` or an equivalently small state holder for dashboard state
- Explicit states: initial, loading, loaded, empty, error

If the app later grows to authentication, watchlists, notifications, and multi-screen workflows, state management can be upgraded without changing the API/domain layer.

## 9. Refresh and Date Behavior

Dashboard supports pull-to-refresh.

Default launch behavior:

1. Request latest radar without a date.
2. Display backend-returned `date` and `source`.
3. If backend returns the latest fallback for a requested date, make that visible rather than silently presenting it as the requested date.

No automatic high-frequency polling in V1 because the backend radar is currently daily, not intraday.

## 10. Loading, Empty, and Error States

Loading:

- Skeleton or progress indicator
- Keep layout stable where practical

Empty:

- Explain that no qualifying signals are available for the selected/latest session
- Do not imply backend failure

Network/server error:

- Human-readable error
- Retry button
- Preserve last successful data in memory during the session when possible

## 11. Visual Direction

V1 should optimize for fast scanning rather than decorative complexity.

Recommended visual hierarchy:

- Large score number
- Compact signal badge
- Clear rank
- Risk warning only when present
- Strong separation among Top 10 / Watch / Overheated

Use system-accessible typography, adequate contrast, and touch targets suitable for mobile.

Avoid relying on color alone to communicate signal state; badges must also contain text/icons.

## 12. Project Structure

Proposed repository addition:

```text
app/
  lib/
    main.dart
    app.dart
    config/
    domain/
    data/
    features/
      radar/
        data/
        presentation/
        widgets/
  test/
  pubspec.yaml
  android/
  ios/
```

The backend remains under `functions/`.

## 13. Testing Strategy

Minimum V1 tests:

1. JSON model parsing
   - complete payload
   - missing optional fields
   - unknown signal/risk values

2. API client
   - success
   - 404
   - 500
   - malformed payload

3. Dashboard state
   - loading → loaded
   - loading → empty
   - loading → error → retry

4. Widget tests
   - Top 10 card renders rank/symbol/score/signal
   - overheated stock displays warning
   - fallback source is visible

No backend scoring logic should be duplicated in Flutter tests.

## 14. Non-Goals for Flutter V1

Excluded from this first client milestone:

- Brokerage trading integration
- Intraday tick streaming
- Recomputing KD/MACD on device
- User authentication
- Personal watchlists
- Push notifications
- Subscription/payment
- Social features
- Full charting suite
- App Store/Play Store release automation

These can be introduced after the dashboard proves the end-to-end product flow.

## 15. Security and Product Boundaries

- No service-account JSON or backend API secrets in the repository or client bundle.
- The public API should only return fields intended for client display.
- Internal scoring implementation remains within the backend.
- The app must include a non-guarantee investment disclaimer before public release.

## 16. Acceptance Criteria

Flutter V1 is complete when:

1. The app launches on a supported Flutter development target.
2. It can request `/api/radar` and render the daily Top 10.
3. Top 10 items show rank, symbol, score, signal, and applicable risk flags.
4. Watch and overheated data can be viewed from the dashboard.
5. A stock can be opened into a detail screen.
6. Pull-to-refresh works.
7. Loading, empty, network error, 404, and retry states are implemented.
8. API/model/state/widget tests pass in CI.
9. No proprietary scoring computation or server secrets exist in Flutter code.

## 17. Implementation Order

After this written design is reviewed and approved:

1. Create a detailed implementation plan.
2. Scaffold the Flutter project.
3. Establish API/domain models using tests first.
4. Implement dashboard state and API client.
5. Implement dashboard widgets.
6. Implement stock detail.
7. Add CI for Flutter analyze/test.
8. Verify against the existing backend read model.
