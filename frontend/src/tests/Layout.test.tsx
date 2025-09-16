import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Layout from '../components/Layout';
import * as api from '../api';

// Mock all API modules
vi.mock('../api', () => ({
  authAPI: {
    me: vi.fn(),
    logout: vi.fn(),
  },
  projectAPI: {
    getAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  analyticsAPI: {
    getProjectTime: vi.fn(),
  },
  ideasAPI: {
    getIdeasCount: vi.fn(),
  },
}));

// Mock other dependencies
vi.mock('../hooks/useAnalytics', () => ({
  useAnalytics: () => ({ trackEvent: vi.fn() }),
}));

vi.mock('../utils/unsavedChanges', () => ({
  unsavedChangesManager: {
    hasUnsavedChanges: vi.fn(() => false),
    clearUnsavedChanges: vi.fn(),
    setConfirmationHandler: vi.fn(),
  },
}));

vi.mock('../services/errorService', () => ({
  handleAPIError: vi.fn(),
}));

vi.mock('../services/toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
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

// Mock user data
const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  role: 'user',
  plan: 'free'
};

// Mock projects data
const mockProjects = [
  {
    id: 'project-1',
    title: 'Project 1',
    description: 'First project',
    status: 'active',
    owner: 'user-123',
    createdAt: '2023-01-01',
    updatedAt: '2023-01-01'
  },
  {
    id: 'project-2',
    title: 'Project 2',
    description: 'Second project',
    status: 'archived',
    owner: 'user-123',
    createdAt: '2023-01-02',
    updatedAt: '2023-01-02'
  }
];

describe('Layout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default API mocks
    vi.mocked(api.authAPI.me).mockResolvedValue({ user: mockUser });
    vi.mocked(api.projectAPI.getAll).mockResolvedValue({ projects: mockProjects });
    vi.mocked(api.analyticsAPI.getProjectTime).mockResolvedValue({});
    vi.mocked(api.ideasAPI.getIdeasCount).mockResolvedValue({ count: 5 });

    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn((key: string) => {
          if (key === 'theme') return 'retro';
          if (key === 'collapsedSections') return '{}';
          return null;
        }),
        setItem: vi.fn(),
      },
    });
  });

  it('renders layout with navigation', async () => {
    render(<Layout />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByRole('navigation')).toBeInTheDocument();
    });

    expect(screen.getByText('Dev Codex')).toBeInTheDocument();
  });

  it('loads user data on mount', async () => {
    render(<Layout />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(api.authAPI.me).toHaveBeenCalled();
    });

    expect(screen.getByText('Test User')).toBeInTheDocument();
  });

  it('loads projects on mount', async () => {
    render(<Layout />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(api.projectAPI.getAll).toHaveBeenCalled();
    });

    expect(screen.getByText('Project 1')).toBeInTheDocument();
    expect(screen.getByText('Project 2')).toBeInTheDocument();
  });

  it('shows loading spinner initially', () => {
    render(<Layout />, { wrapper: createWrapper() });

    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('hides loading spinner after data loads', async () => {
    render(<Layout />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });
  });

  it('allows project selection', async () => {
    const user = userEvent.setup();
    render(<Layout />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Project 1')).toBeInTheDocument();
    });

    const projectButton = screen.getByText('Project 1');
    await user.click(projectButton);

    // Project should be selected (highlighted/active)
    expect(projectButton.closest('li')).toHaveClass('active');
  });

  it('filters projects by search term', async () => {
    const user = userEvent.setup();
    render(<Layout />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Project 1')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/search projects/i);
    await user.type(searchInput, 'Project 1');

    expect(screen.getByText('Project 1')).toBeInTheDocument();
    expect(screen.queryByText('Project 2')).not.toBeInTheDocument();
  });

  it('filters projects by status tab', async () => {
    const user = userEvent.setup();
    render(<Layout />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Project 1')).toBeInTheDocument();
    });

    const archivedTab = screen.getByText('Archived');
    await user.click(archivedTab);

    expect(screen.queryByText('Project 1')).not.toBeInTheDocument();
    expect(screen.getByText('Project 2')).toBeInTheDocument();
  });

  it('handles logout', async () => {
    const user = userEvent.setup();
    vi.mocked(api.authAPI.logout).mockResolvedValue(undefined);

    render(<Layout />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Test User')).toBeInTheDocument();
    });

    const userMenuButton = screen.getByText('Test User');
    await user.click(userMenuButton);

    const logoutButton = screen.getByText('Logout');
    await user.click(logoutButton);

    await waitFor(() => {
      expect(api.authAPI.logout).toHaveBeenCalled();
    });
  });

  it('displays notification bell', async () => {
    render(<Layout />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId('notification-bell')).toBeInTheDocument();
    });
  });

  it('displays session tracker', async () => {
    render(<Layout />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId('session-tracker')).toBeInTheDocument();
    });
  });

  it('displays toast container', async () => {
    render(<Layout />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId('toast-container')).toBeInTheDocument();
    });
  });

  it('handles create new project', async () => {
    const user = userEvent.setup();
    render(<Layout />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Create New Project')).toBeInTheDocument();
    });

    const createButton = screen.getByText('Create New Project');
    await user.click(createButton);

    expect(window.location.pathname).toBe('/create-project');
  });

  it('handles authentication errors', async () => {
    vi.mocked(api.authAPI.me).mockRejectedValue(new Error('Unauthorized'));

    render(<Layout />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(window.location.pathname).toBe('/login');
    });
  });

  it('handles API errors gracefully', async () => {
    vi.mocked(api.projectAPI.getAll).mockRejectedValue(new Error('Network error'));

    render(<Layout />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText(/error loading projects/i)).toBeInTheDocument();
    });
  });

  it('shows admin section for admin users', async () => {
    const adminUser = { ...mockUser, role: 'admin' };
    vi.mocked(api.authAPI.me).mockResolvedValue({ user: adminUser });

    render(<Layout />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Admin')).toBeInTheDocument();
    });
  });

  it('hides admin section for regular users', async () => {
    render(<Layout />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.queryByText('Admin')).not.toBeInTheDocument();
    });
  });

  it('displays project time analytics', async () => {
    const timeData = { 'project-1': 3600, 'project-2': 7200 }; // 1 hour, 2 hours
    vi.mocked(api.analyticsAPI.getProjectTime).mockResolvedValue(timeData);

    render(<Layout />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('1h')).toBeInTheDocument(); // Project 1 time
      expect(screen.getByText('2h')).toBeInTheDocument(); // Project 2 time
    });
  });

  it('displays ideas count', async () => {
    render(<Layout />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('5')).toBeInTheDocument(); // Ideas count badge
    });
  });

  it('handles responsive navigation', async () => {
    const user = userEvent.setup();
    render(<Layout />, { wrapper: createWrapper() });

    // On mobile, navigation should have a toggle button
    const navToggle = screen.getByLabelText(/toggle navigation/i);
    expect(navToggle).toBeInTheDocument();

    await user.click(navToggle);
    expect(screen.getByRole('navigation')).toHaveClass('open');
  });

  it('persists selected project in URL', async () => {
    const user = userEvent.setup();
    render(<Layout />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Project 1')).toBeInTheDocument();
    });

    const projectButton = screen.getByText('Project 1');
    await user.click(projectButton);

    expect(window.location.search).toContain('project=project-1');
  });
});