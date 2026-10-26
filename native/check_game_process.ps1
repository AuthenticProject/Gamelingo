$proc = Get-Process | Where-Object { $_.MainWindowTitle -match 'Wuthering|Waves|Client-Win64' -or $_.ProcessName -match 'Wuthering|Waves|Client-Win64' }
if ($proc) {
    Write-Output "GAME_FOUND"
    $proc | Select-Object Id, ProcessName, MainWindowTitle, MainWindowHandle | Format-Table -AutoSize
} else {
    Write-Output "GAME_NOT_RUNNING"
}
