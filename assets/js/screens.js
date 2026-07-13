// 画面 ── 提出完了・エラー表示
import { $, el } from "./dom.js";
import { state } from "./runtime.js";

const factRow = (k, v) =>
  el("div", {}, [el("span", { class: "k", text: k }), el("span", { text: v || "—" })]);

/** 提出完了画面 */
export function showConfirmation(payload, opts = {}) {
  if (state.timerId) clearInterval(state.timerId);
  const bar = $(".actionbar");
  if (bar) bar.style.display = "none";

  const when = new Date(payload.submitted_at);
  const hhmm = when.toLocaleString("ja-JP", {
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
  });

  const answered = payload.responses.filter((r) =>
    Array.isArray(r.value) ? r.value.length > 0 : r.value != null && r.value !== ""
  ).length;

  const children = [
    el("div", { class: "notice__badge notice__badge--ok", text: "✓" }),
    el("h2", { text: "答案を提出しました" }),
    // el("p", { text: "お疲れさまでした。結果は後日、担当講師より共有されます。" }),
    el("div", { class: "notice__facts" }, [
      factRow("氏名", payload.student.name),
      factRow("生徒ID or メールアドレス", payload.student.student_id),
      factRow("科目", (state.data.meta || {}).subject || ""),
      factRow("提出日時", hhmm),
      factRow("回答数", `${answered} / ${payload.responses.length} 問`),
    ]),
  ];

  if (opts.demo) {
    children.splice(3, 0, el("div", { class: "demo-tag", text: "DEMO MODE ── 未送信" }));
    children.push(el("p", { class: "intro__instructions", text: "本番ではこの内容が送信され、自動採点のうえ記録されます。" }));
    children.push(el("pre", { class: "demo-dump", text: JSON.stringify(payload, null, 2) }));
  }
  else if (opts.result && opts.result.ok) {
    // ==========================================
    // SPA用：公開日時による表示の切り替え
    // ==========================================
    const publishedAt = new Date(opts.result.results_published_at);
    const now = new Date();

    if (now >= publishedAt) {
      // ▼ 即時公開（または公開日時を過ぎている）場合
      children.push(el("hr", { style: "margin: 24px 0; border: none; border-top: 1px dashed var(--border, #ccc);" }));
      children.push(el("p", { text: "今回の模試の採点結果が確認できます。" }));
      children.push(el("p", { text: "以下の提出IDを用いると、後日からでもトップページから成績照会をすることが出来ます。必要に応じて保存してください。" }));

      // IDをコピーしやすくするためのボックス
      children.push(el("div", {
        style: "background: #f6f8fa; padding: 12px; border-radius: 6px; font-family: monospace; font-size: 1.1em; text-align: center; border: 1px solid #d0d7de; user-select: all;",
        text: opts.result.submission_id
      }));
      
      const resultBtn = el("button", { 
        class: "btn-primary", 
        text: "成績結果画面へ進む",
        style: "margin-top: 16px;" 
      });
      
      // ボタンクリックでURLのハッシュを書き換える（ページリロードなし）
      resultBtn.addEventListener("click", () => {
        window.location.hash = `result=${opts.result.submission_id}`;
      });
      
      children.push(resultBtn);

    } else {
      // ▼ 後日公開（公開日時が未来）の場合
      const dateString = publishedAt.toLocaleString("ja-JP", {
        year: "numeric", month: "short", day: "numeric", 
        hour: "2-digit", minute: "2-digit"
      });

      children.push(el("hr", { style: "margin: 24px 0; border: none; border-top: 1px dashed var(--border, #ccc);" }));
      children.push(el("h3", { text: "成績結果の公開について", style: "margin-bottom: 8px;" }));
      children.push(el("p", { text: `成績結果は ${dateString} 以降に公開されます。` }));
      children.push(el("p", { 
        text: "公開日時になりましたら、以下の受験IDを使用して成績照会ページから結果を確認してください。この画面をスクリーンショット等で保存しておくことをお勧めします。",
        style: "font-size: 0.9em; margin-bottom: 12px;"
      }));
      
      // IDをコピーしやすくするためのボックス
      children.push(el("div", {
        style: "background: #f6f8fa; padding: 12px; border-radius: 6px; font-family: monospace; font-size: 1.1em; text-align: center; border: 1px solid #d0d7de; user-select: all;",
        text: opts.result.submission_id
      }));
    }
  }

  const main = $("#examRoot");
  main.innerHTML = "";
  main.appendChild(el("div", { class: "notice" }, children));
  window.scrollTo({ top: 0, behavior: "smooth" });
}

/** 読み込み失敗などのエラー画面 */
export function showError(err) {
  const bar = $(".actionbar");
  if (bar) bar.style.display = "none";

  let msg, sub;
  if (err && err.kind === "no-param") {
    msg = "模試が指定されていません";
    sub = "URL に ?exam=<模試ID> を付けて開いてください（例: ?exam=2026-07_chemistry）。";
  } else if (err && err.kind === "not-found") {
    msg = "模試データが見つかりません";
    sub = "指定された模試IDのファイルが存在しません。URLをご確認ください。";
  } else {
    msg = "読み込みに失敗しました";
    sub = "時間をおいて再読み込みしてください。";
  }

  const main = $("#examRoot");
  main.innerHTML = "";
  main.appendChild(
    el("div", { class: "notice" }, [
      el("div", { class: "notice__badge notice__badge--warn", text: "!" }),
      el("h2", { text: msg }),
      el("p", { text: sub }),
    ])
  );
}
