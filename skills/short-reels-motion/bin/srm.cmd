@echo off
rem Runs the Short Reels Motion CLI shipped next to this skill, from cmd (see srm.mjs). Not from PowerShell: it hands
rem the arguments to cmd.exe, which reads & | < > ^ inside an unquoted one as its own; there run node srm.mjs instead.
node "%~dp0srm.mjs" %*
