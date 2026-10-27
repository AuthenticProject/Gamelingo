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
$window.Title = "GameLingo Universal Overlay"
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

# Brushes
$brushConverter = New-Object System.Windows.Media.BrushConverter
$maskBgBrush = $brushConverter.ConvertFromString("#EE0B1018")
$maskBorderBrush = $brushConverter.ConvertFromString("#4D35D6E8")
$textWhiteBrush = $brushConverter.ConvertFromString("#F5F7FA")
$accentCyanBrush = $brushConverter.ConvertFromString("#35D6E8")
$subtleBorderBrush = $brushConverter.ConvertFromString("#2A3B4D")

# Mode A: Subtitle Card (Bottom Centered)
$subtitleBorder = New-Object System.Windows.Controls.Border
$subtitleBorder.Background = $brushConverter.ConvertFromString("#E60B1018")
$subtitleBorder.BorderBrush = $brushConverter.ConvertFromString("#6635D6E8")
$subtitleBorder.BorderThickness = New-Object System.Windows.Thickness(1.5)
$subtitleBorder.CornerRadius = New-Object System.Windows.CornerRadius(10)
$subtitleBorder.Padding = New-Object System.Windows.Thickness(20, 10, 20, 10)
$subtitleBorder.HorizontalAlignment = [System.Windows.HorizontalAlignment]::Center

$subtitleStack = New-Object System.Windows.Controls.StackPanel
$subtitleStack.HorizontalAlignment = [System.Windows.HorizontalAlignment]::Center

$subText = New-Object System.Windows.Controls.TextBlock
$subText.Text = ""
$subText.Foreground = $textWhiteBrush
$subText.FontSize = 22
$subText.FontWeight = [System.Windows.FontWeights]::SemiBold
$subText.TextWrapping = [System.Windows.TextWrapping]::Wrap
$subText.TextAlignment = [System.Windows.TextAlignment]::Center
$subtitleStack.Children.Add($subText)

$subMeta = New-Object System.Windows.Controls.TextBlock
$subMeta.Text = ""
$subMeta.Foreground = $accentCyanBrush
$subMeta.FontSize = 11
$subMeta.TextAlignment = [System.Windows.TextAlignment]::Center
$subMeta.Margin = New-Object System.Windows.Thickness(0, 4, 0, 0)
$subtitleStack.Children.Add($subMeta)

$subtitleBorder.Child = $subtitleStack
[System.Windows.Controls.Canvas]::SetLeft($subtitleBorder, ($window.Width - 840) / 2)
[System.Windows.Controls.Canvas]::SetTop($subtitleBorder, $window.Height - 180)
$subtitleBorder.Width = 840
$subtitleBorder.Visibility = [System.Windows.Visibility]::Collapsed
$canvas.Children.Add($subtitleBorder)

# Mode B: Replacement cards map (keyed by blockId or index)
$replacementCards = @{}

# On SourceInitialized, enable genuine Win32 click-through
$window.Add_SourceInitialized({
    $helper = New-Object System.Windows.Interop.WindowInteropHelper($window)
    [Win32Overlay]::EnableClickThrough($helper.Handle)
})

# Communication via JSON file
$cmdFile = Join-Path $PSScriptRoot "overlay_command.json"
$timer = New-Object System.Windows.Threading.DispatcherTimer
$timer.Interval = [TimeSpan]::FromMilliseconds(80)

$timer.Add_Tick({
    if (Test-Path $cmdFile) {
        try {
            $raw = Get-Content $cmdFile -Raw -Encoding UTF8
            if (-not $raw) { return }
            $content = $raw | ConvertFrom-Json

            if ($content.close) {
                $window.Close()
                return
            }

            $mode = if ($content.mode) { $content.mode } else { "replacement" }

            if ($mode -eq "subtitle") {
                # Hide replacement cards
                foreach ($key in $replacementCards.Keys) {
                    $replacementCards[$key].Visibility = [System.Windows.Visibility]::Collapsed
                }

                if ($content.text -or $content.meta) {
                    $subText.Text = if ($content.text) { $content.text } else { "" }
                    $subMeta.Text = if ($content.meta) { $content.meta } else { "" }
                    $subtitleBorder.Visibility = [System.Windows.Visibility]::Visible
                } else {
                    $subtitleBorder.Visibility = [System.Windows.Visibility]::Collapsed
                }
            } else {
                # Mode B: Visual Text Replacement
                $subtitleBorder.Visibility = [System.Windows.Visibility]::Collapsed

                $currentBlocks = @()
                if ($content.blocks) {
                    $currentBlocks = @($content.blocks)
                }

                $activeKeys = @()

                for ($i = 0; $i -lt $currentBlocks.Count; $i++) {
                    $b = $currentBlocks[$i]
                    $key = "block_$i"
                    $activeKeys += $key

                    $box = $b.box
                    if (-not $box) { continue }

                    # Pad mask slightly to ensure complete coverage of English text
                    $padX = 6
                    $padY = 3
                    $posX = [math]::Max(0, $box.x - $padX)
                    $posY = [math]::Max(0, $box.y - $padY)
                    $cardW = [math]::Max(60, $box.width + ($padX * 2))
                    $cardH = [math]::Max(24, $box.height + ($padY * 2))

                    $card = $null
                    if ($replacementCards.ContainsKey($key)) {
                        $card = $replacementCards[$key]
                    } else {
                        # Create new replacement card
                        $card = New-Object System.Windows.Controls.Border
                        $card.Background = $maskBgBrush
                        $card.BorderBrush = $maskBorderBrush
                        $card.BorderThickness = New-Object System.Windows.Thickness(1.0)
                        $card.CornerRadius = New-Object System.Windows.CornerRadius(4)
                        $card.Padding = New-Object System.Windows.Thickness(4, 2, 4, 2)

                        $tb = New-Object System.Windows.Controls.TextBlock
                        $tb.Foreground = $textWhiteBrush
                        $tb.TextWrapping = [System.Windows.TextWrapping]::Wrap
                        $tb.FontFamily = New-Object System.Windows.Media.FontFamily("Segoe UI")

                        $card.Child = $tb
                        $canvas.Children.Add($card)
                        $replacementCards[$key] = $card
                    }

                    # Position and size
                    [System.Windows.Controls.Canvas]::SetLeft($card, $posX)
                    [System.Windows.Controls.Canvas]::SetTop($card, $posY)
                    $card.Width = $cardW
                    $card.Height = $cardH
                    $card.Visibility = [System.Windows.Visibility]::Visible

                    # Text content & scaling
                    $tb = $card.Child
                    $textToShow = if ($b.translatedText) { $b.translatedText } else { $b.text }
                    $tb.Text = $textToShow

                    # Dynamic font sizing based on card height
                    if ($cardH -ge 60) {
                        $tb.FontSize = 18
                        $tb.FontWeight = [System.Windows.FontWeights]::SemiBold
                    } elseif ($cardH -ge 36) {
                        $tb.FontSize = 14
                        $tb.FontWeight = [System.Windows.FontWeights]::Normal
                    } else {
                        $tb.FontSize = 11.5
                        $tb.FontWeight = [System.Windows.FontWeights]::Normal
                    }

                    if ($b.category -eq "dialogue") {
                        $card.Background = (New-Object System.Windows.Media.BrushConverter).ConvertFromString("#F50B1018")
                        $card.BorderBrush = $accentCyanBrush
                    } else {
                        $card.Background = $maskBgBrush
                        $card.BorderBrush = $maskBorderBrush
                    }
                }

                # Hide inactive cards
                foreach ($key in $replacementCards.Keys) {
                    if ($activeKeys -notcontains $key) {
                        $replacementCards[$key].Visibility = [System.Windows.Visibility]::Collapsed
                    }
                }
            }
        } catch {
            # Ignore transient JSON read locks
        }
    }
})

$timer.Start()
$window.ShowDialog() | Out-Null
