@echo off
setlocal EnableDelayedExpansion

REM ============================================================
REM 洛谷客户端 - 一键打包脚本（electron-updater 兼容版）
REM 版本：由 package.json 统一维护
REM 特性：离线构建 / 自动生成 latest.yml / Pre-Release 支持
REM ============================================================

REM ---------- 基础路径 ----------
set PROJECT_DIR=D:\GitHub\luogu-electron
set DIST_DIR=%PROJECT_DIR%\dist
set UNPACKED_DIR=%DIST_DIR%\win-unpacked
set ICO_FILE=%PROJECT_DIR%\luogu.ico
set TRAY_ICO=%PROJECT_DIR%\tray-icon.ico
set NSIS_SCRIPT=%PROJECT_DIR%\build-installer.nsi

REM ---------- Electron 离线环境 ----------
set ELECTRON_DIST=%PROJECT_DIR%\electron-dist
set ELECTRON_BUILDER_BINARIES_MIRROR=
set ELECTRON_BUILDER_CACHE=C:\Users\1ir_b\AppData\Local\electron-builder\cache

REM ---------- Node.js / Builder 行为 ----------
set NODE_OPTIONS=--use-system-ca
set ELECTRON_SKIP_BINARY_DOWNLOAD=1

REM ---------- 进入项目目录（防止在 System32 执行）----------
cd /d %PROJECT_DIR%
if not exist "package.json" (
    echo [致命错误] 当前目录不是项目根目录：
    echo            %CD%
    pause
    exit /b 1
)

REM ---------- 读取版本号（从 package.json）----------
for /f "tokens=2 delims=:, " %%a in ('findstr "\"version\":" package.json') do (
    set APP_VERSION=%%~a
)
set APP_VERSION=%APP_VERSION:"=%

echo ============================================================
echo   洛谷客户端 - 一键打包脚本
echo   版本：%APP_VERSION%
echo   模式：离线构建（electron-updater 兼容）
echo ============================================================
echo.

REM ---------- 1. 清理旧产物 ----------
echo [1/6] 清理旧的打包产物...
if exist %DIST_DIR% (
    rmdir /s /q %DIST_DIR%
)
echo        OK
echo.

REM ---------- 2. 校验关键文件 ----------
echo [2/6] 校验关键文件...
if not exist "%ELECTRON_DIST%\electron.exe" (
    echo [错误] Electron 离线目录缺失：
    echo        %ELECTRON_DIST%
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

REM ---------- 3. electron-builder 打包 ----------
echo [3/6] 执行 electron-builder（离线模式）...
call npm run dist
if errorlevel 1 (
    echo [错误] Electron 打包失败
    pause
    exit /b 1
)
if not exist "%UNPACKED_DIR%\洛谷.exe" (
    echo [错误] win-unpacked\洛谷.exe 未生成
    pause
    exit /b 1
)
echo        OK
echo.

REM ---------- 4. 复制运行时资源 ----------
echo [4/6] 复制运行时资源（ico / tray-icon）...
copy /y "%ICO_FILE%" "%UNPACKED_DIR%\luogu.ico" >nul
if exist "%TRAY_ICO%" (
    copy /y "%TRAY_ICO%" "%UNPACKED_DIR%\tray-icon.ico" >nul
)
echo        OK
echo.

REM ---------- 5. 编译 NSIS 安装包 ----------
echo [5/6] 编译 NSIS 安装包...
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

REM ---------- 6. 构建完成 ----------
echo ============================================================
echo   打包完成！
echo ============================================================
echo   版本号：       %APP_VERSION%
echo   安装包：       %DIST_DIR%\洛谷 Setup %APP_VERSION%.exe
echo   绿色版：       %UNPACKED_DIR%\洛谷.exe
echo   更新元数据：   %DIST_DIR%\latest.yml
echo.
echo   后续步骤：
echo   1. 测试安装包是否正常安装 / 卸载
echo   2. 确认关于对话框版本号
echo   3. GitHub Release 上传以下文件：
echo      - 洛谷 Setup %APP_VERSION%.exe
echo      - latest.yml
echo ============================================================
echo.
pause
endlocal