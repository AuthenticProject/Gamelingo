[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::InputEncoding = [System.Text.Encoding]::UTF8

Add-Type -AssemblyName System.Runtime.WindowsRuntime
[Windows.Storage.StorageFile, Windows.Foundation.UniversalApiContract, ContentType = WindowsRuntime] | Out-Null
[Windows.Media.Ocr.OcrEngine, Windows.Foundation.UniversalApiContract, ContentType = WindowsRuntime] | Out-Null
[Windows.Graphics.Imaging.BitmapDecoder, Windows.Foundation.UniversalApiContract, ContentType = WindowsRuntime] | Out-Null
[Windows.Globalization.Language, Windows.Foundation.UniversalApiContract, ContentType = WindowsRuntime] | Out-Null

$method = [System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
    $_.Name -eq 'AsTask' -and $_.IsGenericMethod -and $_.GetGenericArguments().Count -eq 1 -and $_.GetParameters().Count -eq 1
} | Select-Object -First 1

$taskStorageFile = $method.MakeGenericMethod([Windows.Storage.StorageFile])
$taskStream = $method.MakeGenericMethod([Windows.Storage.Streams.IRandomAccessStream])
$taskDecoder = $method.MakeGenericMethod([Windows.Graphics.Imaging.BitmapDecoder])
$taskSoftwareBmp = $method.MakeGenericMethod([Windows.Graphics.Imaging.SoftwareBitmap])
$taskOcrResult = $method.MakeGenericMethod([Windows.Media.Ocr.OcrResult])

# Pre-warm OCR Engine ONCE
$lang = [Windows.Globalization.Language]::new("en-US")
$engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromLanguage($lang)

# Ready signal
[Console]::WriteLine((@{ status = "READY"; engine = "Windows.Media.Ocr (en-US, Pre-Warmed)" } | ConvertTo-Json -Compress))

# Persistent Loop
while ($true) {
    $line = [Console]::ReadLine()
    if ($null -eq $line) { break }
    $line = $line.Trim()
    if ($line -eq "") { continue }

    try {
        $req = $line | ConvertFrom-Json
        if ($req.command -eq "exit") { break }

        $sw = [System.Diagnostics.Stopwatch]::StartNew()
        $imgPath = (Resolve-Path $req.imagePath).Path

        $op1 = [Windows.Storage.StorageFile]::GetFileFromPathAsync($imgPath)
        $t1 = $taskStorageFile.Invoke($null, @($op1)); $t1.Wait(); $file = $t1.Result

        $op2 = $file.OpenAsync([Windows.Storage.FileAccessMode]::Read)
        $t2 = $taskStream.Invoke($null, @($op2)); $t2.Wait(); $stream = $t2.Result

        $op3 = [Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($stream)
        $t3 = $taskDecoder.Invoke($null, @($op3)); $t3.Wait(); $decoder = $t3.Result

        $op4 = $decoder.GetSoftwareBitmapAsync()
        $t4 = $taskSoftwareBmp.Invoke($null, @($op4)); $t4.Wait(); $softwareBmp = $t4.Result

        $op5 = $engine.RecognizeAsync($softwareBmp)
        $t5 = $taskOcrResult.Invoke($null, @($op5)); $t5.Wait(); $ocrResult = $t5.Result
        $sw.Stop()

        $linesList = @()
        foreach ($l in $ocrResult.Lines) {
            $wordsList = @()
            foreach ($w in $l.Words) {
                $wordsList += @{
                    text = $w.Text
                    box = @{
                        x = [math]::Round($w.BoundingRect.X)
                        y = [math]::Round($w.BoundingRect.Y)
                        width = [math]::Round($w.BoundingRect.Width)
                        height = [math]::Round($w.BoundingRect.Height)
                    }
                }
            }
            $linesList += @{
                text = $l.Text
                words = $wordsList
            }
        }

        $res = @{
            success = $true
            fullText = $ocrResult.Text
            lines = $linesList
            warmOcrLatencyMs = $sw.ElapsedMilliseconds
        }
        [Console]::WriteLine(($res | ConvertTo-Json -Depth 5 -Compress))
    } catch {
        $err = @{
            success = $false
            error = $_.Exception.Message
        }
        [Console]::WriteLine(($err | ConvertTo-Json -Compress))
    }
}
