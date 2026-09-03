param(
  [switch]$AllowProtectedBranch,
  [switch]$ApproveProtectedChanges,
  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]]$PushArgs
)

$ErrorActionPreference = 'Stop'
$RepoRoot = Split-Path -Parent $PSScriptRoot
$ProtectedBranchPattern = '^(main|master|production|release)$'
$ProtectedPathPattern = '(^|/)(\.github/|\.gitignore|\.gitattributes|vite\.config\.(js|cjs|mjs|ts)|package(-lock)?\.json|pnpm-lock\.yaml|yarn\.lock|\.npmrc|ecosystem\.config\.(js|cjs)|nodemon\.json|scripts/|\.husky/)'
$MalwareIndicators = @('A8-3713-1', 'A8-3387', 'Payload-B6', 'x-payload-b64', 'lastSenderTxViaIndexer', 'NONCE_FANOUT')

function Fail([string]$Message) { Write-Host "[Safe Push] $Message" -ForegroundColor Red; exit 1 }

Set-Location $RepoRoot
& (Join-Path $PSScriptRoot 'git-security-preflight.ps1')
if (-not $?) { exit 1 }

$branch = git branch --show-current
if (-not $branch) { Fail 'Unable to determine the current branch.' }
if ($branch -match $ProtectedBranchPattern -and -not $AllowProtectedBranch) {
  Fail "Direct pushes from '$branch' are blocked. Open a feature branch or rerun with -AllowProtectedBranch after review."
}

$dirty = @(git status --porcelain)
if ($dirty.Count -gt 0) {
  Write-Host '[Safe Push] Working tree is not clean. Commit or stash before pushing.' -ForegroundColor Red
  $dirty | ForEach-Object { Write-Host "  $_" -ForegroundColor Yellow }
  exit 1
}

git fetch --prune origin
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

$upstream = git rev-parse --abbrev-ref '@{upstream}' 2>$null
if ($LASTEXITCODE -ne 0 -or -not $upstream) {
  $candidateUpstream = "origin/$branch"
  git show-ref --verify --quiet "refs/remotes/$candidateUpstream"
  if ($LASTEXITCODE -eq 0) {
    $upstream = $candidateUpstream
  }
}
if (-not $upstream) { Fail 'No upstream branch is configured for this branch.' }

$behindCount = [int](git rev-list --count "HEAD..$upstream")
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
if ($behindCount -gt 0) {
  Fail "Your branch is behind $upstream by $behindCount commit(s). Run scripts\\safe-sync.ps1 first."
}

$outgoing = @(git diff --name-only "$upstream..HEAD")
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
if ($outgoing.Count -eq 0) {
  Write-Host "[Safe Push] No outgoing commits relative to $upstream." -ForegroundColor Yellow
  exit 0
}

$outgoingPatch = @(git diff --no-ext-diff "$upstream..HEAD" -- .)
foreach ($indicator in $MalwareIndicators) {
  if ($outgoingPatch | Select-String -SimpleMatch -Pattern $indicator -Quiet) {
    Fail "Push blocked: outgoing commits contain known malicious loader indicator '$indicator'."
  }
}

$protected = @($outgoing | Where-Object { $_ -match $ProtectedPathPattern })
if ($protected.Count -gt 0 -and -not $ApproveProtectedChanges) {
  Write-Host '[Safe Push] Push blocked because outgoing commits touch protected files:' -ForegroundColor Red
  $protected | ForEach-Object { Write-Host "  $_" -ForegroundColor Yellow }
  Write-Host 'Review the diff, then rerun with -ApproveProtectedChanges to push.' -ForegroundColor Yellow
  exit 1
}

if ($PushArgs.Count -gt 0) {
  git push @PushArgs
}
else {
  git push
}
exit $LASTEXITCODE
