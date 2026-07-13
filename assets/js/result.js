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
    if (!data || !data.ok) {
      if (data && data.error === "not_published_yet") {
        throw new Error(data.message || "成績はまだ公開されていません。");
      }
      throw new Error("データの取得に失敗しました。");
    }

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
    root.innerHTML = `
      <div style="text-align:center; padding:60px 20px;">
        <div style="font-size: 3em; margin-bottom: 16px;">🔒</div>
        <h2 style="color:var(--ink); margin-bottom: 8px;">アクセスできません</h2>
        <p style="color:var(--text-muted);">${err.message}</p>
        <button class="btn-primary" style="margin-top: 24px;" onclick="window.location.hash=''">トップへ戻る</button>
      </div>
    `;
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

  // グラフCanvasを作成
  const chartContainer = el("div", { style: "width: 100%; max-width: 600px; margin: 0 auto 32px auto;" });
  const canvas = el("canvas", { id: "scoreChart" });
  chartContainer.appendChild(canvas);
  wrap.appendChild(chartContainer);

  // 階級データと自分の位置を計算
  const histData = createHistogramData(stats.score_distribution, data.exam.total_points, mine.total_score);
  
  // 自分のいる階級だけ目立つ色（赤系）にする
  const bgColors = histData.data.map((_, i) => i === histData.myBinIndex ? '#B23A2B' : '#e2e6ea');

  // DOMが画面にアペンドされた直後にグラフを描画するため、setTimeoutを使用
  setTimeout(() => {
    if (typeof Chart !== "undefined") {
      new Chart(canvas, {
        type: 'bar',
        data: {
          labels: histData.labels,
          datasets: [{
            label: '人数',
            data: histData.data,
            backgroundColor: bgColors,
            borderWidth: 0,
            borderRadius: 4, // 棒の角を少し丸くする
          }]
        },
        options: {
          responsive: true,
          scales: {
            y: {
              beginAtZero: true,
              ticks: { stepSize: 1 } // 人数は必ず整数なので1刻み
            }
          },
          plugins: {
            legend: { display: false }, // 「人数」の凡例を非表示（シンプルにするため）
            tooltip: {
              callbacks: {
                label: (ctx) => `${ctx.raw} 人`
              }
            }
          }
        }
      });
    }
  }, 0);

  return wrap;
}

/**
 * 満点に応じて最適な階級幅を決定し、グラフ用のデータを生成する補助関数
 */
function createHistogramData(rawDistribution, totalPoints, myScore) {
  // 1. 満点に応じて階級幅（binSize）を決定
  let binSize = 10;
  if (totalPoints <= 10) binSize = 1;        // 10点満点以下なら1点刻み
  else if (totalPoints <= 30) binSize = 3;   // 30点満点以下なら3点刻み
  else if (totalPoints <= 50) binSize = 5;   // 50点満点以下なら5点刻み
  else if (totalPoints <= 100) binSize = 10; // 100点満点以下なら10点刻み

  const numBins = Math.ceil(totalPoints / binSize);
  const labels = [];
  const data = new Array(numBins).fill(0);
  let myBinIndex = -1;

  // 2. 階級のラベルを作成し、自分のスコアが属するインデックスを特定
  for (let i = 0; i < numBins; i++) {
    const min = i * binSize;
    const max = (i === numBins - 1) ? totalPoints : (i + 1) * binSize - 1;
    labels.push(binSize === 1 ? `${min}点` : `${min}〜${max}点`);

    if (myScore >= min && myScore <= max) {
      myBinIndex = i;
    }
  }

  // 3. 生の分布データを階級ごとに集計
  for (const [scoreStr, count] of Object.entries(rawDistribution || {})) {
    const score = Number(scoreStr);
    let binIndex = Math.floor(score / binSize);
    
    // 満点ピッタリの人が配列の最後尾を超えないための安全処理
    if (binIndex >= numBins) binIndex = numBins - 1; 
    
    data[binIndex] += count;
  }

  return { labels, data, myBinIndex };
}