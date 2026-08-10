@echo off
cd /d "C:\Users\admin\Desktop\Billbook\billbook\backend"
echo [%date% %time%] Running sweep-demo >> logs\demo-sweep.log
"venv\Scripts\flask.exe" sweep-demo >> logs\demo-sweep.log 2>&1