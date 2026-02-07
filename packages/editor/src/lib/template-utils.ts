/**
 * Infer the starter template label from HTML content.
 * Checks data-template attribute first (most reliable), then falls back
 * to wrapper class names for older prototypes.
 */
export function inferTemplateLabel(htmlContent: string | undefined | null): string | null {
  if (!htmlContent) return null;

  // Primary: check data-template attribute (added to STARTER_TEMPLATES)
  const dataTemplateMatch = htmlContent.match(/data-template="([^"]+)"/);
  if (dataTemplateMatch) {
    const templateId = dataTemplateMatch[1];
    const labelMap: Record<string, string> = {
      'signed-in': 'Signed In',
      'signed-out': 'Signed Out',
      'form': 'Form',
      'landing': 'Landing',
      'sign-in': 'Sign In',
      'error': 'Error',
      'blank': 'Blank',
    };
    if (labelMap[templateId]) return labelMap[templateId];
  }

  // Fallback: check wrapper class names (for prototypes created before data-template)
  if (htmlContent.includes('signed-in-template')) return 'Signed In';
  if (htmlContent.includes('signed-out-template')) return 'Signed Out';
  if (htmlContent.includes('form-starter-template')) return 'Form';
  if (htmlContent.includes('landing-template')) return 'Landing';
  if (htmlContent.includes('form-template')) return 'Form';
  if (htmlContent.includes('sign-in-template')) return 'Sign In';
  if (htmlContent.includes('error-template')) return 'Error';
  if (htmlContent.includes('blank-template')) return 'Blank';

  return null;
}
