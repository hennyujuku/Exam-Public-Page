import { $, el } from "./dom.js";
import { loadExamList } from "./api.js";

/** トップページ（ポータル画面）を描画するエントリポイント */
export async function renderTopPage() {
  const root = $("#examRoot");
  root.innerHTML = '<div style="text-align:center; padding: 40px;">読み込み中...</div>';

  // ヘッダーをトップページ用に書き換え
  $("#examTerm").textContent = "合格者編入塾-公開模試";
  $("#examTitle").textContent = "受験ポータル";
  
  // 進行度バーやタイマーなど、トップページに不要なものを隠す
  const metaArea = $(".exam-header__meta");
  if (metaArea) metaArea.style.display = "none";
  const actionBar = $(".actionbar");
  if (actionBar) actionBar.style.display = "none";

  try {
    const exams = await loadExamList();
    root.innerHTML = "";

    // 1. タブ切り替えUIの構築
    const tabContainer = el("div", { 
      style: "display:flex; margin-bottom: 24px; border-radius: 8px; overflow: hidden; border: 1px solid var(--border, #d0d7de);" 
    });
    
    const btnExamList = el("button", { text: "試験を受験する" });
    const btnResult = el("button", { text: "成績照会" });
    
    [btnExamList, btnResult].forEach(btn => {
      btn.style.flex = "1";
      btn.style.padding = "14px";
      btn.style.fontSize = "1.1em";
      btn.style.cursor = "pointer";
      btn.style.border = "none";
      btn.style.outline = "none";
      btn.style.transition = "all 0.2s ease-in-out";
    });

    function updateTabUI(isListActive) {
      const activeBg = "#e2e6ea";
      const activeColor = "#1e293b";
      const activeBorder = "3px solid #24292f";
      const activeWeight = "bold";

      const inactiveBg = "#f8f9fa";
      const inactiveColor = "#6c757d";
      const inactiveBorder = "3px solid transparent";
      const inactiveWeight = "normal";

      btnExamList.style.backgroundColor = isListActive ? activeBg : inactiveBg;
      btnExamList.style.color = isListActive ? activeColor : inactiveColor;
      btnExamList.style.borderBottom = isListActive ? activeBorder : inactiveBorder;
      btnExamList.style.fontWeight = isListActive ? activeWeight : inactiveWeight;

      btnResult.style.backgroundColor = !isListActive ? activeBg : inactiveBg;
      btnResult.style.color = !isListActive ? activeColor : inactiveColor;
      btnResult.style.borderBottom = !isListActive ? activeBorder : inactiveBorder;
      btnResult.style.fontWeight = !isListActive ? activeWeight : inactiveWeight;
    }

    updateTabUI(true);
    tabContainer.appendChild(btnExamList);
    tabContainer.appendChild(btnResult);
    root.appendChild(tabContainer);

    const contentArea = el("div", { class: "top-content" });
    root.appendChild(contentArea);

    // --- 【タブ1】試験一覧ビュー ---
    const examListView = el("div", { class: "view-exam-list" });
    if (exams.length === 0) {
      examListView.appendChild(el("p", { text: "現在、公開されている試験はありません。", style: "text-align:center; padding:40px; color:var(--text-muted);" }));
    } else {
      // 1. データを試験種別で振り分ける
      const mockExams = exams.filter(ex => ex.exam_type === "mock");
      const confExams = exams.filter(ex => ex.exam_type === "confirmation");

      // 試験カード（li要素）を生成する共通関数
      const createExamListItem = (ex) => {
        const li = el("li", {
          style: "border: 1px solid var(--border, #d0d7de); border-radius: 8px; padding: 20px; background: #fff; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 2px 4px rgba(0,0,0,0.02); margin-bottom: 12px;"
        }, [
          el("div", {}, [
            el("div", { text: ex.term || "通年", style: "font-size: 0.85em; color: var(--text-muted); margin-bottom: 6px; font-weight:bold;" }),
            el("div", { text: ex.title, style: "font-weight: bold; font-size: 1.2em; color: var(--ink); margin-bottom: 4px;" }),
            el("div", { text: `制限時間: ${ex.duration_minutes}分 / 配点: ${ex.total_points}点`, style: "font-size: 0.9em; color: #666;" })
          ]),
          el("button", { class: "btn-primary", text: "受験ページへ", style: "padding: 10px 20px; font-size: 0.95em;" })
        ]);
        li.querySelector("button").addEventListener("click", () => window.location.href = `?exam=${ex.exam_id}`);
        return li;
      };

      // 2. 模試セクション（アコーディオン）の構築
      const mockDetails = el("details", { style: "margin-bottom: 24px;" });
      // デフォルトで開いてほしければ以下のコメントアウトのように記述せよ
      // const mockDetails = el("details", { open: false, style: "margin-bottom: 24px;" }); 
      const mockSummary = el("summary", { text: "模試", style: "cursor: pointer; font-size: 1.2em; font-weight: bold; padding: 12px 0; border-bottom: 2px solid #eee; margin-bottom: 16px; user-select: none;" });
      mockDetails.appendChild(mockSummary);

      if (mockExams.length === 0) {
        mockDetails.appendChild(el("p", { text: "現在公開されている模試はありません。", style: "color:var(--text-muted); margin-left: 16px;" }));
      } else {
        const mockList = el("ul", { style: "list-style: none; padding: 0; margin: 0;" });
        mockExams.forEach(ex => mockList.appendChild(createExamListItem(ex)));
        mockDetails.appendChild(mockList);
      }
      examListView.appendChild(mockDetails);

      // 3. 確認テストセクション（アコーディオン）の構築
      const confDetails = el("details", { style: "margin-bottom: 24px;" });
      const confSummary = el("summary", { text: "確認テスト", style: "cursor: pointer; font-size: 1.2em; font-weight: bold; padding: 12px 0; border-bottom: 2px solid #eee; margin-bottom: 16px; user-select: none;" });
      confDetails.appendChild(confSummary);

      if (confExams.length === 0) {
        confDetails.appendChild(el("p", { text: "現在公開されている確認テストはありません。", style: "color:var(--text-muted); margin-left: 16px;" }));
      } else {
        // 科目ごとにグループ化する
        const groupedBySubject = {};
        confExams.forEach(ex => {
          const subject = ex.exam_subject || "その他";
          if (!groupedBySubject[subject]) groupedBySubject[subject] = [];
          groupedBySubject[subject].push(ex);
        });

        // 科目ごとに見出しとリストを生成
        for (const [subject, subjectExams] of Object.entries(groupedBySubject)) {
          confDetails.appendChild(el("h4", { text: subject, style: "margin: 16px 0 12px 16px; font-size: 1.05em; color: var(--ink); border-left: 4px solid var(--primary, #0056b3); padding-left: 8px;" }));
          const confList = el("ul", { style: "list-style: none; padding: 0; margin: 0 0 24px 0;" });
          subjectExams.forEach(ex => confList.appendChild(createExamListItem(ex)));
          confDetails.appendChild(confList);
        }
      }
      examListView.appendChild(confDetails);
    }

    // --- 【タブ2】成績照会ビュー ---
    const resultQueryView = el("div", { style: "display: none; padding: 40px 24px; background: #fff; border: 1px solid var(--border); border-radius: 8px; text-align: center;" });
    resultQueryView.appendChild(el("h3", { text: "成績結果の照会", style: "margin-bottom: 16px; font-size: 1.4em;" }));
    resultQueryView.appendChild(el("p", { text: "回答提出後に発行された 提出ID を入力してください。", style: "color: var(--text-muted); margin-bottom: 32px;" }));

    const inputId = el("input", { 
      type: "text", 
      placeholder: "例: 123e4567-e89b-12d3-a456-426614174000", 
      style: "width: 100%; max-width: 480px; padding: 14px; font-size: 1.1em; border: 2px solid #d0d7de; border-radius: 6px; margin-bottom: 24px; outline: none; transition: all 0.2s; background-color: #ffffff; box-shadow: inset 0 1px 2px rgba(0,0,0,0.05);"
    });
    // 入力フォーカス時のスタイル（簡易的）
    inputId.addEventListener("focus", () => inputId.style.borderColor = "var(--primary, #0056b3)");
    inputId.addEventListener("blur", () => inputId.style.borderColor = "var(--border)");

    const btnSearch = el("button", { class: "btn-primary", text: "成績を確認する", style: "padding: 14px 32px; font-size: 1.1em;" });

    // 検索ボタンクリックでハッシュを変更（app.jsのルーターが検知して遷移）
    btnSearch.addEventListener("click", () => {
      const val = inputId.value.trim();
      if (val) {
        window.location.hash = `result=${val}`;
      } else {
        alert("提出IDを入力してください。");
      }
    });

    resultQueryView.appendChild(inputId);
    resultQueryView.appendChild(el("br"));
    resultQueryView.appendChild(btnSearch);

    contentArea.appendChild(examListView);
    contentArea.appendChild(resultQueryView);

    // タブ切り替えイベント
    btnExamList.addEventListener("click", () => {
      updateTabUI(true);
      examListView.style.display = "block";
      resultQueryView.style.display = "none";
    });

    btnResult.addEventListener("click", () => {
      updateTabUI(false);
      examListView.style.display = "none";
      resultQueryView.style.display = "block";
    });

  } catch (e) {
    console.error(e);
    root.innerHTML = '<div style="color:red; text-align:center; padding:40px;">データの読み込みに失敗しました。</div>';
  }
}