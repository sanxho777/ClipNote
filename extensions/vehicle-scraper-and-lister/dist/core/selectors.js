export function qs(root, sel): Element | null {
  return root.querySelector(sel);
}
export function qsa(root, sel): Element[] {
  return Array.from(root.querySelectorAll(sel));
}
export function byLabel(root, labelLike)= Array.from(root.querySelectorAll('*')).filter((el) => {
    const txt = el.textContent?.trim() ?? '';
    return labelLike.test(txt);
  });
  for (const label of labels) {
    // next sibling or parent table row cell proximity
    const sib = label.nextElementSibling;
    if (sib) {
      const t = (sib).innerText?.trim();
      if (t) return t;
    }
    const parent = label.closest('tr, div, li');
    if (parent) {
      const cand = Array.from(parent.querySelectorAll('td, div, span'))
        .map((n) => (n).innerText?.trim() ?? '')
        .filter(Boolean);
      if (cand.length > 1) return cand.slice(1).join(' ').trim();
    }
  }
  return undefined;
}

export function metaContent(name)= document.querySelector(`meta[name="${name}"], meta[property="${name}"]`) HTMLMetaElement
    | null;
  return el?.content?.trim() || undefined;
}
