// ランタイム ── 受験中の状態と進捗・タイマー
import { $ } from "./dom.js";

/** 受験セッションの状態（シングルトン） */
export const state = {
  data: null,
  startedAt: null,
  remainingSec: null,
  timerId: null,
  submitted: false,
};

/** 設問が回答済みか */
export function isAnswered(q) {
  if (q.type === "single_choice" || q.type === "multiple_choice") {
    return !!document.querySelector(`input[name="${q.id}"]:checked`);
  }
  const node = document.querySelector(`[name="${q.id}"]`);
  return !!(node && node.value && node.value.trim() !== "");
}

/** ヘッダーの進捗バー・残り問題数を更新 */
export function updateProgress() {
  const qs = (state.data && state.data.questions) || [];
  const done = qs.filter(isAnswered).length;
  const pct = qs.length ? Math.round((done / qs.length) * 100) : 0;

  $("#progressBar").style.width = pct + "%";
  $("#answeredCount").textContent = String(done);

  const remaining = qs.length - done;
  $("#barStatus").innerHTML =
    remaining === 0
      ? `<span class="count">全${qs.length}問</span> 回答済み`
      : `残り <span class="count">${remaining}</span> 問`;
}

/** 残り時間の表示のみ（自動提出はしない＝事故防止） */
export function startTimer(minutes) {
  state.remainingSec = minutes * 60;
  const node = $("#examTimer");

  const tick = () => {
    if (state.remainingSec <= 0) {
      node.textContent = "00:00";
      node.classList.add("is-low");
      clearInterval(state.timerId);
      return;
    }
    const m = Math.floor(state.remainingSec / 60);
    const s = state.remainingSec % 60;
    node.textContent = `${m < 10 ? "0" : ""}${m}:${s < 10 ? "0" : ""}${s}`;
    if (state.remainingSec <= 300) node.classList.add("is-low");
    state.remainingSec--;
  };

  tick();
  state.timerId = setInterval(tick, 1000);
}
