@echo off
set NODE_OPTIONS=--max-old-space-size=4096
set BROWSER=none
cd /d "%~dp0frontend"
npm start
