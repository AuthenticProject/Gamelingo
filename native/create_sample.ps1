Add-Type -AssemblyName System.Drawing
$bmp = New-Object System.Drawing.Bitmap 600, 100
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.Clear([System.Drawing.Color]::Black)
$font = New-Object System.Drawing.Font "Arial", 22
$brush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::White)
$g.DrawString("Something doesn't feel right here.", $font, $brush, 20, 30)
$outPath = Join-Path $PSScriptRoot "test_sample.png"
$bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose()
$bmp.Dispose()
Write-Output ("Saved: " + $outPath)
