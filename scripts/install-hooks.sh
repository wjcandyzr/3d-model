#!/usr/bin/env bash
# Optional: push to GitHub automatically after every commit on main, which triggers the deploy.
# Run once per clone:  bash scripts/install-hooks.sh
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
cat > .git/hooks/post-commit <<'HOOK'
#!/usr/bin/env bash
# installed by scripts/install-hooks.sh
[ "$(git rev-parse --abbrev-ref HEAD)" = "main" ] || exit 0
echo "post-commit: pushing main to GitHub (this starts the deploy)…"
git push --quiet origin main || echo "post-commit: push failed, run 'git push' by hand"
HOOK
chmod +x .git/hooks/post-commit
echo "installed .git/hooks/post-commit"
