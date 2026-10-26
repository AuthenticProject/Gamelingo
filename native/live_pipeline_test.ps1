Add-Type -AssemblyName System.Runtime.WindowsRuntime
Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.Windows.Forms

[Windows.Storage.StorageFile, Windows.Foundation.UniversalApiContract, ContentType = WindowsRuntime] | Out-Null
[Windows.Media.Ocr.OcrEngine, Windows.Foundation.UniversalApiContract, ContentType = WindowsRuntime] | Out-Null
[Windows.Graphics.Imaging.BitmapDecoder, Windows.Foundation.UniversalApiContract, ContentType = WindowsRuntime] | Out-Null
[Windows.Globalization.Language, Windows.Foundation.UniversalApiContract, ContentType = WindowsRuntime] | Out-Null

function Await-AsyncOp ($asyncOp, $resultType) {
    $method = [System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
        $_.Name -eq 'AsTask' -and $_.IsGenericMethod -and $_.GetGenericArguments().Count -eq 1 -and $_.GetParameters().Count -eq 1
    } | Select-Object -First 1
    $generic = $method.MakeGenericMethod($resultType)
    $task = $generic.Invoke($null, @($asyncOp))
    $task.Wait()
    return $task.Result
}

# Function to translate EN -> ID via HTTPS endpoint
function Translate-ToIndonesian ($text) {
    try {
        $encoded = [System.Web.HttpUtility]::UrlEncode($text)
        $url = "https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=id&dt=t&q=$encoded"
        $resp = Invoke-RestMethod -Uri $url -Method Get -TimeoutSec 5
        $translated = ""
        foreach ($seg in $resp[0]) {
            if ($seg[0]) { $translated += $seg[0] }
        }
        return $translated
    } catch {
        return "Terjemahan: " + $text
    }
}

Add-Type -AssemblyName System.Web

Write-Output "=================================================="
Write-Output " GAMELINGO LIVE REAL-TIME TRANSLATION PIPELINE TEST"
Write-Output "=================================================="

# 1. Start Desktop Overlay in Background
$overlayCmd = Join-Path $PSScriptRoot "overlay_command.json"
@{ text = "GameLingo Pipeline Initializing..."; meta = "Connecting Screen Capture to Windows OCR" } | ConvertTo-Json | Set-Content $overlayCmd -Encoding UTF8

$overlayProc = Start-Process powershell -ArgumentList "-ExecutionPolicy Bypass -File `"$PSScriptRoot\desktop_overlay.ps1`"" -PassThru
Write-Output "[1/5] Launched Transparent Click-Through Overlay (PID: $($overlayProc.Id))"

# 2. Start Test Dialogue Window in Background
$dialogueProc = Start-Process powershell -ArgumentList "-ExecutionPolicy Bypass -File `"$PSScriptRoot\test_dialogue_window.ps1`"" -PassThru
Write-Output "[2/5] Launched Wuthering Waves Dialogue Window (PID: $($dialogueProc.Id))"

Start-Sleep -Seconds 2

# 3. OCR Engine initialization
$lang = [Windows.Globalization.Language]::new("en-US")
$engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromLanguage($lang)
Write-Output "[3/5] Windows.Media.Ocr Engine Active (en-US)"

# 4. Pipeline Execution Loop (3 iterations of live dialogue capture)
$results = @()
$captureRect = New-Object System.Drawing.Rectangle(320, 430, 680, 100)

for ($i = 1; $i -le 3; $i++) {
    Write-Output "`n--- RUN $i OF 3: CAPTURING LIVE DESKTOP PIXELS ---"
    $swTotal = [System.Diagnostics.Stopwatch]::StartNew()

    # Step A: Real Screen Capture
    $swCapture = [System.Diagnostics.Stopwatch]::StartNew()
    $bmp = New-Object System.Drawing.Bitmap $captureRect.Width, $captureRect.Height
    $graphics = [System.Drawing.Graphics]::FromImage($bmp)
    try {
        $graphics.CopyFromScreen($captureRect.Location, [System.Drawing.Point]::Empty, $captureRect.Size)
    } catch {
        $graphics.Clear([System.Drawing.Color]::Black)
    }
    $tempFrame = Join-Path $PSScriptRoot "live_frame_$i.png"
    $bmp.Save($tempFrame, [System.Drawing.Imaging.ImageFormat]::Png)
    $graphics.Dispose()
    $bmp.Dispose()
    $swCapture.Stop()
    Write-Output "  [A] Screen Capture: Saved $($captureRect.Width)x$($captureRect.Height) frame in $($swCapture.ElapsedMilliseconds) ms"

    # Step B: Windows OCR Recognition
    $swOcr = [System.Diagnostics.Stopwatch]::StartNew()
    $file = Await-AsyncOp ([Windows.Storage.StorageFile]::GetFileFromPathAsync((Resolve-Path $tempFrame).Path)) ([Windows.Storage.StorageFile])
    $stream = Await-AsyncOp ($file.OpenAsync([Windows.Storage.FileAccessMode]::Read)) ([Windows.Storage.Streams.IRandomAccessStream])
    $decoder = Await-AsyncOp ([Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($stream)) ([Windows.Graphics.Imaging.BitmapDecoder])
    $softwareBmp = Await-AsyncOp ($decoder.GetSoftwareBitmapAsync()) ([Windows.Graphics.Imaging.SoftwareBitmap])
    $ocrResult = Await-AsyncOp ($engine.RecognizeAsync($softwareBmp)) ([Windows.Media.Ocr.OcrResult])
    $swOcr.Stop()

    $detectedText = $ocrResult.Text.Trim()
    Write-Output "  [B] Windows OCR Detected ($($swOcr.ElapsedMilliseconds) ms): `"$detectedText`""

    # Step C: Translation Pipeline
    $swTrans = [System.Diagnostics.Stopwatch]::StartNew()
    $translatedText = ""
    if ($detectedText) {
        $translatedText = Translate-ToIndonesian $detectedText
    } else {
        $translatedText = "(No text in capture bounds)"
    }
    $swTrans.Stop()
    Write-Output "  [C] Indonesian Translation ($($swTrans.ElapsedMilliseconds) ms): `"$translatedText`""

    # Step D: Update Desktop Overlay HUD
    $swOverlay = [System.Diagnostics.Stopwatch]::StartNew()
    $swTotal.Stop()
    $totalLatency = $swTotal.ElapsedMilliseconds

    @{
        text = $translatedText
        meta = "Live Overlay | OCR: $($swOcr.ElapsedMilliseconds)ms | Trans: $($swTrans.ElapsedMilliseconds)ms | Total: ${totalLatency}ms"
    } | ConvertTo-Json | Set-Content $overlayCmd -Encoding UTF8
    $swOverlay.Stop()
    Write-Output "  [D] Desktop Overlay Updated in $($swOverlay.ElapsedMilliseconds) ms"
    Write-Output "  => TOTAL PIPELINE LATENCY: $totalLatency ms"

    $results += [PSCustomObject]@{
        Run = $i
        Detected_EN = $detectedText
        Translated_ID = $translatedText
        Capture_ms = $swCapture.ElapsedMilliseconds
        OCR_ms = $swOcr.ElapsedMilliseconds
        Trans_ms = $swTrans.ElapsedMilliseconds
        Total_Latency_ms = $totalLatency
    }

    Start-Sleep -Seconds 3
}

# 5. Clean up processes
@{ close = $true } | ConvertTo-Json | Set-Content $overlayCmd -Encoding UTF8
Start-Sleep -Milliseconds 500
Stop-Process -Id $dialogueProc.Id -Force -ErrorAction SilentlyContinue
Stop-Process -Id $overlayProc.Id -Force -ErrorAction SilentlyContinue

Write-Output "`n=================================================="
Write-Output " REAL LIVE TRANSLATION BENCHMARK RESULTS"
Write-Output "=================================================="
$results | Format-Table -AutoSize
