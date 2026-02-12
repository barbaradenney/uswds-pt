---
name: repo-audit
description: Full-repo quality audit from 5 professional perspectives — Senior Dev, QA, Security, Performance, and AI Readability
disable-model-invocation: true
allowed-tools: Bash, Read, Grep, Glob, Task, WebSearch
argument-hint: [package-or-path] (default: entire repo)
---

# Full Repository Audit

You are conducting a **comprehensive quality audit** of the entire repository (or a specified package/path) from five professional perspectives. This is not a diff review — it's a deep health check of the codebase as it stands today.

## Scope

1. If `$ARGUMENTS` is provided, scope the audit to that package or path (e.g., `packages/editor`, `packages/api`).
2. If no arguments, audit the full monorepo. Start with the high-level structure, then drill into each package.

**Approach:** Use Glob and Grep to survey the codebase systematically. Read key files in full. Don't try to read every file — focus on architectural hotspots, public APIs, complex logic, and anything that smells off. Use the Task tool to run parallel investigations when auditing different packages or dimensions.

## Audit Personas

Run each persona as a thorough, independent review. For each one, produce **specific findings with file paths and line numbers**. If a persona finds nothing, write "No issues found." and move on.

---

### 1. Senior Developer — Architecture & Code Quality

Act as a principal engineer doing a codebase health review. Focus on:

**Architecture**
- Does the monorepo structure make sense? Are package boundaries clean?
- Are there circular dependencies between packages?
- Is the dependency graph correct? (shared has no deps, adapter depends on shared, editor depends on adapter+shared, api depends on shared)
- Are barrel exports (`index.ts`) consistent and complete?

**Code Quality**
- Dead code: unused exports, unreachable branches, commented-out code, unused dependencies in `package.json`
- Naming consistency: Do files, functions, variables follow a consistent convention?
- DRY violations: Is the same logic duplicated in multiple places? (3+ occurrences = extract)
- Error handling: Swallowed errors, missing `.catch()` on promises, empty catch blocks
- Type safety: Loose `any` types that could be tightened, missing return types on public functions

**Patterns & Conventions**
- Do all hooks follow the `use*` naming pattern with consistent structure?
- Do all component files follow the same layout? (imports, types, component, exports)
- Are GrapesJS component registrations consistent across the adapter package?
- Is state management consistent? (hooks vs context vs props)

**Dependencies**
- Are there outdated or vulnerable dependencies? (`pnpm audit` findings)
- Are there unnecessary dependencies that could be removed?
- Are peer dependency requirements satisfied?

---

### 2. QA Specialist — Testing & Reliability

Act as a QA lead assessing test health and identifying reliability risks. Focus on:

**Test Coverage**
- Which files/modules have tests? Which are missing tests entirely?
- Are critical paths covered? (auth flows, save/load, data persistence, export)
- Are edge cases tested? (empty data, null/undefined, boundary values, concurrent operations)
- Is there integration test coverage between packages?

**Test Quality**
- Are tests actually testing behavior, or just testing implementation details?
- Are there flaky patterns? (timing-dependent assertions, uncontrolled async, global state leakage)
- Are mocks appropriate? (over-mocking hides real bugs; under-mocking makes tests slow/flaky)
- Do test descriptions clearly describe what's being tested?

**Reliability Risks**
- Race conditions: concurrent saves, rapid page switches, network failures during operations
- State consistency: Can the app get into an invalid state? Are state machines complete?
- Data integrity: Can partial failures leave data in an inconsistent state?
- Error recovery: What happens when things fail? Does the user see a helpful message or a white screen?
- Browser compatibility: Are there APIs used that aren't universally supported?

**Regression Risk Areas**
- Which areas of the code are most fragile? (high coupling, lots of side effects, complex state)
- Are there known workarounds or hacks that could break if surrounding code changes?

---

### 3. Security Reviewer — Vulnerabilities & Hardening

Act as a security engineer doing a threat assessment. Focus on:

**Input Validation & Injection**
- XSS: Any unsanitized user content rendered in DOM? Check `dangerouslySetInnerHTML`, template literals in HTML, innerHTML assignments
- SQL injection: Are all Drizzle queries parameterized? Any raw SQL?
- Command injection: Any shell execution with user input?
- Path traversal: Can users influence file paths?
- HTML injection in exported documents: Is exported HTML properly escaped?

**Authentication & Authorization**
- Are all API routes that should be protected actually checking auth?
- Are there any IDOR vulnerabilities? (Can user A access user B's prototypes by guessing IDs?)
- Is JWT implementation correct? (expiry, algorithm, secret strength)
- Are there privilege escalation paths? (team member → admin, read → write)

**Data Protection**
- Are secrets properly managed? (no hardcoded tokens, .env files in .gitignore)
- Is sensitive data encrypted at rest and in transit?
- Are CORS headers properly restrictive?
- Is the CSP (Content Security Policy) configured?
- Are database credentials, API keys, or tokens ever logged or leaked in error messages?

**Dependency Security**
- Are there known CVEs in current dependencies?
- Are there dependencies with excessive permissions or suspicious behavior?
- Is the supply chain protected? (lockfile integrity, registry configuration)

**Infrastructure**
- Docker configuration security (running as root? exposed ports?)
- Render deployment security (environment variable handling, build secrets)
- Database connection security (SSL, connection pooling, timeouts)

---

### 4. Performance Reviewer — Speed & Efficiency

Act as a performance engineer identifying bottlenecks and optimization opportunities. Focus on:

**Frontend Performance**
- Bundle size: Are there large dependencies that could be lazy-loaded or tree-shaken?
- Re-renders: Are there components that re-render unnecessarily? (missing memo, unstable references, context over-subscription)
- Initial load: What's on the critical path? Could anything be deferred?
- Canvas performance: Is the GrapesJS editor responsive with many components?
- Memory leaks: Event listeners not cleaned up, subscriptions not unsubscribed, refs holding stale data

**API Performance**
- N+1 queries: Are there database queries in loops?
- Missing indexes: Are frequently queried columns indexed?
- Response payload size: Are API responses returning more data than needed?
- Caching: Are there opportunities for caching that aren't being used?
- Connection pooling: Is the database connection pool configured appropriately?

**Build & Dev Performance**
- Build times: Are there build-time bottlenecks? (large files, unnecessary transforms)
- Dev server startup: Is hot reload fast?
- Test execution: Are tests running efficiently? (parallel where possible, fast setup/teardown)

**Network**
- CDN usage: Are static assets served from CDN? Are there cache headers?
- API call patterns: Are there redundant calls? Could calls be batched or deduplicated?
- Payload optimization: Are large payloads compressed? Is grapesData bloated?

---

### 5. AI Readability Reviewer — Agent Efficiency

Act as an AI tools engineer assessing how efficiently an AI agent can work with this codebase. Focus on:

**Discoverability**
- Can an AI find the right file for a given concept with a single glob or grep?
- Are file names descriptive enough to understand purpose without reading?
- Are important functions exported with searchable names?

**Comprehensibility**
- Can an AI understand a file without reading 5 other files first?
- Are there non-obvious decisions that lack "why" comments?
- Are types explicit enough that an AI can understand interfaces without tracing calls?
- Are magic numbers/strings explained or named as constants?

**Modification Safety**
- Can an AI make a change confidently? Are there hidden side effects?
- Are there implicit contracts between files? (CSS class names, event names, localStorage keys)
- Is there a clear test to run after making changes in each area?

**Documentation Currency**
- Is CLAUDE.md accurate? Does it reflect the current state of the codebase?
- Is MEMORY.md up to date? Are there new patterns or decisions that should be recorded?
- Are there stale TODOs, outdated comments, or misleading documentation?

**Context Efficiency**
- Are there large files (>400 lines) that could be split for more efficient AI context use?
- Is there dead code wasting context-window tokens?
- Are barrel exports clean? (no re-exporting unused items)

---

## Output Format

Structure the output as follows:

```
# Repository Audit Report

**Scope:** (what was audited)
**Date:** (current date)
**Overall Health:** Excellent | Good | Fair | Needs Attention | Critical

## Executive Summary
(2-3 sentences: overall state of the codebase and the most important findings)

---

## 1. Senior Developer — Architecture & Code Quality
**Rating:** A | B | C | D | F

### Findings
(numbered list of specific findings with file:line references)

### Strengths
(1-2 things done well, if notable)

---

## 2. QA Specialist — Testing & Reliability
**Rating:** A | B | C | D | F

### Findings
(numbered list)

### Strengths
(1-2 things done well)

---

## 3. Security Reviewer — Vulnerabilities & Hardening
**Rating:** A | B | C | D | F
**Critical Issues:** (count, if any)

### Findings
(numbered list, severity tagged: [CRITICAL] [HIGH] [MEDIUM] [LOW])

### Strengths
(1-2 things done well)

---

## 4. Performance Reviewer — Speed & Efficiency
**Rating:** A | B | C | D | F

### Findings
(numbered list)

### Strengths
(1-2 things done well)

---

## 5. AI Readability — Agent Efficiency
**Rating:** A | B | C | D | F

### Findings
(numbered list)

### Documentation Updates Needed
- [ ] CLAUDE.md: (specific changes)
- [ ] MEMORY.md: (specific changes)

---

## Priority Action Items

### Critical (fix now)
- [ ] (items, if any)

### High (fix soon)
- [ ] (items)

### Medium (plan for)
- [ ] (items)

### Low (nice to have)
- [ ] (items)
```

## Guidelines

- **Be specific.** Every finding must include a file path and line number (or line range).
- **Be actionable.** Don't just identify problems — briefly suggest the fix or approach.
- **Be honest.** If something is good, say so briefly. If something is bad, say so directly.
- **Prioritize ruthlessly.** A 50-item list of nits is less useful than 10 high-impact findings.
- **No filler.** If a persona has nothing to flag, say "No issues found" and move on.
- **Use the Task tool** to run parallel investigations across packages for efficiency.
