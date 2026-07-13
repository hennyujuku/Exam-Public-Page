// エントリポイント ── 全体を組み立てる
import { $ } from "./dom.js";
import { loadExam } from "./api.js";
import { state, updateProgress, startTimer } from "./runtime.js";
import { buildIntro, buildQuestion, renderMath } from "./render.js";
import { onSubmit } from "./submit.js";
import { showError } from "./screens.js";
import { renderResultScreen } from "./result.js";

function build(data) {
  state.data = data;
  const meta = data.meta || {};
  const qs = data.questions || [];

  // ヘッダー
  $("#examTerm").textContent = meta.term || "";
  $("#examTitle").textContent = meta.title || meta.subject || "模試";
  document.title = (meta.title || "模試") + " | 編入模試";
  $("#totalCount").textContent = String(qs.length);

  // 本体
  const root = $("#examRoot");
  root.innerHTML = "";
  root.appendChild(buildIntro(meta));
  qs.forEach((q, i) => root.appendChild(buildQuestion(q, i + 1)));

  // 数式描画 → 進捗・タイマー・送信の配線
  renderMath(root);
  if (meta.duration_minutes) startTimer(meta.duration_minutes);
  updateProgress();
  $("#submitBtn").addEventListener("click", onSubmit);
  state.startedAt = new Date();
}

function handleRoute() {
  const hash = window.location.hash;

  if (hash.startsWith("#result=")) {
    // 成績結果画面の描画
    const submissionId = hash.replace("#result=", "");
    renderResultScreen(submissionId);
  } else {
    // 通常の模試画面の描画
    loadExam().then(build).catch(showError);
  }
}

function init() {
  // ハッシュが変更された時にルート処理を再実行する
  window.addEventListener("hashchange", handleRoute);
  
  // 初回ロード時
  handleRoute();
}


// scriptの実行
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
