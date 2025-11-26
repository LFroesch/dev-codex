import { useState } from 'react';

export interface UseLoadingStateReturn {
  loading: boolean;
  setLoading: (loading: boolean) => void;
  withLoading: <T>(fn: () => Promise<T>) => Promise<T | null>;
}

export const useLoadingState = (initialState = false): UseLoadingStateReturn => {
  const [loading, setLoading] = useState(initialState);

  const withLoading = async <T>(fn: () => Promise<T>): Promise<T | null> => {
    setLoading(true);
    try {
      const result = await fn();
      return result;
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return { loading, setLoading, withLoading };
};

export default useLoadingState;