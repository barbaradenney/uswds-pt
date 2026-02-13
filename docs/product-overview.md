# USWDS Prototyping Tool — Product Overview

USWDS-PT is a visual drag-and-drop prototyping tool for building government web interfaces using the [U.S. Web Design System](https://designsystem.digital.gov/). Teams design multi-page prototypes in a browser-based editor and export clean, production-ready HTML that developers can drop directly into any codebase.

---

## Visual Editor

A GrapesJS-powered canvas lets designers drag USWDS components onto pages, rearrange them in a layers tree, and edit properties in a sidebar — no code required. The editor includes undo/redo, responsive device previews (desktop/tablet/mobile), keyboard shortcuts, and autosave with a "last saved" timestamp.

## 50+ USWDS Components

The component library covers the full design system: buttons, form controls, navigation (header, footer, breadcrumb, side-nav), data display (cards, tables, tags, collections), feedback (alerts, modals, tooltips), layout (accordions, step indicators, process lists), and grid helpers. Six **form pattern** components (name, address, phone, email, date-of-birth, SSN) encode VA.gov best practices as single drag-and-drop elements.

## Multi-Page Prototypes

Prototypes can contain multiple pages with in-editor navigation. A step indicator tracks progress across form flows, and Back/Continue buttons link pages together — all wired up automatically.

## Starter Templates

Four starter templates accelerate new prototypes: **Signed In** (authenticated header), **Signed Out** (public header), **Form** (minimal chrome with form area), and **Blank** (empty canvas). Five built-in page templates (landing, form, sign-in, error, blank) and six responsive grid layouts are available from the components panel.

## Prototype States & User Personas

Teams define **states** (e.g., "Error", "Loading", "Success") and **user personas** (e.g., "Admin", "Guest") at the organization level. Components are tagged to one or more states and users; switching the active state or persona in the editor, preview, or exported HTML shows only the relevant content — enabling a single prototype to demonstrate multiple scenarios.

## AI Copilot

An optional AI assistant (powered by Claude or OpenAI) lets users describe what they want in plain English — "add a contact form", "convert this PDF into a multi-step form" — and generates the corresponding USWDS components. The AI understands all available components, VA.gov form patterns, and multi-page layouts. Users can attach PDFs or images for the AI to convert.

## Preview & Export

**Preview** opens a live, sandboxed view with state and user-persona switchers. **Export** produces clean HTML (all editor artifacts removed) with USWDS CDN links included — ready for developer handoff via download or clipboard copy.

## GitHub Integration

Prototypes can be connected to a GitHub repository. Changes auto-push on save, with branch mapping (each prototype branch maps to a `uswds-pt/` prefixed git branch). A dedicated "handoff push" sends clean exported HTML to a separate repo or branch for developer pickup.

## Team Collaboration

Organizations contain teams; team members share prototypes with role-based permissions (org admin, team admin, member). Invitations are sent by email. Organization-level settings (states, personas) cascade to all teams.

## Version History & Branching

Every save creates a version snapshot. Teams can browse the full history, restore any prior version, and add labels. Prototype branches let designers explore alternatives without affecting the main version.

## Crash Recovery & Reliability

The editor writes recovery snapshots to IndexedDB every 3 seconds. If the browser crashes or the tab closes unexpectedly, a recovery banner offers to restore unsaved work on next load. Stale snapshots are auto-cleaned after 7 days.

## Authentication

Users sign up with email/password or **Sign in with GitHub** (OAuth). GitHub tokens are AES-256-GCM encrypted at rest. Rate limiting protects login and registration endpoints.

## Demo Mode

A no-login demo mode stores prototypes in the browser's localStorage, giving stakeholders a frictionless way to try the tool before their organization sets up accounts.

---

**Tech stack:** React + GrapesJS (editor), Fastify + PostgreSQL (API), pnpm monorepo with Turborepo. Outputs framework-agnostic Web Components — compatible with any frontend stack.
