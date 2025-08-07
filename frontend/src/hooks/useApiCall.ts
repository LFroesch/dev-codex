import { useState } from 'react';
import { useLoadingState } from './useLoadingState';

export interface UseApiCallReturn<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  call: (apiFunction: () => Promise<T>) => Promise<T | null>;
  reset: () => void;
}

export const useApiCall = <T = any>(): UseApiCallReturn<T> => {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { loading, withLoading } = useLoadingState();

  const call = async (apiFunction: () => Promise<T>): Promise<T | null> => {
    setError(null);
    try {
      const result = await withLoading(apiFunction);
      setData(result);
      return result;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'An error occurred';
      setError(errorMessage);
      setData(null);
      return null;
    }
  };

  const reset = () => {
    setData(null);
    setError(null);
  };

  return { data, loading, error, call, reset };
};

export default useApiCall;