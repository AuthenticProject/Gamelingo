param(
    [long]$Hwnd = 0,
    [string]$OutputPath = "native/current_frame.png",
    [int]$CropX = 0,
    [int]$CropY = 0,
    [int]$CropW = 0,
    [int]$CropH = 0
)

Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.Windows.Forms
. "$PSScriptRoot/window_manager.ps1" | Out-Null
$resolved = [System.IO.Path]::GetFullPath($OutputPath)
[WinManager]::CaptureWindowOrClient($Hwnd, $resolved, $CropX, $CropY, $CropW, $CropH) | Out-Null
Write-Output "OK"
