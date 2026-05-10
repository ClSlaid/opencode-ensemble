# Roadmap

OpenCode Ensemble is evolving from concurrent coding agents into a delivery
runtime for agentic software teams.

The goal is simple: give a developer one place to ask for meaningful work,
watch a real agent team execute it, and receive a reviewed, verified,
merge-ready result.

## Product Bet

Raw parallelism is not enough. Agents need a delivery protocol: clear intent,
scoped plans, isolated work, review gates, verification evidence, and a final
report.

Ensemble should make that protocol persistent, visible, recoverable, and fast.

## Delivery Methodology

The delivery loop is disciplined by default:

1. Understand the request before coding.
2. Turn intent into a concise spec.
3. Break the spec into task contracts.
4. Staff the run with clear roles.
5. Isolate implementation work in worktrees.
6. Review for spec compliance before code quality.
7. Verify with real commands before claiming success.
8. End with a shipping report.

The magic is not that agents run at the same time. The magic is that the team
keeps moving through a shared, inspectable delivery process.

## First Pass

The first implementation should be ambitious but narrow.

- Start a run from one feature goal.
- Record the spec, plan, staffing, task contracts, review findings,
  verification output, and shipping report.
- Use the existing team tools as the execution engine.
- Keep the lead's active tool surface small and phase-relevant.
- Keep approval gates explicit for spec, plan, risky changes, and merge.
- Optimize for a merge-ready diff with evidence, not silent autopilot.

## Delivery Run

A Delivery Run is the core future workflow:

1. Intake
2. Spec
3. Plan
4. Staffing
5. Implementation
6. Review
7. Verification
8. Merge
9. Shipping report

The first target is feature delivery. The same runtime should later support
debugging, codebase analysis, migrations, audits, and research.

## Milestones

### M0: No Lost Work

Make teammate lifecycle management a deep module.

- Centralize branch preservation, abort, shutdown, cleanup, and merge behavior.
- Make "never lose teammate work" enforceable by design.
- Improve lifecycle tests around every abort and cleanup path.

### M1: Delivery Run Backbone

Add the persistent model for full-feature runs.

- Track run phase, goal, owner, status, blockers, artifacts, and verification state.
- Show runs in the dashboard.
- Preserve run context across compaction and recovery.

### M2: Planner To Team

Turn a feature request into a staffed execution plan.

- Produce a concise spec.
- Break work into task contracts.
- Assign planner, builder, QA, and reviewer roles.
- Keep humans in control at approval gates.

### M3: Review Gates

Make quality checks part of the runtime.

- Add spec-compliance review.
- Add code-quality review.
- Require unresolved review findings to block completion.
- Record review evidence as run artifacts.

### M4: Verification And Shipping Report

End every feature run with evidence.

- Run configured verification commands.
- Summarize changed files, commits, tests, reviews, blockers, and residual risks.
- Return a merge-ready or PR-ready result.

### M5: Beyond Features

Extend Delivery Runs beyond feature work.

- Debugging runs.
- Codebase analysis runs.
- Migration runs.
- Audit runs.
- Research runs.

## Principle

Ensemble should feel less like spawning agents and more like running a focused
software team.
