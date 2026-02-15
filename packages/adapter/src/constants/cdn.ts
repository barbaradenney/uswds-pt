/**
 * CDN configuration for USWDS-WC components
 * Uses esm.sh with shared Lit dependencies to avoid duplicate custom element registration
 */
export const USWDS_WC_VERSIONS = {
  core: '2.5.4',
  actions: '2.5.5',
  forms: '2.5.4',
  feedback: '2.5.4',
  navigation: '2.5.5',
  'data-display': '2.5.4',
  layout: '2.5.4',
  patterns: '2.5.4',
} as const;
export const LIT_VERSION = '3';
export const USWDS_VERSION = '3.8.1';

/**
 * USWDS-WC Bundle version
 * The bundle package includes all components with Lit bundled in
 */
export const USWDS_WC_BUNDLE_VERSION = '2.5.15';

/**
 * USWDS-WC package names for loading
 */
export const USWDS_WC_PACKAGES = [
  'core',
  'actions',
  'forms',
  'feedback',
  'navigation',
  'data-display',
  'layout',
  'patterns',
] as const;

/**
 * CDN URLs for stylesheets and scripts
 * Using @uswds-wc/bundle which includes all components with Lit bundled
 * @see https://github.com/barbaradenney/uswds-wc
 */
export const CDN_URLS = {
  // USWDS base CSS (required for styling)
  uswdsCss: `https://cdn.jsdelivr.net/npm/@uswds/uswds@${USWDS_VERSION}/dist/css/uswds.min.css`,
  // USWDS-WC bundle - all web components with Lit included (using jsdelivr for better reliability)
  // Note: USWDS JavaScript (uswds.min.js) is NOT included - web components handle their own behavior
  uswdsWcJs: `https://cdn.jsdelivr.net/npm/@uswds-wc/bundle@${USWDS_WC_BUNDLE_VERSION}/uswds-wc.js`,
  uswdsWcCss: `https://cdn.jsdelivr.net/npm/@uswds-wc/bundle@${USWDS_WC_BUNDLE_VERSION}/uswds-wc.css`,
};

// Keep CDN_STYLES for backwards compatibility
export const CDN_STYLES = {
  uswds: CDN_URLS.uswdsCss,
};

/**
 * Generate a script that loads all USWDS-WC components in an iframe
 * This script should be injected after the import map
 */
export function generateComponentLoaderScript(): string {
  const imports = USWDS_WC_PACKAGES.map(pkg => `import '@uswds-wc/${pkg}';`).join('\n');
  return imports;
}
