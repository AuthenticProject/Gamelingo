Add-Type -AssemblyName System.Drawing

$width = 1920
$height = 1080
$bmp = New-Object System.Drawing.Bitmap $width, $height
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

# Dark game scenery backdrop
$bgBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    (New-Object System.Drawing.Point 0, 0),
    (New-Object System.Drawing.Point 0, $height),
    [System.Drawing.Color]::FromArgb(255, 15, 23, 35),
    [System.Drawing.Color]::FromArgb(255, 8, 12, 18)
)
$g.FillRectangle($bgBrush, 0, 0, $width, $height)

# Brushes and Fonts
$whiteBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 245, 247, 250))
$yellowBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 255, 204, 77))
$cyanBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 53, 214, 232))
$grayBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 160, 175, 195))

$titleFont = New-Object System.Drawing.Font ("Segoe UI", [float]18, [System.Drawing.FontStyle]::Bold)
$bodyFont = New-Object System.Drawing.Font ("Segoe UI", [float]14, [System.Drawing.FontStyle]::Regular)
$smallFont = New-Object System.Drawing.Font ("Segoe UI", [float]11, [System.Drawing.FontStyle]::Regular)
$btnFont = New-Object System.Drawing.Font ("Segoe UI", [float]13, [System.Drawing.FontStyle]::Bold)
$dialogueFont = New-Object System.Drawing.Font ("Segoe UI", [float]22, [System.Drawing.FontStyle]::Regular)

# 1. Quest Tracker (Top Left)
$g.DrawString("Main Quest: Echoes of the Past", $titleFont, $yellowBrush, 60, 80)
$g.DrawString("Objective: Investigate the Retroact Rain near Jinzhou", $bodyFont, $whiteBrush, 60, 115)
$g.DrawString("Defeat the lurking Tacet Discord (0/3)", $smallFont, $grayBrush, 60, 145)

# 2. System Status & Currency (Top Right)
$g.DrawString("Astrite: 1,600", $bodyFont, $yellowBrush, 1550, 40)
$g.DrawString("Waveplate: 240 / 240", $bodyFont, $cyanBrush, 1720, 40)

# 3. Echo Tooltip / Inventory Menu (Center Right)
$panelBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(200, 20, 30, 45))
$g.FillRectangle($panelBrush, 1400, 200, 450, 320)
$panelPen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(100, 53, 214, 232), 1.5)
$g.DrawRectangle($panelPen, 1400, 200, 450, 320)

$g.DrawString("Echo: Crownless", $titleFont, $cyanBrush, 1420, 220)
$g.DrawString("Cost: 4 | Class: Calamity Class", $smallFont, $grayBrush, 1420, 255)
$g.DrawString("Havoc DMG Bonus: +12.0%", $bodyFont, $whiteBrush, 1420, 290)
$g.DrawString("Crit Rate: +8.5%", $bodyFont, $whiteBrush, 1420, 320)
$g.DrawString("Skill Effect: Transform into Crownless to unleash a flurry of rapid strikes, dealing massive Havoc DMG to surrounding enemies.", $smallFont, $grayBrush, (New-Object System.Drawing.RectangleF 1420, 360, 410, 80))
$g.DrawString("[ Equip to Resonator ]", $btnFont, $yellowBrush, 1520, 460)

# 4. Dialogue Box (Bottom Center)
$dialoguePanelBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(210, 10, 15, 22))
$g.FillRectangle($dialoguePanelBrush, 360, 840, 1200, 130)
$dialoguePen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(80, 53, 214, 232), 1.0)
$g.DrawRectangle($dialoguePen, 360, 840, 1200, 130)

$g.DrawString("Rover:", $titleFont, $cyanBrush, 400, 855)
$g.DrawString("The frequency in this area feels completely distorted. We must find Magistrate Jinhsi.", $dialogueFont, $whiteBrush, 400, 895)

# 5. Interaction Prompts (Bottom Right)
$g.DrawString("[F] Talk to Yangyang", $btnFont, $whiteBrush, 1650, 920)
$g.DrawString("[Space] Jump", $smallFont, $grayBrush, 1650, 960)

$outPath = Join-Path $PSScriptRoot "sample_game_frame.png"
$bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose()
$bmp.Dispose()
Write-Output "Realistic Wuthering Waves full-screen game frame created at $outPath"
