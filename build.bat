@echo off
setlocal EnableDelayedExpansion

REM ============================================================
REM 洛谷客户端 - 一键打包脚本
REM 版本：1.0.2.0 (Pre-Release)
REM 说明：不清空旧产物 / makensis 已加入 PATH
REM ============================================================
set APP_VERSION=1.0.2.0
set SETUP_NAME=洛谷 Setup %APP_VERSION%.exe
set DIST_DIR=dist
set UNPACKED_DIR=%DIST_DIR%\win-unpacked
set ICO_FILE=luogu.ico
set TRAY_ICO=tray-icon.ico
set NSIS_SCRIPT=build-installer.nsi
set ELECTRON_DIST=D:\GitHub\luogu-electron\electron-dist
set NODE_OPTIONS=--use-system-ca
set ELECTRON_SKIP_BINARY_DOWNLOAD=1

echo ============================================================
echo   洛谷客户端 一键打包脚本
echo   版本：%APP_VERSION% (Pre-Release)
echo ============================================================
echo.

REM ------------------------------------------------------------
REM 1. 检查 Electron 离线路径
REM ------------------------------------------------------------
echo [1/5] 检查 Electron 离线路径...
if not exist "%ELECTRON_DIST%\electron.exe" (
    echo [错误] Electron 离线路径不存在：
    echo        %ELECTRON_DIST%
    pause
    exit /b 1
)
echo        OK
echo.

REM ------------------------------------------------------------
REM 2. 设置环境变量并打包 Electron 应用
REM （不清空旧产物，按你的要求）
REM ------------------------------------------------------------
echo [2/5] 打包 Electron 应用（生成 / 更新 win-unpacked）...
set ELECTRON_OVERRIDE_DIST_PATH=%ELECTRON_DIST%
call npm run dist
if errorlevel 1 (
    echo [错误] Electron 打包失败，请检查 npm 日志
    pause
    exit /b 1
)
if not exist "%UNPACKED_DIR%\luogu.exe" (
    echo [错误] win-unpacked\luogu.exe 未生成
    pause
    exit /b 1
)
echo        OK
echo.

REM ------------------------------------------------------------
REM 3. 复制资源文件到 win-unpacked
REM ------------------------------------------------------------
echo [3/5] 复制资源文件（ico / tray-icon）...
copy /y %ICO_FILE% %UNPACKED_DIR%\%ICO_FILE% >nul
if not exist "%UNPACKED_DIR%\%ICO_FILE%" (
    echo [警告] 复制 %ICO_FILE% 失败
)
if exist %TRAY_ICO% (
    copy /y %TRAY_ICO% %UNPACKED_DIR%\%TRAY_ICO% >nul
)
echo        OK
echo.

REM ------------------------------------------------------------
REM 4. 编译 NSIS 安装包（makensis 已在 PATH）
REM ------------------------------------------------------------
echo [4/5] 编译 NSIS 安装包（%SETUP_NAME%）...
makensis.exe %NSIS_SCRIPT%
if errorlevel 1 (
    echo [错误] NSIS 编译失败，请检查脚本编码是否为 GBK
    pause
    exit /b 1
)
if not exist "%DIST_DIR%\%SETUP_NAME%" (
    echo [错误] 安装包未生成：%SETUP_NAME%
    pause
    exit /b 1
)
echo        OK
echo.

REM ------------------------------------------------------------
REM 5. 完成
REM ------------------------------------------------------------
echo ============================================================
echo   打包完成！
echo ============================================================
echo   版本号：       %APP_VERSION% (Pre-Release)
echo   安装包：       %DIST_DIR%\%SETUP_NAME%
echo   绿色版：       %UNPACKED_DIR%\luogu.exe
echo.
echo   注意事项：
echo   - 旧 dist 产物未被清理（按你的要求）
echo   - 若安装包体积异常，请检查 win-unpacked 是否被重复拷贝
echo.
echo   下一步建议：
echo   1. 测试安装 / 卸载
echo   2. 检查关于对话框版本号
echo   3. GitHub 发布 Pre-Release
echo ============================================================
echo.
pause
endlocal