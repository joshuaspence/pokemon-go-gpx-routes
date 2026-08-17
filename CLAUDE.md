# CLAUDE.md

- **Give every subtask its own worktree.** A subagent takes `isolation: "worktree"`; a session enters one with
  `EnterWorktree`. Two agents in one checkout collide — they edit the same file at the same time, and a `git add --all`
  from either commits the other's half-finished work. Note that a new worktree branches from `origin/master` unless
  `worktree.baseRef` is `head`, so it will not contain unpushed commits.
- **Commit staged changes.** Staged work is finished work. Stage the paths you touched rather than the whole tree, so a
  commit carries your change and nothing else.
- **Commit to `master`.** Single maintainer, linear history, so work lands on `master` directly. Create a branch only
  when asked for one.
