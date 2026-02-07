import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TemplateChooser } from './TemplateChooser';

describe('TemplateChooser', () => {
  const defaultProps = {
    onSelect: vi.fn(),
    onBack: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all 4 template cards', () => {
    render(<TemplateChooser {...defaultProps} />);

    expect(screen.getByText('Signed In')).toBeInTheDocument();
    expect(screen.getByText('Signed Out')).toBeInTheDocument();
    expect(screen.getByText('Form')).toBeInTheDocument();
    expect(screen.getByText('Blank')).toBeInTheDocument();
  });

  it('renders heading and description', () => {
    render(<TemplateChooser {...defaultProps} />);

    expect(screen.getByText('Choose a Starting Template')).toBeInTheDocument();
    expect(screen.getByText(/Pick a layout to start with/)).toBeInTheDocument();
  });

  it('calls onSelect with correct template ID when clicking a card', () => {
    render(<TemplateChooser {...defaultProps} />);

    fireEvent.click(screen.getByText('Signed In'));
    expect(defaultProps.onSelect).toHaveBeenCalledWith('signed-in');

    fireEvent.click(screen.getByText('Signed Out'));
    expect(defaultProps.onSelect).toHaveBeenCalledWith('signed-out');

    fireEvent.click(screen.getByText('Form'));
    expect(defaultProps.onSelect).toHaveBeenCalledWith('form');

    fireEvent.click(screen.getByText('Blank'));
    expect(defaultProps.onSelect).toHaveBeenCalledWith('blank');
  });

  it('calls onSelect when pressing Enter on a card', () => {
    render(<TemplateChooser {...defaultProps} />);

    const signedInCard = screen.getByText('Signed In').closest('[role="button"]')!;
    fireEvent.keyDown(signedInCard, { key: 'Enter' });
    expect(defaultProps.onSelect).toHaveBeenCalledWith('signed-in');
  });

  it('calls onSelect when pressing Space on a card', () => {
    render(<TemplateChooser {...defaultProps} />);

    const blankCard = screen.getByText('Blank').closest('[role="button"]')!;
    fireEvent.keyDown(blankCard, { key: ' ' });
    expect(defaultProps.onSelect).toHaveBeenCalledWith('blank');
  });

  it('calls onBack when clicking back button', () => {
    render(<TemplateChooser {...defaultProps} />);

    fireEvent.click(screen.getByText(/Back to prototypes/));
    expect(defaultProps.onBack).toHaveBeenCalled();
  });

  it('renders template descriptions', () => {
    render(<TemplateChooser {...defaultProps} />);

    expect(screen.getByText(/authenticated header/i)).toBeInTheDocument();
    expect(screen.getByText(/public header/i)).toBeInTheDocument();
    expect(screen.getByText(/form content area/i)).toBeInTheDocument();
    expect(screen.getByText(/empty canvas/i)).toBeInTheDocument();
  });
});
