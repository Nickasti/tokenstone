@echo off
rem Doppio clic: accende il cantiere e apre la scena nel browser.
rem Per spegnere, chiudi questa finestra.
rem Se il cantiere e gia acceso, apre solo la pagina.

title Acropoli - cantiere
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo   Per accendere il cantiere serve Node.js, versione 18 o successiva.
  echo   Si scarica da https://nodejs.org - poi fai di nuovo doppio clic qui.
  echo.
  pause
  exit /b 1
)

node tools\server.js %*
if errorlevel 1 (
  echo.
  pause
)
