import { Overlay } from '../ui/Sheet';

// Compat: hojas que arman su propio panel. El código nuevo usa `ui/Sheet`.
export default function Sheet({ align, closeOnBackdrop = false, ...props }) {
  return <Overlay align={align === 'full' ? 'full' : 'sheet'} closeOnBackdrop={closeOnBackdrop} {...props} />;
}
