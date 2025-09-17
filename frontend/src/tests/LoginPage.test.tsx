import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import LoginPage from '../pages/LoginPage';
import { authAPI } from '../api';

// Mock the API
vi.mock('../api', () => ({
  authAPI: {
    login: vi.fn(),
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

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders login form elements', () => {
    render(<LoginPage />, { wrapper: createWrapper() });

    expect(screen.getByRole('heading', { name: /welcome back/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
    expect(screen.getByText(/don't have an account/i)).toBeInTheDocument();
  });

  it('allows user to type in email and password fields', async () => {
    const user = userEvent.setup();
    render(<LoginPage />, { wrapper: createWrapper() });

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');

    expect(emailInput).toHaveValue('test@example.com');
    expect(passwordInput).toHaveValue('password123');
  });

  it('submits form with valid credentials', async () => {
    const user = userEvent.setup();
    const mockLogin = vi.mocked(authAPI.login);
    mockLogin.mockResolvedValue({
      message: 'Login successful',
      user: { id: '1', email: 'test@example.com', firstName: 'John' }
    });

    render(<LoginPage />, { wrapper: createWrapper() });

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /login/i });

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123'
      });
    });

    expect(mockNavigate).toHaveBeenCalledWith('/notes?view=projects');
  });

  it('displays error message on login failure', async () => {
    const user = userEvent.setup();
    const mockLogin = vi.mocked(authAPI.login);
    mockLogin.mockRejectedValue({
      response: {
        data: { message: 'Invalid credentials' }
      }
    });

    render(<LoginPage />, { wrapper: createWrapper() });

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /login/i });

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'wrongpassword');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
    });
  });

  it('shows loading state during submission', async () => {
    const user = userEvent.setup();
    const mockLogin = vi.mocked(authAPI.login);
    
    // Create a promise that resolves after a delay
    let resolveLogin: (value: any) => void;
    const loginPromise = new Promise((resolve) => {
      resolveLogin = resolve;
    });
    mockLogin.mockReturnValue(loginPromise);

    render(<LoginPage />, { wrapper: createWrapper() });

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /login/i });

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    await user.click(submitButton);

    // Check loading state
    expect(screen.getByText(/logging in/i)).toBeInTheDocument();
    expect(submitButton).toBeDisabled();

    // Resolve the promise
    resolveLogin!({
      message: 'Login successful',
      user: { id: '1', email: 'test@example.com' }
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
    });
  });

  it('has register link with correct href', () => {
    render(<LoginPage />, { wrapper: createWrapper() });

    const registerLink = screen.getByRole('link', { name: /sign up here/i });
    expect(registerLink).toHaveAttribute('href', '/register');
  });

  it('has forgot password link with correct href', () => {
    render(<LoginPage />, { wrapper: createWrapper() });

    const forgotPasswordLink = screen.getByRole('link', { name: /forgot password/i });
    expect(forgotPasswordLink).toHaveAttribute('href', '/forgot-password');
  });

  it('has password field of type password', () => {
    render(<LoginPage />, { wrapper: createWrapper() });

    const passwordInput = screen.getByLabelText(/password/i) as HTMLInputElement;
    expect(passwordInput.type).toBe('password');
  });
});