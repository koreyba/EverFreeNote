param(
  [string]$AppId = "com.everfreenote.app.dev",
  [string]$DeepLinkUrl = "everfreenote-dev://dev/maestro/clipboard"
)

$maestro = Get-Command maestro -ErrorAction SilentlyContinue
if (-not $maestro) {
  Write-Error "Maestro CLI is not installed or not available on PATH."
  exit 1
}

$repoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$flowPath = Join-Path $repoRoot ".maestro\flows\note-copy-smoke.yaml"

& $maestro.Source test $flowPath -e APP_ID=$AppId -e DEEPLINK_URL=$DeepLinkUrl
exit $LASTEXITCODE
