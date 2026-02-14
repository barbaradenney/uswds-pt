/**
 * Typed interface for USWDS web component elements.
 *
 * USWDS Web Components are Lit-based custom elements that expose a dynamic
 * set of properties (e.g., `heading`, `variant`, `items`) alongside the
 * standard Lit lifecycle methods (`requestUpdate`, `updateComplete`).
 *
 * This interface extends `HTMLElement` so that adapter code can cast a DOM
 * element once and then access both standard DOM APIs and USWDS/Lit-specific
 * members without repeated `as any` casts.
 *
 * The index signature (`[key: string]`) allows setting and reading arbitrary
 * component properties (like `element.heading`, `element.items`) that vary
 * per component without needing a union of every possible property name.
 *
 * @example
 * ```ts
 * const el = element as USWDSElement;
 * el.heading = 'New heading';
 * el.requestUpdate?.();
 * await el.updateComplete;
 * ```
 */
export interface USWDSElement extends HTMLElement {
  // ── Lit lifecycle (optional — only present on Lit-based elements) ────

  /** Triggers an asynchronous re-render (Lit `ReactiveElement.requestUpdate`). */
  requestUpdate?(): void;

  /** Resolves after the element's next render completes (Lit `ReactiveElement.updateComplete`). */
  updateComplete?: Promise<boolean>;

  // ── Dynamic property access ──────────────────────────────────────────
  //
  // USWDS components expose dozens of reflected properties (heading, variant,
  // items, navItems, etc.) that differ by component.  Rather than maintaining
  // a brittle union of every property on every component, we use an index
  // signature so callers can set/get properties freely while still getting
  // `unknown` (not `any`) from reads, encouraging proper narrowing.

  /** Allow dynamic property access for component-specific attributes. */
  [key: string]: unknown;
}
