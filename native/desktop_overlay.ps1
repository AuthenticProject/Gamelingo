Add-Type -AssemblyName PresentationFramework
Add-Type -AssemblyName PresentationCore
Add-Type -AssemblyName WindowsBase

$csharp = @"
using System;
using System.Runtime.InteropServices;

public class Win32Overlay {
    public const int WS_EX_TRANSPARENT = 0x00000020;
    public const int WS_EX_LAYERED = 0x00080000;
    public const int GWL_EXSTYLE = -20;

    [DllImport("user32.dll")]
    public static extern int GetWindowLong(IntPtr hwnd, int index);

    [DllImport("user32.dll")]
    public static extern int SetWindowLong(IntPtr hwnd, int index, int newStyle);

    public static void EnableClickThrough(IntPtr hwnd) {
        int extendedStyle = GetWindowLong(hwnd, GWL_EXSTYLE);
        SetWindowLong(hwnd, GWL_EXSTYLE, extendedStyle | WS_EX_TRANSPARENT | WS_EX_LAYERED);
    }
}
"@

Add-Type -TypeDefinition $csharp -ErrorAction SilentlyContinue

# Create Transparent Topmost WPF Window
$window = New-Object System.Windows.Window
$window.Title = "GameLingo Transparent Overlay"
$window.WindowStyle = [System.Windows.WindowStyle]::None
$window.AllowsTransparency = $true
$window.Background = [System.Windows.Media.Brushes]::Transparent
$window.Topmost = $true
$window.ShowInTaskbar = $false
$window.Left = 0
$window.Top = 0
$window.Width = [System.Windows.SystemParameters]::PrimaryScreenWidth
$window.Height = [System.Windows.SystemParameters]::PrimaryScreenHeight

# Main Canvas Container
$canvas = New-Object System.Windows.Controls.Canvas
$window.Content = $canvas

# Subtitle Card (Bottom Centered)
$border = New-Object System.Windows.Controls.Border
$border.Background = (New-Object System.Windows.Media.BrushConverter).ConvertFromString("#E60B1018")
$border.BorderBrush = (New-Object System.Windows.Media.BrushConverter).ConvertFromString("#6635D6E8")
$border.BorderThickness = New-Object System.Windows.Thickness(1.5)
$border.CornerRadius = New-Object System.Windows.CornerRadius(10)
$border.Padding = New-Object System.Windows.Thickness(20, 10, 20, 10)
$border.HorizontalAlignment = [System.Windows.HorizontalAlignment]::Center

$stack = New-Object System.Windows.Controls.StackPanel
$stack.HorizontalAlignment = [System.Windows.HorizontalAlignment]::Center

$textBlock = New-Object System.Windows.Controls.TextBlock
$textBlock.Text = "GameLingo Overlay Ready"
$textBlock.Foreground = (New-Object System.Windows.Media.BrushConverter).ConvertFromString("#F5F7FA")
$textBlock.FontSize = 22
$textBlock.FontWeight = [System.Windows.FontWeights]::SemiBold
$textBlock.TextWrapping = [System.Windows.TextWrapping]::Wrap
$textBlock.TextAlignment = [System.Windows.TextAlignment]::Center
$stack.Children.Add($textBlock)

$metaBlock = New-Object System.Windows.Controls.TextBlock
$metaBlock.Text = "Wuthering Waves Live Subtitle HUD (Click-Through Active)"
$metaBlock.Foreground = (New-Object System.Windows.Media.BrushConverter).ConvertFromString("#35D6E8")
$metaBlock.FontSize = 11
$metaBlock.TextAlignment = [System.Windows.TextAlignment]::Center
$metaBlock.Margin = New-Object System.Windows.Thickness(0, 4, 0, 0)
$stack.Children.Add($metaBlock)

$border.Child = $stack
[System.Windows.Controls.Canvas]::SetLeft($border, ($window.Width - 800) / 2)
[System.Windows.Controls.Canvas]::SetTop($border, $window.Height - 180)
$border.Width = 800
$canvas.Children.Add($border)

# On SourceInitialized, enable genuine Win32 click-through
$window.Add_SourceInitialized({
    $helper = New-Object System.Windows.Interop.WindowInteropHelper($window)
    [Win32Overlay]::EnableClickThrough($helper.Handle)
})

# Communication via JSON file
$cmdFile = Join-Path $PSScriptRoot "overlay_command.json"
$timer = New-Object System.Windows.Threading.DispatcherTimer
$timer.Interval = [TimeSpan]::FromMilliseconds(100)
$timer.Add_Tick({
    if (Test-Path $cmdFile) {
        try {
            $content = Get-Content $cmdFile -Raw | ConvertFrom-Json
            if ($content.text) {
                $textBlock.Text = $content.text
            }
            if ($content.meta) {
                $metaBlock.Text = $content.meta
            }
            if ($content.close) {
                $window.Close()
            }
        } catch {}
    }
})
$timer.Start()

$window.ShowDialog() | Out-Null
