[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.Windows.Forms
. "$PSScriptRoot/window_manager.ps1" | Out-Null
$wins = [WinManager]::GetAllWindows()
if ($wins -and $wins.Count -gt 0) {
    $wins | ConvertTo-Json -Depth 3 -Compress
} else {
    Write-Output "[]"
}
