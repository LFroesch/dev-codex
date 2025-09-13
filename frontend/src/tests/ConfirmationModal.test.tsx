import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ConfirmationModal from '../components/ConfirmationModal';

describe('ConfirmationModal', () => {
  const defaultProps = {
    isOpen: true,
    title: 'Confirm Action',
    message: 'Are you sure you want to proceed?',
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders modal when isOpen is true', () => {
    render(<ConfirmationModal {...defaultProps} />);
    
    expect(screen.getByText('Confirm Action')).toBeInTheDocument();
    expect(screen.getByText('Are you sure you want to proceed?')).toBeInTheDocument();
  });

  it('does not render modal when isOpen is false', () => {
    render(<ConfirmationModal {...defaultProps} isOpen={false} />);
    
    expect(screen.queryByText('Confirm Action')).not.toBeInTheDocument();
  });

  it('renders custom confirm button text', () => {
    render(<ConfirmationModal {...defaultProps} confirmText="Delete" />);
    
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
  });

  it('renders custom cancel button text', () => {
    render(<ConfirmationModal {...defaultProps} cancelText="Keep" />);
    
    expect(screen.getByRole('button', { name: 'Keep' })).toBeInTheDocument();
  });

  it('renders error variant with correct styling', () => {
    render(<ConfirmationModal {...defaultProps} variant="error" />);
    
    const confirmButton = screen.getByRole('button', { name: /confirm/i });
    expect(confirmButton).toHaveClass('btn-error');
  });

  it('renders warning variant with correct styling', () => {
    render(<ConfirmationModal {...defaultProps} variant="warning" />);
    
    const confirmButton = screen.getByRole('button', { name: /confirm/i });
    expect(confirmButton).toHaveClass('btn-warning');
  });

  it('calls onConfirm when confirm button is clicked', async () => {
    const user = userEvent.setup();
    render(<ConfirmationModal {...defaultProps} />);
    
    const confirmButton = screen.getByRole('button', { name: /confirm/i });
    await user.click(confirmButton);
    
    expect(defaultProps.onConfirm).toHaveBeenCalled();
  });

  it('calls onCancel when cancel button is clicked', async () => {
    const user = userEvent.setup();
    render(<ConfirmationModal {...defaultProps} />);
    
    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    await user.click(cancelButton);
    
    expect(defaultProps.onCancel).toHaveBeenCalled();
  });

  it('renders with default warning variant styling', () => {
    render(<ConfirmationModal {...defaultProps} />);
    
    const confirmButton = screen.getByRole('button', { name: /confirm/i });
    expect(confirmButton).toHaveClass('btn-warning');
  });

  it('renders info variant with correct styling', () => {
    render(<ConfirmationModal {...defaultProps} variant="info" />);
    
    const confirmButton = screen.getByRole('button', { name: /confirm/i });
    expect(confirmButton).toHaveClass('btn-info');
  });

  it('renders modal backdrop', () => {
    render(<ConfirmationModal {...defaultProps} />);
    
    const backdrop = document.querySelector('.fixed.inset-0.bg-black');
    expect(backdrop).toBeInTheDocument();
  });

  it('renders modal content container', () => {
    render(<ConfirmationModal {...defaultProps} />);
    
    const content = document.querySelector('.bg-base-100.rounded-lg.shadow-xl');
    expect(content).toBeInTheDocument();
  });
});