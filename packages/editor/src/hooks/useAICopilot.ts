/**
 * useAICopilot Hook
 *
 * Manages chat state for the AI assistant panel.
 * Sends messages, tracks history, and applies generated HTML to the canvas
 * with full undo support.
 */

import { useState, useCallback, useRef } from 'react';
import { useEditorMaybe } from '@grapesjs/react';
import { sendAIMessage } from '../lib/ai/ai-client';
import type { AIMessage } from '../lib/ai/ai-client';
import { generateUSWDSPrompt, buildUserMessageWithContext } from '../lib/ai/uswds-prompt';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  html?: string;
  /** Was a component selected when the user sent this message? */
  hadSelection?: boolean;
  isError?: boolean;
  isLoading?: boolean;
}

export interface UseAICopilotReturn {
  messages: ChatMessage[];
  isLoading: boolean;
  sendMessage: (text: string) => Promise<void>;
  applyHtml: (messageId: string, mode: 'replace' | 'add') => void;
  clearHistory: () => void;
}

let nextId = 1;
function genId(): string {
  return `msg-${nextId++}`;
}

export function useAICopilot(): UseAICopilotReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const editor = useEditorMaybe();

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;

    // Capture selection context at send time
    const selected = editor?.getSelected?.();
    const selectedHtml = selected ? selected.toHTML?.() || null : null;
    const pageHtml = editor ? editor.getHtml?.() || null : null;
    const hadSelection = !!selected;

    // Add user message
    const userMsg: ChatMessage = {
      id: genId(),
      role: 'user',
      content: text.trim(),
      hadSelection,
    };

    // Add loading placeholder
    const loadingId = genId();
    const loadingMsg: ChatMessage = {
      id: loadingId,
      role: 'assistant',
      content: '',
      isLoading: true,
    };

    setMessages((prev) => [...prev, userMsg, loadingMsg]);
    setIsLoading(true);

    // Build conversation history for the API
    const apiMessages: AIMessage[] = [];
    // Include prior conversation (skip loading placeholders)
    for (const m of messages) {
      if (m.isLoading || m.isError) continue;
      apiMessages.push({
        role: m.role,
        content: m.role === 'assistant' && m.html
          ? `${m.content}\n\n\`\`\`html\n${m.html}\n\`\`\``
          : m.content,
      });
    }
    // Add current user message with context
    apiMessages.push({
      role: 'user',
      content: buildUserMessageWithContext(text.trim(), selectedHtml, pageHtml),
    });

    try {
      abortRef.current = new AbortController();
      const response = await sendAIMessage(
        generateUSWDSPrompt(),
        apiMessages,
        abortRef.current.signal,
      );

      setMessages((prev) =>
        prev.map((m) =>
          m.id === loadingId
            ? {
                ...m,
                content: response.explanation,
                html: response.html || undefined,
                isLoading: false,
              }
            : m,
        ),
      );
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      setMessages((prev) =>
        prev.map((m) =>
          m.id === loadingId
            ? {
                ...m,
                content: err?.message || 'An error occurred',
                isLoading: false,
                isError: true,
              }
            : m,
        ),
      );
    } finally {
      setIsLoading(false);
      abortRef.current = null;
    }
  }, [messages, isLoading, editor]);

  const applyHtml = useCallback((messageId: string, mode: 'replace' | 'add') => {
    if (!editor) return;

    const msg = messages.find((m) => m.id === messageId);
    if (!msg?.html) return;

    const um = editor.UndoManager;
    um?.start?.();

    try {
      const selected = editor.getSelected?.();

      if (mode === 'replace' && selected) {
        const parent = selected.parent?.();
        if (parent) {
          const children = parent.components();
          // Find the index of the selected component
          let index = 0;
          const models = children.models || [];
          for (let i = 0; i < models.length; i++) {
            if (models[i] === selected) {
              index = i;
              break;
            }
          }
          selected.remove();
          children.add(msg.html, { at: index });
        }
      } else {
        // Add mode: append after selected or at end of wrapper
        if (selected) {
          const parent = selected.parent?.();
          if (parent) {
            const children = parent.components();
            const models = children.models || [];
            let index = models.length;
            for (let i = 0; i < models.length; i++) {
              if (models[i] === selected) {
                index = i + 1;
                break;
              }
            }
            children.add(msg.html, { at: index });
          }
        } else {
          const wrapper = editor.DomComponents?.getWrapper();
          wrapper?.append?.(msg.html);
        }
      }
    } finally {
      um?.stop?.();
    }
  }, [editor, messages]);

  const clearHistory = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
    }
    setMessages([]);
    setIsLoading(false);
  }, []);

  return { messages, isLoading, sendMessage, applyHtml, clearHistory };
}
