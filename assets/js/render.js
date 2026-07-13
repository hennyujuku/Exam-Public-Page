// 描画 ── 数式（KaTeX+mhchem）と、設問まわりの DOM 構築
import { el } from "./dom.js";
import { updateProgress } from "./runtime.js";

// marked.jsの初期設定
if (typeof marked !== "undefined") {
  marked.setOptions({
    breaks: true, // \n を <br> に変換する
    highlight: function(code, lang) {
      if (typeof hljs !== "undefined") {
        const language = hljs.getLanguage(lang) ? lang : "plaintext";
        return hljs.highlight(code, { language }).value;
      }
      return code;
    }
  });
}

// 安全にMarkdownをパースする補助関数
export function parseMarkdown(text) {
  if (!text) return "";
  return typeof marked !== "undefined" ? marked.parse(text) : text;
}

/** スコープ内の $...$ / $$...$$ を KaTeX で描画（auto-render のグローバルを使用） */
export function renderMath(scope) {
  const fn = globalThis.renderMathInElement;
  if (typeof fn !== "function") return;
  fn(scope, {
    delimiters: [
      { left: "$$", right: "$$", display: true },
      { left: "$", right: "$", display: false },
    ],
    throwOnError: false,
    errorColor: "#B23A2B",
  });
}

/** 受験者情報＋説明（イントロ） */
export function buildIntro(meta) {
  const facts = [];
  if (meta.subject) facts.push(meta.subject);
  if (meta.total_points != null) facts.push("配点 " + meta.total_points + "点");
  if (meta.duration_minutes) facts.push("制限 " + meta.duration_minutes + "分");

  const labelName = el("label"); labelName.setAttribute("for", "stuName");
  labelName.innerHTML = '氏名<span class="req">*</span>';
  const labelId = el("label"); labelId.setAttribute("for", "stuId");
  labelId.innerHTML = '生徒ID or メールアドレス<span class="req">*</span>';

  return el("section", { class: "intro" }, [
    el("div", { class: "intro__heading" }, [
      el("h2", { text: meta.title || "模試" }),
      el("span", {
        class: "intro__facts",
        html: facts.map((f) => `<span>${f}</span>`).join(""),
      }),
    ]),
    meta.instructions ? el("p", { class: "intro__instructions", text: meta.instructions }) : null,
    el("div", { class: "fields" }, [
      el("div", { class: "field" }, [labelName, el("input", { id: "stuName", type: "text", autocomplete: "name", placeholder: "山田 太郎" })]),
      el("div", { class: "field" }, [labelId, el("input", { id: "stuId", type: "text", inputmode: "numeric", placeholder: "例: stu26001" })]),
    ]),
  ]);
}

/** 1問ぶんのカード */
export function buildQuestion(q, num) {
  const top = el("div", { class: "q__top" }, [
    el("span", { class: "q__num", text: "問 " + num }),
    el("span", { class: "q__points", text: q.points != null ? q.points + "点" : "" }),
  ]);

  const section = el("section", { class: "q", id: "card-" + q.id, "data-qid": q.id, "data-qtype": q.type }, [
    top,
    el("div", { class: "q__prompt", html: parseMarkdown(q.prompt) }),
    buildAnswerArea(q),
  ]);

    // DOM生成後に highlight.js を明示的に適用
  if (typeof hljs !== "undefined") {
    section.querySelectorAll('pre code').forEach((block) => {
      hljs.highlightElement(block);
    });
  }

  return section
}

/** 解答欄（型ごと） */
function buildAnswerArea(q) {
  if (q.type === "single_choice" || q.type === "multiple_choice") {
    const kind = q.type === "single_choice" ? "single" : "multi";
    const inputType = kind === "single" ? "radio" : "checkbox";
    const box = el("div", { class: "choices" });
    (q.choices || []).forEach((c) => {
      const input = el("input", { type: inputType, name: q.id, value: c.id });
      input.addEventListener("change", updateProgress);
      box.appendChild(
        el("label", { class: "choice", "data-kind": kind }, [
          input,
          el("span", { class: "choice__mark", text: c.id }),
          el("span", { class: "choice__body", html: parseMarkdown(c.text) }),
        ])
      );
    });
    return box;
  }

  if (q.type === "numeric") {
    const inp = el("input", { type: "text", inputmode: "decimal", name: q.id, autocomplete: "off", placeholder: "数値を入力" });
    inp.addEventListener("input", updateProgress);
    const wrap = el("div", { class: "answer-numeric" }, [inp]);
    if (q.input_hint) wrap.appendChild(el("span", { class: "answer-hint", text: q.input_hint }));
    return wrap;
  }

  // short_text（記述・サーバ採点しない＝後で人手/AI）
  const ta = el("textarea", { name: q.id, placeholder: "解答を記入" });
  ta.addEventListener("input", updateProgress);
  return el("div", { class: "answer-text" }, [ta]);
}
