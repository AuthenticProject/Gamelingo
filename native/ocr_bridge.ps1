param (
    [Parameter(Mandatory=$true)]
    [string]$ImagePath
)

try {
    Add-Type -AssemblyName System.Runtime.WindowsRuntime
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

    $samplePath = (Resolve-Path $ImagePath).Path
    $fileOp = [Windows.Storage.StorageFile]::GetFileFromPathAsync($samplePath)
    $file = Await-AsyncOp $fileOp ([Windows.Storage.StorageFile])

    $streamOp = $file.OpenAsync([Windows.Storage.FileAccessMode]::Read)
    $stream = Await-AsyncOp $streamOp ([Windows.Storage.Streams.IRandomAccessStream])

    $decoderOp = [Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($stream)
    $decoder = Await-AsyncOp $decoderOp ([Windows.Graphics.Imaging.BitmapDecoder])

    $bmpOp = $decoder.GetSoftwareBitmapAsync()
    $softwareBmp = Await-AsyncOp $bmpOp ([Windows.Graphics.Imaging.SoftwareBitmap])

    $lang = [Windows.Globalization.Language]::new("en-US")
    $engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromLanguage($lang)
    $ocrOp = $engine.RecognizeAsync($softwareBmp)
    $ocrResult = Await-AsyncOp $ocrOp ([Windows.Media.Ocr.OcrResult])

    $linesList = @()
    foreach ($line in $ocrResult.Lines) {
        $wordsList = @()
        foreach ($w in $line.Words) {
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
            text = $line.Text
            words = $wordsList
        }
    }

    $output = @{
        success = $true
        fullText = $ocrResult.Text
        lines = $linesList
    }

    $output | ConvertTo-Json -Depth 5 -Compress
} catch {
    $errOutput = @{
        success = $false
        error = $_.Exception.Message
    }
    $errOutput | ConvertTo-Json -Compress
}
