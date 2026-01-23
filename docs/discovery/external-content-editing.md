# External Content Editing Integration - Discovery Document

## Overview

This document explores options for integrating external content editing workflows into USWDS-PT. The goal is to enable content teams to manage, review, and revise content through their existing processes while maintaining a clean connection to the prototyping tool.

## Problem Statement

- Content teams have their own revision and approval workflows
- They need to collaborate on content separately from visual design
- Content changes should be easily synced to prototypes
- Need to maintain audit trails and version history for content decisions
- Want to reduce friction between content and design processes

### Key Constraint: Tool Diversity

**Product owners use Excel, contractors use Google Sheets.** This rules out any solution that requires a single spreadsheet platform. We need tool-agnostic approaches that work regardless of which spreadsheet tool team members prefer.

---

## Option 1: Tool-Agnostic Import/Export (Recommended MVP)

### Overview
Build around standard file formats (CSV, JSON) that work with ANY spreadsheet tool—Excel, Google Sheets, LibreOffice, Numbers, etc.

### How It Works

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Excel User     │     │  USWDS-PT       │     │  Sheets User    │
│  (Product Owner)│     │  (Import/Export)│     │  (Contractor)   │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         │  Download CSV         │        Download CSV   │
         │◀──────────────────────┤──────────────────────▶│
         │                       │                       │
         │  Edit in Excel        │      Edit in Sheets   │
         │                       │                       │
         │  Upload CSV           │        Upload CSV     │
         │──────────────────────▶├◀──────────────────────│
         │                       │                       │
         │            Merge & Preview Changes            │
         │                       │                       │
```

### Export/Import Format

**CSV Format** (works everywhere):
```csv
content_id,type,text,context,status,notes,last_modified
hero-title,heading,"Welcome to Our Service","Hero section header",approved,"Per brand guidelines",2025-01-23
cta-button,button,"Get Started","Primary call-to-action",in-review,"Consider 'Begin Now'?",2025-01-22
```

**JSON Format** (for advanced use):
```json
{
  "version": "1.0",
  "prototype": "Homepage Redesign",
  "exported": "2025-01-23T00:00:00Z",
  "content": [
    {
      "id": "hero-title",
      "type": "heading",
      "text": "Welcome to Our Service",
      "context": "Hero section header",
      "status": "approved"
    }
  ]
}
```

### Workflow

1. **Designer** exports content from prototype → downloads CSV
2. **Content team** opens CSV in their preferred tool (Excel or Sheets)
3. **Content team** edits, adds comments in their tool, changes status
4. **Content team** exports CSV and sends back (email, Slack, shared drive)
5. **Designer** imports CSV → sees diff of what changed → applies updates

### Pros
- ✅ Works with Excel, Sheets, or any spreadsheet
- ✅ No API integration needed for MVP
- ✅ Familiar workflow for content teams
- ✅ Files can live on SharePoint, Google Drive, or anywhere
- ✅ Simple to implement

### Cons
- ❌ Manual export/import process
- ❌ No real-time collaboration
- ❌ Risk of version conflicts if multiple people edit

### Implementation Effort
- **MVP**: 1-2 weeks

---

## Option 2: Airtable Integration

### Overview
Airtable is a browser-based database/spreadsheet hybrid that works for everyone—no software installation required. It's designed for exactly this kind of workflow tracking.

### Why Airtable?
- **Tool-neutral**: Web-based, works in any browser
- **Structured workflows**: Built-in status fields, automations
- **Collaboration**: Comments, @mentions, activity history
- **API-first**: Easy integration with USWDS-PT
- **Free tier**: Generous for small teams (1,000 records/base)

### Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Airtable Base  │     │  USWDS-PT API    │     │   Prototype     │
│  (Content Team) │◀───▶│  (Sync Service)  │◀───▶│   (Editor)      │
└─────────────────┘     └──────────────────┘     └─────────────────┘
        │
        │ Kanban view, Calendar view
        │ Comments, @mentions
        │ Status automations
        ▼
┌─────────────────┐
│ Content Workflow│
│ Draft → Review  │
│ → Approved      │
└─────────────────┘
```

### Airtable Base Structure

| Field | Type | Description |
|-------|------|-------------|
| Content ID | Text (Primary) | Maps to data-content-id |
| Prototype | Link | Reference to prototype record |
| Text | Long text | The actual content |
| Type | Single select | heading, paragraph, button, etc. |
| Status | Single select | Draft, In Review, Approved, Published |
| Assignee | Collaborator | Who's responsible |
| Notes | Long text | Comments, context |
| Last Synced | Date | When last synced to prototype |

### Views for Different Workflows

1. **Grid View**: Spreadsheet-like for bulk editing
2. **Kanban View**: Drag cards through Draft → Review → Approved
3. **Calendar View**: See content deadlines
4. **Form View**: Let stakeholders submit content requests

### Pricing
- **Free**: 1,000 records, 1 GB attachments
- **Team**: $20/user/month - 50,000 records
- **Business**: $45/user/month - 125,000 records

### Pros
- ✅ Browser-based (no Excel vs Sheets problem)
- ✅ Built-in workflow features
- ✅ Great API for integration
- ✅ Multiple views (grid, kanban, calendar)
- ✅ Automations included

### Cons
- ❌ Another tool to learn
- ❌ Costs money at scale
- ❌ Requires internet connection

### Implementation Effort
- **Basic integration**: 2-3 weeks
- **Full workflow with automations**: 4-5 weeks

---

## Option 3: Notion Integration

### Overview
Notion is a flexible workspace that combines documents and databases—good for teams that want content editing alongside documentation.

### Why Notion?
- **Document-first**: Rich text editing, not just cells
- **Databases**: Track content with status, assignees
- **Comments**: Inline commenting on any content
- **AI features**: Built-in AI for content suggestions
- **API available**: Can sync with USWDS-PT

### Best For
- Teams that also need documentation/wikis
- Content that requires rich formatting
- Smaller content volumes

### Pricing
- **Free**: Limited blocks
- **Plus**: $10/user/month
- **Business**: $15/user/month
- **Notion AI**: +$10/user/month

### Pros
- ✅ Great for content writing (rich text)
- ✅ Inline comments and discussions
- ✅ Can store related documentation

### Cons
- ❌ Less structured than Airtable for workflows
- ❌ API is more limited
- ❌ Can get messy without discipline

### Implementation Effort
- **Basic integration**: 2-3 weeks

---

## Option 4: Google Sheets Integration (Original Option)

> ⚠️ **Note**: This option has limitations due to the Excel/Sheets split in the team. Consider Options 1-3 instead.

### Overview
Use Google Sheets as a content management layer where content teams can edit, comment, and track revisions.

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

## Options Comparison

| Option | Tool Neutral? | Effort | Real-time? | Cost | Best For |
|--------|---------------|--------|------------|------|----------|
| **1. CSV Import/Export** | ✅ Yes | 1-2 weeks | ❌ No | Free | MVP, any team |
| **2. Airtable** | ✅ Yes (web) | 2-3 weeks | ✅ Yes | $20/user | Workflow tracking |
| **3. Notion** | ✅ Yes (web) | 2-3 weeks | ✅ Yes | $10/user | Content + docs |
| **4. Google Sheets** | ❌ No | 2-3 weeks | ✅ Yes | Free | Sheets-only teams |
| **5. Headless CMS** | ✅ Yes (web) | 4-6 weeks | ✅ Yes | Varies | Enterprise |
| **6. Built-in Panel** | ✅ Yes | 3-4 weeks | N/A | Free | Full control |

---

## Recommendation (Updated)

> **Key Constraint**: Product owners use Excel, contractors use Google Sheets. Any solution must be tool-agnostic.

### For MVP (Quickest Value) - Recommended
Start with **Option 1 (Tool-Agnostic CSV Import/Export)**:
1. Add content binding (`data-content-id`) to components
2. Export content to CSV (works in Excel, Sheets, or any tool)
3. Import CSV with change preview and conflict detection
4. Content team reviews in their preferred spreadsheet tool

**Why**: Fastest to implement, works for everyone, no new tools to learn.

### For Full Solution
If real-time collaboration becomes important, consider:

**Path A: Airtable** (if team is open to a new tool)
- Browser-based, solves Excel/Sheets split
- Built-in workflow features (kanban, status tracking)
- Good API for integration

**Path B: Enhanced CSV + Built-in Panel**
- Keep CSV import/export as foundation
- Add content panel in editor for quick edits
- Add status tracking within USWDS-PT

### Implementation Phases

| Phase | Deliverable | Effort | Solves |
|-------|-------------|--------|--------|
| 1 | Content binding system | 1 week | Foundation for all options |
| 2 | CSV export/import | 1 week | Basic workflow |
| 3 | Change preview & merge | 1 week | Conflict handling |
| 4 | Airtable integration OR Content panel | 2-3 weeks | Real-time/better UX |

### Why This Approach?
- ✅ Solves Excel vs Sheets problem immediately
- ✅ Starts simple, adds complexity only if needed
- ✅ No vendor lock-in
- ✅ Preserves flexibility for different team workflows
- ✅ CSV format is universal and future-proof

---

## Questions to Answer Before Implementation

1. **Current workflow**: How does the content team currently share content changes?
2. **Tool preferences**: Would the team be open to Airtable/Notion, or prefer to stick with Excel/Sheets?
3. **Approval process**: Is there a formal approval workflow (draft → review → approved)?
4. **Volume**: How many content items per prototype typically?
5. **Real-time needs**: Is live sync important or is batch import/export OK?
6. **File sharing**: Where do teams currently share files (SharePoint, Google Drive, email)?

---

## References

- [Airtable vs Notion Comparison](https://zapier.com/blog/airtable-vs-notion/) - Zapier
- [Airtable API Documentation](https://airtable.com/developers/web/api/introduction)
- [Notion API Documentation](https://developers.notion.com/)
- [Sanity Headless CMS](https://www.sanity.io/headless-cms)
- [Contentful](https://www.contentful.com/headless-cms/)
- [Rangle: Design System + CMS Integration](https://rangle.io/blog/integrating-your-design-system-into-your-headless-cms)
- [Papa Parse - CSV Parser for JavaScript](https://www.papaparse.com/)
