/**
 * useAICopilot Hook
 *
 * Manages chat state for the AI assistant panel.
 * Sends messages, tracks history, and applies generated HTML to the canvas
 * with full undo support.
 */

import { useState, useCallback, useRef } from 'react';
import { useEditorMaybe } from '@grapesjs/react';
import { sendAIMessage, autoSplitFormHtml, parseMultiPageHtml, resolveSymbolRefs, summarizeSymbolHtml } from '../lib/ai/ai-client';
import type { AIMessage, Attachment, PageDefinition } from '../lib/ai/ai-client';
import { generateUSWDSPrompt, buildUserMessageWithContext } from '../lib/ai/uswds-prompt';
import type { GlobalSymbol, SymbolCatalogEntry } from '@uswds-pt/shared';
import { syncPageLinkHrefs } from '../lib/grapesjs/canvas-helpers';
import { EDITOR_PROPS } from '../lib/contracts';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  html?: string;
  /** Parsed multi-page definitions from AI response */
  pages?: PageDefinition[];
  /** Was a component selected when the user sent this message? */
  hadSelection?: boolean;
  isError?: boolean;
  isLoading?: boolean;
  attachments?: Attachment[];
}

export interface UseAICopilotReturn {
  messages: ChatMessage[];
  isLoading: boolean;
  sendMessage: (text: string, attachments?: Attachment[]) => Promise<void>;
  applyHtml: (messageId: string, mode: 'replace' | 'add') => void;
  applyMultiPage: (messageId: string) => void;
  clearHistory: () => void;
}

function genId(): string {
  return `msg-${crypto.randomUUID()}`;
}

export function useAICopilot(): UseAICopilotReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const editor = useEditorMaybe();

  const sendMessage = useCallback(async (text: string, attachments?: Attachment[]) => {
    if ((!text.trim() && !attachments?.length) || isLoading) return;

    // Capture selection context at send time
    const selected = editor?.getSelected?.();
    const selectedHtml = selected ? selected.toHTML?.() || null : null;
    const pageHtml = editor ? editor.getHtml?.() || null : null;
    const hadSelection = !!selected;

    // Capture page context for multi-page awareness
    const allPages = editor?.Pages?.getAll?.() || [];
    const pageNames = allPages.map((p: any) => p.getName?.() || p.get?.('name') || 'Untitled');
    const selectedPage = editor?.Pages?.getSelected?.();
    const currentPageName = selectedPage?.getName?.() || selectedPage?.get?.('name') || undefined;

    // Add user message
    const userMsg: ChatMessage = {
      id: genId(),
      role: 'user',
      content: text.trim(),
      hadSelection,
      attachments,
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
      content: buildUserMessageWithContext(text.trim(), selectedHtml, pageHtml, pageNames, currentPageName, !!attachments?.length),
      attachments,
    });

    try {
      abortRef.current = new AbortController();

      // Build symbol catalog for AI prompt
      const availableSymbols: GlobalSymbol[] = (editor as any)?.[EDITOR_PROPS.AVAILABLE_SYMBOLS] || [];
      let catalog: SymbolCatalogEntry[] | undefined;
      if (availableSymbols.length > 0) {
        catalog = availableSymbols.map((s) => ({
          name: s.name,
          scope: s.scope,
          summary: summarizeSymbolHtml(s.symbolData),
        }));
      }

      const response = await sendAIMessage(
        generateUSWDSPrompt(catalog),
        apiMessages,
        abortRef.current.signal,
      );

      // Resolve <symbol-ref> placeholders in the response HTML
      let resolvedHtml = response.html;
      let explanation = response.explanation;
      if (resolvedHtml && availableSymbols.length > 0) {
        const resolution = resolveSymbolRefs(resolvedHtml, availableSymbols);
        resolvedHtml = resolution.html;
        if (resolution.unresolvedSymbols.length > 0) {
          explanation += `\n\nNote: Could not resolve symbol(s): ${resolution.unresolvedSymbols.join(', ')}. They may have been renamed or deleted.`;
        }
      }

      // Fallback: if AI didn't use PAGE delimiters but attachments were present,
      // try client-side auto-splitting on headings / fieldsets.
      let pages = resolvedHtml ? parseMultiPageHtml(resolvedHtml) : response.pages;
      if (!pages && attachments?.length && resolvedHtml) {
        pages = autoSplitFormHtml(resolvedHtml);
      }

      setMessages((prev) =>
        prev.map((m) =>
          m.id === loadingId
            ? {
                ...m,
                content: explanation,
                html: resolvedHtml || undefined,
                pages: pages || undefined,
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

  /**
   * Resolve data-symbol-ref markers in the GrapesJS component tree.
   * Replaces marker divs with the actual symbol component data.
   */
  const resolveSymbolMarkers = useCallback((wrapper: any) => {
    if (!wrapper) return;
    const availableSymbols: GlobalSymbol[] = (editor as any)?.[EDITOR_PROPS.AVAILABLE_SYMBOLS] || [];
    if (availableSymbols.length === 0) return;

    const markers = wrapper.find?.('[data-symbol-ref]') || [];
    for (const marker of markers) {
      const symbolId = marker.getAttributes?.()?.['data-symbol-ref'];
      if (!symbolId) continue;

      const symbol = availableSymbols.find((s) => s.id === symbolId);
      if (!symbol?.symbolData?.components) continue;

      const parent = marker.parent?.();
      if (!parent) continue;

      const children = parent.components();
      const models = children.models || [];
      let markerIndex = 0;
      for (let i = 0; i < models.length; i++) {
        if (models[i] === marker) {
          markerIndex = i;
          break;
        }
      }

      marker.remove();
      // Insert the symbol's components at the marker position
      for (let j = symbol.symbolData.components.length - 1; j >= 0; j--) {
        children.add(symbol.symbolData.components[j], { at: markerIndex });
      }
    }
  }, [editor]);

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

      // Resolve symbol-ref markers after inserting HTML
      const wrapper = editor.DomComponents?.getWrapper();
      resolveSymbolMarkers(wrapper);
    } finally {
      um?.stop?.();
    }
  }, [editor, messages, resolveSymbolMarkers]);

  const applyMultiPage = useCallback((messageId: string) => {
    if (!editor) return;

    const msg = messages.find((m) => m.id === messageId);
    if (!msg?.pages?.length) return;

    const um = editor.UndoManager;
    um?.start?.();

    try {
      const pages = msg.pages;
      const nameToIdMap = new Map<string, string>();

      // Capture template HTML from the current page BEFORE any modifications.
      // This is used to clone the page chrome (banner, header, footer, identifier)
      // into new pages, so the AI only needs to output <main> inner content.
      const templateHtml = editor.getHtml?.() || '';
      const mainRegex = /(<main[^>]*>)([\s\S]*?)(<\/main>)/;
      const hasMainElement = mainRegex.test(templateHtml);

      // Step 1: Create all pages first (so name→ID map is complete before link resolution)
      const createdPages: Array<{ page: any; html: string }> = [];

      for (let i = 0; i < pages.length; i++) {
        if (i === 0) {
          // Reuse current page for page 0
          const currentPage = editor.Pages?.getSelected?.();
          if (currentPage) {
            const pageId = currentPage.getId?.() || currentPage.get?.('id') || 'page-current';
            currentPage.set?.('name', pages[i].name);
            nameToIdMap.set(pages[i].name, pageId);
            createdPages.push({ page: currentPage, html: pages[i].html });
          }
        } else {
          // Create new pages for 1..N
          const pageId = `page-${Date.now()}-${i}`;
          const newPage = editor.Pages?.add?.({
            id: pageId,
            name: pages[i].name,
          });
          if (newPage) {
            nameToIdMap.set(pages[i].name, newPage.getId?.() || pageId);
            createdPages.push({ page: newPage, html: pages[i].html });
          }
        }
      }

      // Step 2: Resolve page-link references in each page's HTML
      const resolvedPages = createdPages.map(({ page, html }) => {
        let resolved = html;
        for (const [name, id] of nameToIdMap) {
          const nameEscaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          // Replace page-link="Name" on usa-button / usa-link
          resolved = resolved.replace(
            new RegExp(`page-link="${nameEscaped}"`, 'g'),
            `page-link="${id}" link-type="page" href="#page-${id}"`,
          );
          // Also resolve btn{N}-page-link="Name" on usa-button-group (N=1-4)
          for (let n = 1; n <= 4; n++) {
            resolved = resolved.replace(
              new RegExp(`btn${n}-page-link="${nameEscaped}"`, 'g'),
              `btn${n}-page-link="${id}" btn${n}-link-type="page" btn${n}-href="#page-${id}"`,
            );
          }
        }
        return { page, html: resolved };
      });

      // Step 3: Inject content into each page
      for (let i = 0; i < resolvedPages.length; i++) {
        const { page, html } = resolvedPages[i];
        if (i === 0) {
          // Current page: inject into <main> if it exists, otherwise replace wrapper
          if (hasMainElement) {
            const wrapper = editor.DomComponents?.getWrapper?.();
            const mainComps = wrapper?.find?.('main') || [];
            const mainComp = mainComps[0];
            if (mainComp) {
              mainComp.components?.(html);
            } else {
              wrapper?.components?.(html);
            }
          } else {
            const wrapper = editor.DomComponents?.getWrapper?.();
            wrapper?.components?.(html);
          }
        } else {
          // Other pages: combine template chrome with AI content
          let fullHtml: string;
          if (hasMainElement) {
            // Replace <main> inner content in template with AI-generated content
            fullHtml = templateHtml.replace(mainRegex, `$1\n${html}\n$3`);
          } else {
            // No template — use AI content directly
            fullHtml = html;
          }

          const mainComp = page.getMainComponent?.();
          if (mainComp) {
            mainComp.components?.(fullHtml);
          } else {
            const frameComp = page.getMainFrame?.()?.getComponent?.();
            frameComp?.components?.(fullHtml);
          }
        }
      }

      // Step 4: Resolve symbol-ref markers in all pages
      for (const { page } of resolvedPages) {
        const mainComp = page.getMainComponent?.();
        const comp = mainComp || page.getMainFrame?.()?.getComponent?.();
        if (comp) {
          resolveSymbolMarkers(comp);
        }
      }

      // Step 5: Post-processing — sync page link hrefs
      try {
        syncPageLinkHrefs(editor);
      } catch {
        // Non-critical — links may need manual sync
      }
    } finally {
      um?.stop?.();
    }
  }, [editor, messages, resolveSymbolMarkers]);

  const clearHistory = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
    }
    setMessages([]);
    setIsLoading(false);
  }, []);

  return { messages, isLoading, sendMessage, applyHtml, applyMultiPage, clearHistory };
}
