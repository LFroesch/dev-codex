import { useState, useCallback } from 'react';
import { useLoadingState } from './useLoadingState';
import { useErrorHandler } from './useErrorHandler';

export interface UseResourceReturn<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  execute: (apiCall: () => Promise<T>) => Promise<T | null>;
  refresh: () => Promise<T | null>;
  reset: () => void;
}

export const useResource = <T = any>(initialApiCall?: () => Promise<T>): UseResourceReturn<T> => {
  const [data, setData] = useState<T | null>(null);
  const { loading, withLoading } = useLoadingState();
  const { error, handleError, clearError } = useErrorHandler();

  const execute = useCallback(async (apiCall: () => Promise<T>): Promise<T | null> => {
    clearError();
    try {
      const result = await withLoading(apiCall);
      if (result) {
        setData(result);
      }
      return result;
    } catch (err) {
      handleError(err);
      return null;
    }
  }, [withLoading, handleError, clearError]);

  const refresh = useCallback(async (): Promise<T | null> => {
    if (!initialApiCall) return null;
    return execute(initialApiCall);
  }, [execute, initialApiCall]);

  const reset = useCallback(() => {
    setData(null);
    clearError();
  }, [clearError]);

  return { data, loading, error, execute, refresh, reset };
};

export default useResource;