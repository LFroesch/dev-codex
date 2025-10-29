import React from 'react';

interface InfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  variant?: 'success' | 'error' | 'info';
}

const InfoModal: React.FC<InfoModalProps> = ({
  isOpen,
  onClose,
  title,
  message,
  variant = 'info'
}) => {
  if (!isOpen) return null;

  const getIconAndColor = () => {
    switch (variant) {
      case 'success':
        return {
          bgClass: 'bg-success/10',
          textClass: 'text-success',
          btnClass: 'btn-success',
          icon: (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          )
        };
      case 'error':
        return {
          bgClass: 'bg-error/10',
          textClass: 'text-error',
          btnClass: 'btn-error',
          icon: (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          )
        };
      default:
        return {
          bgClass: 'bg-info/10',
          textClass: 'text-info',
          btnClass: 'btn-info',
          icon: (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          )
        };
    }
  };

  const { bgClass, textClass, btnClass, icon } = getIconAndColor();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-base-100 rounded-lg shadow-xl p-4 sm:p-6 w-full max-w-md max-h-[85vh] sm:max-h-[90vh] overflow-y-auto">
        <div className={`flex items-center justify-center w-16 h-16 mx-auto mb-4 ${bgClass} rounded-full`}>
          <svg className={`w-8 h-8 ${textClass}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {icon}
          </svg>
        </div>
        
        <h3 className="text-xl font-bold text-center mb-4">{title}</h3>
        
        <p className="text-center text-base-content/70 mb-6">{message}</p>

        <div className="flex justify-center">
          <button 
            className={`btn ${btnClass}`}
            onClick={onClose}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};

export default InfoModal;