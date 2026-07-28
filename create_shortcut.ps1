$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut("C:\Users\nda\Desktop\Reoti Handloom Billing.lnk")
$Shortcut.TargetPath = "wscript.exe"
$Shortcut.Arguments = """D:\ReotiHandloom_BillSystem\Launch_Silent.vbs"""
$Shortcut.WorkingDirectory = "D:\ReotiHandloom_BillSystem"
$Shortcut.Description = "Reoti Handloom Billing System"
$Shortcut.Save()
Write-Host "Desktop Shortcut Created Successfully!"
