/**
 * AICopilotPanel Component
 *
 * Chat panel for the AI assistant. Renders as a tab in the right sidebar.
 * Users type requests, AI responds with explanations and optional HTML
 * that can be applied to the canvas.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { useAICopilot } from '../../hooks/useAICopilot';
import type { ChatMessage } from '../../hooks/useAICopilot';
import type { Attachment } from '../../lib/ai/ai-client';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_TYPES = '.pdf,.png,.jpg,.jpeg,.gif,.webp';

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function formatFileType(mediaType: string): string {
  if (mediaType === 'application/pdf') return 'PDF';
  const ext = mediaType.split('/')[1]?.toUpperCase();
  return ext || 'FILE';
}

export function AICopilotPanel() {
  const { messages, isLoading, sendMessage, applyHtml, applyMultiPage, clearHistory } = useAICopilot();
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setFileError(null);
    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        setFileError(`"${file.name}" is too large (max 5MB)`);
        continue;
      }
      const base64Data = await fileToBase64(file);
      setAttachments((prev) => [...prev, {
        name: file.name,
        mediaType: file.type || 'application/octet-stream',
        base64Data,
      }]);
    }
    e.target.value = '';
  }, []);

  const removeAttachment = useCallback((index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleSend = useCallback(() => {
    if ((!input.trim() && attachments.length === 0) || isLoading) return;
    sendMessage(input, attachments.length > 0 ? attachments : undefined);
    setInput('');
    setAttachments([]);
    setFileError(null);
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [input, attachments, isLoading, sendMessage]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  // Auto-resize textarea
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  }, []);

  return (
    <div className="ai-panel">
      <div className="ai-panel-messages">
        {messages.length === 0 && (
          <div className="ai-panel-empty">
            <p>Ask the AI to help build your prototype.</p>
            <p className="ai-panel-empty-hint">
              Try: &ldquo;Add a contact form&rdquo; or select a component and ask &ldquo;Make this horizontal&rdquo;
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            onApply={applyHtml}
            onApplyMultiPage={applyMultiPage}
          />
        ))}

        <div ref={messagesEndRef} />
      </div>

      <div className="ai-panel-input-area">
        {attachments.length > 0 && (
          <div className="ai-panel-attachments">
            {attachments.map((att, i) => (
              <span key={i} className="ai-panel-attachment-chip">
                <span className="ai-panel-attachment-chip-type">{formatFileType(att.mediaType)}</span>
                <span className="ai-panel-attachment-chip-name">{att.name}</span>
                <button
                  className="ai-panel-attachment-chip-remove"
                  onClick={() => removeAttachment(i)}
                  title={`Remove ${att.name}`}
                  aria-label={`Remove ${att.name}`}
                >
                  &times;
                </button>
              </span>
            ))}
          </div>
        )}
        {fileError && (
          <div className="ai-panel-file-error">{fileError}</div>
        )}
        <div className="ai-panel-textarea-row">
          <textarea
            ref={textareaRef}
            className="ai-panel-textarea"
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Describe what you want to build..."
            rows={1}
            disabled={isLoading}
          />
          <button
            className="ai-panel-attach-btn"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            title="Attach file (PDF, image)"
            aria-label="Attach file"
          >
            &#128206;
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_TYPES}
            multiple
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
        </div>
        <div className="ai-panel-input-actions">
          <button
            className="ai-panel-send-btn"
            onClick={handleSend}
            disabled={(!input.trim() && attachments.length === 0) || isLoading}
            title="Send (Enter)"
          >
            Send
          </button>
          {messages.length > 0 && (
            <button
              className="ai-panel-clear-btn"
              onClick={clearHistory}
              title="Clear chat history"
            >
              Clear
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Message Bubble ─── */

function MessageBubble({
  message,
  onApply,
  onApplyMultiPage,
}: {
  message: ChatMessage;
  onApply: (id: string, mode: 'replace' | 'add') => void;
  onApplyMultiPage: (id: string) => void;
}) {
  const [showHtml, setShowHtml] = useState(false);

  if (message.isLoading) {
    return (
      <div className="ai-msg ai-msg--assistant">
        <div className="ai-msg-loading">
          <span className="ai-msg-dot" />
          <span className="ai-msg-dot" />
          <span className="ai-msg-dot" />
        </div>
      </div>
    );
  }

  if (message.role === 'user') {
    return (
      <div className="ai-msg ai-msg--user">
        {message.attachments && message.attachments.length > 0 && (
          <div className="ai-msg-attachments">
            {message.attachments.map((att, i) => (
              <span key={i} className="ai-msg-attachment-badge">
                {formatFileType(att.mediaType)}: {att.name}
              </span>
            ))}
          </div>
        )}
        <div className="ai-msg-content">{message.content}</div>
      </div>
    );
  }

  // Assistant message
  return (
    <div className={`ai-msg ai-msg--assistant ${message.isError ? 'ai-msg--error' : ''}`}>
      <div className="ai-msg-content">{message.content}</div>

      {message.html && (
        <>
          <button
            className="ai-msg-toggle-html"
            onClick={() => setShowHtml(!showHtml)}
          >
            {showHtml ? 'Hide HTML' : 'Show HTML'}
          </button>

          {showHtml && (
            <pre className="ai-msg-html-preview">
              <code>{message.html}</code>
            </pre>
          )}

          <div className="ai-msg-actions">
            {message.pages && message.pages.length > 1 ? (
              <button
                className="ai-msg-action-btn ai-msg-action-btn--primary"
                onClick={() => onApplyMultiPage(message.id)}
              >
                Create {message.pages.length} Pages
              </button>
            ) : (
              <>
                {message.hadSelection && (
                  <button
                    className="ai-msg-action-btn ai-msg-action-btn--primary"
                    onClick={() => onApply(message.id, 'replace')}
                  >
                    Replace Selected
                  </button>
                )}
                <button
                  className="ai-msg-action-btn"
                  onClick={() => onApply(message.id, 'add')}
                >
                  Add to Page
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
