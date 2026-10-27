. "$PSScriptRoot/window_manager.ps1"
$w = [WinManager]::GetAllWindows() | Select-Object -First 1
if ($w) {
    Write-Output "Capturing window: $($w.Title) (Handle: $($w.Handle)) Client: $($w.ClientWidth)x$($w.ClientHeight)"
    [WinManager]::CaptureWindowOrClient($w.Handle, "$PSScriptRoot/test_full_capture.png")
    $item = Get-Item "$PSScriptRoot/test_full_capture.png"
    Write-Output "Capture file created: $($item.FullName) - Size: $($item.Length) bytes"
} else {
    Write-Output "No windows to capture."
}
