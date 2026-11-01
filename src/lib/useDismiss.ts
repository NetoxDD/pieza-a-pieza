import { useEffect, useRef, type RefObject } from "react";

// Cierra un menú al pulsar fuera de él o al presionar Esc
export function useDismiss(
  open: boolean,
  onClose: () => void,
  wrapRef: RefObject<HTMLElement | null>,
  triggerRef?: RefObject<HTMLElement | null>
) {
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) closeRef.current();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeRef.current();
        triggerRef?.current?.focus();
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, wrapRef, triggerRef]);
}