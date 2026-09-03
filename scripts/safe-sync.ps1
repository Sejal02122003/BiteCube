param([switch]$ApproveProtectedChanges)

$ErrorActionPreference = 'Stop'
$RepoRoot = Split-Path -Parent $PSScriptRoot
$ProtectedPathPattern = '(^|/)(vite\.config\.(js|cjs|mjs|ts)|package(-lock)?\.json|pnpm-lock\.yaml|yarn\.lock|\.npmrc|ecosystem\.config\.(js|cjs)|nodemon\.json|scripts/|\.husky/)'
$MalwareIndicators = @('A8-3713-1', 'A8-3387', 'Payload-B6', 'x-payload-b64', 'lastSenderTxViaIndexer', 'NONCE_FANOUT')
Set-Location $RepoRoot

& (Join-Path $PSScriptRoot 'git-security-preflight.ps1')
if (-not $?) { exit 1 }
$dirty = git status --porcelain
if ($dirty) { Write-Host '[Safe Sync] Working tree is not clean. Commit or stash your work before syncing.' -ForegroundColor Red; $dirty | ForEach-Object { Write-Host "  $_" -ForegroundColor Yellow }; exit 1 }
$upstream = git rev-parse --abbrev-ref '@{upstream}' 2>$null
if ($LASTEXITCODE -ne 0 -or -not $upstream) { Write-Host '[Safe Sync] No upstream branch is configured.' -ForegroundColor Red; exit 1 }
git fetch --prune
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
$incoming = @(git diff --name-only "HEAD..$upstream")
if ($incoming.Count -eq 0) { Write-Host '[Safe Sync] Already up to date.' -ForegroundColor Green; exit 0 }
$incomingPatch = @(git diff --no-ext-diff "HEAD..$upstream" -- .)
foreach ($indicator in $MalwareIndicators) {
  if ($incomingPatch | Select-String -SimpleMatch -Pattern $indicator -Quiet) { Write-Host "[Safe Sync] Merge blocked: incoming Git changes contain known malicious loader indicator '$indicator'." -ForegroundColor Red; exit 1 }
}
$protected = @($incoming | Where-Object { $_ -match $ProtectedPathPattern })
if ($protected.Count -gt 0 -and -not $ApproveProtectedChanges) { Write-Host '[Safe Sync] Merge blocked because incoming changes touch protected files:' -ForegroundColor Red; $protected | ForEach-Object { Write-Host "  $_" -ForegroundColor Yellow }; Write-Host 'Review the diff, then rerun with -ApproveProtectedChanges to merge.' -ForegroundColor Yellow; exit 1 }
git merge --ff-only $upstream
exit $LASTEXITCODE
