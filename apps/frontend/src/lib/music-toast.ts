'use client';

/* ------------------------------------------------------------------ */
/*  musicToast — small dependency-free toast for the music domain      */
/*  Used for German success/error feedback (snackbars) across the      */
/*  playlist and favorite flows.                                       */
/* ------------------------------------------------------------------ */

type ToastType = 'success' | 'error';

const DEFAULT_BG: Record<ToastType, string> = {
  success: '#22c55e',
  error: '#ef4444',
};

/**
 * Show a transient snackbar in the bottom-right corner.
 * Accepts German UI strings. Optionally a custom action button.
 */
export function musicToast(
  message: string,
  type: ToastType = 'success',
  opts?: { actionLabel?: string; onAction?: () => void },
): void {
  if (typeof document === 'undefined') return;

  const el = document.createElement('div');
  el.textContent = message;
  Object.assign(el.style, {
    position: 'fixed',
    bottom: '16px',
    right: '16px',
    zIndex: '9999',
    backgroundColor: DEFAULT_BG[type],
    color: '#fff',
    padding: '10px 16px',
    borderRadius: '8px',
    fontSize: '14px',
    lineHeight: '20px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  });

  if (opts?.actionLabel && opts.onAction) {
    const btn = document.createElement('button');
    btn.textContent = opts.actionLabel;
    Object.assign(btn.style, {
      background: 'rgba(255,255,255,0.2)',
      color: '#fff',
      border: 'none',
      borderRadius: '6px',
      padding: '4px 10px',
      fontSize: '13px',
      fontWeight: 600,
      cursor: 'pointer',
      whiteSpace: 'nowrap',
    });
    btn.addEventListener('click', () => {
      opts.onAction?.();
      el.remove();
    });
    el.appendChild(btn);
  }

  // Fade in, then out after 2.5s
  el.style.opacity = '0';
  document.body.appendChild(el);
  requestAnimationFrame(() => {
    el.style.transition = 'opacity 300ms';
    el.style.opacity = '1';
  });
  setTimeout(() => {
    el.style.opacity = '0';
    setTimeout(() => el.remove(), 300);
  }, 2500);
}

/** Convenience: success snackbar. */
export function toastSuccess(message: string, opts?: { actionLabel?: string; onAction?: () => void }): void {
  musicToast(message, 'success', opts);
}

/** Convenience: error snackbar. */
export function toastError(message: string): void {
  musicToast(message, 'error');
}
