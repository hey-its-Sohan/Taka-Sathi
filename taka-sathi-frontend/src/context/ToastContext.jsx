import { createContext, useCallback, useState } from 'react';
import { CheckCircle2, XCircle, Info, X, ShieldAlert } from 'lucide-react';

export const ToastContext = createContext(null);

const ICONS = { success: CheckCircle2, error: XCircle, info: Info, custom: ShieldAlert };
const CLASSES = { success: 'alert-success', error: 'alert-error', info: 'alert-info', custom: 'bg-neutral text-neutral-content border border-teal-500/30' };

export default function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback((message, type = 'info', options = {}) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type, ...options }]);
    const duration = options.duration !== undefined ? options.duration : 4000;
    if (duration > 0 && duration !== Infinity) {
      setTimeout(() => {
        dismiss(id);
      }, duration);
    }
    return id;
  }, [dismiss]);

  const toast = {
    success: (msg, opts) => push(msg, 'success', opts),
    error: (msg, opts) => push(msg, 'error', opts),
    info: (msg, opts) => push(msg, 'info', opts),
    dismiss,
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="toast toast-end toast-bottom z-[100] w-full max-w-sm flex flex-col gap-2 p-4">
        {toasts.map((t) => {
          const Icon = ICONS[t.type] || Info;
          const isCustom = t.type === 'custom';
          return (
            <div 
              key={t.id} 
              className={`alert ${CLASSES[t.type] || CLASSES.info} shadow-lg text-sm rounded-2xl flex flex-col items-stretch gap-2.5 p-4 border border-base-300/40`}
            >
              <div className="flex items-start gap-2.5">
                <Icon size={18} className={isCustom ? 'text-secondary mt-0.5 shrink-0 animate-pulse' : 'mt-0.5 shrink-0'} />
                <div className="flex-1 font-bn font-medium leading-relaxed">
                  {t.message}
                </div>
                <button 
                  onClick={() => dismiss(t.id)} 
                  className="btn btn-ghost btn-xs btn-circle text-base-content/40 hover:text-base-content shrink-0" 
                  aria-label="Dismiss"
                >
                  <X size={14} className={isCustom ? 'text-neutral-content/60' : ''} />
                </button>
              </div>

              {t.action && (
                <div className="flex justify-end gap-2 mt-1">
                  <button
                    onClick={() => {
                      t.action.onClick();
                      dismiss(t.id);
                    }}
                    className={`btn btn-xs font-bold px-3 py-1 rounded-md shadow-sm border-none transition-all
                      ${
                        isCustom
                          ? 'bg-secondary text-secondary-content hover:bg-secondary/90'
                          : 'bg-primary text-primary-content hover:brightness-110'
                      }`}
                  >
                    {t.action.label}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
