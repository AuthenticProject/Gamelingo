[Windows.Media.Ocr.OcrEngine, Windows.Foundation.UniversalApiContract, ContentType = WindowsRuntime] | Out-Null
$langs = [Windows.Media.Ocr.OcrEngine]::AvailableRecognizerLanguages
Write-Output ("Available Windows OCR Languages: " + ($langs.LanguageTag -join ", "))
$isEnAvailable = [Windows.Media.Ocr.OcrEngine]::IsLanguageSupported([Windows.Globalization.Language]::new("en-US"))
Write-Output ("Is en-US OCR supported: " + $isEnAvailable)
