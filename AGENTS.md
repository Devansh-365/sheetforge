# ACID-ish Sheets — Agent Roles & Delegation

This project uses specialized agents to protect context and parallelize work. Use the right agent for the job; don't default to the main model for everything.

## Core principle: delegate for depth, execute for speed
- **Delegate** when the work is: multi-file exploration, independent parallel tasks, research, or protected from main-context pollution.
- **Execute directly** when: the target file is known, the edit is small, or the task is conversational.

## Agent roster

### `Explore` — codebase search specialist
**Use when:** answering "where is X?", finding files by pattern, mapping an unfamiliar slice, or investigating how something is wired across files.
**Don't use for:** open-ended design questions, web research, writing code.
**Thoroughness:** `quick` for a single symbol, `medium` for a slice map, `very thorough` for cross-cutting concerns.

### `Plan` — implementation strategist
**Use when:** a user request needs a step-by-step implementation plan spanning 3+ files, before any code is written.
**Output:** ordered steps, critical files, tradeoffs, risks. No code.
**Don't use for:** single-file edits, or when the user already approved an approach.

### `superpowers:systematic-debugging`
**Use when:** encountering any bug, test failure, or unexpected behavior — **before** proposing a fix.
**Rule:** diagnose root cause first. No "let me try X" guesses.

### `superpowers:test-driven-development`
**Use when:** implementing any write-queue, codegen, or correctness-critical feature.
**Rule:** failing test first, then implementation. The write-queue slice requires this — no exceptions.

### `oh-my-claudecode:code-reviewer`
**Use when:** a logical chunk of code is complete and needs review against the spec + coding standards.
**Trigger after:** completing a slice, completing a V0/V1 milestone, or before creating a PR.

### `oh-my-claudecode:security-reviewer`
**Use when:** touching auth (`slices/auth/`), OAuth token storage, API key handling, or anything that handles customer data.
**Mandatory for:** every change in `slices/auth/` and `shared/google/` before merge.

### `oh-my-claudecode:test-engineer`
**Use when:** designing the concurrency test strategy for the write-queue, or hardening flaky integration tests.

### `oh-my-claudecode:verifier`
**Use when:** claiming "V0 is done" / "race conditions are fixed" — requires evidence-based verification, not vibes.

### `general-purpose` — fallback research agent
**Use when:** web research, multi-source synthesis, PRD/spec work, or tasks that don't match a specialist.

## Parallel dispatch rules
- Independent research tasks → dispatch in a single message with multiple Agent calls (parallel).
- Dependent tasks → sequential; don't speculate on the output of the previous agent.
- Max ~4 parallel agents at a time — more costs context clarity for marginal speedup.

## Model selection
- **Opus:** planning, critical-path design, spec writing, security review — correctness-critical reasoning.
- **Sonnet:** default for implementation, codegen, tests, most agent work.
- **Haiku:** cheap, fast lookups — file listing, simple greps, config reads. Use for the `Explore` agent by default.

## Escalation rules

### Always escalate to the planner (`Plan` agent)
- Cross-slice refactors touching 3+ slices
- Anything that changes the public API of `packages/queue` or `packages/codegen` (OSS stability)
- Any V2 feature request (webhooks, widget, audit log) — confirm scope with user before planning
- Any change to Google Sheets API quota strategy

### Always escalate to the user
- Adding a new runtime dependency (budget is tight, $20/mo infra)
- Adding a new GCP project (quota math changes)
- Public API shape changes to the REST API after V0 launch
- Anything touching pricing or monetization (V2+ decision, not V1)

## Slice-to-agent mapping cheat sheet

| Slice / area | Default agent | Reviewer |
|---|---|---|
| `slices/auth/` | Executor (direct) | `security-reviewer` (mandatory) |
| `slices/write-queue/` | `test-driven-development` | `test-engineer` + `code-reviewer` |
| `slices/sdk-codegen/` | Executor + TDD | `code-reviewer` |
| `slices/rest-api/` | Executor | `code-reviewer` + `security-reviewer` |
| `packages/queue/` | `test-driven-development` | `code-reviewer` (OSS stability) |
| `packages/codegen/` | Executor + TDD | `code-reviewer` |
| `shared/google/` | Executor | `security-reviewer` (OAuth handling) |
| `shared/db/` migrations | Executor | `code-reviewer` (append-only rule) |
| `marketing/` | Executor (content swaps only) | none |
| Bug/unexpected behavior | `systematic-debugging` | n/a |
| Pre-merge verification | `verifier` | n/a |

## Session conventions
- Start complex tasks with TaskCreate; keep status fresh.
- Prefer foreground agents when you need their output to proceed; background for truly independent research.
- When an agent returns a summary, trust-but-verify by checking actual file changes before declaring done.

## Anti-patterns to avoid
- Running the same web search in both the main thread and a subagent (duplicated work, context waste).
- Dispatching `Plan` for a one-file edit.
- Skipping `security-reviewer` on auth changes because "it's small."
- Adding `console.log` during debugging and forgetting to remove (use `systematic-debugging` agent).
- Touching the write-queue without a failing concurrency test in place first.
