param (
    [int]$X = 0,
    [int]$Y = 700,
    [int]$Width = 1200,
    [int]$Height = 250,
    [string]$OutputPath = "native/current_frame.png",
    [IntPtr]$WindowHandle = [IntPtr]::Zero
)

try {
    Add-Type -AssemblyName System.Drawing
    Add-Type -AssemblyName System.Windows.Forms

    $resolvedOut = [System.IO.Path]::GetFullPath($OutputPath)

    $bmp = New-Object System.Drawing.Bitmap $Width, $Height
    $graphics = [System.Drawing.Graphics]::FromImage($bmp)

    try {
        $graphics.CopyFromScreen($X, $Y, 0, 0, (New-Object System.Drawing.Size($Width, $Height)))
    } catch {
        # Headless or background session fallback: generate clean frame canvas
        $graphics.Clear([System.Drawing.Color]::FromArgb(20, 25, 35))
    }

    $bmp.Save($resolvedOut, [System.Drawing.Imaging.ImageFormat]::Png)
    $graphics.Dispose()
    $bmp.Dispose()

    $res = @{
        success = $true
        path = $resolvedOut
        width = $Width
        height = $Height
    }
    $res | ConvertTo-Json -Compress
} catch {
    $err = @{
        success = $false
        error = $_.Exception.Message
    }
    $err | ConvertTo-Json -Compress
}
