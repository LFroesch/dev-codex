import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CreateProject from '../pages/CreateProject';
import { projectAPI } from '../api';

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
    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn(() => 'retro'),
        setItem: vi.fn(),
      },
    });
  });

  it('renders create project form', () => {
    render(<CreateProject />, { wrapper: createWrapper() });

    expect(screen.getByRole('heading', { name: /create new project/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/project name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/category/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/color/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create project/i })).toBeInTheDocument();
  });

  it('allows user to fill out form fields', async () => {
    const user = userEvent.setup();
    render(<CreateProject />, { wrapper: createWrapper() });

    const nameInput = screen.getByLabelText(/project name/i);
    const descriptionInput = screen.getByLabelText(/description/i);
    const categorySelect = screen.getByLabelText(/category/i);

    await user.type(nameInput, 'My Test Project');
    await user.type(descriptionInput, 'This is a test project');
    await user.selectOptions(categorySelect, 'web-app');

    expect(nameInput).toHaveValue('My Test Project');
    expect(descriptionInput).toHaveValue('This is a test project');
    expect(categorySelect).toHaveValue('web-app');
  });

  it('creates project successfully', async () => {
    const user = userEvent.setup();
    const mockCreateProject = vi.mocked(projectAPI.create);
    const mockProject = {
      id: 'project-123',
      name: 'My Test Project',
      description: 'This is a test project',
      category: 'web-app'
    };
    mockCreateProject.mockResolvedValue(mockProject);

    render(<CreateProject />, { wrapper: createWrapper() });

    await user.type(screen.getByLabelText(/project name/i), 'My Test Project');
    await user.type(screen.getByLabelText(/description/i), 'This is a test project');
    await user.selectOptions(screen.getByLabelText(/category/i), 'web-app');

    const submitButton = screen.getByRole('button', { name: /create project/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockCreateProject).toHaveBeenCalledWith({
        name: 'My Test Project',
        description: 'This is a test project',
        category: 'web-app',
        color: '#3B82F6',
        tags: [],
        stagingEnvironment: 'development'
      });
    });

    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  it('validates required fields', async () => {
    const user = userEvent.setup();
    render(<CreateProject />, { wrapper: createWrapper() });

    const submitButton = screen.getByRole('button', { name: /create project/i });
    await user.click(submitButton);

    expect(screen.getByLabelText(/project name/i)).toBeRequired();
  });

  it('shows loading state during submission', async () => {
    const user = userEvent.setup();
    const mockCreateProject = vi.mocked(projectAPI.create);
    
    // Create a pending promise
    let resolvePromise: (value: any) => void;
    const pendingPromise = new Promise(resolve => {
      resolvePromise = resolve;
    });
    mockCreateProject.mockReturnValue(pendingPromise);

    render(<CreateProject />, { wrapper: createWrapper() });

    await user.type(screen.getByLabelText(/project name/i), 'Test Project');
    const submitButton = screen.getByRole('button', { name: /create project/i });
    await user.click(submitButton);

    expect(screen.getByText(/creating/i)).toBeInTheDocument();
    expect(submitButton).toBeDisabled();

    // Resolve the promise
    resolvePromise!({
      id: 'test-id',
      name: 'Test Project'
    });
  });

  it('handles creation errors', async () => {
    const user = userEvent.setup();
    const mockCreateProject = vi.mocked(projectAPI.create);
    const errorMessage = 'Project name already exists';
    mockCreateProject.mockRejectedValue(new Error(errorMessage));

    render(<CreateProject />, { wrapper: createWrapper() });

    await user.type(screen.getByLabelText(/project name/i), 'Duplicate Project');
    const submitButton = screen.getByRole('button', { name: /create project/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('allows adding and removing tags', async () => {
    const user = userEvent.setup();
    render(<CreateProject />, { wrapper: createWrapper() });

    const tagInput = screen.getByPlaceholderText(/add tag/i);
    await user.type(tagInput, 'frontend');
    await user.press('Enter');

    expect(screen.getByText('frontend')).toBeInTheDocument();

    const removeTagButton = screen.getByRole('button', { name: /remove.*frontend/i });
    await user.click(removeTagButton);

    expect(screen.queryByText('frontend')).not.toBeInTheDocument();
  });

  it('allows color selection', async () => {
    const user = userEvent.setup();
    render(<CreateProject />, { wrapper: createWrapper() });

    const colorInput = screen.getByLabelText(/color/i) as HTMLInputElement;
    expect(colorInput.value).toBe('#3b82f6');

    await user.clear(colorInput);
    await user.type(colorInput, '#ff0000');

    expect(colorInput.value).toBe('#ff0000');
  });

  it('sets default values correctly', () => {
    render(<CreateProject />, { wrapper: createWrapper() });

    expect(screen.getByDisplayValue('general')).toBeInTheDocument();
    expect(screen.getByDisplayValue('development')).toBeInTheDocument();
    expect((screen.getByLabelText(/color/i) as HTMLInputElement).value).toBe('#3b82f6');
  });

  it('applies theme from localStorage on mount', () => {
    const mockGetItem = vi.fn(() => 'dark');
    Object.defineProperty(window, 'localStorage', {
      value: { getItem: mockGetItem },
    });

    const mockSetAttribute = vi.fn();
    Object.defineProperty(document.documentElement, 'setAttribute', {
      value: mockSetAttribute,
    });

    render(<CreateProject />, { wrapper: createWrapper() });

    expect(mockGetItem).toHaveBeenCalledWith('theme');
    expect(mockSetAttribute).toHaveBeenCalledWith('data-theme', 'dark');
  });

  it('uses default theme if none saved', () => {
    const mockGetItem = vi.fn(() => null);
    Object.defineProperty(window, 'localStorage', {
      value: { getItem: mockGetItem },
    });

    const mockSetAttribute = vi.fn();
    Object.defineProperty(document.documentElement, 'setAttribute', {
      value: mockSetAttribute,
    });

    render(<CreateProject />, { wrapper: createWrapper() });

    expect(mockSetAttribute).toHaveBeenCalledWith('data-theme', 'retro');
  });

  it('has cancel button that navigates back', async () => {
    const user = userEvent.setup();
    render(<CreateProject />, { wrapper: createWrapper() });

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    await user.click(cancelButton);

    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });

  it('validates project name length', async () => {
    const user = userEvent.setup();
    render(<CreateProject />, { wrapper: createWrapper() });

    const nameInput = screen.getByLabelText(/project name/i);
    
    // Test too long name
    const longName = 'a'.repeat(101);
    await user.type(nameInput, longName);

    expect(nameInput).toHaveAttribute('maxLength', '100');
  });

  it('shows proper staging environment options', async () => {
    const user = userEvent.setup();
    render(<CreateProject />, { wrapper: createWrapper() });

    const stagingSelect = screen.getByLabelText(/staging environment/i);
    
    expect(screen.getByRole('option', { name: 'Development' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Staging' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Production' })).toBeInTheDocument();

    await user.selectOptions(stagingSelect, 'production');
    expect(stagingSelect).toHaveValue('production');
  });
});