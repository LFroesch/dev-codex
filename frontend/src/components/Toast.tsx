import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { toast, Toast as ToastType } from '../services/toast';

const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<ToastType[]>([]);

  useEffect(() => {
    const unsubscribe = toast.subscribe(setToasts);
    return () => {
      unsubscribe();
    };
  }, []);

  if (toasts.length === 0) return null;

  const getToastClasses = (type: string) => {
    switch (type) {
      case 'success':
        return 'alert-success';
      case 'error':
        return 'alert-error';
      case 'warning':
        return 'alert-warning';
      case 'info':
      default:
        return 'alert-info';
    }
  };

  const getToastIcon = (type: string) => {
    switch (type) {
      case 'success':
        return (
          <svg className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'error':
        return (
          <svg className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'warning':
        return (
          <svg className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        );
      case 'info':
      default:
        return (
          <svg className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  const toastContainer = (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[99999] space-y-2 px-4 w-full max-w-lg border-thick">
      {toasts.map((toastItem) => (
        <div key={toastItem.id} className={`alert ${getToastClasses(toastItem.type)} shadow-xl w-full`}>
          {getToastIcon(toastItem.type)}
          <span>{toastItem.message}</span>
          <button
            className="btn btn-sm btn-ghost"
            onClick={() => toast.remove(toastItem.id)}
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );

  return createPortal(toastContainer, document.body);
};

export default ToastContainer;