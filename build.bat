@echo off
setlocal EnableDelayedExpansion
set USE_HARD_LINKS=false
REM ============================================================
REM 洛谷客户端 - 一键打包脚本（x64 + ARM64 离线构建）
REM ============================================================

REM ---------- 基础路径 ----------
set PROJECT_DIR=D:\GitHub\luogu-electron
set DIST_DIR=%PROJECT_DIR%\dist
set ICO_FILE=%PROJECT_DIR%\luogu.ico
set NSIS_SCRIPT=%PROJECT_DIR%\build-installer.nsi

REM ---------- Electron 离线目录 ----------
set ELECTRON_DIST_X64=%PROJECT_DIR%\electron-dist
set ELECTRON_DIST_ARM64=%PROJECT_DIR%\electron-dist-arm64

REM ---------- 离线构建关键环境变量 ----------
set ELECTRON_SKIP_BINARY_DOWNLOAD=1
set ELECTRON_BUILDER_BINARIES_MIRROR=
set NODE_OPTIONS=--use-system-ca

REM ---------- 进入项目目录 ----------
cd /d %PROJECT_DIR%
if not exist "package.json" (
    echo [错误] 当前目录不是项目根目录：
    echo        %CD%
    pause
    exit /b 1
)

REM ---------- 读取版本号 ----------
for /f "tokens=2 delims=:, " %%a in ('findstr "\"version\":" package.json') do (
    set APP_VERSION=%%~a
)
set APP_VERSION=%APP_VERSION:"=%

echo ============================================================
echo   洛谷客户端 - 一键打包脚本
echo   版本：%APP_VERSION%
echo   模式：离线构建（x64 + ARM64）
echo ============================================================
echo.

REM ---------- 1. 清理旧产物 ----------
echo [1/7] 清理旧的打包产物...
if exist "%DIST_DIR%" (
    rmdir /s /q "%DIST_DIR%"
)
echo        OK
echo.

REM ---------- 2. 校验关键文件 ----------
echo [2/7] 校验关键文件...
if not exist "%ELECTRON_DIST_X64%\electron.exe" (
    echo [错误] x64 Electron 不存在：
    echo        %ELECTRON_DIST_X64%
    pause
    exit /b 1
)
if not exist "%ELECTRON_DIST_ARM64%\electron.exe" (
    echo [错误] ARM64 Electron 不存在：
    echo        %ELECTRON_DIST_ARM64%
    pause
    exit /b 1
)
if not exist "%ICO_FILE%" (
    echo [错误] luogu.ico 不存在
    pause
    exit /b 1
)
echo        OK
echo.

REM ---------- 3. 构建 x64 ----------
echo [3/7] 构建 x64...
call npm run dist -- -c.electronDist="%ELECTRON_DIST_X64%" --win --x64
if errorlevel 1 (
    echo [错误] x64 构建失败
    pause
    exit /b 1
)
copy /y "%DIST_DIR%\latest.yml" "%DIST_DIR%\latest-x64.yml"
echo        OK
echo.

REM ---------- 4. 构建 ARM64 ----------
echo [4/7] 构建 ARM64...
call npm run dist -- -c.electronDist="%ELECTRON_DIST_ARM64%" --win --arm64
if errorlevel 1 (
    echo [错误] ARM64 构建失败
    pause
    exit /b 1
)
copy /y "%DIST_DIR%\latest.yml" "%DIST_DIR%\latest-arm64.yml"
echo        OK
echo.

REM ---------- 5. 复制运行时资源 ----------
echo [5/7] 复制运行时资源...
if exist "%DIST_DIR%\win-unpacked" (
    copy /y "%ICO_FILE%" "%DIST_DIR%\win-unpacked\luogu.ico" >nul
)
if exist "%PROJECT_DIR%\tray-icon.ico" (
    copy /y "%PROJECT_DIR%\tray-icon.ico" "%DIST_DIR%\win-unpacked\tray-icon.ico" >nul
)
echo        OK
echo.

REM ---------- 6. 编译 NSIS 安装包 ----------
echo [6/7] 编译 NSIS 安装包...
if exist "%NSIS_SCRIPT%" (
    makensis.exe "%NSIS_SCRIPT%"
    if errorlevel 1 (
        echo [错误] NSIS 编译失败
        pause
        exit /b 1
    )
) else (
    echo [警告] NSIS 脚本不存在，跳过安装包构建
)
echo        OK
echo.

REM ---------- 7. 构建完成 ----------
echo ============================================================
echo   构建完成
echo ============================================================
echo   版本号：       %APP_VERSION%
echo   安装包（x64）：%DIST_DIR%\洛谷 Setup %APP_VERSION%-x64.exe
echo   安装包（ARM64）：%DIST_DIR%\洛谷 Setup %APP_VERSION%-arm64.exe
echo   更新元数据：
echo     - %DIST_DIR%\latest.yml
echo     - %DIST_DIR%\latest-arm64.yml
echo.
echo   后续步骤：
echo   1. 测试安装包是否正常安装 / 卸载
echo   2. 确认关于对话框版本号
echo   3. GitHub Release 上传以下文件：
echo      - 洛谷 Setup %APP_VERSION%-x64.exe
echo      - 洛谷 Setup %APP_VERSION%-arm64.exe
echo      - latest.yml
echo      - latest-arm64.yml
echo ============================================================
pause
endlocal