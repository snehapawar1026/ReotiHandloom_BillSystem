Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
strPath = fso.GetParentFolderName(WScript.ScriptFullName)
WshShell.CurrentDirectory = strPath

' Start Node server silently in background without showing terminal window
WshShell.Run "cmd /c node server.js", 0, False

' Wait 1.5 seconds for server initialization
WScript.Sleep 1500

' Open application in default web browser
WshShell.Run "cmd /c start http://localhost:5000", 0, False
