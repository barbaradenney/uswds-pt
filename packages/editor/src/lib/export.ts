/**
 * HTML Export Utilities
 * Clean HTML output for developer handoff
 */

export interface CleanOptions {
  removeGrapesAttributes?: boolean;
  removeEmptyAttributes?: boolean;
  formatOutput?: boolean;
  indentSize?: number;
}

/**
 * Attributes added by GrapesJS that should be removed
 */
const GRAPES_ATTRIBUTES = [
  'data-gjs-type',
  'data-gjs-highlightable',
  'data-gjs-droppable',
  'data-gjs-draggable',
  'data-gjs-editable',
  'data-gjs-stylable',
  'data-gjs-hoverable',
  'data-gjs-textable',
  'data-gjs-badgable',
  'data-gjs-copyable',
  'data-gjs-removable',
  'data-gjs-selectable',
  'data-gjs-propagate',
  'data-highlightable',
];

/**
 * CSS classes added by GrapesJS that should be removed
 */
const GRAPES_CLASSES = [
  'gjs-selected',
  'gjs-hovered',
  'gjs-dashed',
  'gjs-comp-selected',
  'gjs-freezed',
];

/**
 * Clean HTML content by removing GrapesJS artifacts
 */
export function cleanExport(html: string, options: CleanOptions = {}): string {
  const {
    removeGrapesAttributes = true,
    removeEmptyAttributes = true,
    formatOutput = true,
    indentSize = 2,
  } = options;

  if (!html || !html.trim()) {
    return '';
  }

  let cleaned = html;

  if (removeGrapesAttributes) {
    cleaned = removeGrapesAttrs(cleaned);
  }

  if (removeEmptyAttributes) {
    cleaned = removeEmptyAttrs(cleaned);
  }

  // Remove generated IDs (pattern: single letter followed by random chars)
  cleaned = cleaned.replace(/\s+id="[a-z][a-z0-9]{3,5}"/gi, '');

  // Clean up GrapesJS classes
  cleaned = cleanGrapesClasses(cleaned);

  if (formatOutput) {
    cleaned = formatHtml(cleaned, indentSize);
  }

  return cleaned.trim();
}

/**
 * Remove data-gjs-* attributes
 */
function removeGrapesAttrs(html: string): string {
  let result = html;

  for (const attr of GRAPES_ATTRIBUTES) {
    // Match attribute with or without value
    const regex = new RegExp(`\\s*${attr}(="[^"]*")?`, 'gi');
    result = result.replace(regex, '');
  }

  return result;
}

/**
 * Remove empty attributes like class=""
 */
function removeEmptyAttrs(html: string): string {
  // Remove empty class attributes
  let result = html.replace(/\s+class=""/g, '');

  // Remove empty style attributes
  result = result.replace(/\s+style=""/g, '');

  // Remove empty id attributes
  result = result.replace(/\s+id=""/g, '');

  return result;
}

/**
 * Remove GrapesJS-specific classes from class attributes
 */
function cleanGrapesClasses(html: string): string {
  return html.replace(/class="([^"]*)"/g, (match, classes: string) => {
    const cleanedClasses = classes
      .split(' ')
      .filter((cls: string) => {
        // Remove gjs-* classes
        if (cls.startsWith('gjs-')) return false;
        // Remove classes in our list
        if (GRAPES_CLASSES.includes(cls)) return false;
        // Keep non-empty classes
        return cls.trim().length > 0;
      })
      .join(' ')
      .trim();

    if (!cleanedClasses) {
      return ''; // Remove entire attribute if no classes left
    }

    return `class="${cleanedClasses}"`;
  });
}

/**
 * Simple HTML formatter
 */
function formatHtml(html: string, indentSize: number): string {
  const indent = ' '.repeat(indentSize);
  let result = '';
  let depth = 0;

  // Normalize whitespace
  html = html.replace(/>\s+</g, '><').trim();

  // Split by tags
  const tokens = html.split(/(<\/?[^>]+>)/g).filter(Boolean);

  for (const token of tokens) {
    const isClosingTag = token.startsWith('</');
    const isSelfClosing = token.endsWith('/>') || isSelfClosingTag(token);
    const isOpeningTag = token.startsWith('<') && !isClosingTag && !isSelfClosing;

    if (isClosingTag) {
      depth = Math.max(0, depth - 1);
    }

    const currentIndent = indent.repeat(depth);

    if (token.startsWith('<')) {
      result += '\n' + currentIndent + token;
    } else if (token.trim()) {
      // Text content
      result += token.trim();
    }

    if (isOpeningTag) {
      depth++;
    }
  }

  return result.trim();
}

/**
 * Check if a tag is self-closing (void element)
 */
function isSelfClosingTag(tag: string): boolean {
  const voidElements = [
    'area',
    'base',
    'br',
    'col',
    'embed',
    'hr',
    'img',
    'input',
    'link',
    'meta',
    'param',
    'source',
    'track',
    'wbr',
  ];

  const tagName = tag.match(/<(\w+)/)?.[1]?.toLowerCase();
  return tagName ? voidElements.includes(tagName) : false;
}

/**
 * Generate a full HTML document with USWDS imports
 */
export function generateFullDocument(
  content: string,
  options: {
    title?: string;
    cdnBase?: string;
    lang?: string;
  } = {}
): string {
  const {
    title = 'Prototype',
    cdnBase = 'https://unpkg.com/@uswds-wc/all@latest',
    lang = 'en',
  } = options;

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>

  <!-- USWDS Web Components -->
  <link rel="stylesheet" href="${cdnBase}/dist/styles.css">
  <script type="module" src="${cdnBase}/dist/index.js"></script>
</head>
<body>
${content ? indentContent(content, 2) : '  <!-- Add your content here -->'}
</body>
</html>`;
}

/**
 * Escape HTML special characters
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Indent content by a number of spaces
 */
function indentContent(content: string, spaces: number): string {
  const indent = ' '.repeat(spaces);
  return content
    .split('\n')
    .map((line) => indent + line)
    .join('\n');
}
