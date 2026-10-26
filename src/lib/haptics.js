// Feedback háptico. iOS no expone `navigator.vibrate`, pero desde iOS 18
// Safari hace vibrar el teléfono al alternar un <input type="checkbox" switch>,
// incluso oculto. Se usa eso en iPhone y `vibrate` en el resto.

let label = null;

const ensureSwitch = () => {
  if (label || typeof document === 'undefined') return label;
  label = document.createElement('label');
  label.setAttribute('aria-hidden', 'true');
  label.style.cssText = 'position:fixed;left:-9999px;top:0;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none;';
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.setAttribute('switch', '');
  input.tabIndex = -1;
  label.appendChild(input);
  document.body.appendChild(label);
  return label;
};

export const haptic = (pattern = 10) => {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(pattern);
      return;
    }
    ensureSwitch()?.click();
  } catch {
    // sin háptica, sin drama
  }
};
