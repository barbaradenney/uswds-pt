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

    expect(screen.getByText('Create a New Prototype')).toBeInTheDocument();
    expect(screen.getByText(/Name your prototype and pick a layout/)).toBeInTheDocument();
  });

  it('renders name input with label', () => {
    render(<TemplateChooser {...defaultProps} />);

    expect(screen.getByLabelText('Prototype name')).toBeInTheDocument();
  });

  it('disables template cards when name is empty', () => {
    render(<TemplateChooser {...defaultProps} />);

    // Cards should be disabled (aria-disabled)
    const blankCard = screen.getByText('Blank').closest('[role="button"]')!;
    expect(blankCard).toHaveAttribute('aria-disabled', 'true');

    // Clicking a disabled card should not call onSelect
    fireEvent.click(blankCard);
    expect(defaultProps.onSelect).not.toHaveBeenCalled();
  });

  it('calls onSelect with template ID and name when name is provided', () => {
    render(<TemplateChooser {...defaultProps} />);

    // Enter a name
    fireEvent.change(screen.getByLabelText('Prototype name'), {
      target: { value: 'My Prototype' },
    });

    // Click a template card
    fireEvent.click(screen.getByText('Blank'));
    expect(defaultProps.onSelect).toHaveBeenCalledWith('blank', 'My Prototype');
  });

  it('calls onSelect when pressing Enter on a card with name filled', () => {
    render(<TemplateChooser {...defaultProps} />);

    fireEvent.change(screen.getByLabelText('Prototype name'), {
      target: { value: 'Test' },
    });

    const signedInCard = screen.getByText('Signed In').closest('[role="button"]')!;
    fireEvent.keyDown(signedInCard, { key: 'Enter' });
    expect(defaultProps.onSelect).toHaveBeenCalledWith('signed-in', 'Test');
  });

  it('calls onSelect when pressing Space on a card with name filled', () => {
    render(<TemplateChooser {...defaultProps} />);

    fireEvent.change(screen.getByLabelText('Prototype name'), {
      target: { value: 'Test' },
    });

    const blankCard = screen.getByText('Blank').closest('[role="button"]')!;
    fireEvent.keyDown(blankCard, { key: ' ' });
    expect(defaultProps.onSelect).toHaveBeenCalledWith('blank', 'Test');
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

  it('shows branch slug preview when name is entered', () => {
    render(<TemplateChooser {...defaultProps} />);

    fireEvent.change(screen.getByLabelText('Prototype name'), {
      target: { value: 'Contact Form Redesign' },
    });

    expect(screen.getByText(/uswds-pt\/contact-form-redesign/)).toBeInTheDocument();
  });

  it('does not show slug preview when name is empty', () => {
    render(<TemplateChooser {...defaultProps} />);

    expect(screen.queryByText(/uswds-pt\//)).not.toBeInTheDocument();
  });
});
