export function toast(message: string, type: 'info' | 'warn' | 'error' = 'info'): void {
  try {
    const id = `vsml-toast-${Date.now()}`;
    const div = document.createElement('div');
    div.id = id;
    div.textContent = message;
    div.style.position = 'fixed';
    div.style.zIndex = '2147483647';
    div.style.bottom = '20px';
    div.style.right = '20px';
    div.style.padding = '10px 14px';
    div.style.borderRadius = '8px';
    div.style.fontFamily = 'system-ui, sans-serif';
    div.style.fontSize = '12px';
    div.style.color = '#fff';
    div.style.background = type === 'info' ? '#2563eb' : type === 'warn' ? '#d97706' : '#b91c1c';
    div.style.boxShadow = '0 6px 20px rgba(0,0,0,.3)';
    document.documentElement.appendChild(div);
    setTimeout(() => div.remove(), 3000);
  } catch {
    // no-op
  }
}

export const log = {
  info: (...a: unknown[]) => console.log('[VSML]', ...a),
  warn: (...a: unknown[]) => console.warn('[VSML]', ...a),
  error: (...a: unknown[]) => console.error('[VSML]', ...a),
};
