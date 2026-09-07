# AI Stock Radar V1 — 技術設計規格

日期：2026-09-07

## 1. 產品目標

AI Stock Radar 是一個以台股為主的「起漲偵測與風險分級」平台，核心目標不是追逐已經大漲的股票，而是找出：

> 法人提前布局 + 技術面開始轉強 + 價格尚未完全反映

V1 先支援 Web，架構必須能直接延伸至 iOS / Android App，不重寫核心分析邏輯。

## 2. 平台架構

### 前端
- Web：Flutter Web 或現有 Firebase Hosting 頁面逐步過渡
- Mobile：Flutter
- 共用 UI Model 與 API Contract
- 不在前端保存核心評分規則與敏感金鑰

### 後端
- Firebase Authentication：使用者登入與帳號
- Firestore：股票資料、技術指標、法人資料、雷達分數、使用者自選股
- Cloud Functions / 後端 API：資料抓取、技術指標計算、評分、排程更新
- Firebase Hosting：Web 版部署

### 原則
1. 分析邏輯與 UI 分離
2. 原始資料與衍生指標分離
3. 每日資料可回溯
4. 所有雷達分數可解釋
5. App 與 Web 共用同一套後端

## 3. 資料流程

每日流程：

1. 抓取台股 OHLCV
2. 抓取外資 / 投信 / 自營商買賣超
3. 計算 KD
4. 計算 MACD
5. 計算量價訊號
6. 計算法人籌碼訊號
7. 執行過熱 / 風險排除
8. 計算 AI 起漲分數
9. 產生 Top 10
10. 寫入 Firestore
11. Web / App 讀取結果

## 4. 技術指標

### KD

預設使用 RSV(9)：

RSV = (Close - LowestLow9) / (HighestHigh9 - LowestLow9) * 100

K = 2/3 * 前一日K + 1/3 * RSV  
D = 2/3 * 前一日D + 1/3 * K

初始 K、D 預設 50。

判讀：
- K 上穿 D：黃金交叉
- K 下穿 D：死亡交叉
- K、D < 20：低檔區
- K、D > 80：高檔區

### MACD

DIF = EMA12 - EMA26  
DEA / Signal = EMA9(DIF)  
OSC = DIF - DEA

判讀：
- DIF 上穿 DEA：MACD 黃金交叉
- DIF 下穿 DEA：MACD 死亡交叉
- DIF、DEA < 0 且向上：低檔動能改善
- OSC 負柱連續縮短：空方動能衰減
- OSC 正柱放大：多方動能增強

## 5. 「MACD 準黃金交叉」定義

觸發條件：

- DIF < DEA
- DIF - DEA 的負值連續 2~3 日縮小
- OSC 負柱連續 2~3 日縮短
- DIF 斜率 > 0
- KD 已黃金交叉或 K > D
- 法人合計偏買超

訊號名稱：

🟠 起漲預警

若後續 DIF 正式上穿 DEA，且量價同步確認：

🟢 起漲確認

## 6. 法人籌碼評分

避免只用「絕對買超張數」，V1 同時考慮：

- 外資買賣超
- 投信買賣超
- 自營商買賣超
- 三大法人合計
- 連續買超天數
- 買超占成交量比例

建議計算：

法人買超比 = 法人淨買超股數 / 當日成交股數

此設計可降低大型股因絕對張數大而自動高分的偏誤。

## 7. AI 起漲雷達 100 分制

| 模組 | 分數 |
|---|---:|
| 外資連買 / 由賣轉買 | 15 |
| 投信連買 / 買超增強 | 15 |
| 三大法人同步偏多 | 10 |
| KD 黃金交叉 | 15 |
| KD 低檔轉強 | 5 |
| MACD 黃金 / 準金叉 | 15 |
| OSC 柱狀體改善 | 10 |
| MACD 0 軸位置與方向 | 5 |
| 成交量 + 價格結構 | 10 |
| **總分** | **100** |

分級：

- 80–100：🟢 起漲候選
- 65–79：🟡 提前埋伏
- 50–64：⚪ 觀察
- < 50：🔴 暫不介入

## 8. 過熱與風險排除

即使原始分數高，出現以下條件時降低評級或標示警告：

- KD > 80
- 5 日短線漲幅過大
- 爆量長上影
- MACD 正乖離過大
- 股價偏離 MA20 過遠
- 成交量異常放大後無法續強
- 法人買超但股價不漲，疑似出貨 / 對敲
- 流動性過低

標記：

⚠️ 過熱  
⚠️ 量價背離  
⚠️ 法人背離  
⚠️ 流動性不足

## 9. Firestore 建議資料模型

### stocks/{symbol}

- symbol
- name
- market
- industry
- latestPrice
- latestVolume
- latestRadarScore
- latestSignal
- updatedAt

### stocks/{symbol}/daily/{date}

- open
- high
- low
- close
- volume
- foreignNet
- trustNet
- dealerNet
- institutionalNet
- institutionalRatio
- K
- D
- DIF
- DEA
- OSC
- radarScore
- signal
- riskFlags[]

### radar/daily/{date}

- generatedAt
- top10[]
- watchlist[]
- overheated[]
- weakSignals[]

## 10. 首頁 V1

首頁顯示：

### AI 起漲雷達 Top 10

欄位：
- 排名
- 股票代號
- 股票名稱
- 收盤價
- 外資
- 投信
- 自營商
- K
- D
- MACD 狀態
- 量價
- AI 分數
- 判讀
- 風險

顏色語意：
- 🟢 起漲確認
- 🟠 起漲預警
- 🟡 提前埋伏
- ⚪ 觀察
- 🔴 轉弱
- ⚠️ 過熱 / 風險

## 11. App Store 架構預留

V1 即預留：

- Firebase Authentication
- 使用者自選股
- 推播通知
- 多裝置同步
- 隱私權政策頁
- 服務條款
- 投資風險免責聲明
- 刪除帳號流程
- App Store / Google Play 上架所需權限最小化

產品文案避免：
- 保證上漲
- 必買
- 穩賺
- 明牌

改用：
- 起漲機率訊號
- 籌碼轉強
- 技術面確認
- 風險分級
- 量化評分

## 12. V1 成功標準

V1 完成必須做到：

1. 可每日自動更新台股資料
2. 可正確計算 KD / MACD
3. 可整合法人買賣超
4. 可產生 0–100 起漲分數
5. 可列出每日 Top 10
6. 可標示準金叉與過熱
7. Web 可穩定讀取 Firestore
8. 核心邏輯不綁死於 Web
9. 可直接供未來 Flutter App 使用

## 13. 後續階段

V2：
- 月營收 YoY
- EPS
- 產業題材
- 法說 / 新聞事件
- 投信持續性
- 外資持股變化
- 多週期技術分析
- AI 智囊團二次審查

V3：
- iOS / Android
- 自選股推播
- 個人化雷達
- 回測與勝率儀表板
- 訂閱方案

## 14. 驗證要求

任何「起漲」模型不得只以主觀觀察上線。

正式對外前需完成：
- 歷史回測
- Walk-forward 測試
- 5 日 / 10 日報酬驗證
- +3% / +5% 命中率
- 最大回撤
- 過熱誤判率
- 不同產業分層表現

模型輸出應視為「機率排序與風險輔助」，不是股價保證。
