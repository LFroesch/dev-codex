import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CreateProject from '../pages/CreateProject';

// Mock the API
vi.mock('../api', () => ({
  projectAPI: {
    create: vi.fn(),
  },
}));

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock toast service
vi.mock('../services/toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

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

describe('CreateProject', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders create project form', () => {
    render(<CreateProject />, { wrapper: createWrapper() });

    expect(screen.getByText(/create new project/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/enter project name/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create project/i })).toBeInTheDocument();
  });

  it('allows user to type in name field', async () => {
    const user = userEvent.setup();
    render(<CreateProject />, { wrapper: createWrapper() });

    const nameInput = screen.getByPlaceholderText(/enter project name/i);
    await user.type(nameInput, 'My Test Project');

    expect(nameInput).toHaveValue('My Test Project');
  });

  it('renders without crashing', () => {
    render(<CreateProject />, { wrapper: createWrapper() });
    expect(document.body).toBeInTheDocument();
  });
});