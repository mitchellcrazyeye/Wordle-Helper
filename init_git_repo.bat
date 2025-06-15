@echo off
REM Git Repository Initializer Batch Script
REM This script initializes a Git repository in the current or specified directory

setlocal enabledelayedexpansion

REM Check if Git is installed
where git >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Git is not installed or not in PATH.
    echo Please install Git from: https://git-scm.com/downloads
    exit /b 1
)

REM Parse arguments
set TARGET_DIR=.
set USER_NAME=
set USER_EMAIL=

:parse_args
if "%~1"=="" goto continue_execution
if /i "%~1"=="-p" (
    set TARGET_DIR=%~2
    shift
    shift
    goto parse_args
)
if /i "%~1"=="-n" (
    set USER_NAME=%~2
    shift
    shift
    goto parse_args
)
if /i "%~1"=="-e" (
    set USER_EMAIL=%~2
    shift
    shift
    goto parse_args
)
echo Unknown parameter: %~1
shift
goto parse_args

:continue_execution
REM Save current directory
set CURRENT_DIR=%CD%

REM Check if target directory exists
if not exist "%TARGET_DIR%" (
    echo ERROR: Directory "%TARGET_DIR%" does not exist.
    exit /b 1
)

REM Navigate to target directory
cd /d "%TARGET_DIR%"
echo Initializing Git repository in: "%CD%"

REM Check if .git already exists
if exist ".git" (
    echo Git repository already exists in this directory.
    cd /d "%CURRENT_DIR%"
    exit /b 1
)

REM Initialize repository
git init
if %ERRORLEVEL% NEQ 0 (
    echo Failed to initialize Git repository.
    cd /d "%CURRENT_DIR%"
    exit /b 1
)
echo Git repository initialized successfully.

REM Configure user if provided
if defined USER_NAME (
    git config user.name "%USER_NAME%"
    echo Git user name set to: %USER_NAME%
)

if defined USER_EMAIL (
    git config user.email "%USER_EMAIL%"
    echo Git user email set to: %USER_EMAIL%
)

REM Create .gitignore if it doesn't exist
if not exist ".gitignore" (
    echo Creating default .gitignore file...
    (
        echo # OS generated files
        echo .DS_Store
        echo Thumbs.db
        echo desktop.ini
        echo.
        echo # Editor files
        echo *.swp
        echo .idea/
        echo .vscode/
        echo *.sublime-*
    ) > .gitignore
    echo Created default .gitignore file.
)

REM Add all files
git add .
echo All files added to staging area.

REM Make initial commit
for /f "tokens=2-4 delims=/ " %%a in ('date /t') do (set DATE=%%c-%%a-%%b)
for /f "tokens=1-2 delims=: " %%a in ('time /t') do (set TIME=%%a:%%b)
git commit -m "Initial commit - %DATE% %TIME%"
if %ERRORLEVEL% NEQ 0 (
    echo Warning: Could not create initial commit.
    echo You may need to set your Git user name and email with:
    echo   git config --global user.name "Your Name"
    echo   git config --global user.email "your.email@example.com"
) else (
    echo Initial commit created successfully.
)

REM Return to original directory
cd /d "%CURRENT_DIR%"

echo.
echo Repository successfully initialized!
echo.
echo Next steps:
echo   1. To add a remote repository:
echo      git remote add origin ^<repository-url^>
echo   2. To push your changes:
echo      git push -u origin main

exit /b 0
