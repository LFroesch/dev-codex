import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import RegisterPage from '../pages/RegisterPage';

// Mock the API
vi.mock('../api', () => ({
  authAPI: {
    register: vi.fn(),
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

// Mock the hooks to return simple working implementations
vi.mock('../hooks/useLoadingState', () => ({
  useLoadingState: () => ({
    loading: false,
    withLoading: async (fn: () => Promise<any>) => {
      return await fn();
    },
  }),
}));

vi.mock('../hooks/useErrorHandler', () => ({
  useErrorHandler: () => ({
    error: null,
    clearError: vi.fn(),
    handleError: vi.fn(),
  }),
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

describe('RegisterPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders registration form with all required fields', () => {
    render(<RegisterPage />, { wrapper: createWrapper() });

    expect(screen.getByRole('heading', { name: /create account/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/first name/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/last name/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/enter your email/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/create a password/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/confirm your password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
  });

  it('allows user to type in all form fields', async () => {
    const user = userEvent.setup();
    render(<RegisterPage />, { wrapper: createWrapper() });

    const firstNameInput = screen.getByPlaceholderText(/first name/i);
    const lastNameInput = screen.getByPlaceholderText(/last name/i);
    const emailInput = screen.getByPlaceholderText(/enter your email/i);
    const passwordInput = screen.getByPlaceholderText(/create a password/i);
    const confirmPasswordInput = screen.getByPlaceholderText(/confirm your password/i);

    await user.type(firstNameInput, 'John');
    await user.type(lastNameInput, 'Doe');
    await user.type(emailInput, 'john@example.com');
    await user.type(passwordInput, 'password123');
    await user.type(confirmPasswordInput, 'password123');

    expect(firstNameInput).toHaveValue('John');
    expect(lastNameInput).toHaveValue('Doe');
    expect(emailInput).toHaveValue('john@example.com');
    expect(passwordInput).toHaveValue('password123');
    expect(confirmPasswordInput).toHaveValue('password123');
  });

  it('has correct input types for form fields', () => {
    render(<RegisterPage />, { wrapper: createWrapper() });

    expect(screen.getByPlaceholderText(/enter your email/i)).toHaveAttribute('type', 'email');
    expect(screen.getByPlaceholderText(/create a password/i)).toHaveAttribute('type', 'password');
    expect(screen.getByPlaceholderText(/confirm your password/i)).toHaveAttribute('type', 'password');
  });

  it('marks all fields as required', () => {
    render(<RegisterPage />, { wrapper: createWrapper() });

    expect(screen.getByPlaceholderText(/first name/i)).toBeRequired();
    expect(screen.getByPlaceholderText(/last name/i)).toBeRequired();
    expect(screen.getByPlaceholderText(/enter your email/i)).toBeRequired();
    expect(screen.getByPlaceholderText(/create a password/i)).toBeRequired();
    expect(screen.getByPlaceholderText(/confirm your password/i)).toBeRequired();
  });

  it('has minimum length requirement for password fields', () => {
    render(<RegisterPage />, { wrapper: createWrapper() });

    expect(screen.getByPlaceholderText(/create a password/i)).toHaveAttribute('minLength', '6');
    expect(screen.getByPlaceholderText(/confirm your password/i)).toHaveAttribute('minLength', '6');
  });

  it('displays login link with correct href', () => {
    render(<RegisterPage />, { wrapper: createWrapper() });

    const loginLink = screen.getByRole('link', { name: /sign in here/i });
    expect(loginLink).toHaveAttribute('href', '/login');
  });

  it('displays Google signup button', () => {
    render(<RegisterPage />, { wrapper: createWrapper() });

    expect(screen.getByRole('button', { name: /sign up with google/i })).toBeInTheDocument();
  });

  it('has proper form structure', () => {
    const { container } = render(<RegisterPage />, { wrapper: createWrapper() });

    // Check if the form element exists by finding it via querySelector
    const form = container.querySelector('form');
    expect(form).toBeInTheDocument();
    
    const submitButton = screen.getByRole('button', { name: /create account/i });
    expect(submitButton).toHaveAttribute('type', 'submit');
  });

  it('displays OR divider between form and social login', () => {
    render(<RegisterPage />, { wrapper: createWrapper() });

    expect(screen.getByText('OR')).toBeInTheDocument();
  });

  it('has proper page structure and headings', () => {
    render(<RegisterPage />, { wrapper: createWrapper() });

    expect(screen.getByText('Already have an account?')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /create account/i })).toBeInTheDocument();
  });
});