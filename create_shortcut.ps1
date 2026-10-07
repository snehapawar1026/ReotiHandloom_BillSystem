$WshShell = New-Object -ComObject WScript.Shell
$DesktopPath = [Environment]::GetFolderPath('Desktop')
$Shortcut = $WshShell.CreateShortcut("$DesktopPath\Reoti Handloom Billing.lnk")
$Shortcut.TargetPath = "wscript.exe"
$Shortcut.Arguments = """D:\ReotiHandloom_BillSystem\Launch_Silent.vbs"""
$Shortcut.WorkingDirectory = "D:\ReotiHandloom_BillSystem"
$Shortcut.Description = "Reoti Handloom Billing System"
$Shortcut.Save()
Write-Host "Desktop Shortcut Created Successfully at: $DesktopPath\Reoti Handloom Billing.lnk"
