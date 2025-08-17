export function qs(root: ParentNode, sel: string): Element | null {
  return root.querySelector(sel);
}
export function qsa(root: ParentNode, sel: string): Element[] {
  return Array.from(root.querySelectorAll(sel));
}
export function byLabel(root: ParentNode, labelLike: RegExp): string | undefined {
  const labels = Array.from(root.querySelectorAll('*')).filter((el) => {
    const txt = el.textContent?.trim() ?? '';
    return labelLike.test(txt);
  });
  for (const label of labels) {
    // next sibling or parent table row cell proximity
    const sib = label.nextElementSibling;
    if (sib) {
      const t = (sib as HTMLElement).innerText?.trim();
      if (t) return t;
    }
    const parent = label.closest('tr, div, li');
    if (parent) {
      const cand = Array.from(parent.querySelectorAll('td, div, span'))
        .map((n) => (n as HTMLElement).innerText?.trim() ?? '')
        .filter(Boolean);
      if (cand.length > 1) return cand.slice(1).join(' ').trim();
    }
  }
  return undefined;
}

export function metaContent(name: string): string | undefined {
  const el = document.querySelector(`meta[name="${name}"], meta[property="${name}"]`) as
    | HTMLMetaElement
    | null;
  return el?.content?.trim() || undefined;
}
