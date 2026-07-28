; ============================================
; 洛谷客户端 NSIS 安装脚本
; 支持：/S 静默安装 /D=自定义路径
; ============================================

!define APP_NAME "洛谷"
!define APP_VERSION "1.0.2.0"
!define APP_PUBLISHER "LuoguClient"
!define APP_EXE "luogu.exe"
!define SOURCE_DIR "dist\win-unpacked"

; ---------------------------
; 基础设置
; ---------------------------
Name "${APP_NAME}"
OutFile "dist\洛谷 Setup ${APP_VERSION}.exe"
InstallDir "$PROGRAMFILES64\${APP_NAME}"
InstallDirRegKey HKLM "Software\${APP_NAME}" "InstallDir"
RequestExecutionLevel admin
SilentInstall silent

; ---------------------------
; UI 设置
; ---------------------------
!include "MUI2.nsh"
!define MUI_ABORTWARNING
!define MUI_ICON "luogu.ico"
!define MUI_UNICON "luogu.ico"

!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_WELCOME
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!define MUI_FINISHPAGE_RUN "$INSTDIR\${APP_EXE}"
!define MUI_FINISHPAGE_RUN_TEXT "启动 洛谷。"
!define MUI_FINISHPAGE_RUN_CHECKED
!insertmacro MUI_UNPAGE_FINISH

!insertmacro MUI_LANGUAGE "SimpChinese"

; ---------------------------
; 版本信息（控制面板显示）
; ---------------------------
VIProductVersion "${APP_VERSION}"
VIAddVersionKey "Release Type" "Pre-Release" ;测试版提示
VIAddVersionKey "FileDescription" "${APP_NAME} 桌面客户端"
VIAddVersionKey "ProductName" "${APP_NAME}"
VIAddVersionKey "CompanyName" "${APP_PUBLISHER}"
VIAddVersionKey "LegalCopyright" "Copyright ? 2026"
VIAddVersionKey /LANG=2052 "FileVersion" "${APP_VERSION}"
VIAddVersionKey /LANG=2052 "ProductVersion" "${APP_VERSION}"

; ============================================
; 安装段
; ============================================
Section "MainSection" SEC01
  SetOutPath "$INSTDIR"

  ; 复制 Electron 应用
  File /r "${SOURCE_DIR}\*.*"

  ; 注册安装路径
  WriteRegStr HKLM "Software\${APP_NAME}" "InstallDir" "$INSTDIR"

  ; 卸载注册（控制面板）
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" \
    "DisplayName" "${APP_NAME}"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" \
    "DisplayVersion" "${APP_VERSION}"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" \
    "Publisher" "${APP_PUBLISHER}"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" \
    "UninstallString" '"$INSTDIR\uninstall.exe"'
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" \
    "InstallLocation" "$INSTDIR"
  WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" \
    "NoModify" 1
  WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" \
    "NoRepair" 1

  ; 生成卸载程序
  WriteUninstaller "$INSTDIR\uninstall.exe"

  ; 快捷方式
  CreateShortcut "$DESKTOP\${APP_NAME}.lnk" "$INSTDIR\${APP_EXE}"
  CreateDirectory "$SMPROGRAMS\${APP_NAME}"
  CreateShortcut "$SMPROGRAMS\${APP_NAME}\${APP_NAME}.lnk" "$INSTDIR\${APP_EXE}"
  CreateShortcut "$SMPROGRAMS\${APP_NAME}\卸载.lnk" "$INSTDIR\uninstall.exe"

  ; 静默模式下不弹完成页
  IfSilent 0 1
SectionEnd

; ============================================
; 卸载段
; ============================================
Section "Uninstall"
  ; 删除程序文件
  RMDir /r "$INSTDIR"

  ; 删除快捷方式
  Delete "$DESKTOP\${APP_NAME}.lnk"
  RMDir /r "$SMPROGRAMS\${APP_NAME}"

  ; 删除注册表
  DeleteRegKey HKLM "Software\${APP_NAME}"
  DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}"

  ; 静默卸载不弹提示
  IfSilent +2 0
  MessageBox MB_OK "洛谷客户端已卸载。"
SectionEnd