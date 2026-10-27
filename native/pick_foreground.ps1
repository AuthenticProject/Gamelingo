[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.Windows.Forms
. "$PSScriptRoot/window_manager.ps1" | Out-Null

$fg = [WinManager]::GetForegroundWindowEntry()

if (-not $fg -or $fg.ProcessName -match "GameLingo" -or $fg.Title -match "GameLingo") {
    $all = [WinManager]::GetAllWindows()
    foreach ($w in $all) {
        if ($w.ProcessName -notmatch "GameLingo" -and $w.Title -notmatch "GameLingo") {
            $fg = $w
            break
        }
    }
}

if ($fg) {
    $fg | ConvertTo-Json -Depth 3 -Compress
} else {
    Write-Output "null"
}
