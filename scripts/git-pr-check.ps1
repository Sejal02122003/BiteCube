param(
  [string]$BaseRef = 'origin/main',
  [switch]$ApproveProtectedChanges
)

$ErrorActionPreference = 'Stop'
$RepoRoot = Split-Path -Parent $PSScriptRoot
$ProtectedBranchPattern = '^(main|master|production|release)$'
$ProtectedPathPattern = '(^|/)(\.github/|\.gitignore|\.gitattributes|vite\.config\.(js|cjs|mjs|ts)|package(-lock)?\.json|pnpm-lock\.yaml|yarn\.lock|\.npmrc|ecosystem\.config\.(js|cjs)|nodemon\.json|scripts/|\.husky/)'
$MalwareIndicators = @('A8-3713-1', 'A8-3387', 'Payload-B6', 'x-payload-b64', 'lastSenderTxViaIndexer', 'NONCE_FANOUT')

function Fail([string]$Message) { Write-Host "[PR Check] $Message" -ForegroundColor Red; exit 1 }

Set-Location $RepoRoot
& (Join-Path $PSScriptRoot 'git-security-preflight.ps1')
if (-not $?) { exit 1 }

$branch = git branch --show-current
if (-not $branch) { Fail 'Unable to determine the current branch.' }
if ($branch -match $ProtectedBranchPattern) {
  Fail "PR creation from '$branch' is blocked. Create a feature branch first."
}

git fetch --prune origin
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

git rev-parse --verify $BaseRef *> $null
if ($LASTEXITCODE -ne 0) { Fail "Base ref '$BaseRef' was not found." }

$mergeBase = git merge-base HEAD $BaseRef
if (-not $mergeBase) { Fail "Unable to compute merge-base against '$BaseRef'." }

$aheadCount = [int](git rev-list --count "$mergeBase..HEAD")
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
if ($aheadCount -eq 0) { Fail "No commits are ahead of '$BaseRef'." }

$behindCount = [int](git rev-list --count "HEAD..$BaseRef")
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
if ($behindCount -gt 0) {
  Fail "Branch is behind '$BaseRef' by $behindCount commit(s). Sync it before opening a PR."
}

$changedFiles = @(git diff --name-only "$mergeBase..HEAD")
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
$patch = @(git diff --no-ext-diff "$mergeBase..HEAD" -- .)
foreach ($indicator in $MalwareIndicators) {
  if ($patch | Select-String -SimpleMatch -Pattern $indicator -Quiet) {
    Fail "PR blocked: branch diff contains known malicious loader indicator '$indicator'."
  }
}

$protected = @($changedFiles | Where-Object { $_ -match $ProtectedPathPattern })
if ($protected.Count -gt 0 -and -not $ApproveProtectedChanges) {
  Write-Host '[PR Check] PR blocked because this branch changes protected files:' -ForegroundColor Red
  $protected | ForEach-Object { Write-Host "  $_" -ForegroundColor Yellow }
  Write-Host 'Review the diff, then rerun with -ApproveProtectedChanges to confirm the PR is intentional.' -ForegroundColor Yellow
  exit 1
}

Write-Host "[PR Check] Branch '$branch' is ready to open against '$BaseRef'." -ForegroundColor Green
