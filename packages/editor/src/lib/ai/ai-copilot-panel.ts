/**
 * AI Copilot Panel Enhancement
 *
 * Adds drag, minimize, and close functionality to the AI copilot panel.
 */

let toggleBtn: HTMLButtonElement | null = null;

/**
 * Initialize the AI copilot panel with drag and minimize capabilities
 */
export function initAICopilotPanel(): void {
  // Wait for the panel to be created
  const checkForPanel = setInterval(() => {
    const panel = document.querySelector('.gjs-pn-ai-copilot-panel') as HTMLElement;
    if (panel) {
      clearInterval(checkForPanel);
      setupPanel(panel);
    }
  }, 500);

  // Stop checking after 10 seconds
  setTimeout(() => clearInterval(checkForPanel), 10000);
}

function setupPanel(panel: HTMLElement): void {
  // Check if already set up
  if (panel.querySelector('.ai-copilot-header')) return;

  // Create header
  const header = document.createElement('div');
  header.className = 'ai-copilot-header';
  header.innerHTML = `
    <span class="ai-copilot-header-title">AI Assistant</span>
    <div class="ai-copilot-header-controls">
      <button class="ai-copilot-header-btn" data-action="minimize" title="Minimize">−</button>
      <button class="ai-copilot-header-btn" data-action="close" title="Close">×</button>
    </div>
  `;

  // Insert header at the top
  panel.insertBefore(header, panel.firstChild);

  // Set up drag functionality
  makeDraggable(panel, header);

  // Set up button handlers
  header.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const action = target.dataset.action;

    if (action === 'minimize') {
      toggleMinimize(panel, target);
    } else if (action === 'close') {
      hidePanel(panel);
    }
  });

  // Create toggle button (shown when panel is hidden)
  createToggleButton(panel);

  // Load saved position
  loadPanelPosition(panel);
}

function makeDraggable(panel: HTMLElement, handle: HTMLElement): void {
  let isDragging = false;
  let startX = 0;
  let startY = 0;
  let initialLeft = 0;
  let initialTop = 0;

  handle.addEventListener('mousedown', (e) => {
    // Don't drag if clicking buttons
    if ((e.target as HTMLElement).closest('.ai-copilot-header-controls')) return;

    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;

    const rect = panel.getBoundingClientRect();
    initialLeft = rect.left;
    initialTop = rect.top;

    // Switch to fixed positioning with current position
    panel.style.position = 'fixed';
    panel.style.left = `${initialLeft}px`;
    panel.style.top = `${initialTop}px`;
    panel.style.right = 'auto';

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);

    e.preventDefault();
  });

  function onMouseMove(e: MouseEvent): void {
    if (!isDragging) return;

    const deltaX = e.clientX - startX;
    const deltaY = e.clientY - startY;

    let newLeft = initialLeft + deltaX;
    let newTop = initialTop + deltaY;

    // Keep panel within viewport
    const panelRect = panel.getBoundingClientRect();
    const maxLeft = window.innerWidth - panelRect.width;
    const maxTop = window.innerHeight - panelRect.height;

    newLeft = Math.max(0, Math.min(newLeft, maxLeft));
    newTop = Math.max(0, Math.min(newTop, maxTop));

    panel.style.left = `${newLeft}px`;
    panel.style.top = `${newTop}px`;
  }

  function onMouseUp(): void {
    if (isDragging) {
      isDragging = false;
      savePanelPosition(panel);
    }
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
  }
}

function toggleMinimize(panel: HTMLElement, button: HTMLElement): void {
  const isMinimized = panel.classList.toggle('ai-copilot-minimized');
  button.textContent = isMinimized ? '+' : '−';
  button.title = isMinimized ? 'Expand' : 'Minimize';

  localStorage.setItem('ai-copilot-minimized', String(isMinimized));
}

function hidePanel(panel: HTMLElement): void {
  panel.classList.add('ai-copilot-hidden');
  if (toggleBtn) {
    toggleBtn.classList.add('visible');
  }
  localStorage.setItem('ai-copilot-hidden', 'true');
}

function showPanel(panel: HTMLElement): void {
  panel.classList.remove('ai-copilot-hidden');
  if (toggleBtn) {
    toggleBtn.classList.remove('visible');
  }
  localStorage.setItem('ai-copilot-hidden', 'false');
}

function createToggleButton(panel: HTMLElement): void {
  toggleBtn = document.createElement('button');
  toggleBtn.className = 'ai-copilot-toggle-btn';
  toggleBtn.innerHTML = '✨';
  toggleBtn.title = 'Open AI Assistant';

  toggleBtn.addEventListener('click', () => showPanel(panel));

  document.body.appendChild(toggleBtn);

  // Check if panel was hidden
  if (localStorage.getItem('ai-copilot-hidden') === 'true') {
    hidePanel(panel);
  }
}

function savePanelPosition(panel: HTMLElement): void {
  const rect = panel.getBoundingClientRect();
  localStorage.setItem('ai-copilot-position', JSON.stringify({
    left: rect.left,
    top: rect.top,
  }));
}

function loadPanelPosition(panel: HTMLElement): void {
  const saved = localStorage.getItem('ai-copilot-position');
  if (saved) {
    try {
      const pos = JSON.parse(saved);
      panel.style.position = 'fixed';
      panel.style.left = `${pos.left}px`;
      panel.style.top = `${pos.top}px`;
      panel.style.right = 'auto';
    } catch (e) {
      // Ignore invalid saved position
    }
  }

  // Restore minimized state
  if (localStorage.getItem('ai-copilot-minimized') === 'true') {
    panel.classList.add('ai-copilot-minimized');
    const btn = panel.querySelector('[data-action="minimize"]');
    if (btn) {
      btn.textContent = '+';
      btn.setAttribute('title', 'Expand');
    }
  }
}

/**
 * Clean up the toggle button when the editor unmounts
 */
export function cleanupAICopilotPanel(): void {
  if (toggleBtn && toggleBtn.parentNode) {
    toggleBtn.parentNode.removeChild(toggleBtn);
    toggleBtn = null;
  }
}
