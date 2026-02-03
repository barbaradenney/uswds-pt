import { test, expect } from '@playwright/test';

/**
 * E2E Tests for the USWDS Prototyping Tool Editor
 *
 * These tests cover critical user flows:
 * - Creating a new prototype
 * - Saving changes
 * - Loading existing prototypes
 */

test.describe('Editor', () => {
  test.describe('New Prototype Creation', () => {
    test('should create a new prototype from dashboard', async ({ page }) => {
      // Navigate to dashboard
      await page.goto('/');

      // Click "New Prototype" button
      const newButton = page.getByRole('button', { name: /new prototype/i });
      await expect(newButton).toBeVisible();
      await newButton.click();

      // Should navigate to editor with new prototype
      await expect(page).toHaveURL(/\/edit\//);

      // Editor canvas should be visible
      const canvas = page.locator('.gjs-cv-canvas');
      await expect(canvas).toBeVisible({ timeout: 10000 });
    });

    test('should show empty canvas for new prototype', async ({ page }) => {
      await page.goto('/');

      // Create new prototype
      await page.getByRole('button', { name: /new prototype/i }).click();
      await expect(page).toHaveURL(/\/edit\//);

      // Wait for editor to initialize
      const canvas = page.locator('.gjs-cv-canvas');
      await expect(canvas).toBeVisible({ timeout: 10000 });

      // Canvas frame should be present
      const frame = page.frameLocator('.gjs-frame');
      await expect(frame.locator('body')).toBeVisible();
    });
  });

  test.describe('Saving Prototypes', () => {
    test('should save prototype manually', async ({ page }) => {
      await page.goto('/');

      // Create new prototype
      await page.getByRole('button', { name: /new prototype/i }).click();
      await expect(page).toHaveURL(/\/edit\//);

      // Wait for editor
      const canvas = page.locator('.gjs-cv-canvas');
      await expect(canvas).toBeVisible({ timeout: 10000 });

      // Click save button
      const saveButton = page.getByRole('button', { name: /save/i });
      await expect(saveButton).toBeVisible();
      await saveButton.click();

      // Should show success indication (save indicator or toast)
      // The exact UI depends on implementation - check for save state
      await expect(page.getByText(/saved/i)).toBeVisible({ timeout: 5000 });
    });

    test('should update prototype name', async ({ page }) => {
      await page.goto('/');

      // Create new prototype
      await page.getByRole('button', { name: /new prototype/i }).click();
      await expect(page).toHaveURL(/\/edit\//);

      // Wait for editor
      await page.locator('.gjs-cv-canvas').waitFor({ timeout: 10000 });

      // Find and edit the name input
      const nameInput = page.getByRole('textbox', { name: /prototype name/i });
      if (await nameInput.isVisible()) {
        await nameInput.fill('My Test Prototype');
        await nameInput.blur();

        // Save to persist the name
        await page.getByRole('button', { name: /save/i }).click();
        await expect(page.getByText(/saved/i)).toBeVisible({ timeout: 5000 });
      }
    });
  });

  test.describe('Loading Prototypes', () => {
    test('should display prototypes on dashboard', async ({ page }) => {
      await page.goto('/');

      // Dashboard should show prototype list or empty state
      const dashboard = page.locator('[data-testid="prototype-list"], .prototype-grid, .dashboard');
      await expect(dashboard).toBeVisible({ timeout: 5000 });
    });

    test('should load existing prototype from dashboard', async ({ page }) => {
      // First create a prototype
      await page.goto('/');
      await page.getByRole('button', { name: /new prototype/i }).click();
      await expect(page).toHaveURL(/\/edit\//);

      // Wait for editor and save
      await page.locator('.gjs-cv-canvas').waitFor({ timeout: 10000 });
      await page.getByRole('button', { name: /save/i }).click();
      await expect(page.getByText(/saved/i)).toBeVisible({ timeout: 5000 });

      // Get the current URL slug
      const url = page.url();
      const slug = url.split('/edit/')[1];

      // Navigate back to dashboard
      await page.goto('/');

      // Find and click the prototype card
      const prototypeCard = page.locator(`[href*="${slug}"], [data-slug="${slug}"]`).first();
      if (await prototypeCard.isVisible({ timeout: 3000 })) {
        await prototypeCard.click();

        // Should load the editor with the prototype
        await expect(page).toHaveURL(/\/edit\//);
        await expect(page.locator('.gjs-cv-canvas')).toBeVisible({ timeout: 10000 });
      }
    });

    test('should navigate directly to prototype by URL', async ({ page }) => {
      // Create a prototype first
      await page.goto('/');
      await page.getByRole('button', { name: /new prototype/i }).click();

      // Wait for redirect and get slug
      await expect(page).toHaveURL(/\/edit\//);
      await page.locator('.gjs-cv-canvas').waitFor({ timeout: 10000 });

      const url = page.url();

      // Navigate away and back
      await page.goto('/');
      await page.goto(url);

      // Editor should load with the prototype
      await expect(page.locator('.gjs-cv-canvas')).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Component Interaction', () => {
    test('should show component blocks panel', async ({ page }) => {
      await page.goto('/');
      await page.getByRole('button', { name: /new prototype/i }).click();

      // Wait for editor
      await page.locator('.gjs-cv-canvas').waitFor({ timeout: 10000 });

      // Blocks panel should be visible (component library)
      const blocksPanel = page.locator('.gjs-blocks-c, [data-testid="blocks-panel"]');
      await expect(blocksPanel).toBeVisible();
    });

    test('should drag component onto canvas', async ({ page }) => {
      await page.goto('/');
      await page.getByRole('button', { name: /new prototype/i }).click();

      // Wait for editor
      await page.locator('.gjs-cv-canvas').waitFor({ timeout: 10000 });

      // Find a block to drag (e.g., button)
      const block = page.locator('.gjs-block').first();
      const canvas = page.locator('.gjs-cv-canvas');

      if (await block.isVisible()) {
        // Drag block to canvas
        await block.dragTo(canvas);

        // Verify component was added (frame should have content)
        const frame = page.frameLocator('.gjs-frame');
        const body = frame.locator('body');
        const childCount = await body.locator('*').count();

        // Should have at least one element after drag
        expect(childCount).toBeGreaterThan(0);
      }
    });
  });

  test.describe('Export', () => {
    test('should open export modal', async ({ page }) => {
      await page.goto('/');
      await page.getByRole('button', { name: /new prototype/i }).click();

      // Wait for editor
      await page.locator('.gjs-cv-canvas').waitFor({ timeout: 10000 });

      // Click export button
      const exportButton = page.getByRole('button', { name: /export/i });
      await expect(exportButton).toBeVisible();
      await exportButton.click();

      // Export modal should appear
      const modal = page.locator('[role="dialog"]');
      await expect(modal).toBeVisible();
      await expect(modal.getByText(/export/i)).toBeVisible();
    });

    test('should copy HTML from export modal', async ({ page }) => {
      await page.goto('/');
      await page.getByRole('button', { name: /new prototype/i }).click();

      // Wait for editor
      await page.locator('.gjs-cv-canvas').waitFor({ timeout: 10000 });

      // Open export modal
      await page.getByRole('button', { name: /export/i }).click();
      const modal = page.locator('[role="dialog"]');
      await expect(modal).toBeVisible();

      // Find copy button and click
      const copyButton = modal.getByRole('button', { name: /copy/i });
      await expect(copyButton).toBeVisible();
      await copyButton.click();

      // Should show copied confirmation
      await expect(modal.getByText(/copied/i)).toBeVisible({ timeout: 3000 });
    });
  });

  test.describe('Preview', () => {
    test('should open preview in new tab', async ({ page, context }) => {
      await page.goto('/');
      await page.getByRole('button', { name: /new prototype/i }).click();

      // Wait for editor
      await page.locator('.gjs-cv-canvas').waitFor({ timeout: 10000 });

      // Listen for new page
      const pagePromise = context.waitForEvent('page');

      // Click preview button
      const previewButton = page.getByRole('button', { name: /preview/i });
      await expect(previewButton).toBeVisible();
      await previewButton.click();

      // New tab should open with preview
      const newPage = await pagePromise;
      await newPage.waitForLoadState();

      // Preview page should have content
      expect(newPage.url()).toContain('/preview');
    });
  });
});
