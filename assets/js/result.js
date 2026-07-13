import { $, el } from "./dom.js";
import { parseMarkdown, renderMath } from "./render.js";
import { loadResult } from "./api.js";

/** 成績結果画面を描画するエントリポイント */
export async function renderResultScreen(submissionId) {
  const root = $("#examRoot");
  root.innerHTML = '<div style="text-align:center; padding: 40px;">成績結果を取得中...</div>';

  // アクションバー(送信ボタンなど)を非表示
  const bar = $(".actionbar");
  if (bar) bar.style.display = "none";

  try {
    const data = await loadResult(submissionId);
    if (!data || !data.ok) throw new Error("データの取得に失敗しました");

    root.innerHTML = "";

    // 1. ヘッダー情報の更新
    $("#examTerm").textContent = "成績照会";
    $("#examTitle").textContent = data.exam.title;
    $("#totalCount").textContent = data.questions.length;
    const timerBox = $("#examTimer");
    if (timerBox) timerBox.style.display = "none";

    // 2. タブ切り替えUIの構築
    const tabContainer = el("div", { 
      style: "display:flex; margin-bottom: 24px; border-radius: 8px; overflow: hidden; border: 1px solid var(--border, #d0d7de);" 
    });
    
    const btnMyResult = el("button", { text: "自分の成績" });
    const btnStats = el("button", { text: "試験統計" });
    
    // タブボタンの共通のベーススタイル
    [btnMyResult, btnStats].forEach(btn => {
      btn.style.flex = "1";
      btn.style.padding = "14px";
      btn.style.fontSize = "1.1em";
      btn.style.cursor = "pointer";
      btn.style.border = "none";
      btn.style.outline = "none";
      btn.style.transition = "all 0.2s ease-in-out";
    });

    // タブの見た目を切り替える関数
    function updateTabUI(isMyResultActive) {
      // 選択中のスタイル（少し濃い背景色、濃い文字、太いアンダーライン）
      const activeBg = "#e2e6ea"; // 少し濃いグレー
      const activeColor = "#1e293b";
      const activeBorder = "3px solid #24292f";
      const activeWeight = "bold";

      // 未選択のスタイル（少し薄い背景色、薄い文字、透明なアンダーライン）
      const inactiveBg = "#f8f9fa"; // 少し薄いグレー
      const inactiveColor = "#6c757d";
      const inactiveBorder = "3px solid transparent";
      const inactiveWeight = "normal";

      // 「自分の成績」タブへの適用
      btnMyResult.style.backgroundColor = isMyResultActive ? activeBg : inactiveBg;
      btnMyResult.style.color = isMyResultActive ? activeColor : inactiveColor;
      btnMyResult.style.borderBottom = isMyResultActive ? activeBorder : inactiveBorder;
      btnMyResult.style.fontWeight = isMyResultActive ? activeWeight : inactiveWeight;

      // 「試験統計」タブへの適用
      btnStats.style.backgroundColor = !isMyResultActive ? activeBg : inactiveBg;
      btnStats.style.color = !isMyResultActive ? activeColor : inactiveColor;
      btnStats.style.borderBottom = !isMyResultActive ? activeBorder : inactiveBorder;
      btnStats.style.fontWeight = !isMyResultActive ? activeWeight : inactiveWeight;
    }

    // 初期状態は「自分の成績」をアクティブにする
    updateTabUI(true);
    
    tabContainer.appendChild(btnMyResult);
    tabContainer.appendChild(btnStats);
    root.appendChild(tabContainer);

    // 3. コンテンツ領域
    const contentArea = el("div", { class: "result-content" });
    root.appendChild(contentArea);

    // --- 【タブ1】自分の成績ビュー ---
    const myResultView = el("div", { class: "view-my-result" });
    const totalScore = el("h2", { 
      text: `合計得点: ${data.my_result.total_score} / ${data.exam.total_points} 点`, 
      style: "text-align:center; margin-bottom: 32px; color: #B23A2B; font-size: 1.8em;" 
    });
    myResultView.appendChild(totalScore);

    data.questions.forEach((q) => {
      myResultView.appendChild(buildResultQuestion(q));
    });

    // --- 【タブ2】試験統計ビュー ---
    const statsView = buildStatsView(data);
    statsView.style.display = "none"; // 初期状態は非表示

    contentArea.appendChild(myResultView);
    contentArea.appendChild(statsView);

    // 4. タブ切り替えイベント
    btnMyResult.addEventListener("click", () => {
      updateTabUI(true);
      myResultView.style.display = "block";
      statsView.style.display = "none";
    });

    btnStats.addEventListener("click", () => {
      updateTabUI(false);
      myResultView.style.display = "none";
      statsView.style.display = "block";
    });

    // 数式・コードハイライトの適用
    renderMath(root);

  } catch (err) {
    console.error(err);
    root.innerHTML = '<div style="color:red; text-align:center; padding:40px;">結果の読み込みに失敗しました。</div>';
  }
}

/** 設問1問分の成績を描画（render.jsを踏襲） */
function buildResultQuestion(q) {
  const top = el("div", { class: "q__top" }, [
    el("span", { class: "q__num", text: "問 " + q.position }),
    // 要件: 右上に赤色で獲得点を表示
    el("span", { class: "q__points", text: `${q.points_earned} / ${q.points_max} 点`, style: "color: #B23A2B; font-weight: bold;" }),
  ]);

  const section = el("section", { class: "q" }, [
    top,
    el("div", { class: "q__prompt", html: parseMarkdown(q.prompt) }),
    buildResultAnswerArea(q),
  ]);

  if (typeof hljs !== "undefined") {
    section.querySelectorAll('pre code').forEach((block) => hljs.highlightElement(block));
  }
  return section;
}

/** 各形式に応じた解答と正解の色分け描画 */
function buildResultAnswerArea(q) {
  // 選択問題
  if (q.format === "single_choice" || q.format === "multiple_choice") {
    const box = el("div", { class: "choices" });
    const studentAns = Array.isArray(q.student_answer) ? q.student_answer : [q.student_answer];
    const correctAns = Array.isArray(q.correct_answer) ? q.correct_answer : [q.correct_answer];

    (q.choices || []).forEach((c) => {
      const isStudent = studentAns.includes(c.id);
      const isCorrect = correctAns.includes(c.id);

      // 要件: 自分の回答を青色、答えを赤色で表示
      let badgeHtml = "";
      let textColor = "inherit";
      
      if (isStudent && isCorrect) {
        badgeHtml = ' <strong style="color:#0056b3;">[あなたの回答]</strong> <strong style="color:#B23A2B;">[正解]</strong>';
        textColor = "#B23A2B"; 
      } else if (isStudent) {
        badgeHtml = ' <strong style="color:#0056b3;">[あなたの回答]</strong>';
        textColor = "#0056b3";
      } else if (isCorrect) {
        badgeHtml = ' <strong style="color:#B23A2B;">[正解]</strong>';
        textColor = "#B23A2B";
      }

      const bodySpan = el("span", { class: "choice__body", html: badgeHtml + parseMarkdown(c.text) });
      if (textColor !== "inherit") bodySpan.style.color = textColor;

      const inputAttrs = { 
        type: q.format === "single_choice" ? "radio" : "checkbox", 
        disabled: true 
      };
      if (isStudent) {
        inputAttrs.checked = true;
      }

      box.appendChild(
        el("label", { class: "choice" }, [
          el("input", inputAttrs),
          el("span", { class: "choice__mark", text: c.id }),
          bodySpan,
        ])
      );
    });
    return box;
  }

  // 記述・数値問題
  const wrap = el("div", { class: "answer-text", style: "padding: 16px; background: #f6f8fa; border-radius: 6px;" });
  const myAns = q.student_answer || "(無回答)";
  
  // 要件: 自分の回答の下に答えを赤色で表示
  wrap.appendChild(el("div", { html: `<strong style="color:#666;">あなたの回答:</strong> <span style="color:#0056b3; font-weight:bold;">${myAns}</span>`, style: "margin-bottom: 12px; font-size:1.1em;" }));

  if (q.is_manual) {
    wrap.appendChild(el("div", { html: `<strong style="color:#666;">採点基準・模範解答:</strong> <span style="color:#B23A2B; font-weight:bold;">${q.rubric || "設定されていません"}</span>` }));
  } else {
    wrap.appendChild(el("div", { html: `<strong style="color:#666;">正解:</strong> <span style="color:#B23A2B; font-weight:bold;">${q.correct_answer}</span>`, style: "font-size:1.1em;" }));
  }

  return wrap;
}

/** 統計ビューの構築 */
function buildStatsView(data) {
  const stats = data.overall_stats;
  const mine = data.my_result;

  const wrap = el("div", { style: "padding: 16px 0;" });

  // 1. 偏差値・順位ハイライト
  const summaryBox = el("div", { style: "display:flex; gap: 16px; margin-bottom: 32px;" });
  summaryBox.appendChild(el("div", { style: "flex:1; background:#fff; border:1px solid var(--border); padding:24px; border-radius:8px; text-align:center;" }, [
    el("div", { text: "あなたの偏差値", style: "color:var(--text-muted); font-size:0.9em; margin-bottom:8px;" }),
    el("div", { text: mine.deviation.toFixed(1), style: "color:#B23A2B; font-size:2em; font-weight:bold;" })
  ]));
  summaryBox.appendChild(el("div", { style: "flex:1; background:#fff; border:1px solid var(--border); padding:24px; border-radius:8px; text-align:center;" }, [
    el("div", { text: "順位", style: "color:var(--text-muted); font-size:0.9em; margin-bottom:8px;" }),
    el("div", { text: `${mine.rank} 位 / ${stats.total_examinees} 人中`, style: "color:var(--ink); font-size:1.6em; font-weight:bold; margin-top:6px;" })
  ]));
  wrap.appendChild(summaryBox);

  // 2. 全体概要と点数分布
  wrap.appendChild(el("h3", { text: "試験全体の統計", style: "margin-bottom: 16px;" }));
  wrap.appendChild(el("p", { text: `総受験人数: ${stats.total_examinees} 人 ／ 全体平均: ${stats.average_score} 点`, style: "margin-bottom: 16px; font-weight:bold;" }));

  // 点数分布テーブル
  const distTable = el("table", { style: "width: 100%; border-collapse: collapse; margin-bottom: 32px; text-align:center; border: 1px solid var(--border);" });
  distTable.innerHTML = `<tr style="background:#f6f8fa;"><th style="padding:12px; border-bottom:1px solid var(--border);">得点</th><th style="padding:12px; border-bottom:1px solid var(--border);">人数</th></tr>`;
  
  const dist = stats.score_distribution || {};
  Object.keys(dist).sort((a,b) => b - a).forEach(score => {
    distTable.innerHTML += `<tr><td style="padding:12px; border-bottom:1px solid var(--border);">${score} 点</td><td style="padding:12px; border-bottom:1px solid var(--border);">${dist[score]} 人</td></tr>`;
  });
  wrap.appendChild(distTable);

  // 3. 設問別平均点
  wrap.appendChild(el("h3", { text: "各設問の平均得点", style: "margin-bottom: 16px;" }));
  const qTable = el("table", { style: "width: 100%; border-collapse: collapse; text-align:center; border: 1px solid var(--border);" });
  qTable.innerHTML = `<tr style="background:#f6f8fa;"><th style="padding:12px; border-bottom:1px solid var(--border);">設問</th><th style="padding:12px; border-bottom:1px solid var(--border);">平均得点 / 配点</th></tr>`;
  
  data.questions.forEach(q => {
    qTable.innerHTML += `<tr><td style="padding:12px; border-bottom:1px solid var(--border);">問 ${q.position}</td><td style="padding:12px; border-bottom:1px solid var(--border);">${q.average_points} / ${q.points_max} 点</td></tr>`;
  });
  wrap.appendChild(qTable);
  
  // （※注：Edge Functionの仕様上、各設問の「点数分布」は算出データに含まれていないため、ここでは「平均得点」のみを描画しています）

  return wrap;
}