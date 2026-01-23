# External Content Editing Integration - Discovery Document

## Overview

This document explores options for integrating external content editing workflows into USWDS-PT. The goal is to enable content teams to manage, review, and revise content through their existing processes while maintaining a clean connection to the prototyping tool.

## Problem Statement

- Content teams have their own revision and approval workflows
- They need to collaborate on content separately from visual design
- Content changes should be easily synced to prototypes
- Need to maintain audit trails and version history for content decisions
- Want to reduce friction between content and design processes

---

## Option 1: Google Sheets Integration

### Overview
Use Google Sheets as a content management layer where content teams can edit, comment, and track revisions.

### Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Google Sheet   │────▶│  USWDS-PT API    │────▶│   Prototype     │
│  (Content Team) │     │  (Sync Service)  │     │   (Editor)      │
└─────────────────┘     └──────────────────┘     └─────────────────┘
        │                        │
        │ Comments, Versions     │ Content Keys
        │ Suggestions            │ Mapped to Components
        ▼                        ▼
┌─────────────────┐     ┌──────────────────┐
│ Revision History│     │ Content Bindings │
│ (Native Sheets) │     │ (data-content-id)│
└─────────────────┘     └──────────────────┘
```

### Implementation Approach

**A. Sheet Structure**
```
| content_id     | content_type | text                    | status    | notes           |
|----------------|--------------|-------------------------|-----------|-----------------|
| hero-title     | heading      | Welcome to Our Service  | approved  | Per brand team  |
| hero-subtitle  | paragraph    | Making government...    | in-review | Shorten?        |
| cta-button     | button       | Get Started             | approved  |                 |
```

**B. Component Binding**
Add a `content-id` trait to components that can be bound to external content:

```typescript
// In component registry
{
  tagName: 'usa-button',
  traits: {
    'content-id': {
      definition: {
        type: 'text',
        name: 'content-id',
        label: 'Content ID (External)',
        placeholder: 'e.g., cta-button'
      },
      handler: {
        onChange: (el, value) => {
          el.setAttribute('data-content-id', value);
        }
      }
    }
  }
}
```

**C. Sync Methods**

1. **Manual Sync (MVP)**: Button in toolbar to pull latest content
2. **On-Load Sync**: Fetch content when prototype opens
3. **Real-time Sync**: WebSocket/polling for live updates (advanced)

### Pros
- Content teams already familiar with Sheets
- Native commenting and suggestion features
- Version history built-in
- Easy sharing and permissions
- Low barrier to entry

### Cons
- 10 million cell limit
- API rate limits (300 requests/minute)
- Requires Google account for content team
- No built-in approval workflow (manual status columns)

### Implementation Effort
- **MVP**: 2-3 weeks
- **Full feature**: 4-6 weeks

---

## Option 2: Headless CMS Integration

### Overview
Integrate with a headless CMS like Contentful, Sanity, or Strapi for more robust content management.

### Recommended Platforms

| Platform    | Best For                    | Pricing          |
|-------------|-----------------------------|--------------------|
| **Sanity**  | Real-time collaboration     | Free tier generous |
| **Contentful** | Enterprise, governance   | Starts $489/mo     |
| **Strapi**  | Self-hosted, full control   | Free (self-host)   |
| **Hygraph** | GraphQL-native, multi-source| Free tier available|

### Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Headless CMS   │     │  Content API     │     │   USWDS-PT      │
│  (Sanity/etc)   │────▶│  (GraphQL/REST)  │────▶│   Prototype     │
└─────────────────┘     └──────────────────┘     └─────────────────┘
        │                                               │
        │ Workflows, Approvals                          │
        │ Localization, Scheduling                      │
        ▼                                               ▼
┌─────────────────┐                            ┌─────────────────┐
│ Content Studio  │                            │ Content Panel   │
│ (Rich editing)  │                            │ (in Editor)     │
└─────────────────┘                            └─────────────────┘
```

### Content Model Example (Sanity)

```javascript
// sanity/schemas/prototypeContent.js
export default {
  name: 'prototypeContent',
  title: 'Prototype Content',
  type: 'document',
  fields: [
    {
      name: 'contentId',
      title: 'Content ID',
      type: 'slug',
      description: 'Maps to data-content-id in prototype'
    },
    {
      name: 'prototype',
      title: 'Prototype',
      type: 'reference',
      to: [{ type: 'prototype' }]
    },
    {
      name: 'content',
      title: 'Content',
      type: 'text'
    },
    {
      name: 'status',
      title: 'Status',
      type: 'string',
      options: {
        list: ['draft', 'in-review', 'approved', 'published']
      }
    }
  ]
}
```

### Pros
- Built-in approval workflows
- Rich content types (images, rich text, etc.)
- Localization support
- Version history with diffs
- API-first design
- Webhooks for real-time updates

### Cons
- More complex setup
- Additional service to manage
- Learning curve for content team
- Potential cost (depending on platform)

### Implementation Effort
- **Basic integration**: 3-4 weeks
- **Full feature with studio customization**: 6-8 weeks

---

## Option 3: Built-in Content Panel

### Overview
Add a dedicated content editing panel within USWDS-PT that can export/import content for external review.

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        USWDS-PT Editor                       │
├─────────────┬─────────────────────────┬─────────────────────┤
│   Blocks    │        Canvas           │   Content Panel     │
│   Panel     │                         │   ┌───────────────┐ │
│             │   ┌─────────────────┐   │   │ hero-title    │ │
│             │   │   <usa-header>   │   │   │ [Edit]        │ │
│             │   └─────────────────┘   │   │ Status: Draft │ │
│             │   ┌─────────────────┐   │   ├───────────────┤ │
│             │   │   Hero Section   │   │   │ cta-button    │ │
│             │   │   "Welcome..."   │◀─────│ [Edit]        │ │
│             │   └─────────────────┘   │   │ Status: OK    │ │
│             │                         │   └───────────────┘ │
├─────────────┴─────────────────────────┴─────────────────────┤
│  [Export Content] [Import Content] [Sync from Sheet]        │
└─────────────────────────────────────────────────────────────┘
```

### Features

1. **Content Extraction**: Pull all text content into a structured format
2. **Export Options**: CSV, JSON, Google Sheets link
3. **Import/Merge**: Apply content changes back to prototype
4. **Status Tracking**: Mark content as draft/reviewed/approved
5. **Highlight Mode**: Show which content needs review

### Export Format Example

```json
{
  "prototypeId": "abc123",
  "prototypeName": "Homepage Redesign",
  "exportedAt": "2025-01-23T00:00:00Z",
  "content": [
    {
      "id": "comp-1-heading",
      "type": "heading",
      "element": "h1",
      "text": "Welcome to Our Service",
      "context": "Hero section, main heading",
      "status": "draft",
      "maxLength": 50
    },
    {
      "id": "comp-2-button",
      "type": "button",
      "text": "Get Started",
      "context": "Primary CTA in hero",
      "status": "approved"
    }
  ]
}
```

### Pros
- No external dependencies
- Integrated experience
- Full control over workflow
- Works offline

### Cons
- Need to build collaboration features
- No native commenting (would need to build)
- Less familiar to content teams
- Export/import friction

### Implementation Effort
- **MVP (export/import)**: 2-3 weeks
- **Full panel with status tracking**: 4-5 weeks

---

## Option 4: Hybrid Approach (Recommended)

### Overview
Combine the best of multiple approaches with progressive enhancement.

### Phase 1: Content Binding Foundation
- Add `content-id` trait to all text-capable components
- Create content extraction utility
- Export to CSV/JSON for external editing

### Phase 2: Google Sheets Integration
- One-click export to Google Sheets
- Import from Sheets with conflict resolution
- Link prototype to specific Sheet for ongoing sync

### Phase 3: Content Panel (Optional)
- Side panel showing all bound content
- Quick edit capability
- Status tracking per content item

### Phase 4: CMS Integration (Optional)
- Plugin architecture for CMS adapters
- Sanity/Contentful/Strapi connectors
- Webhook support for real-time sync

---

## Technical Implementation Details

### Content Binding System

```typescript
// packages/shared/src/types/content.ts
export interface ContentBinding {
  id: string;                    // Unique content ID
  componentId: string;           // GrapesJS component ID
  text: string;                  // Current text content
  context?: string;              // Where this content appears
  status: ContentStatus;         // draft | in-review | approved
  lastSyncedAt?: Date;           // When last synced from external source
  externalSource?: {
    type: 'google-sheets' | 'cms' | 'manual';
    url?: string;
    cellRef?: string;            // e.g., "A2" for sheets
  };
}

export type ContentStatus = 'draft' | 'in-review' | 'approved' | 'needs-update';
```

### Google Sheets Service

```typescript
// packages/api/src/services/google-sheets.ts
export class GoogleSheetsService {
  async createContentSheet(prototypeId: string): Promise<string> {
    // Creates a new sheet with standard columns
    // Returns sheet URL
  }

  async syncToSheet(prototypeId: string, content: ContentBinding[]): Promise<void> {
    // Pushes content to linked sheet
  }

  async syncFromSheet(prototypeId: string): Promise<ContentBinding[]> {
    // Pulls content from linked sheet
    // Returns updated content with any changes
  }
}
```

### Editor Integration

```typescript
// packages/editor/src/components/ContentPanel.tsx
export function ContentPanel({ prototypeSlug }: { prototypeSlug: string }) {
  const [bindings, setBindings] = useState<ContentBinding[]>([]);
  const [linkedSheet, setLinkedSheet] = useState<string | null>(null);

  // Extract content from current editor state
  const extractContent = () => {
    const editor = editorRef.current;
    const components = editor.DomComponents.getWrapper().find('[data-content-id]');
    // ... extract and update bindings
  };

  // Sync with external source
  const syncContent = async () => {
    if (linkedSheet) {
      const updated = await api.syncFromSheet(prototypeSlug);
      applyContentToEditor(updated);
    }
  };

  return (
    <div className="content-panel">
      <header>
        <h3>Content</h3>
        <button onClick={extractContent}>Refresh</button>
        {linkedSheet && <button onClick={syncContent}>Sync from Sheet</button>}
      </header>

      <ul className="content-list">
        {bindings.map(binding => (
          <ContentItem key={binding.id} binding={binding} />
        ))}
      </ul>

      <footer>
        <button onClick={exportToCSV}>Export CSV</button>
        <button onClick={linkGoogleSheet}>Link Google Sheet</button>
      </footer>
    </div>
  );
}
```

---

## Database Schema Additions

```sql
-- Content bindings table
CREATE TABLE content_bindings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prototype_id UUID NOT NULL REFERENCES prototypes(id) ON DELETE CASCADE,
  content_id VARCHAR(255) NOT NULL,  -- e.g., "hero-title"
  component_id VARCHAR(255),          -- GrapesJS component ID
  text TEXT NOT NULL,
  context TEXT,
  status VARCHAR(50) DEFAULT 'draft',
  external_source JSONB,              -- { type, url, cellRef }
  last_synced_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(prototype_id, content_id)
);

-- Linked external sources
CREATE TABLE content_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prototype_id UUID NOT NULL REFERENCES prototypes(id) ON DELETE CASCADE,
  source_type VARCHAR(50) NOT NULL,   -- 'google-sheets', 'sanity', etc.
  source_url TEXT NOT NULL,
  config JSONB,                        -- Source-specific config
  last_synced_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(prototype_id, source_type)
);
```

---

## Recommendation

### For MVP (Quickest Value)
Start with **Option 3 (Built-in Content Panel)** with export capability:
1. Add content extraction to JSON/CSV
2. Simple import functionality
3. Content team reviews in their preferred tool (even just a text editor)

### For Full Solution
Implement the **Hybrid Approach (Option 4)**:
1. **Phase 1**: Content binding system (1-2 weeks)
2. **Phase 2**: Google Sheets integration (2-3 weeks)
3. **Phase 3**: Content panel UI (2 weeks)
4. **Future**: CMS adapters as needed

### Why This Approach?
- Starts simple, adds complexity as needed
- Google Sheets is likely already used by content teams
- Doesn't lock into a specific CMS
- Preserves flexibility for different team workflows

---

## Questions to Answer Before Implementation

1. **Current workflow**: How does the content team currently review content?
2. **Approval process**: Is there a formal approval workflow needed?
3. **Localization**: Do you need multi-language support?
4. **Volume**: How many content items per prototype typically?
5. **Real-time needs**: Is live sync important or is manual sync OK?
6. **Access control**: Should content team see the prototype or just content?

---

## References

- [Google Sheets API Documentation](https://developers.google.com/workspace/sheets/api/guides/concepts)
- [Sheet Best - Sheets to API](https://sheetbest.com/)
- [SheetDB - Sheets REST API](https://sheetdb.io/)
- [Sanity Headless CMS](https://www.sanity.io/headless-cms)
- [Contentful](https://www.contentful.com/headless-cms/)
- [Rangle: Design System + CMS Integration](https://rangle.io/blog/integrating-your-design-system-into-your-headless-cms)
- [Figma ContentFlow Plugin](https://www.figma.com/community/plugin/1476000573027190248/contentflow)
- [Frontitude UX Writing Tools](https://www.frontitude.com/blog/best-figma-plugins-for-writers-in-2025)
