"use client";
import React, { createContext, useCallback, useContext, useState } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

type ToastVariant = "success" | "error" | "info";

interface Toast {
  id: number;
  message: string;
  variant: ToastVariant;
}

interface ToastContextType {
  showToast: (message: string, variant?: ToastVariant) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

const VARIANT_STYLES: Record<ToastVariant, string> = {
  success: "bg-emerald-50 border-emerald-100 text-emerald-700",
  error: "bg-red-50 border-red-100 text-red-700",
  info: "bg-slate-50 border-slate-200 text-slate-700",
};

const VARIANT_ICONS: Record<ToastVariant, React.ElementType> = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
};

const AUTO_DISMISS_MS = 5000;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, variant: ToastVariant = "info") => {
      const id = Date.now() + Math.random();
      setToasts((prev) => [...prev, { id, message, variant }]);
      setTimeout(() => dismiss(id), AUTO_DISMISS_MS);
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 w-full max-w-sm pointer-events-none">
        {toasts.map((toast) => {
          const Icon = VARIANT_ICONS[toast.variant];
          return (
            <div
              key={toast.id}
              role="status"
              className={`pointer-events-auto flex items-start gap-2 px-4 py-3 rounded-2xl border shadow-lg font-bold text-xs animate-in fade-in slide-in-from-top-2 ${VARIANT_STYLES[toast.variant]}`}
            >
              <Icon size={18} className="shrink-0 mt-0.5" />
              <span className="flex-1">{toast.message}</span>
              <button
                onClick={() => dismiss(toast.id)}
                aria-label="Dismiss"
                className="shrink-0 opacity-50 hover:opacity-100 transition"
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within ToastProvider");
  return context;
};
