# @uswds-pt/adapter

Converts USWDS Web Components into GrapesJS block and component registrations. This package is the bridge between the USWDS component library and the visual editor -- it defines what appears in the editor palette and how each component's properties are edited.

## Architecture

| File / Directory | Purpose |
|---|---|
| `component-registry-v2.ts` | `ComponentRegistry` class + singleton; imports all component registrations |
| `components/form-components.ts` | Form inputs: button, text-input, select, checkbox, radio, etc. |
| `components/form-input-components.ts` | Specialized form inputs: date picker, combo box, file input |
| `components/data-components.ts` | Data display: card, table, tag, list, collection |
| `components/feedback-components.ts` | Feedback: alert, banner, modal, tooltip |
| `components/layout-components.ts` | Layout: accordion, step-indicator, prose |
| `components/navigation-components.ts` | Navigation: header, footer, breadcrumb, side-nav |
| `components/structure-components.ts` | Structural layout: grid, container |
| `components/ui-components.ts` | UI elements: identifier, language-selector |
| `components/shared-utils.ts` | Trait factories, boolean coercion, common types |
| `WebComponentTraitManager.ts` | Syncs GrapesJS trait values with DOM attributes on canvas |
| `cem-parser.ts` | Parses Custom Elements Manifest into internal format |
| `block-generator.ts` | Generates GrapesJS block definitions from parsed CEM |
| `trait-generator.ts` | Generates GrapesJS trait configs from component attributes |
| `constants.ts` | CDN URLs, block templates, component icons, starter templates |

## Key Exports

| Export | Description |
|---|---|
| `componentRegistry` | Singleton registry with all USWDS component registrations |
| `WebComponentTraitManager` | Manages trait-to-DOM synchronization |
| `CDN_URLS`, `CDN_STYLES` | USWDS CSS/JS CDN paths |
| `STARTER_TEMPLATES` | Pre-built page templates for new prototypes |
| `generateBlocks`, `generateTraits` | Block/trait generation from CEM |
| `createAttributeTrait`, `createBooleanTrait` | Trait factory helpers |
| `cleanupElementIntervals`, `cleanupAllIntervals` | Interval cleanup for components with polling |

## Development

```bash
pnpm --filter @uswds-pt/adapter build       # tsc
pnpm --filter @uswds-pt/adapter dev         # tsc --watch
pnpm --filter @uswds-pt/adapter test        # Run tests (Vitest + happy-dom)
pnpm --filter @uswds-pt/adapter test:watch  # Watch mode
```

No environment variables required. Tests use `happy-dom` for DOM simulation.

## Monorepo Dependencies

- **`@uswds-pt/shared`** -- `escapeHtml` (XSS safety in table rendering), CEM types
