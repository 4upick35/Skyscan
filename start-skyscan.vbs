Set WshShell = CreateObject("WScript.Shell")
WshShell.Run "powershell.exe -WindowStyle Hidden -ExecutionPolicy Bypass -File ""C:\Users\4upic\CascadeProjects\weather\start-skyscan.ps1""", 0, False
