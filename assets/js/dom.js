// DOM ヘルパ ── 小さなユーティリティ群

export const $ = (sel, root = document) => root.querySelector(sel);

/**
 * 要素を組み立てる。attrs の特殊キー: class / html / text はそれぞれ
 * className / innerHTML / textContent に対応。children は配列。
 */
export function el(tag, attrs, children) {
  const n = document.createElement(tag);
  if (attrs) {
    for (const k of Object.keys(attrs)) {
      if (k === "class") n.className = attrs[k];
      else if (k === "html") n.innerHTML = attrs[k];
      else if (k === "text") n.textContent = attrs[k];
      else n.setAttribute(k, attrs[k]);
    }
  }
  (children || []).forEach((c) => c && n.appendChild(c));
  return n;
}

export const getParam = (name) =>
  new URLSearchParams(window.location.search).get(name);
