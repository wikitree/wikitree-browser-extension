%~d0
cd %~dp0
call npm run build-firefox
"C:\Program Files\Mozilla Firefox\firefox.exe" "about:debugging#/runtime/this-firefox"