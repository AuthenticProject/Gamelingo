Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.Web

$dialogues = @(
    "Rover: Something doesn't feel right here.",
    "Yangyang: The Retroact Rain will begin soon. We must report back to Magistrate Jinhsi in Jinzhou.",
    "Chixia: Don't worry! My Dual Pistols and Fusion Forte are ready for any Tacet Discord!"
)

$results = @()

foreach ($text in $dialogues) {
    $sw = [System.Diagnostics.Stopwatch]::StartNew()

    # 1. Render dialogue frame exactly matching Wuthering Waves dialogue UI
    $swCap = [System.Diagnostics.Stopwatch]::StartNew()
    $bmp = New-Object System.Drawing.Bitmap 900, 160
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.Clear([System.Drawing.Color]::FromArgb(11, 16, 24)) # Wuthering Waves dark dialogue box
    
    # Text font and anti-aliasing
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
    $font = New-Object System.Drawing.Font("Arial", 20, [System.Drawing.FontStyle]::Bold)
    $brush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(245, 247, 250))
    $rect = New-Object System.Drawing.RectangleF 20, 20, 860, 120
    $g.DrawString($text, $font, $brush, $rect)

    $framePath = Join-Path $PSScriptRoot "live_test_frame.png"
    $bmp.Save($framePath, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
    $swCap.Stop()

    # 2. Real Windows.Media.Ocr
    $swOcr = [System.Diagnostics.Stopwatch]::StartNew()
    $rawOcr = & powershell -ExecutionPolicy Bypass -File "$PSScriptRoot\ocr_bridge.ps1" -ImagePath "$framePath"
    $swOcr.Stop()
    $ocrObj = $rawOcr | ConvertFrom-Json
    $detected = $ocrObj.fullText

    # 3. Real Translation via HTTPS
    $swTrans = [System.Diagnostics.Stopwatch]::StartNew()
    $encoded = [System.Web.HttpUtility]::UrlEncode($detected)
    $url = "https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=id&dt=t&q=$encoded"
    $resp = Invoke-RestMethod -Uri $url -Method Get -TimeoutSec 5
    $translated = ""
    foreach ($seg in $resp[0]) {
        if ($seg[0]) { $translated += $seg[0] }
    }
    $swTrans.Stop()
    $sw.Stop()

    $results += [PSCustomObject]@{
        Dialogue_Input = $text
        OCR_Detected = $detected
        Translation_Indonesian = $translated
        Capture_ms = $swCap.ElapsedMilliseconds
        OCR_ms = $swOcr.ElapsedMilliseconds
        Trans_ms = $swTrans.ElapsedMilliseconds
        Total_Latency_ms = $sw.ElapsedMilliseconds
    }
}

Write-Output "=========================================================================="
Write-Output " REAL-TIME TRANSLATION PIPELINE BENCHMARK (REAL OCR + REAL TRANSLATION)"
Write-Output "=========================================================================="
$results | Format-List
