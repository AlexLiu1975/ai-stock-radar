const els = {
  marketStatus: document.querySelector("#marketStatus"),
  topCount: document.querySelector("#topCount"),
  candidateCount: document.querySelector("#candidateCount"),
  watchCount: document.querySelector("#watchCount"),
  overheatCount: document.querySelector("#overheatCount"),
  radarDate: document.querySelector("#radarDate"),
  dataSource: document.querySelector("#dataSource"),
  rows: document.querySelector("#radarRows"),
  refresh: document.querySelector("#refreshButton"),
};

els.refresh?.addEventListener("click", () => loadRadar(true));

loadRadar(false);

async function loadRadar(isManualRefresh) {
  setLoading(isManualRefresh ? "重新整理中" : "資料載入中");

  try {
    const response = await fetch("/api/radar", {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    if (!response.ok) {
      if (response.status === 404) {
        showEmpty("目前尚未產生雷達資料，待每日掃描完成後會顯示 Top 10。");
        return;
      }
      throw new Error(`HTTP ${response.status}`);
    }

    const radar = await response.json();
    renderRadar(radar);
  } catch (error) {
    console.error(error);
    els.marketStatus.textContent = "資料連線失敗";
    showEmpty("無法讀取雷達資料，請稍後重新整理。");
  }
}

function renderRadar(radar) {
  const top10 = Array.isArray(radar.top10) ? radar.top10 : [];
  const watchlist = Array.isArray(radar.watchlist) ? radar.watchlist : [];
  const overheated = Array.isArray(radar.overheated) ? radar.overheated : [];

  els.topCount.textContent = String(top10.length);
  els.candidateCount.textContent = String(top10.length);
  els.watchCount.textContent = String(watchlist.length);
  els.overheatCount.textContent = String(overheated.length);
  els.radarDate.textContent = radar.date || radar.generatedAt || "—";
  els.dataSource.textContent = sourceLabel(radar.source);
  els.marketStatus.textContent = `已更新 ${radar.date || "最新交易日"}`;

  if (top10.length === 0) {
    showEmpty("今日沒有符合起漲條件且通過過熱排除的股票。");
    return;
  }

  els.rows.innerHTML = top10.map((item, index) => rowTemplate(item, index)).join("");
}

function rowTemplate(item, index) {
  const institutional = numberOrZero(item.breakdown?.institutionalScore);
  const technical = numberOrZero(item.breakdown?.technicalScore);
  const score = numberOrZero(item.score);
  const riskFlags = Array.isArray(item.riskFlags) ? item.riskFlags : [];
  const riskText = riskFlags.length ? riskFlags.join("、") : "無重大警示";

  return `
    <tr>
      <td class="rank">${index + 1}</td>
      <td><span class="symbol">${escapeHtml(item.symbol || "—")}</span></td>
      <td>${institutional}<span class="muted"> / 40</span></td>
      <td>${technical}<span class="muted"> / 60</span></td>
      <td><span class="score ${score >= 80 ? "high" : "mid"}">${score}</span></td>
      <td>${signalBadge(item.signal)}</td>
      <td class="${riskFlags.length ? "risk-flag" : "risk-none"}">${escapeHtml(riskText)}</td>
    </tr>`;
}

function signalBadge(signal) {
  const map = {
    RISE_CONFIRMED: ["起漲確認", "green"],
    EARLY_RISE: ["提前埋伏", "amber"],
    WATCH: ["觀察", "gray"],
    WEAK: ["弱勢", "red"],
  };
  const [label, tone] = map[signal] || [signal || "未知", "gray"];
  return `<span class="pill ${tone}">${escapeHtml(label)}</span>`;
}

function sourceLabel(source) {
  if (source === "latest-fallback") return "最新交易日資料（自動回退）";
  if (source === "requested") return "指定交易日資料";
  return "TWSE / Firestore 最新資料";
}

function setLoading(text) {
  els.marketStatus.textContent = text;
  els.rows.innerHTML = `<tr><td colspan="7" class="empty">${escapeHtml(text)}…</td></tr>`;
}

function showEmpty(message) {
  els.rows.innerHTML = `<tr><td colspan="7" class="empty">${escapeHtml(message)}</td></tr>`;
}

function numberOrZero(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.round(number * 10) / 10 : 0;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
