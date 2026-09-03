$ErrorActionPreference = 'Stop'
$RepoRoot = Split-Path -Parent $PSScriptRoot
$LifecycleScriptNames = @('preinstall', 'install', 'postinstall', 'prepublish', 'prepublishOnly', 'prepare', 'prestart', 'poststart', 'predev', 'postdev', 'prepack', 'postpack')
$ForbiddenCommandPatterns = @(
  '(?i)(replace_colors|replace_ordersmain_colors|replace_remaining_colors|modernize(_v[2-4])?|trim_data)\.(js|cjs)',
  '(?i)invoke-expression', '(?i)downloadstring', '(?i)frombase64string', '(?i)encodedcommand', '(?i)executionpolicy\s+bypass'
)
$MalwareIndicators = @('A8-3713-1', 'A8-3387', 'Payload-B6', 'x-payload-b64', 'lastSenderTxViaIndexer', 'NONCE_FANOUT')

function Fail([string]$Message) { Write-Host "[Git Security] $Message" -ForegroundColor Red; exit 1 }

function Assert-NoCustomGitHooks {
  $configuredPath = git config --get core.hooksPath 2>$null
  if ($LASTEXITCODE -eq 0 -and $configuredPath) { Fail "Custom Git hooks path is configured: $configuredPath" }
  $activeHooks = Get-ChildItem -LiteralPath (Join-Path $RepoRoot '.git\hooks') -File -ErrorAction SilentlyContinue | Where-Object { $_.Name -notlike '*.sample' }
  if ($activeHooks) { Fail "Active Git hook(s) found: $($activeHooks.Name -join ', ')." }
}

function Assert-SafePackageScripts {
  if (-not (Get-Command rg -ErrorAction SilentlyContinue)) { Fail 'ripgrep (rg) is required but is not installed.' }
  $manifests = @(& rg --files --hidden -g package.json -g '!node_modules/**' -g '!.git/**' $RepoRoot | ForEach-Object { Get-Item -LiteralPath $_ })
  foreach ($manifest in $manifests) {
    $package = Get-Content -LiteralPath $manifest.FullName -Raw | ConvertFrom-Json
    if (-not $package.scripts) { continue }
    foreach ($property in $package.scripts.PSObject.Properties) {
      if ($LifecycleScriptNames -contains $property.Name) { Fail "Lifecycle script '$($property.Name)' is not permitted in $($manifest.FullName)." }
      foreach ($pattern in $ForbiddenCommandPatterns) {
        if ([string]$property.Value -match $pattern) { Fail "Unsafe command in $($manifest.FullName): script '$($property.Name)'." }
      }
    }
  }
}

function Assert-NoKnownLoaderIndicators {
  if (-not (Get-Command rg -ErrorAction SilentlyContinue)) { Fail 'ripgrep (rg) is required but is not installed.' }
  $rgArguments = @('--hidden', '--files-with-matches', '--fixed-strings', '--glob', '*.js', '--glob', '*.cjs', '--glob', '*.mjs', '--glob', '*.ts', '--glob', '*.cts', '--glob', '*.mts', '--glob', '*.json', '--glob', '!node_modules/**', '--glob', '!.git/**', '--glob', '!dist/**', '--glob', '!build/**', '--glob', '!coverage/**', '--glob', '!uploads/**', '--glob', '!logs/**', '--glob', '!.cache/**', '--glob', '!.vite/**', '--glob', '!.next/**')
  foreach ($indicator in $MalwareIndicators) {
    $match = & rg @rgArguments $indicator $RepoRoot 2>$null | Select-Object -First 1
    if ($LASTEXITCODE -eq 0 -and $match) { Fail "Known malicious loader indicator '$indicator' found in $match." }
  }
}

Set-Location $RepoRoot
Assert-NoCustomGitHooks
Assert-SafePackageScripts
Assert-NoKnownLoaderIndicators
Write-Host '[Git Security] Hooks, package scripts, and loader indicators passed review.' -ForegroundColor Green
