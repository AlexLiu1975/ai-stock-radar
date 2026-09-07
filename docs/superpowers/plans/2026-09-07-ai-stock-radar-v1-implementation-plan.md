# AI Stock Radar V1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立可同時支援 Web、iOS 與 Android 的 AI Stock Radar V1，完成台股日資料、三大法人、KD、MACD、起漲評分、過熱警示與 Top 10 雷達輸出。

**Architecture:** 核心分析邏輯放在後端可測試模組，前端只讀取結構化結果；Firebase/Firestore 作為共用資料層，未來 Flutter Web/iOS/Android 共用同一後端。第一階段先建立可重複執行的日線分析 pipeline，再接 UI。

**Tech Stack:** TypeScript, Node.js 20+, Firebase Functions, Firestore, Vitest, Flutter（第二階段 UI）

**Spec:** `docs/superpowers/specs/2026-09-07-ai-stock-radar-v1-design.md`

## Global Constraints

- V1 先以台股日線資料為主。
- 核心分析邏輯不得綁死於 Web UI。
- KD 預設 RSV(9)，K/D 初始值 50。
- MACD 預設 EMA12、EMA26、Signal EMA9，OSC = DIF - DEA。
- 雷達分數為 0–100 分，必須可解釋各子分數。
- 必須支援「MACD 準黃金交叉」與過熱/風險標記。
- 原始資料、衍生指標、雷達結果分層儲存。
- 對外產品文案不得使用「保證上漲」「必買」「穩賺」「明牌」。
- 正式對外前必須完成歷史回測與 walk-forward 驗證。

---

## File Structure

- `functions/src/domain/types.ts`：OHLCV、法人、技術指標、雷達結果型別
- `functions/src/indicators/ema.ts`：EMA
- `functions/src/indicators/kd.ts`：KD
- `functions/src/indicators/macd.ts`：MACD 與準金叉
- `functions/src/scoring/institutional.ts`：法人籌碼分數
- `functions/src/scoring/technical.ts`：KD/MACD/量價分數
- `functions/src/scoring/risk.ts`：過熱與風險旗標
- `functions/src/scoring/radar.ts`：總分與訊號分類
- `functions/src/pipeline/dailyRadar.ts`：單檔日線分析 pipeline
- `functions/src/repositories/firestoreRadarRepository.ts`：Firestore 寫入/讀取
- `functions/src/jobs/generateDailyRadar.ts`：每日批次產生 Top 10
- `functions/test/**`：對應單元與整合測試
- `docs/superpowers/specs/...`：核定技術規格
- `docs/superpowers/plans/...`：實作計畫

### Task 1: 初始化 Firebase Functions 測試骨架與 Domain Types

**Files:**
- Create: `functions/package.json`
- Create: `functions/tsconfig.json`
- Create: `functions/vitest.config.ts`
- Create: `functions/src/domain/types.ts`
- Test: `functions/test/domain/types.test.ts`

**Interfaces:**
- Produces: `DailyBar`, `InstitutionalFlow`, `KDPoint`, `MACDPoint`, `RadarAnalysis`, `RiskFlag`

- [ ] **Step 1: 建立型別使用測試**
- [ ] **Step 2: 執行測試，確認因型別不存在而失敗**
- [ ] **Step 3: 建立 domain types**
- [ ] **Step 4: 執行測試確認通過**
- [ ] **Step 5: Commit**

### Task 2: EMA 計算器

**Files:**
- Create: `functions/src/indicators/ema.ts`
- Test: `functions/test/indicators/ema.test.ts`

**Interfaces:**
- Produces: `calculateEma(values: number[], period: number): number[]`

- [ ] **Step 1: 寫入失敗測試**
- [ ] **Step 2: 執行測試確認失敗**
- [ ] **Step 3: 實作 EMA**
- [ ] **Step 4: 執行測試確認通過**
- [ ] **Step 5: Commit**

### Task 3: KD 指標

**Files:**
- Create: `functions/src/indicators/kd.ts`
- Test: `functions/test/indicators/kd.test.ts`

**Interfaces:**
- Consumes: `DailyBar`
- Produces: `calculateKD(bars: DailyBar[], period?: number): KDPoint[]`

- [ ] **Step 1: 建立低檔轉強測試**
- [ ] **Step 2: 執行測試確認失敗**
- [ ] **Step 3: 實作 RSV(9) 與 K/D**
- [ ] **Step 4: 執行測試確認通過**
- [ ] **Step 5: Commit**

### Task 4: MACD 與準黃金交叉

**Files:**
- Create: `functions/src/indicators/macd.ts`
- Test: `functions/test/indicators/macd.test.ts`

**Interfaces:**
- Consumes: `DailyBar[]`, `calculateEma`
- Produces:
  - `calculateMACD(bars: DailyBar[]): MACDPoint[]`
  - `isPreGoldenCross(points: MACDPoint[]): boolean`

- [ ] **Step 1: 建立測試**
- [ ] **Step 2: 執行測試確認失敗**
- [ ] **Step 3: 實作 MACD**
- [ ] **Step 4: 執行測試確認通過**
- [ ] **Step 5: Commit**

### Task 5: 法人籌碼分數

**Files:**
- Create: `functions/src/scoring/institutional.ts`
- Test: `functions/test/scoring/institutional.test.ts`

**Interfaces:**
- Produces: `scoreInstitutional(flows: InstitutionalFlow[], volumes: number[]): { score: number; breakdown: Record<string, number> }`

- [ ] **Step 1: 測試連續外資與投信買超**
- [ ] **Step 2: 執行測試確認失敗**
- [ ] **Step 3: 實作 40 分法人模組**
- [ ] **Step 4: 執行測試確認通過**
- [ ] **Step 5: Commit**

### Task 6: 技術分數與量價

**Files:**
- Create: `functions/src/scoring/technical.ts`
- Test: `functions/test/scoring/technical.test.ts`

**Interfaces:**
- Consumes: `KDPoint[]`, `MACDPoint[]`, `DailyBar[]`
- Produces: `scoreTechnical(...): { score: number; breakdown: Record<string, number>; preGoldenCross: boolean }`

- [ ] **Step 1: 建立「低檔 KD 金叉 + MACD 負柱縮短」測試**
- [ ] **Step 2: 執行確認失敗**
- [ ] **Step 3: 實作 60 分技術模組**
- [ ] **Step 4: 執行測試確認通過**
- [ ] **Step 5: Commit**

### Task 7: 過熱與風險引擎

**Files:**
- Create: `functions/src/scoring/risk.ts`
- Test: `functions/test/scoring/risk.test.ts`

**Interfaces:**
- Produces: `detectRiskFlags(bars, kd, macd, flows): RiskFlag[]`

- [ ] **Step 1: 建立 KD > 80 與長上影測試**
- [ ] **Step 2: 執行確認失敗**
- [ ] **Step 3: 實作風險旗標**
- [ ] **Step 4: 執行測試確認通過**
- [ ] **Step 5: Commit**

### Task 8: 綜合 Radar 評分與訊號分類

**Files:**
- Create: `functions/src/scoring/radar.ts`
- Test: `functions/test/scoring/radar.test.ts`

**Interfaces:**
- Produces: `buildRadarAnalysis(input): RadarAnalysis`

- [ ] **Step 1: 建立分類測試**
- [ ] **Step 2: 執行確認失敗**
- [ ] **Step 3: 實作總分、breakdown 與風險降級**
- [ ] **Step 4: 執行測試確認通過**
- [ ] **Step 5: Commit**

### Task 9: 單檔日線 Pipeline

**Files:**
- Create: `functions/src/pipeline/dailyRadar.ts`
- Test: `functions/test/pipeline/dailyRadar.test.ts`

**Interfaces:**
- Produces: `analyzeDailyRadar(symbol: string, bars: DailyBar[], flows: InstitutionalFlow[]): RadarAnalysis`

- [ ] **Step 1: 建立完整 pipeline 測試**
- [ ] **Step 2: 執行確認失敗**
- [ ] **Step 3: 串接 KD、MACD、法人、技術、風險與總分**
- [ ] **Step 4: 執行確認通過**
- [ ] **Step 5: Commit**

### Task 10: Firestore Repository

**Files:**
- Create: `functions/src/repositories/firestoreRadarRepository.ts`
- Test: `functions/test/repositories/firestoreRadarRepository.test.ts`

**Interfaces:**
- Produces: `saveDailyStockAnalysis(...)`, `saveDailyRadar(...)`

Firestore 路徑：
- `stocks/{symbol}`
- `stocks/{symbol}/daily/{date}`
- `radar/daily/{date}`

- [ ] **Step 1: 用 Firebase Emulator 建立寫入測試**
- [ ] **Step 2: 執行確認失敗**
- [ ] **Step 3: 實作 repository**
- [ ] **Step 4: 執行 emulator 測試確認通過**
- [ ] **Step 5: Commit**

### Task 11: 每日 Top 10 Job

**Files:**
- Create: `functions/src/jobs/generateDailyRadar.ts`
- Test: `functions/test/jobs/generateDailyRadar.test.ts`

- [ ] **Step 1: 建立排序與過熱排除測試**
- [ ] **Step 2: 執行確認失敗**
- [ ] **Step 3: 實作批次排序**
- [ ] **Step 4: 執行確認通過**
- [ ] **Step 5: Commit**

### Task 12: 資料來源 Adapter

**Files:**
- Create: `functions/src/data/marketDataSource.ts`
- Create: `functions/src/data/institutionalDataSource.ts`
- Test: `functions/test/data/dataSourceContract.test.ts`

**Interfaces:**
- `MarketDataSource.fetchDailyBars(symbol, from, to)`
- `InstitutionalDataSource.fetchDailyFlows(symbol, from, to)`

- [ ] **Step 1: 建立 contract tests**
- [ ] **Step 2: 實作 interface 與第一個資料供應商 adapter**
- [ ] **Step 3: 加入 timeout、重試上限與資料驗證**
- [ ] **Step 4: 執行 contract tests**
- [ ] **Step 5: Commit**

### Task 13: Web/API Read Model

**Files:**
- Create: `functions/src/api/getDailyRadar.ts`
- Test: `functions/test/api/getDailyRadar.test.ts`

- [ ] **Step 1: 建立 API 輸出 schema 測試**
- [ ] **Step 2: 實作 Firestore read model**
- [ ] **Step 3: 驗證缺資料與日期 fallback**
- [ ] **Step 4: 執行測試**
- [ ] **Step 5: Commit**

### Task 14: 回測骨架

**Files:**
- Create: `functions/src/backtest/evaluateSignals.ts`
- Test: `functions/test/backtest/evaluateSignals.test.ts`

- [ ] **Step 1: 建立固定樣本回測測試**
- [ ] **Step 2: 實作 forward-return 計算**
- [ ] **Step 3: 實作命中率與 drawdown**
- [ ] **Step 4: 執行測試**
- [ ] **Step 5: Commit**

## Completion Verification

完成 V1 後必須執行：

```bash
cd functions
npm ci
npm test
npm run build
```

並確認：
- 全部單元測試通過
- TypeScript build 無錯誤
- Firebase Emulator 整合測試通過
- Top 10 可由 Firestore 讀回
- 過熱股票不會被錯誤標成起漲確認
- 每個雷達結果都有 breakdown 與 riskFlags
