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

export function AICopilotPanel() {
  const { messages, isLoading, sendMessage, applyHtml, clearHistory } = useAICopilot();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = useCallback(() => {
    if (!input.trim() || isLoading) return;
    sendMessage(input);
    setInput('');
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [input, isLoading, sendMessage]);

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
          />
        ))}

        <div ref={messagesEndRef} />
      </div>

      <div className="ai-panel-input-area">
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
        <div className="ai-panel-input-actions">
          <button
            className="ai-panel-send-btn"
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
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
}: {
  message: ChatMessage;
  onApply: (id: string, mode: 'replace' | 'add') => void;
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
          </div>
        </>
      )}
    </div>
  );
}
