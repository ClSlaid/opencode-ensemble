import type { Database } from "bun:sqlite"
import { log } from "../log"

/** Result of merging a single branch. */
export interface MergeResult {
  ok: boolean
  error?: string
}

/** Injectable function for testing. */
export type MergeBranchFn = (branch: string, cwd: string) => Promise<MergeResult>

/** Injectable function for overlap detection before merge. */
export type OverlapCheckFn = (branch: string, cwd: string) => Promise<string[]>

/** Injectable function for preserving a branch before worktree deletion. */
export type PreserveBranchFn = (sourceBranch: string, targetBranch: string, cwd: string) => Promise<boolean>

/** Injectable function for deleting a branch. */
export type DeleteBranchFn = (branch: string, cwd: string) => Promise<boolean>

/** Human-readable resource identity for a team. */
export interface TeamResourceParts {
  projectName: string
  teamName: string
  teamId: string
}

function shortTeamId(teamId: string): string {
  return (teamId.split("_").at(-1) || teamId).slice(0, 6)
}

function resourcePart(value: string): string {
  const part = value.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "")
  return part || "unnamed"
}

/** Load the human-readable pieces used to build team resource names. */
export function getTeamResourceParts(db: Database, teamId: string): TeamResourceParts {
  const row = db.query(
    `SELECT t.id as team_id, t.name as team_name, p.name as project_name
     FROM team t
     JOIN project p ON t.project_id = p.id
     WHERE t.id = ?`
  ).get(teamId) as { team_id: string; team_name: string; project_name: string } | null
  if (!row) throw new Error(`Team not found: ${teamId}`)
  return { projectName: row.project_name, teamName: row.team_name, teamId: row.team_id }
}

/** Build the readable namespace used for team-owned resources. */
export function teamResourceSlug(projectName: string, teamName: string, teamId: string): string {
  return `${resourcePart(projectName)}-${resourcePart(teamName)}#${shortTeamId(teamId)}`
}

/** Build the team-only resource segment used under project-scoped namespaces. */
export function teamResourceSegment(teamName: string, teamId: string): string {
  return `${resourcePart(teamName)}#${shortTeamId(teamId)}`
}

/** Build an OpenCode worktree name for a team member. */
export function teamWorktreeName(projectName: string, teamName: string, teamId: string, memberName: string): string {
  return `ensemble-${teamResourceSlug(projectName, teamName, teamId)}-${memberName}`
}

/**
 * Copy a git branch to a new ref. Used to preserve worktree branches
 * before session.abort() which may delete the worktree and its branch.
 * Returns true if the branch was successfully copied.
 */
export async function preserveBranch(sourceBranch: string, targetBranch: string, cwd: string): Promise<boolean> {
  const proc = Bun.spawn(["git", "branch", targetBranch, sourceBranch], { cwd, stdout: "pipe", stderr: "pipe" })
  const exit = await proc.exited
  if (exit !== 0) {
    const stderr = await new Response(proc.stderr).text()
    log(`merge-helper:preserve:failed src=${sourceBranch} target=${targetBranch} err=${stderr.trim()}`)
    return false
  }
  return true
}

/**
 * Delete a git branch. Returns true if successful.
 */
export async function deleteBranch(branch: string, cwd: string): Promise<boolean> {
  const proc = Bun.spawn(["git", "branch", "-D", branch], { cwd, stdout: "pipe", stderr: "pipe" })
  const exit = await proc.exited
  if (exit !== 0) {
    log(`merge-helper:delete:failed branch=${branch}`)
    return false
  }
  return true
}

/**
 * Raw squash merge of a single branch. No stash/pop — caller handles that.
 * Used by mergeBranch (single) and mergeMultipleBranches (batch).
 */
export async function mergeBranchRaw(branch: string, cwd: string): Promise<MergeResult> {
  const merge = Bun.spawn(["git", "merge", "--squash", branch], { cwd, stdout: "pipe", stderr: "pipe" })
  const stderrPromise = new Response(merge.stderr).text()
  const mergeExit = await merge.exited

  if (mergeExit !== 0) {
    const stderr = await stderrPromise
    log(`merge-helper:merge:conflict branch=${branch} err=${stderr.trim()}`)
    const abort = Bun.spawn(["git", "merge", "--abort"], { cwd, stdout: "pipe", stderr: "pipe" })
    await abort.exited
    return { ok: false, error: stderr.trim() || `merge exited with code ${mergeExit}` }
  }

  return { ok: true }
}

/** Unstage all changes so merge results appear as unstaged. */
export async function gitReset(cwd: string): Promise<void> {
  const reset = Bun.spawn(["git", "reset", "HEAD"], { cwd, stdout: "pipe", stderr: "pipe" })
  await reset.exited
}

/**
 * Squash merge a branch into the working directory as unstaged changes.
 * No stashing — existing unstaged changes from previous merges are preserved.
 * If the merge conflicts, the lead resolves it with git.
 */
export async function mergeBranch(branch: string, cwd: string): Promise<MergeResult> {
  const result = await mergeBranchRaw(branch, cwd)
  if (!result.ok) return result
  await gitReset(cwd)
  return { ok: true }
}

/**
 * Detect files that both the lead (local changes) and the agent (branch) modified.
 * Returns the list of overlapping file paths, or empty if safe to merge.
 */
export async function getOverlappingFiles(branch: string, cwd: string): Promise<string[]> {
  const run = async (args: string[]) => {
    const proc = Bun.spawn(["git", ...args], { cwd, stdout: "pipe", stderr: "pipe" })
    const out = await new Response(proc.stdout).text()
    const exit = await proc.exited
    if (exit !== 0) throw new Error(`git ${args.join(" ")} failed with exit code ${exit}`)
    return out.split("\n").filter(Boolean)
  }
  const agentFiles = new Set(await run(["diff", "--name-only", "HEAD", branch]))
  const localChanged = await run(["diff", "--name-only", "HEAD"])
  const localUntracked = await run(["ls-files", "--others", "--exclude-standard"])
  const localFiles = [...new Set([...localChanged, ...localUntracked])]
  return localFiles.filter(f => agentFiles.has(f))
}

/**
 * Build the preserved branch name for a team member.
 */
export function preservedBranchName(projectName: string, teamName: string, teamId: string, memberName: string): string {
  return `ensemble/preserved/${resourcePart(projectName)}/${teamResourceSegment(teamName, teamId)}/${resourcePart(memberName)}`
}
