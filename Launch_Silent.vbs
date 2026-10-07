Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
strPath = fso.GetParentFolderName(WScript.ScriptFullName)
WshShell.CurrentDirectory = strPath

' Start Node server silently in background without showing terminal window
WshShell.Run "cmd /c set ""PATH=C:\Program Files\nodejs;%PATH%"" && node server.js", 0, False

' Wait 2 seconds for server initialization
WScript.Sleep 2000

' Open application in default web browser
WshShell.Run "cmd /c start http://localhost:5000", 0, False
