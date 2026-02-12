---
name: ai-friendly
description: Audit code for AI-agent readability and suggest improvements that make the repo efficient for future AI sessions
disable-model-invocation: true
allowed-tools: Bash, Read, Grep, Glob
argument-hint: [file-or-path]
---

# AI-Friendly Code Audit

You are auditing code to ensure it is **optimized for AI agent consumption** — meaning future Claude Code sessions (and other AI tools) can understand, navigate, and modify this codebase efficiently with minimal context-gathering overhead.

## What to Audit

1. If `$ARGUMENTS` is provided, audit those specific files or directories.
2. If no arguments, audit all uncommitted changes: run `git diff` (unstaged) and `git diff --cached` (staged). If both are empty, diff the latest commit against its parent with `git diff HEAD~1`.

Read every changed file in full to understand context.

## Audit Dimensions

### 1. Naming & Discoverability
- **File names** — Do they clearly describe what's inside? Can an agent find the right file with a single glob?
- **Function/variable names** — Are they self-documenting? Avoid abbreviations, acronyms, or overloaded names
- **Exports** — Are public APIs exported with clear names? Can an agent grep for a concept and find it?
- **Directory structure** — Does the folder layout match the mental model? Are related files co-located?

### 2. Code Navigability
- **Single responsibility** — Does each file/function do one thing? Large files (>300 lines) are harder for AI to reason about
- **Barrel exports** — Are `index.ts` files present where needed? Do they re-export cleanly?
- **Circular dependencies** — These confuse AI agents trying to trace imports
- **Consistent patterns** — Does new code follow the same patterns as existing code? (e.g., hook naming, component structure, API route conventions)

### 3. Context Clues for AI
- **CLAUDE.md accuracy** — Do the changes affect anything documented in CLAUDE.md? If so, flag what needs updating
- **Non-obvious "why" comments** — Complex business logic, workarounds, or counterintuitive decisions should have a brief comment explaining *why*, not *what*
- **Type annotations** — Are function signatures, props interfaces, and return types explicit? Implicit `any` or loose types force AI to trace through call sites
- **Magic values** — Are there hardcoded strings, numbers, or config that should be named constants?

### 4. Testability & Verifiability
- **Deterministic behavior** — Can an AI agent run tests to verify its changes? Are tests reliable (no flaky timing, no external deps)?
- **Test co-location** — Are tests next to the code they test? Can an agent find the test for a given file?
- **Mocking surface** — Are dependencies injectable? Can an AI agent write a test without complex setup?

### 5. Maintenance Signals
- **Dead code** — Unused imports, unreachable branches, commented-out code — these waste AI context window tokens
- **Duplicated logic** — If the same pattern appears 3+ times, it should be extracted (AI agents may modify one copy and miss the others)
- **Stale TODOs** — `// TODO` comments that reference completed work or outdated plans
- **Implicit coupling** — Are there hidden dependencies between files that aren't expressed through imports? (e.g., relying on CSS class names defined elsewhere, global state mutations)

### 6. Documentation Hooks
- **Memory file updates** — Should any patterns, decisions, or file paths be recorded in the project memory (`MEMORY.md` or topic files)?
- **CLAUDE.md updates** — Do the changes add new commands, env vars, architecture patterns, or conventions that should be documented?
- **Inline references** — When a file implements something described in docs, a brief reference helps AI agents connect the dots

## Output Format

```
## AI-Friendly Audit

**Files audited:** (list files)
**AI Readability Score:** A | B | C | D
  - A = Excellent — an AI agent can understand and modify this with minimal exploration
  - B = Good — minor improvements would help
  - C = Fair — several areas need attention for efficient AI interaction
  - D = Poor — significant refactoring needed for AI readability

---

### Naming & Discoverability
(findings or "All clear.")

### Code Navigability
(findings or "All clear.")

### Context Clues
(findings or "All clear.")

### Testability
(findings or "All clear.")

### Maintenance Signals
(findings or "All clear.")

### Documentation Updates Needed
- [ ] CLAUDE.md: (what to add/change, if anything)
- [ ] MEMORY.md: (what to add/change, if anything)
- [ ] Inline: (what comments to add, if any)

---

## Recommendations
1. (prioritized list of improvements, most impactful first)
```

Be specific with file paths and line numbers. Focus on **actionable** improvements — don't flag things that are already good just to fill space. Prioritize changes that save the most AI context-window tokens or reduce the most exploration steps.
