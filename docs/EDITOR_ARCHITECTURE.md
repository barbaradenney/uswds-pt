# Editor Architecture Reference

This document describes the GrapesJS editor architecture, known issues, and their fixes.

## Overview

The USWDS-PT editor uses GrapesJS Studio SDK to provide a visual drag-and-drop interface. The editor must handle two distinct scenarios:

1. **NEW prototypes** - Created from scratch with a blank template
2. **EXISTING prototypes** - Loaded from the database with saved state

## Data Flow

### GrapesJS Project Data Structure

```typescript
interface GrapesProjectData {
  assets?: GrapesAsset[];      // Images, files
  styles?: GrapesStyle[];      // CSS styles
  pages?: GrapesPage[];        // Page definitions with components
  symbols?: unknown[];         // Reusable symbols
  dataSources?: unknown[];     // Data bindings
}

interface GrapesPage {
  id: string;
  name: string;
  frames: [{
    component: {
      type: string;
      components: GrapesComponent[];
    }
  }];
}
```

### Save Flow

1. User clicks Save or autosave triggers
2. `editor.getHtml()` - Gets rendered HTML
3. `editor.getProjectData()` - Gets GrapesJS internal state
4. Both are sent to API and stored in database

### Load Flow

1. API returns `{ htmlContent, grapesData }`
2. Editor calls `editor.loadProjectData(grapesData)`
3. GrapesJS hydrates its internal state from the structured data

## Known Issues (Fixed)

### Issue 1: forEach Error on Initial Save

**Symptom**: "Cannot read properties of undefined (reading 'forEach')" when saving a new prototype.

**Root Cause**: For new prototypes, `editor.getProjectData()` may return data where `pages` is undefined rather than an empty array. Code that iterates over pages without null checking would fail.

**Fix**:
- Added data normalization in `handleSave()` to ensure `pages` is always an array
- Added try/catch around GrapesJS method calls
- Added null checks before iterating

### Issue 2: Pages Disappearing on Switch

**Symptom**: When switching to a different page in a multi-page prototype, the canvas goes blank and content appears to be deleted.

**Root Cause**:
- New prototypes initialize from HTML strings via `project.default`
- Existing prototypes load from structured JSON via `loadProjectData()`
- These create different internal GrapesJS state structures
- Page switching relies on proper page state, which new prototypes don't have

**Fix**:
- Normalize project data structure at save time
- Ensure consistent initialization between new and existing prototypes
- Properly initialize page state for new prototypes

### Issue 3: Multiple Initialization Code Paths

**Symptom**: Race conditions, duplicate loading, inconsistent state.

**Root Cause**: Three separate places could initialize/load project data:
1. `loadPrototype()` function (before render)
2. `onReady()` callback (after render)
3. `project.default` in StudioEditor options

**Fix**:
- Consolidated to single initialization point in `onReady()`
- Clear separation between new vs existing prototype handling
- Removed redundant loading calls

## Architecture After Fixes

### Initialization Flow

```
NEW PROTOTYPE:
1. Editor mounts with no slug
2. onReady() fires
3. GrapesJS initializes with project.default template
4. On first save, data is normalized and stored
5. URL updates to include slug
6. Subsequent saves work with properly structured data

EXISTING PROTOTYPE:
1. Editor mounts with slug
2. loadPrototype() fetches data from API
3. onReady() fires
4. loadProjectData() hydrates GrapesJS state
5. Editor ready for use
```

### Data Normalization

All saves go through normalization to ensure:
- `pages` is always an array (never undefined)
- Each page has required properties (id, name, frames)
- Component structure is valid

### Page Switching

After fixes, page switching:
1. Fires `page:select` event
2. Waits for GrapesJS internal switch to complete
3. Ensures USWDS resources are loaded in the frame
4. Calls `editor.refresh()` once
5. No need for complex re-render hacks

## Key Files

- `packages/editor/src/components/Editor.tsx` - Main editor component
- `packages/editor/src/hooks/useAutosave.ts` - Autosave logic
- `packages/api/src/routes/prototypes.ts` - API endpoints
- `packages/shared/src/types/prototype.ts` - Type definitions

## Debugging

Enable debug mode to see detailed logs:
```javascript
// In browser console
localStorage.setItem('uswds_pt_debug', 'true');
// Or add ?debug=true to URL
```

Debug mode exposes:
- `window.__editor` - GrapesJS editor instance
- `window.__clearCanvas()` - Clear canvas helper
- Console logs prefixed with `[USWDS-PT]`
