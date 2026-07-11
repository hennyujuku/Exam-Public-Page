// 提出 ── 回答の収集・検証・送信
import { $, getParam } from "./dom.js";
import { state, isAnswered } from "./runtime.js";
import { submitResponses } from "./api.js";
import { showConfirmation } from "./screens.js";

/** 各設問の回答を収集 */
function collectResponses() {
  return (state.data.questions || []).map((q) => {
    let value;
    if (q.type === "multiple_choice") {
      value = [...document.querySelectorAll(`input[name="${q.id}"]:checked`)].map((n) => n.value);
    } else if (q.type === "single_choice") {
      const picked = document.querySelector(`input[name="${q.id}"]:checked`);
      value = picked ? picked.value : null;
    } else {
      const node = document.querySelector(`[name="${q.id}"]`);
      value = node ? node.value.trim() : "";
    }
    return { id: q.id, type: q.type, value };
  });
}

/** 氏名・受験番号の必須チェック */
function validateStudent() {
  const name = $("#stuName");
  const id = $("#stuId");
  let ok = true;
  [name, id].forEach((f) => {
    if (!f.value.trim()) { f.classList.add("is-error"); ok = false; }
    else f.classList.remove("is-error");
  });
  return ok;
}

/** 提出ハンドラ */
export async function onSubmit() {
  if (state.submitted) return;

  if (!validateStudent()) {
    $("#stuName").scrollIntoView({ behavior: "smooth", block: "center" });
    $("#barStatus").innerHTML = '<span style="color:var(--mark)">氏名と受験番号を入力してください</span>';
    return;
  }

  const qs = state.data.questions || [];
  const unanswered = qs.filter((q) => !isAnswered(q)).length;
  if (unanswered > 0 && !window.confirm(`未回答が ${unanswered} 問あります。このまま提出しますか？`)) {
    return;
  }

  const payload = {
    exam_id: state.data.exam_id,
    subject: (state.data.meta || {}).subject || "",
    student: { name: $("#stuName").value.trim(), student_id: $("#stuId").value.trim() },
    submitted_at: new Date().toISOString(),
    duration_used_sec: state.startedAt ? Math.round((Date.now() - state.startedAt.getTime()) / 1000) : null,
    responses: collectResponses(),
  };

  state.submitted = true;
  const btn = $("#submitBtn");
  btn.disabled = true;
  btn.textContent = "送信中…";

  // デモモード（プレビュー or ?demo=1 or 埋め込みデータ）は送信せず内容を表示
  const demoMode = window.__PREVIEW__ || getParam("demo") === "1" || !!window.__EXAM_DATA__;
  if (demoMode) {
    showConfirmation(payload, { demo: true });
    return;
  }

  try {
    const result = await submitResponses(payload);
    showConfirmation(payload, { demo: false, result });
  } catch (e) {
    state.submitted = false;
    btn.disabled = false;
    btn.textContent = "答案を提出する";
    $("#barStatus").innerHTML =
      '<span style="color:var(--mark)">送信に失敗しました。通信環境を確認して再度お試しください。</span>';
  }
}
