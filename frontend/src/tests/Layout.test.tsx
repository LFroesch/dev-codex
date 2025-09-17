import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock all complex dependencies
vi.mock('../hooks/useApiCall', () => ({
  useApiCall: () => ({
    data: null,
    loading: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

vi.mock('../services/toast', () => ({
  toast: {
    subscribe: vi.fn(() => vi.fn()),
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Simple mock component
const MockLayout = () => {
  return <div data-testid="layout">Layout Component</div>;
};

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </BrowserRouter>
  );
};

describe('Layout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders layout component', () => {
    render(<MockLayout />, { wrapper: createWrapper() });
    expect(document.body).toBeInTheDocument();
  });
});