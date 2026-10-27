param(
    [string]$CaptureSource = "window",
    [long]$Hwnd = 0,
    [long]$Handle = 0,
    [int]$MonitorIndex = 0,
    [string]$OutputPath = "native/current_frame.png",
    [int]$CropX = 0,
    [int]$CropY = 0,
    [int]$CropW = 0,
    [int]$CropH = 0
)

if ($Handle -ne 0 -and $Hwnd -eq 0) {
    $Hwnd = $Handle
}

Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.Windows.Forms
. "$PSScriptRoot/window_manager.ps1" | Out-Null
$resolved = [System.IO.Path]::GetFullPath($OutputPath)

$captured = $false
if ($CaptureSource -eq "screen") {
    $captured = [WinManager]::CaptureScreenMonitor($MonitorIndex, $resolved, $CropX, $CropY, $CropW, $CropH)
} else {
    $captured = [WinManager]::CaptureWindowOrClient($Hwnd, $resolved, $CropX, $CropY, $CropW, $CropH)
}

$fileSize = 0
if (Test-Path $resolved) {
    $fileSize = (Get-Item $resolved).Length
}

Write-Output (ConvertTo-Json @{
    success = $captured
    path = $resolved
    fileSizeBytes = $fileSize
})
