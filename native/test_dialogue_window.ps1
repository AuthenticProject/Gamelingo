Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$form = New-Object System.Windows.Forms.Form
$form.Text = "Wuthering Waves - Dialogue Box Test"
$form.Size = New-Object System.Drawing.Size(750, 220)
$form.StartPosition = "Manual"
$form.Location = New-Object System.Drawing.Point(300, 400)
$form.BackColor = [System.Drawing.Color]::FromArgb(15, 20, 28)
$form.FormBorderStyle = [System.Windows.Forms.FormBorderStyle]::FixedSingle
$form.MaximizeBox = $false

$label = New-Object System.Windows.Forms.Label
$label.Size = New-Object System.Drawing.Size(700, 130)
$label.Location = New-Object System.Drawing.Point(20, 25)
$label.ForeColor = [System.Drawing.Color]::White
$label.Font = New-Object System.Drawing.Font("Arial", 16, [System.Drawing.FontStyle]::Regular)
$label.Text = "Rover: Something doesn't feel right here."
$form.Controls.Add($label)

$dialogues = @(
    "Rover: Something doesn't feel right here.",
    "Yangyang: The Retroact Rain will begin soon. We must report back to Magistrate Jinhsi in Jinzhou.",
    "Chixia: Don't worry! My Dual Pistols and Fusion Forte are ready for any Tacet Discord!",
    "Baizhi: The frequency fluctuations here are abnormal. Let me analyze the Echo resonance."
)

$index = 0
$timer = New-Object System.Windows.Forms.Timer
$timer.Interval = 3000
$timer.Add_Tick({
    $script:index = ($script:index + 1) % $dialogues.Count
    $label.Text = $dialogues[$script:index]
})
$timer.Start()

$form.ShowDialog() | Out-Null
