Add-Type -TypeDefinition (Get-Content "native/WindowCapture.cs" -Raw) -ReferencedAssemblies "System.Drawing.dll"
Add-Type -AssemblyName System.Windows.Forms

# Start Dialogue Form
$form = New-Object System.Windows.Forms.Form
$form.Text = "Wuthering Waves Live Dialogue"
$form.Size = New-Object System.Drawing.Size(650, 180)
$form.BackColor = [System.Drawing.Color]::Black

$lbl = New-Object System.Windows.Forms.Label
$lbl.Size = New-Object System.Drawing.Size(600, 100)
$lbl.Location = New-Object System.Drawing.Point(20, 30)
$lbl.Font = New-Object System.Drawing.Font("Arial", 20)
$lbl.ForeColor = [System.Drawing.Color]::White
$lbl.Text = "Rover: Something doesn't feel right here."
$form.Controls.Add($lbl)

# Show form in background thread
$form.Show()
[System.Windows.Forms.Application]::DoEvents()

# Capture using PrintWindow Win32 API
$capturedBmp = [WindowCapture]::CaptureWindow($form.Handle)
$testPath = Join-Path $PSScriptRoot "pw_capture.png"
$capturedBmp.Save($testPath, [System.Drawing.Imaging.ImageFormat]::Png)
$form.Close()

Write-Output ("Saved PrintWindow capture to " + $testPath)

# Run Windows OCR on it
. native/ocr_bridge.ps1 -ImagePath $testPath
