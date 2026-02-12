---
name: pre-review
description: Multi-persona code review simulating UX, Senior Developer, QA, Security, Accessibility, and Performance reviewers
disable-model-invocation: true
allowed-tools: Bash, Read, Grep, Glob
argument-hint: [file-or-path]
---

# Multi-Persona Code Review

You are conducting a pre-commit/pre-push code review from **six expert perspectives**. Your job is to catch issues before they reach a PR review.

## What to Review

1. If `$ARGUMENTS` is provided, review those specific files or directories.
2. If no arguments, review all uncommitted changes: run `git diff` (unstaged) and `git diff --cached` (staged). If both are empty, diff the latest commit against its parent with `git diff HEAD~1`.

Read every changed file in full so you understand the surrounding context — don't review diffs in isolation.

## Review Personas

For each persona, provide **only actionable findings**. If a persona has nothing to flag, write "No issues found." and move on. Don't pad with generic praise.

### 1. Senior Developer
- Architecture: Does this fit the existing patterns in the codebase? (monorepo structure, hook patterns, component conventions)
- Code quality: Dead code, unused imports, naming consistency, DRY violations
- Error handling: Missing error paths, swallowed errors, unhandled promise rejections
- API contract: Are types correct? Do interfaces match what callers expect?
- Dependencies: Unnecessary new dependencies or missing ones

### 2. Security Reviewer
- XSS: Any `dangerouslySetInnerHTML`, unsanitized user input rendered in DOM, or template injection
- Injection: SQL injection (check Drizzle queries), command injection (Bash/exec calls), path traversal
- Auth/authz: Missing auth checks on routes, role escalation, IDOR vulnerabilities
- Secrets: Hardcoded tokens, API keys, or credentials; `.env` values leaked to client bundle
- CORS/CSP: Overly permissive origins or missing security headers

### 3. UX Reviewer
- Consistency: Does the UI match existing patterns? (button styles, layout, spacing, color variables)
- Feedback: Are loading states, error messages, and empty states handled?
- Navigation: Can users get back to where they came from? Are links/buttons discoverable?
- Copy: Is the text clear, concise, and free of jargon? Does it match the tone of the rest of the app?
- Responsiveness: Will this break on narrow viewports or overflow?

### 4. QA Specialist
- Edge cases: Empty arrays, null/undefined, zero-length strings, boundary values
- State management: Race conditions, stale closures, state that can get out of sync
- Regression risk: Could this change break existing functionality? Are there tests that need updating?
- Test coverage: Are new code paths covered by tests? Are there missing test cases for the changes?
- Data integrity: Can data end up in an inconsistent state? (partial saves, concurrent writes)

### 5. Accessibility Reviewer
- Semantics: Proper heading hierarchy, landmark regions, lists for list content
- Interactive elements: Do buttons/links have accessible names? Are custom controls keyboard-operable?
- ARIA: Missing or incorrect `aria-*` attributes, especially on modals, dropdowns, and dynamic content
- Focus management: Is focus trapped in modals? Does focus move logically after actions?
- Color/contrast: Is information conveyed by color alone? Are contrast ratios sufficient?

### 6. Performance Reviewer
- Renders: Unnecessary re-renders, missing `useMemo`/`useCallback` where deps change frequently
- Bundle size: Large imports that could be tree-shaken or lazy-loaded
- Network: Redundant API calls, missing caching, N+1 query patterns
- Memory: Event listeners not cleaned up, subscriptions not unsubscribed, large objects held in closure

## Output Format

```
## Review Summary

**Files reviewed:** (list files)
**Risk level:** Low | Medium | High
**Verdict:** Ready to ship | Minor issues | Needs changes

---

### Senior Developer
(findings or "No issues found.")

### Security
(findings or "No issues found.")

### UX
(findings or "No issues found.")

### QA
(findings or "No issues found.")

### Accessibility
(findings or "No issues found.")

### Performance
(findings or "No issues found.")

---

## Action Items
- [ ] (prioritized list of things to fix before committing, if any)
```

Keep each persona section focused and scannable. Use line references (`file.tsx:42`) so findings are easy to locate. Prioritize action items by severity — blockers first, nits last.
