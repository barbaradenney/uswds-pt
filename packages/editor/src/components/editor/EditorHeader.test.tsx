/**
 * EditorHeader Component Tests
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '../../test/render';
import { EditorHeader, type EditorHeaderProps } from './EditorHeader';

const defaultProps: EditorHeaderProps = {
  name: 'Test Prototype',
  onBack: vi.fn(),
  onPreview: vi.fn(),
  onExport: vi.fn(),
  onEmbed: vi.fn(),
  onSave: vi.fn(),
  onToggleHistory: vi.fn(),
  showVersionHistory: false,
  showEmbedButton: true,
  showHistoryButton: true,
  showAutosaveIndicator: true,
  autosaveStatus: 'idle',
  lastSavedAt: null,
  isSaving: false,
  isSaveDisabled: false,
  error: null,
};

describe('EditorHeader', () => {
  it('renders the prototype name as read-only text', () => {
    render(<EditorHeader {...defaultProps} />);
    expect(screen.getByText('Test Prototype')).toBeInTheDocument();
  });

  it('calls onBack when back button is clicked', () => {
    const onBack = vi.fn();
    render(<EditorHeader {...defaultProps} onBack={onBack} />);

    fireEvent.click(screen.getByText('← Back'));
    expect(onBack).toHaveBeenCalled();
  });

  it('calls onPreview when preview button is clicked', () => {
    const onPreview = vi.fn();
    render(<EditorHeader {...defaultProps} onPreview={onPreview} />);

    fireEvent.click(screen.getByText('Preview'));
    expect(onPreview).toHaveBeenCalled();
  });

  it('calls onExport when export button is clicked', () => {
    const onExport = vi.fn();
    render(<EditorHeader {...defaultProps} onExport={onExport} />);

    fireEvent.click(screen.getByText('Export'));
    expect(onExport).toHaveBeenCalled();
  });

  it('calls onSave when save button is clicked', () => {
    const onSave = vi.fn();
    render(<EditorHeader {...defaultProps} onSave={onSave} />);

    fireEvent.click(screen.getByText('Save'));
    expect(onSave).toHaveBeenCalled();
  });

  it('shows embed button when showEmbedButton is true', () => {
    render(<EditorHeader {...defaultProps} showEmbedButton={true} />);
    expect(screen.getByText('Embed')).toBeInTheDocument();
  });

  it('hides embed button when showEmbedButton is false', () => {
    render(<EditorHeader {...defaultProps} showEmbedButton={false} />);
    expect(screen.queryByText('Embed')).not.toBeInTheDocument();
  });

  it('shows history button when showHistoryButton is true', () => {
    render(<EditorHeader {...defaultProps} showHistoryButton={true} />);
    expect(screen.getByText('History')).toBeInTheDocument();
  });

  it('hides history button when showHistoryButton is false', () => {
    render(<EditorHeader {...defaultProps} showHistoryButton={false} />);
    expect(screen.queryByText('History')).not.toBeInTheDocument();
  });

  it('shows autosave indicator with correct status', () => {
    render(<EditorHeader {...defaultProps} autosaveStatus="saved" />);
    expect(screen.getByText('Saved')).toBeInTheDocument();
  });

  it('shows saving status in autosave indicator', () => {
    render(<EditorHeader {...defaultProps} autosaveStatus="saving" />);
    expect(screen.getByText('Saving...')).toBeInTheDocument();
  });

  it('hides autosave indicator when showAutosaveIndicator is false', () => {
    render(<EditorHeader {...defaultProps} showAutosaveIndicator={false} />);
    expect(screen.queryByText('Autosave on')).not.toBeInTheDocument();
  });

  it('shows error message when error is provided', () => {
    render(<EditorHeader {...defaultProps} error="Something went wrong" />);
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('shows "Saving..." on save button when isSaving is true', () => {
    render(<EditorHeader {...defaultProps} isSaving={true} />);
    expect(screen.getByText('Saving...')).toBeInTheDocument();
  });

  it('disables save button when isSaveDisabled is true', () => {
    render(<EditorHeader {...defaultProps} isSaveDisabled={true} />);
    expect(screen.getByText('Loading...')).toBeDisabled();
  });

  it('shows "Saved just now" when idle with recent lastSavedAt', () => {
    render(
      <EditorHeader
        {...defaultProps}
        autosaveStatus="idle"
        lastSavedAt={new Date()}
      />
    );
    expect(screen.getByText('Saved just now')).toBeInTheDocument();
  });
});
