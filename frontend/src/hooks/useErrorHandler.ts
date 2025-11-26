import { useState } from 'react';

export interface UseErrorHandlerReturn {
  error: string | null;
  setError: (error: string | null) => void;
  clearError: () => void;
  handleError: (error: any) => void;
}

export const useErrorHandler = (): UseErrorHandlerReturn => {
  const [error, setError] = useState<string | null>(null);

  const clearError = () => setError(null);

  const handleError = (err: any) => {
    
    let errorMessage = 'An unexpected error occurred';
    
    if (err?.response?.data?.message) {
      errorMessage = err.response.data.message;
    } else if (err?.message) {
      errorMessage = err.message;
    } else if (typeof err === 'string') {
      errorMessage = err;
    }
    
    setError(errorMessage);
  };

  return { error, setError, clearError, handleError };
};

export default useErrorHandler;