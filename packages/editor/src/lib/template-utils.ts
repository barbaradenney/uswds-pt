/**
 * Infer the starter template label from HTML content.
 * Checks for wrapper class names that each starter template uses.
 */
export function inferTemplateLabel(htmlContent: string | undefined | null): string | null {
  if (!htmlContent) return null;

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
