/**
 * HTML Cleaning Utilities
 * Remove GrapesJS artifacts and format HTML for developer handoff
 */

export interface CleanOptions {
  removeGrapesAttributes?: boolean;
  removeEmptyAttributes?: boolean;
  formatOutput?: boolean;
  indentSize?: number;
}

/**
 * Regex patterns for GrapesJS attributes that should be removed.
 * Using patterns instead of a hardcoded list ensures we catch all
 * data-gjs-* attributes even if GrapesJS adds new ones.
 */
export const GRAPES_ATTR_PATTERNS = [
  /\s+data-gjs-[a-z-]+(?:="[^"]*")?/gi,  // All data-gjs-* attributes
  /\s+data-highlightable(?:="[^"]*")?/gi, // data-highlightable (no gjs prefix)
  /\s+data-uswds-pt-id(?:="[^"]*")?/gi,   // Internal tracking IDs
];

/**
 * CSS classes added by GrapesJS that should be removed
 */
export const GRAPES_CLASSES = [
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

  // Fix usa-button slot content - the text attribute should become the slot content
  // since the web component uses slot content, not the text attribute
  cleaned = fixButtonSlotContent(cleaned);

  // Remove USWDS JS script tags - web components handle their own behavior
  // and USWDS JS conflicts with them (causes "Cannot read properties of null" errors)
  cleaned = removeUSWDSScripts(cleaned);

  if (removeGrapesAttributes) {
    cleaned = removeGrapesAttrs(cleaned);
  }

  if (removeEmptyAttributes) {
    cleaned = removeEmptyAttrs(cleaned);
  }

  // Remove GrapesJS generated IDs (pattern: single letter + alphanumeric with at least one digit)
  // This preserves meaningful IDs like "select", "my-input" while removing generated ones like "i1a2b"
  cleaned = cleaned.replace(/\s+id="[a-z](?=[a-z0-9]*\d)[a-z0-9]{3,7}"/gi, '');

  // Clean up GrapesJS classes
  cleaned = cleanGrapesClasses(cleaned);

  if (formatOutput) {
    cleaned = formatHtml(cleaned, indentSize);
  }

  return cleaned.trim();
}

/**
 * Fix usa-button slot content based on the text attribute.
 * The usa-button web component uses slot content, not a text attribute.
 * GrapesJS stores the text in the attribute, so we need to move it to slot content.
 *
 * Transforms: <usa-button text="page 2" ...>Click me</usa-button>
 * Into:       <usa-button text="page 2" ...>page 2</usa-button>
 */
export function fixButtonSlotContent(html: string): string {
  // Match usa-button tags with a text attribute and capture the text value and old content
  // Pattern: <usa-button ... text="value" ...>old content</usa-button>
  return html.replace(
    /<usa-button([^>]*)\stext="([^"]*)"([^>]*)>([^<]*)<\/usa-button>/gi,
    (match, before, textValue, after, _oldContent) => {
      // Use the text attribute value as the new slot content
      // Keep the text attribute for reference (web component ignores it anyway)
      return `<usa-button${before} text="${textValue}"${after}>${textValue}</usa-button>`;
    }
  );
}

/**
 * Remove USWDS JS script tags that conflict with web components.
 * The web components handle their own behavior (mobile menu, accordions, etc.)
 * and loading USWDS JS causes "Cannot read properties of null" errors.
 */
export function removeUSWDSScripts(html: string): string {
  // Remove script tags that load uswds.min.js or uswds.js from any source
  // Matches: <script src="...uswds.min.js..."></script> or <script src="...uswds.js..."></script>
  return html.replace(/<script[^>]*src="[^"]*uswds(?:\.min)?\.js[^"]*"[^>]*><\/script>/gi, '');
}

/**
 * Remove data-gjs-* and other GrapesJS-related attributes using regex patterns.
 * This is more maintainable than a hardcoded list and catches all variants.
 */
export function removeGrapesAttrs(html: string): string {
  let result = html;

  for (const pattern of GRAPES_ATTR_PATTERNS) {
    result = result.replace(pattern, '');
  }

  return result;
}

/**
 * Remove empty attributes like class=""
 */
export function removeEmptyAttrs(html: string): string {
  // Remove empty class attributes
  let result = html.replace(/\s+class=""/g, '');

  // Remove empty style attributes
  result = result.replace(/\s+style=""/g, '');

  // Remove empty id attributes
  result = result.replace(/\s+id=""/g, '');

  // Remove empty href attributes
  result = result.replace(/\s+href=""/g, '');

  // Remove empty page-link attributes
  result = result.replace(/\s+page-link=""/g, '');

  return result;
}

/**
 * Remove GrapesJS-specific classes from class attributes
 */
export function cleanGrapesClasses(html: string): string {
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
export function formatHtml(html: string, indentSize: number): string {
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
export function isSelfClosingTag(tag: string): boolean {
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
