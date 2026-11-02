import { useEffect, type RefObject } from 'react';

/**
 * Accesibilidad compartida de modales (Fase 2 — C6):
 * - Cierre con la tecla Escape.
 * - Foco inicial en el primer campo interactivo del modal.
 *
 * Debe llamarse SIEMPRE (incondicionalmente, antes del early-return
 * `if (!isOpen) return null`) para respetar las reglas de hooks de React.
 */
export function useModalA11y(
  isOpen: boolean,
  onClose: () => void,
  containerRef: RefObject<HTMLDivElement | null>
): void {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const t = window.setTimeout(() => {
      const first = containerRef.current?.querySelector<HTMLElement>(
        'input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])'
      );
      first?.focus();
    }, 50);
    return () => window.clearTimeout(t);
  }, [isOpen, containerRef]);
}
