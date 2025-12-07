# USWDS Web Components Prototyping Tool

A visual drag-and-drop prototyping environment constrained to the USWDS Web Components library. Outputs working HTML that developers can integrate directly into codebases.

## Recommended Stack (MVP)

| Layer | Technology | Why |
|-------|------------|-----|
| Visual Editor | GrapesJS | Native Web Components support, drag-and-drop, property panels |
| Database | PostgreSQL 16+ (JSONB) | Stores prototypes + version history |
| Auth | Authentik or Keycloak | SSO, MFA, integrates with LDAP/Active Directory |
| Deployment | Docker Compose | Single server is sufficient for MVP |

**Not needed for MVP:** AI/LLM infrastructure, RAG pipelines, real-time collaboration (can add later)

---

## Security & Self-Hosting

The entire stack runs internally with zero external dependencies:

| Component | Security Model |
|-----------|----------------|
| GrapesJS | Client-side JS, no external calls |
| PostgreSQL | Self-hosted, your network only |
| Authentik/Keycloak | Self-hosted identity provider, supports SSO/SAML |
| Docker | Deploy on your own infrastructure |

**Access control options:**
- Shareable URLs can require authentication (no public links)
- Authentik integrates with existing LDAP/Active Directory
- Full audit logs stored in PostgreSQL

---

## What GrapesJS Provides Out of the Box

- Drag-and-drop canvas
- Component palette (Block Manager)
- Property editing panel (Traits)
- Undo/redo
- Responsive preview modes
- HTML/CSS export
- Layer panel (component tree view)

You're configuring GrapesJS with your components, not building an editor from scratch.

---

## Why GrapesJS?

GrapesJS is the only major open source visual builder with **native Web Components support**. React-based alternatives (Puck, Craft.js) require wrapper components.

```javascript
// Register USWDS components directly
editor.DomComponents.addType('usa-button', {
  isComponent: el => el.tagName === 'USA-BUTTON',
  model: {
    defaults: {
      tagName: 'usa-button',
      traits: ['variant', 'size', 'disabled'],
    }
  }
});
```

**Gaps to fill:**
- UI needs modernization
- Auto-generate property panels from Custom Elements Manifest (CEM)

---

## Web Components Integration

Since the USWDS Web Components library **does not use Shadow DOM**, integration with GrapesJS is straightforward:

| Concern | Approach |
|---------|----------|
| Element selection | Standard `event.target` works normally |
| CSS for editor overlays | Global styles apply without workarounds |
| Attribute modification | Direct DOM access |
| Content nesting | Regular DOM children |
| Drag-and-drop | Standard GrapesJS behavior |

### Auto-generate Property Panels from CEM
```javascript
import manifest from './custom-elements.json';

function getComponentSchema(tagName) {
  const component = manifest.modules
    .flatMap(m => m.declarations)
    .find(d => d.tagName === tagName);
  return {
    attributes: component.attributes,
    cssProperties: component.cssProperties
  };
}
```

---

## Database Schema

```sql
CREATE TABLE prototypes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(21) UNIQUE NOT NULL,
  name VARCHAR(255),
  html_content TEXT NOT NULL,        -- Clean HTML output
  grapes_data JSONB NOT NULL,        -- GrapesJS state (for re-editing)
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE prototype_versions (
  id UUID PRIMARY KEY,
  prototype_id UUID REFERENCES prototypes(id),
  version_number INTEGER NOT NULL,
  html_content TEXT,
  grapes_data JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## Developer Integration & Handoff

### Where the Output Works

Since the output is Web Components (not React/Vue-specific), it works in:

| Environment | Integration |
|-------------|-------------|
| Static HTML sites | Drop in directly |
| Server-rendered apps (Rails, Django, PHP) | Paste into templates |
| React/Vue/Svelte apps | Works as-is (Web Components are framework-agnostic) |
| Astro, Eleventy, other SSGs | Native support |

The team just needs to include the component library's JS/CSS imports.

### The Workflow

```
Designer/PM builds prototype → Exports HTML → Developer integrates
                                    ↓
                              Clean component markup:
                              <usa-card>
                                <usa-button variant="primary">
                                  Submit
                                </usa-button>
                              </usa-card>
```

### Two Output Modes

**1. Prototype mode** (for sharing/testing)
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Prototype</title>
  <link rel="stylesheet" href="https://your-cdn/uswds-wc/styles.css">
  <script type="module" src="https://your-cdn/uswds-wc/components.js"></script>
</head>
<body>
  <usa-header>
    <usa-nav>...</usa-nav>
  </usa-header>
  <main>
    <usa-card>
      <usa-button variant="primary">Submit</usa-button>
    </usa-card>
  </main>
</body>
</html>
```
- Full HTML document with component imports
- Shareable URL that renders immediately
- Good for stakeholder review, user testing

**2. Snippet mode** (for developer handoff)
```html
<usa-card>
  <h2 slot="header">Application Status</h2>
  <usa-alert variant="success">
    Your application has been submitted.
  </usa-alert>
  <usa-button variant="primary">View Details</usa-button>
</usa-card>
```
- Just the markup, no document wrapper
- Clean, indented component HTML
- Copy-paste ready for codebase integration

### Clean Export Configuration

GrapesJS defaults can create messy output. Configure for clean code:

| Concern | Default Behavior | What to Change |
|---------|------------------|----------------|
| Layout | Adds wrapper `<div>`s with inline styles | Use CSS classes or grid components |
| IDs | Generates random IDs (`#i4k2j`) | Strip or make semantic |
| Inline styles | Adds `style=""` attributes | Force class-based styling only |
| Empty attributes | Sometimes adds `class=""` | Clean on export |

```javascript
function cleanExport(grapesHtml) {
  // Remove GrapesJS artifacts
  // Strip empty attributes  
  // Format/prettify
  return cleanedHtml;
}
```

### What Developers Still Add

The prototype provides structure and layout. Developers add:

- Event handlers (`<usa-button @click="handleSubmit">`)
- Dynamic data (`<usa-card :title="user.name">`)
- Conditional logic (`v-if`, `{#if}`, etc.)
- API calls, state management
- Form validation, error handling

### Value Proposition

| Use Case | How Well It Works |
|----------|-------------------|
| "Here's the layout, build this" | Excellent—saves hours of markup writing |
| "Use this HTML exactly as-is in production" | Needs minor cleanup, but close |
| "Generate a full working app" | No—still need dev work for logic |

**The real value:** Eliminates the translation step. Instead of a Figma file that a developer interprets, they get the actual component markup with structure, component choices, and properties already decided.

---

## Implementation Roadmap

### Week 1-2: Foundation
- [ ] Fork GrapesJS, strip default blocks
- [ ] Build CEM parser → generate Block Manager entries
- [ ] Generate Traits (property panels) from CEM attributes
- [ ] Basic canvas with components working

### Week 3-4: Persistence
- [ ] PostgreSQL schema + API (save/load)
- [ ] Version history (snapshot on each save)
- [ ] Shareable URLs with auth check
- [ ] Clean HTML export with proper component imports

### Week 5-6: Polish
- [ ] UI theming to match your brand
- [ ] Preview mode (hide editor chrome)
- [ ] Snippet export mode for developer handoff
- [ ] Basic SSO integration
- [ ] Deploy with Docker Compose

---

## Custom Development Required

| Item | Effort | Description |
|------|--------|-------------|
| CEM-to-GrapesJS adapter | ~1 week | Parse manifest, generate blocks + traits |
| UI theming | ~1 week | Modernize GrapesJS default UI |
| Save/load backend | ~1 week | PostgreSQL integration, API routes |
| Shareable URLs | ~2-3 days | NanoID slugs, auth checks |
| Clean export function | ~2-3 days | Strip artifacts, format output |

---

## Effort Estimate

**MVP:** 1-2 developers for 4-6 weeks

**Ongoing:** Part-time maintenance, updates when component library changes

**Infrastructure:** Basic web server, no GPU needed

---

## Future Enhancements (Post-MVP)

- **Real-time collaboration** — Add Yjs for multiple editors
- **AI-assisted generation** — LLM creates initial layout from prompt
- **Component usage analytics** — Track which components get used
- **Design token theming** — Switch themes in the editor
- **Figma import** — Convert Figma frames to component markup

---

## Key Resources

- [GrapesJS Documentation](https://grapesjs.com/docs/)
- [Custom Elements Manifest](https://custom-elements-manifest.open-wc.org/)
- [Authentik](https://goauthentik.io/) (self-hosted identity provider)
- [GOV.UK Prototype Kit](https://prototype-kit.service.gov.uk/) (reference architecture)
