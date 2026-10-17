import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

/**
 * Shared modal for the dashboard.
 *
 * - Rendered in a portal on <body>, so the fixed top navbar, the floating bottom navbar and any
 *   transformed/overflow-hidden dashboard wrapper can never trap it or draw over it.
 * - "sheet" placement: slides up from the bottom on phones (like a bottom sheet) and is centered
 *   on larger screens. "center" placement: centered everywhere (good for confirmations).
 * - Header and footer stay pinned, only the body scrolls, so action buttons are never hidden.
 * - Locks page scroll, closes on Escape / backdrop click, and only the top-most modal reacts to Escape.
 */

let lockCount = 0;
const stack: object[] = [];

type Props = {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: ReactNode;
  icon?: ReactNode;
  footer?: ReactNode;
  hideHeader?: boolean;
  maxWidth?: "sm" | "md" | "lg";
  placement?: "sheet" | "center";
  /** Set to false to block closing (for example while a request is running). */
  dismissible?: boolean;
};

const widths = { sm: "sm:max-w-sm", md: "sm:max-w-md", lg: "sm:max-w-lg" };

export default function ModalShell({
  open,
  onClose,
  children,
  title,
  icon,
  footer,
  hideHeader = false,
  maxWidth = "md",
  placement = "sheet",
  dismissible = true,
}: Props) {
  const onCloseRef = useRef(onClose);
  const dismissibleRef = useRef(dismissible);
  onCloseRef.current = onClose;
  dismissibleRef.current = dismissible;

  useEffect(() => {
    if (!open) return;
    const token = {};
    stack.push(token);
    if (lockCount++ === 0) document.body.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && dismissibleRef.current && stack[stack.length - 1] === token) {
        onCloseRef.current();
      }
    };
    window.addEventListener("keydown", onKey);

    return () => {
      window.removeEventListener("keydown", onKey);
      stack.splice(stack.indexOf(token), 1);
      if (--lockCount === 0) document.body.style.overflow = "";
    };
  }, [open]);

  if (typeof document === "undefined") return null;

  const isSheet = placement === "sheet";

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          // z-[100] sits above any navbar; confirmations (center) sit one layer higher so they can open over a details modal.
          className={`fixed inset-0 flex justify-center bg-black/60 backdrop-blur-xs ${
            isSheet ? "z-[100] items-end sm:items-center sm:p-4" : "z-[110] items-center p-4"
          }`}
          onClick={() => dismissible && onClose()}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={isSheet ? { opacity: 0, y: 56 } : { opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={isSheet ? { opacity: 0, y: 56 } : { opacity: 0, scale: 0.96, y: 10 }}
            transition={{ type: "spring", damping: 30, stiffness: 340 }}
            onClick={(e) => e.stopPropagation()}
            className={`relative w-full ${widths[maxWidth]} max-h-[88dvh] sm:max-h-[90dvh] flex flex-col overflow-hidden bg-base-100 border border-base-200 shadow-2xl ${
              isSheet ? "rounded-t-3xl sm:rounded-2xl border-b-0 sm:border-b" : "rounded-2xl"
            }`}
          >
            {/* Grab handle (phones only) */}
            {isSheet && (
              <div className="sm:hidden flex justify-center pt-2.5 pb-1 shrink-0">
                <span className="h-1 w-10 rounded-full bg-base-300" />
              </div>
            )}

            {!hideHeader && (
              <div className="flex items-center justify-between gap-2 px-4 sm:px-5 py-3 border-b border-base-200 shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  {icon && <span className="text-primary shrink-0">{icon}</span>}
                  <h3 className="font-black text-xs uppercase tracking-wider text-base-content truncate">{title}</h3>
                </div>
                {dismissible && (
                  <button onClick={onClose} className="btn btn-ghost btn-xs btn-square rounded-lg" aria-label="Close">
                    <X size={14} />
                  </button>
                )}
              </div>
            )}

            <div className="flex-1 overflow-y-auto overscroll-contain px-4 sm:px-5 py-4">{children}</div>

            {footer && (
              <div className="shrink-0 border-t border-base-200 bg-base-100 px-4 sm:px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                {footer}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}