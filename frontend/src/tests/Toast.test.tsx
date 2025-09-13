import { render, screen, act } from '@testing-library/react';
import { toast } from '../services/toast';
import ToastContainer from '../components/Toast';

// Mock createPortal to render in test environment
vi.mock('react-dom', async () => {
  const actual = await vi.importActual('react-dom');
  return {
    ...actual,
    createPortal: (children: React.ReactNode) => children,
  };
});

describe('ToastContainer', () => {
  beforeEach(() => {
    // Clear all toasts before each test
    act(() => {
      toast.clear();
    });
  });

  it('renders nothing when there are no toasts', () => {
    const { container } = render(<ToastContainer />);
    expect(container.firstChild).toBeNull();
  });

  it('renders success toast with correct styling', () => {
    render(<ToastContainer />);
    
    act(() => {
      toast.success('Success message');
    });

    expect(screen.getByText('Success message')).toBeInTheDocument();
    expect(screen.getByText('Success message').closest('.alert')).toHaveClass('alert-success');
  });

  it('renders error toast with correct styling', () => {
    render(<ToastContainer />);
    
    act(() => {
      toast.error('Error message');
    });

    expect(screen.getByText('Error message')).toBeInTheDocument();
    expect(screen.getByText('Error message').closest('.alert')).toHaveClass('alert-error');
  });

  it('renders warning toast with correct styling', () => {
    render(<ToastContainer />);
    
    act(() => {
      toast.warning('Warning message');
    });

    expect(screen.getByText('Warning message')).toBeInTheDocument();
    expect(screen.getByText('Warning message').closest('.alert')).toHaveClass('alert-warning');
  });

  it('renders info toast with correct styling', () => {
    render(<ToastContainer />);
    
    act(() => {
      toast.info('Info message');
    });

    expect(screen.getByText('Info message')).toBeInTheDocument();
    expect(screen.getByText('Info message').closest('.alert')).toHaveClass('alert-info');
  });

  it('renders multiple toasts', () => {
    render(<ToastContainer />);
    
    act(() => {
      toast.success('Success message');
      toast.error('Error message');
    });

    expect(screen.getByText('Success message')).toBeInTheDocument();
    expect(screen.getByText('Error message')).toBeInTheDocument();
  });

  it('removes toast when close button is clicked', () => {
    render(<ToastContainer />);
    
    act(() => {
      toast.success('Test message');
    });

    expect(screen.getByText('Test message')).toBeInTheDocument();
    
    const closeButton = screen.getByText('✕');
    act(() => {
      closeButton.click();
    });

    expect(screen.queryByText('Test message')).not.toBeInTheDocument();
  });

  it('renders toast in fixed position container', () => {
    render(<ToastContainer />);
    
    act(() => {
      toast.success('Test message');
    });

    const container = screen.getByText('Test message').closest('div.fixed');
    expect(container).toHaveClass('fixed', 'top-4', 'left-1/2');
  });
});