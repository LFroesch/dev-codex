import React from 'react';
import { getContrastTextColor } from '../utils/contrastTextColor';

interface ConfirmationModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'error' | 'warning' | 'info';
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onConfirm,
  onCancel,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'warning'
}) => {
  if (!isOpen) return null;

  const getIconAndColor = () => {
    switch (variant) {
      case 'error':
        return {
          bgClass: 'bg-error/10',
          textClass: 'text-error',
          btnClass: 'btn-error',
          colorName: 'error',
          icon: (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          )
        };
      case 'warning':
        return {
          bgClass: 'bg-warning/10',
          textClass: 'text-warning',
          btnClass: 'btn-warning',
          colorName: 'warning',
          icon: (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          )
        };
      default:
        return {
          bgClass: 'bg-info/10',
          textClass: 'text-info',
          btnClass: 'btn-info',
          colorName: 'info',
          icon: (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          )
        };
    }
  };

  const { bgClass, textClass, btnClass, colorName, icon } = getIconAndColor();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-200 p-4">
      <div className="bg-base-100 rounded-lg shadow-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto border-2 border-base-content/20">
        <div className={`flex items-center justify-center w-16 h-16 mx-auto mb-4 ${bgClass} rounded-full border-2 border-base-content/20`}>
          <svg className={`w-8 h-8 ${textClass}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {icon}
          </svg>
        </div>

        <h3 className="text-xl font-bold text-center mb-4" style={{ color: getContrastTextColor('base') }}>{title}</h3>

        <div className="text-center mb-6" style={{ color: getContrastTextColor('base') }} dangerouslySetInnerHTML={{ __html: message }} />

        <div className="flex gap-3">
          <button
            type="button"
            className="btn btn-ghost flex-1 border-2 border-base-content/20"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onCancel();
            }}
            style={{ color: getContrastTextColor('base') }}
          >
            {cancelText}
          </button>
          <button
            type="button"
            className={`btn ${btnClass} flex-1 border-2 border-base-content/20`}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onConfirm();
            }}
            style={{ color: getContrastTextColor(colorName) }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
