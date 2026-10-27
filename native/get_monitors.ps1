[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.Windows.Forms
. "$PSScriptRoot/window_manager.ps1" | Out-Null
$monitors = [WinManager]::GetMonitors()
$monitors | ConvertTo-Json -Depth 3 -Compress
