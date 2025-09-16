import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import NotesPage from '../pages/NotesPage';

// Mock the API
vi.mock('../api', () => ({
  projectAPI: {
    updateProject: vi.fn(),
    getProject: vi.fn(),
  },
}));

// Mock useOutletContext
const mockContextValue = {
  selectedProject: {
    id: 'project-123',
    title: 'Test Project',
    description: 'Test description',
    todos: [
      {
        id: 'todo-1',
        title: 'Test Todo',
        description: 'Test todo description',
        completed: false,
        priority: 'medium',
        createdAt: '2023-01-01T00:00:00Z'
      }
    ],
    notes: [
      {
        id: 'note-1',
        title: 'Test Note',
        content: 'Test note content',
        createdAt: '2023-01-01T00:00:00Z'
      }
    ],
    devLogs: []
  },
  user: {
    id: 'user-123',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User'
  },
  onProjectUpdate: vi.fn(),
  onProjectRefresh: vi.fn(),
};

const mockUseOutletContext = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useOutletContext: mockUseOutletContext,
  };
});

// Mock activity tracker
vi.mock('../services/activityTracker', () => ({
  default: {
    setContext: vi.fn(),
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

describe.skip('NotesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseOutletContext.mockReturnValue(mockContextValue);
  });

  it('renders project information when project is selected', () => {
    render(<NotesPage />, { wrapper: createWrapper() });

    expect(screen.getByText('Test Project')).toBeInTheDocument();
    expect(screen.getByText('Test description')).toBeInTheDocument();
  });

  it('displays todos from selected project', () => {
    render(<NotesPage />, { wrapper: createWrapper() });

    expect(screen.getByText('Test Todo')).toBeInTheDocument();
    expect(screen.getByText('Test todo description')).toBeInTheDocument();
  });

  it('displays notes from selected project', () => {
    render(<NotesPage />, { wrapper: createWrapper() });

    expect(screen.getByText('Test Note')).toBeInTheDocument();
  });

  it('shows message when no project is selected', () => {
    // Mock context with no selected project
    const noProjectContext = { ...mockContextValue, selectedProject: null };
    mockUseOutletContext.mockReturnValue(noProjectContext);

    render(<NotesPage />, { wrapper: createWrapper() });

    expect(screen.getByText(/select a project/i)).toBeInTheDocument();
  });

  it('opens note modal when note is clicked', async () => {
    const user = userEvent.setup();
    render(<NotesPage />, { wrapper: createWrapper() });

    const noteElement = screen.getByText('Test Note');
    await user.click(noteElement);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  it('handles todo completion toggle', async () => {
    const user = userEvent.setup();
    const mockUpdateProject = vi.fn().mockResolvedValue({ success: true });
    mockContextValue.onProjectUpdate.mockImplementation(mockUpdateProject);

    render(<NotesPage />, { wrapper: createWrapper() });

    const todoCheckbox = screen.getByRole('checkbox');
    await user.click(todoCheckbox);

    await waitFor(() => {
      expect(mockUpdateProject).toHaveBeenCalled();
    });
  });

  it('allows creating new todos', async () => {
    const user = userEvent.setup();
    render(<NotesPage />, { wrapper: createWrapper() });

    const addTodoButton = screen.getByRole('button', { name: /add todo/i });
    await user.click(addTodoButton);

    expect(screen.getByPlaceholderText(/enter todo title/i)).toBeInTheDocument();
  });

  it('allows creating new notes', async () => {
    const user = userEvent.setup();
    render(<NotesPage />, { wrapper: createWrapper() });

    const addNoteButton = screen.getByRole('button', { name: /add note/i });
    await user.click(addNoteButton);

    expect(screen.getByPlaceholderText(/enter note title/i)).toBeInTheDocument();
  });

  it('filters todos by status', async () => {
    const user = userEvent.setup();
    
    // Add completed todo to context
    const contextWithCompletedTodo = {
      ...mockContextValue,
      selectedProject: {
        ...mockContextValue.selectedProject!,
        todos: [
          ...mockContextValue.selectedProject!.todos,
          {
            id: 'todo-2',
            title: 'Completed Todo',
            description: 'This is done',
            completed: true,
            priority: 'low',
            createdAt: '2023-01-02T00:00:00Z'
          }
        ]
      }
    };
    
    mockUseOutletContext.mockReturnValue(contextWithCompletedTodo);

    render(<NotesPage />, { wrapper: createWrapper() });

    // Check if both todos are initially visible
    expect(screen.getByText('Test Todo')).toBeInTheDocument();
    expect(screen.getByText('Completed Todo')).toBeInTheDocument();

    // Filter to show only completed
    const filterSelect = screen.getByRole('combobox', { name: /filter todos/i });
    await user.selectOptions(filterSelect, 'completed');

    await waitFor(() => {
      expect(screen.queryByText('Test Todo')).not.toBeInTheDocument();
      expect(screen.getByText('Completed Todo')).toBeInTheDocument();
    });
  });

  it('sorts todos by priority', async () => {
    const user = userEvent.setup();
    
    const contextWithMultipleTodos = {
      ...mockContextValue,
      selectedProject: {
        ...mockContextValue.selectedProject!,
        todos: [
          {
            id: 'todo-1',
            title: 'Low Priority',
            description: 'Low priority task',
            completed: false,
            priority: 'low',
            createdAt: '2023-01-01T00:00:00Z'
          },
          {
            id: 'todo-2',
            title: 'High Priority',
            description: 'High priority task',
            completed: false,
            priority: 'high',
            createdAt: '2023-01-02T00:00:00Z'
          }
        ]
      }
    };
    
    mockUseOutletContext.mockReturnValue(contextWithMultipleTodos);

    render(<NotesPage />, { wrapper: createWrapper() });

    const sortSelect = screen.getByRole('combobox', { name: /sort by/i });
    await user.selectOptions(sortSelect, 'priority');

    // High priority should appear before low priority
    const todoElements = screen.getAllByText(/Priority/);
    expect(todoElements[0]).toHaveTextContent('High Priority');
    expect(todoElements[1]).toHaveTextContent('Low Priority');
  });

  it('handles errors gracefully', async () => {
    const mockUpdateProject = vi.fn().mockRejectedValue(new Error('Network error'));
    mockContextValue.onProjectUpdate.mockImplementation(mockUpdateProject);

    render(<NotesPage />, { wrapper: createWrapper() });

    const user = userEvent.setup();
    const todoCheckbox = screen.getByRole('checkbox');
    await user.click(todoCheckbox);

    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });

  it('updates activity tracker context when project changes', () => {
    const activityTracker = require('../services/activityTracker').default;
    
    render(<NotesPage />, { wrapper: createWrapper() });

    expect(activityTracker.setContext).toHaveBeenCalledWith(
      mockContextValue.selectedProject!.id,
      mockContextValue.user.id
    );
  });

  it('displays project statistics', () => {
    render(<NotesPage />, { wrapper: createWrapper() });

    // Should show todo count
    expect(screen.getByText(/1.*todo/i)).toBeInTheDocument();
    // Should show note count
    expect(screen.getByText(/1.*note/i)).toBeInTheDocument();
  });

  it('handles empty project state', () => {
    const emptyProjectContext = {
      ...mockContextValue,
      selectedProject: {
        ...mockContextValue.selectedProject!,
        todos: [],
        notes: [],
        devLogs: []
      }
    };
    
    mockUseOutletContext.mockReturnValue(emptyProjectContext);

    render(<NotesPage />, { wrapper: createWrapper() });

    expect(screen.getByText(/no todos yet/i)).toBeInTheDocument();
    expect(screen.getByText(/no notes yet/i)).toBeInTheDocument();
  });
});