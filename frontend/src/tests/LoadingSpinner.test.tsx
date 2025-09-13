import { render, screen } from '@testing-library/react';
import LoadingSpinner from '../components/LoadingSpinner';

describe('LoadingSpinner', () => {
  it('renders default loading spinner', () => {
    render(<LoadingSpinner />);
    
    const spinner = screen.getByTestId('loading-spinner');
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveClass('loading', 'loading-spinner', 'loading-lg');
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders with custom size', () => {
    render(<LoadingSpinner size="sm" />);
    
    const spinner = screen.getByTestId('loading-spinner');
    expect(spinner).toHaveClass('loading', 'loading-spinner', 'loading-sm');
  });

  it('renders with custom text', () => {
    render(<LoadingSpinner text="Custom loading message" />);
    
    expect(screen.getByText('Custom loading message')).toBeInTheDocument();
  });

  it('renders centered layout by default', () => {
    render(<LoadingSpinner />);
    
    const container = screen.getByTestId('loading-container');
    expect(container).toHaveClass('flex', 'justify-center', 'items-center');
  });

  it('applies custom className', () => {
    render(<LoadingSpinner className="custom-class" />);
    
    const container = screen.getByTestId('loading-container');
    expect(container).toHaveClass('custom-class');
  });

  it('renders with all props combined', () => {
    render(
      <LoadingSpinner 
        size="md" 
        text="Please wait..." 
        className="my-custom-spinner"
      />
    );
    
    const container = screen.getByTestId('loading-container');
    const spinner = screen.getByTestId('loading-spinner');
    const text = screen.getByText('Please wait...');
    
    expect(container).toHaveClass('my-custom-spinner');
    expect(spinner).toHaveClass('loading', 'loading-spinner', 'loading-md');
    expect(text).toBeInTheDocument();
  });

  it('has proper accessibility attributes', () => {
    render(<LoadingSpinner />);
    
    const spinner = screen.getByTestId('loading-spinner');
    expect(spinner).toHaveAttribute('role', 'status');
    expect(spinner).toHaveAttribute('aria-label', 'Loading');
  });
});