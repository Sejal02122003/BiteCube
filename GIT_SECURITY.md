# BiteCube Git Security

This repository uses script-based Git protections instead of custom hooks.

## Why

- Custom Git hooks are blocked by design because they are a common malware entry point.
- Sensitive Git and build files require explicit review before pull, push, or PR.
- CI re-runs the same checks on every PR to `main`.

## Local commands

Run these from the repo root:

```powershell
.\scripts\git-security-preflight.ps1
.\scripts\safe-sync.ps1
.\scripts\safe-push.ps1
.\scripts\git-pr-check.ps1
```

## Protected changes

The following areas require an explicit override flag after review:

- `.github/`
- `scripts/`
- `.gitignore`
- package manifests and lockfiles
- Vite, npm, PM2, and nodemon config files

Override flags:

```powershell
.\scripts\safe-sync.ps1 -ApproveProtectedChanges
.\scripts\safe-push.ps1 -ApproveProtectedChanges
.\scripts\git-pr-check.ps1 -ApproveProtectedChanges
```

## Branch rules to enable on GitHub

For `main`, enable:

1. Require a pull request before merging.
2. Require at least 1 approval.
3. Require review from Code Owners.
4. Require status checks to pass.
5. Include `Git Security / preflight` as a required check.
6. Block force pushes.
7. Block branch deletion.

## Recommended flow

```powershell
git checkout -b feature/your-change
.\scripts\git-security-preflight.ps1
git add .
git commit -m "Describe the change"
.\scripts\git-pr-check.ps1
.\scripts\safe-push.ps1 --set-upstream origin feature/your-change
```
