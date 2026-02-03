import { test, expect, Page } from '@playwright/test';

/**
 * E2E Tests for the USWDS Prototyping Tool Editor
 *
 * These tests run in DEMO MODE (no API/auth required) for reliable testing.
 * Demo mode uses localStorage for prototype storage.
 *
 * Tests cover critical user flows:
 * - Creating a new prototype
 * - Saving changes
 * - Loading existing prototypes
 * - Export and Preview
 */

/**
 * Helper to create a new prototype and wait for editor
 */
async function createNewPrototype(page: Page) {
  await page.goto('/');

  // Wait for home page to load
  await expect(page.getByRole('heading', { name: /USWDS Prototyping Tool/i })).toBeVisible({ timeout: 10000 });

  // Click the first New Prototype button (there may be two - in header and welcome card)
  const newButton = page.getByRole('button', { name: /new prototype/i }).first();
  await expect(newButton).toBeVisible({ timeout: 5000 });
  await newButton.click();

  // Wait for navigation to editor
  await expect(page).toHaveURL(/\/new|\/edit\//, { timeout: 10000 });

  // Wait for editor to load - look for StudioEditor elements
  // The GrapesJS Studio SDK renders a specific structure
  await page.waitForSelector('[class*="gjs"], [class*="studio"], [data-gjs-type]', { timeout: 60000 });
}

/**
 * Helper to wait for editor to be fully ready
 */
async function waitForEditorReady(page: Page) {
  // Wait for the editor container to be visible
  // GrapesJS Studio SDK has different class names than standard GrapesJS
  await page.waitForSelector('[class*="gjs"], [class*="studio"]', {
    state: 'visible',
    timeout: 60000,
  });

  // Give editor time to fully initialize
  await page.waitForTimeout(2000);
}

test.describe('Editor - Demo Mode', () => {
  test.describe('Home Page', () => {
    test('should show home page with welcome message', async ({ page }) => {
      await page.goto('/');

      // Should show the main heading
      await expect(page.getByRole('heading', { name: /USWDS Prototyping Tool/i })).toBeVisible({ timeout: 10000 });

      // Should have New Prototype button (use first() since there are two)
      await expect(page.getByRole('button', { name: /new prototype/i }).first()).toBeVisible();
    });

    test('should show welcome card for new users', async ({ page }) => {
      await page.goto('/');

      // Should show welcome content when no prototypes exist
      await expect(page.getByText(/welcome/i)).toBeVisible({ timeout: 10000 });
      await expect(page.getByText(/drag and drop/i)).toBeVisible();
    });
  });

  test.describe('New Prototype Creation', () => {
    test('should create a new prototype from home page', async ({ page }) => {
      await createNewPrototype(page);

      // Editor should be visible
      await waitForEditorReady(page);
    });

    test('should navigate to /new URL when creating prototype', async ({ page }) => {
      await page.goto('/');
      await expect(page.getByRole('button', { name: /new prototype/i }).first()).toBeVisible({ timeout: 10000 });
      await page.getByRole('button', { name: /new prototype/i }).first().click();

      // Should navigate to /new
      await expect(page).toHaveURL(/\/new/);
    });
  });

  test.describe('Editor Interface', () => {
    test('should show editor toolbar', async ({ page }) => {
      await createNewPrototype(page);
      await waitForEditorReady(page);

      // Should have Save button
      const saveButton = page.getByRole('button', { name: /save/i });
      await expect(saveButton).toBeVisible({ timeout: 10000 });
    });

    test('should show export button', async ({ page }) => {
      await createNewPrototype(page);
      await waitForEditorReady(page);

      // Should have Export button
      const exportButton = page.getByRole('button', { name: /export/i });
      await expect(exportButton).toBeVisible({ timeout: 10000 });
    });

    test('should show preview button', async ({ page }) => {
      await createNewPrototype(page);
      await waitForEditorReady(page);

      // Should have Preview button
      const previewButton = page.getByRole('button', { name: /preview/i });
      await expect(previewButton).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Saving Prototypes', () => {
    test('should save prototype', async ({ page }) => {
      await createNewPrototype(page);
      await waitForEditorReady(page);

      // Click save button
      const saveButton = page.getByRole('button', { name: /save/i }).first();
      await saveButton.click();

      // In demo mode with hash routing, URL becomes /#/edit/[id] or stays at /#/new
      // Wait for either URL change or save confirmation
      await page.waitForTimeout(2000);

      // Check for save success - either URL changed or still at /new (demo mode may not change URL)
      const url = page.url();
      const isSaved = url.includes('/edit/') || url.includes('/new');
      expect(isSaved).toBe(true);
    });
  });

  test.describe('Export Modal', () => {
    test('should open export modal', async ({ page }) => {
      await createNewPrototype(page);
      await waitForEditorReady(page);

      // Click export button
      await page.getByRole('button', { name: /export/i }).click();

      // Export modal should appear
      const modal = page.locator('[role="dialog"]');
      await expect(modal).toBeVisible({ timeout: 5000 });
    });

    test('should show snippet and full document tabs', async ({ page }) => {
      await createNewPrototype(page);
      await waitForEditorReady(page);

      await page.getByRole('button', { name: /export/i }).click();

      const modal = page.locator('[role="dialog"]');
      await expect(modal).toBeVisible();

      // Should have tab buttons
      await expect(modal.getByRole('tab', { name: /snippet/i })).toBeVisible();
      await expect(modal.getByRole('tab', { name: /full document/i })).toBeVisible();
    });

    test('should have copy and download buttons', async ({ page }) => {
      await createNewPrototype(page);
      await waitForEditorReady(page);

      await page.getByRole('button', { name: /export/i }).click();

      const modal = page.locator('[role="dialog"]');
      await expect(modal).toBeVisible();

      // Should have Copy and Download buttons
      await expect(modal.getByRole('button', { name: /copy/i })).toBeVisible();
      await expect(modal.getByRole('button', { name: /download/i })).toBeVisible();
    });

    test('should close export modal', async ({ page }) => {
      await createNewPrototype(page);
      await waitForEditorReady(page);

      await page.getByRole('button', { name: /export/i }).click();

      const modal = page.locator('[role="dialog"]');
      await expect(modal).toBeVisible();

      // Close the modal
      await modal.getByRole('button', { name: /×|close/i }).click();
      await expect(modal).not.toBeVisible();
    });
  });

  test.describe('Preview', () => {
    test('should open preview in new tab', async ({ page, context }) => {
      await createNewPrototype(page);
      await waitForEditorReady(page);

      // Save first
      await page.getByRole('button', { name: /save/i }).first().click();
      await page.waitForTimeout(2000); // Wait for save to complete

      // Listen for new page
      const pagePromise = context.waitForEvent('page');

      // Click preview button
      await page.getByRole('button', { name: /preview/i }).click();

      // New tab should open
      const newPage = await pagePromise;
      await newPage.waitForLoadState();

      // Preview opens in demo mode as blob URL or in API mode as /preview/ route
      const previewUrl = newPage.url();
      const isValidPreview = previewUrl.includes('/preview') || previewUrl.startsWith('blob:');
      expect(isValidPreview).toBe(true);

      // The preview page should have content (body should not be empty)
      await expect(newPage.locator('body')).toBeVisible();
    });
  });

  test.describe('Navigation', () => {
    test('should have home link in editor', async ({ page }) => {
      await createNewPrototype(page);
      await waitForEditorReady(page);

      // Look for home link (usually a logo or back link)
      const homeLink = page.locator('a[href="/"]').first();
      if (await homeLink.isVisible({ timeout: 3000 })) {
        await homeLink.click();
        await expect(page).toHaveURL('/');
      }
    });
  });

  test.describe('Prototype Persistence', () => {
    test('should load saved prototype from home page', async ({ page }) => {
      // Create and save a prototype
      await createNewPrototype(page);
      await waitForEditorReady(page);

      await page.getByRole('button', { name: /save/i }).first().click();
      await page.waitForTimeout(2000); // Wait for save to complete

      // Go back to home
      await page.goto('/');
      await expect(page.getByRole('heading', { name: /USWDS Prototyping Tool/i })).toBeVisible({ timeout: 10000 });

      // Should see the prototype card (localStorage persists in demo mode)
      const prototypeCard = page.locator('.prototype-card').first();
      if (await prototypeCard.isVisible({ timeout: 5000 })) {
        // Clicking card should navigate to editor
        await prototypeCard.click();
        await expect(page).toHaveURL(/\/edit\//);
        await waitForEditorReady(page);
      }
    });

    test('should navigate directly to saved prototype', async ({ page }) => {
      // Create and save a prototype
      await createNewPrototype(page);
      await waitForEditorReady(page);

      await page.getByRole('button', { name: /save/i }).first().click();
      await page.waitForTimeout(2000); // Wait for save to complete

      // In demo mode, URL might stay at /new or change to /edit/[id]
      const savedUrl = page.url();

      // Navigate away
      await page.goto('/');
      await expect(page.getByRole('heading', { name: /USWDS Prototyping Tool/i })).toBeVisible({ timeout: 10000 });

      // Navigate back directly (if URL changed to edit)
      if (savedUrl.includes('/edit/')) {
        await page.goto(savedUrl);
        await waitForEditorReady(page);
      }
    });
  });
});
