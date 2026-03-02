# Bug Review Agent

Automated code review that runs after every commit to catch bugs before they ship.

## How It Works

Two modes:

1. **Auto mode (Hook)** — triggers automatically after every `git commit` Claude makes
2. **Manual mode (Standalone)** — run anytime from terminal using Claude headless mode

### What It Checks

- Logic bugs, off-by-one errors, null/undefined issues
- Missing error handling or uncaught exceptions
- Security issues (injection, XSS, exposed secrets, path traversal)
- Race conditions, deadlocks, async/await issues
- Type mismatches or wrong API contracts (frontend ↔ backend)
- Broken imports or missing dependencies
- Edge cases not handled

## Auto Mode (Hook)

Configured in `.claude/settings.json` as a `PostToolUse` hook on `Bash(git commit*)`.

After Claude commits code:
1. Hook checks which code files changed (`.py`, `.ts`, `.tsx`, `.js`, `.jsx`, `.rs`, `.swift`)
2. Skips review if only docs/config files changed
3. Feeds diff context back to Claude as a "block" signal
4. Claude reads the actual diffs and reviews for bugs before continuing

### Setup

Already configured. To verify:

```bash
cat .claude/settings.json
```

Should show:
```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Bash(git commit*)",
        "hooks": [
          {
            "type": "command",
            "command": ".claude/hooks/bug-review.sh",
            "timeout": 30,
            "statusMessage": "Running bug review on commit..."
          }
        ]
      }
    ]
  }
}
```

### Reload After Changes

If you edit the hook config, reload in Claude Code:
```
/hooks
```
Or restart your Claude Code session.

## Manual / Standalone Mode

Run from terminal anytime — spawns Claude in headless mode with read-only tools.

### Usage

```bash
# Review last commit
.claude/hooks/bug-review-standalone.sh

# Review a specific commit
.claude/hooks/bug-review-standalone.sh abc1234

# Review a range of commits
.claude/hooks/bug-review-standalone.sh HEAD~3..HEAD
```

### Output

Structured review with:
- **Issues Found** — severity (critical/warning/info), file, line, description
- **Related Code Concerns** — issues in files that interact with the changes
- **Verdict** — CLEAN / NEEDS ATTENTION / HAS BUGS

### Requirements

- `claude` CLI must be installed and on your PATH
- Allowed tools are locked to read-only: `git diff`, `git log`, `git show`, `Read`, `Glob`, `Grep`

## Files

| File | Purpose |
|------|---------|
| `.claude/settings.json` | Hook configuration (auto mode) |
| `.claude/hooks/bug-review.sh` | Hook script — parses commit, outputs review context |
| `.claude/hooks/bug-review-standalone.sh` | Standalone script — runs Claude headless for full review |

## Customization

### Skip review for certain commits

The hook already skips commits that only touch non-code files. To skip by commit message (e.g., `docs:` or `chore:` prefixes), edit `.claude/hooks/bug-review.sh`:

```bash
# Add after COMMIT_MSG line:
if echo "$COMMIT_MSG" | grep -qE '^(docs|chore|style):'; then
  exit 0
fi
```

### Change reviewed file types

Edit the `grep -E` pattern in both scripts:

```bash
# Default: Python, TypeScript, JavaScript, Rust, Swift
grep -E '\.(py|ts|tsx|js|jsx|rs|swift)$'

# Add Go and Ruby:
grep -E '\.(py|ts|tsx|js|jsx|rs|swift|go|rb)$'
```

### Adjust review depth

In `bug-review-standalone.sh`, change `--max-turns 15` to allow more or fewer agentic loops.
