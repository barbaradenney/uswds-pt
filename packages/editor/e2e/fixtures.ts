import { test as base, expect } from '@playwright/test';

/**
 * Test fixtures for USWDS-PT E2E tests
 *
 * Extends Playwright test with custom fixtures for:
 * - Authenticated user sessions
 * - Pre-created prototypes
 */

// Test user credentials (should match test data in API)
const TEST_USER = {
  email: 'test@example.com',
  password: 'testpassword123',
};

/**
 * Extended test fixture with authentication support
 */
export const test = base.extend<{
  /** Logged-in page with auth token set */
  authenticatedPage: typeof base;
}>({
  authenticatedPage: async ({ page }, use) => {
    // Navigate to login if not already authenticated
    await page.goto('/login');

    // Check if already logged in (redirected to dashboard)
    if (page.url().includes('/login')) {
      // Fill login form
      const emailInput = page.getByLabel(/email/i);
      const passwordInput = page.getByLabel(/password/i);
      const submitButton = page.getByRole('button', { name: /sign in|log in/i });

      if (await emailInput.isVisible({ timeout: 3000 })) {
        await emailInput.fill(TEST_USER.email);
        await passwordInput.fill(TEST_USER.password);
        await submitButton.click();

        // Wait for redirect to dashboard
        await expect(page).not.toHaveURL(/\/login/, { timeout: 10000 });
      }
    }

    await use(page as any);
  },
});

export { expect };

/**
 * Page object for Editor interactions
 */
export class EditorPage {
  constructor(private page: any) {}

  async goto(slug?: string) {
    if (slug) {
      await this.page.goto(`/edit/${slug}`);
    } else {
      await this.page.goto('/');
      await this.page.getByRole('button', { name: /new prototype/i }).click();
    }
    await this.waitForEditor();
  }

  async waitForEditor() {
    await this.page.locator('.gjs-cv-canvas').waitFor({ timeout: 15000 });
  }

  async save() {
    await this.page.getByRole('button', { name: /save/i }).click();
    await expect(this.page.getByText(/saved/i)).toBeVisible({ timeout: 5000 });
  }

  async setName(name: string) {
    const nameInput = this.page.getByRole('textbox', { name: /prototype name/i });
    if (await nameInput.isVisible()) {
      await nameInput.fill(name);
      await nameInput.blur();
    }
  }

  async openExport() {
    await this.page.getByRole('button', { name: /export/i }).click();
    await expect(this.page.locator('[role="dialog"]')).toBeVisible();
  }

  async openPreview() {
    const pagePromise = this.page.context().waitForEvent('page');
    await this.page.getByRole('button', { name: /preview/i }).click();
    return await pagePromise;
  }

  async dragBlock(blockSelector: string) {
    const block = this.page.locator(blockSelector).first();
    const canvas = this.page.locator('.gjs-cv-canvas');
    await block.dragTo(canvas);
  }

  getSlug(): string {
    const url = this.page.url();
    const match = url.match(/\/edit\/([^/?]+)/);
    return match ? match[1] : '';
  }
}

/**
 * Helper to create a unique test prototype name
 */
export function uniqueName(prefix = 'Test'): string {
  return `${prefix} ${Date.now().toString(36)}`;
}

/**
 * Helper to wait for network idle
 */
export async function waitForNetworkIdle(page: any, timeout = 5000) {
  await page.waitForLoadState('networkidle', { timeout });
}
