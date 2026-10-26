Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$dialogues = @(
    "Rover: Something doesn't feel right here.",
    "Yangyang: The Retroact Rain will begin soon. We must report back to Magistrate Jinhsi in Jinzhou.",
    "Chixia: Don't worry! My Dual Pistols and Fusion Forte are ready for any Tacet Discord!"
)

$results = @()

foreach ($text in $dialogues) {
    $sw = [System.Diagnostics.Stopwatch]::StartNew()

    # 1. Real GUI Window Rendering
    $form = New-Object System.Windows.Forms.Form
    $form.Size = New-Object System.Drawing.Size(800, 200)
    $form.BackColor = [System.Drawing.Color]::FromArgb(15, 20, 28)
    
    $lbl = New-Object System.Windows.Forms.Label
    $lbl.Size = New-Object System.Drawing.Size(760, 140)
    $lbl.Location = New-Object System.Drawing.Point(20, 25)
    $lbl.Font = New-Object System.Drawing.Font("Arial", 18, [System.Drawing.FontStyle]::Regular)
    $lbl.ForeColor = [System.Drawing.Color]::White
    $lbl.Text = $text
    $form.Controls.Add($lbl)

    # 2. Real Pixel Capture of Form Surface
    $swCap = [System.Diagnostics.Stopwatch]::StartNew()
    $bmp = New-Object System.Drawing.Bitmap $form.ClientSize.Width, $form.ClientSize.Height
    $form.DrawToBitmap($bmp, (New-Object System.Drawing.Rectangle(0, 0, $form.ClientSize.Width, $form.ClientSize.Height)))
    $capPath = Join-Path $PSScriptRoot "captured_dialogue.png"
    $bmp.Save($capPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $form.Dispose()
    $bmp.Dispose()
    $swCap.Stop()

    # 3. Real Windows.Media.Ocr
    $swOcr = [System.Diagnostics.Stopwatch]::StartNew()
    $rawJson = (& powershell -ExecutionPolicy Bypass -File "$PSScriptRoot\ocr_bridge.ps1" -ImagePath "$capPath")
    $swOcr.Stop()
    $ocrObj = $rawJson | ConvertFrom-Json
    $detected = $ocrObj.fullText

    # 4. Real Translation Pipeline
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
        Input_Dialogue = $text
        OCR_Detected = $detected
        Translation_ID = $translated
        Capture_ms = $swCap.ElapsedMilliseconds
        OCR_ms = $swOcr.ElapsedMilliseconds
        Trans_ms = $swTrans.ElapsedMilliseconds
        Total_Latency_ms = $sw.ElapsedMilliseconds
    }
}

Write-Output "=========================================================================="
Write-Output " GAME TRANSLATOR END-TO-END VERIFICATION: CAPTURE -> OCR -> TRANSLATE"
Write-Output "=========================================================================="
$results | Format-Table -AutoSize
