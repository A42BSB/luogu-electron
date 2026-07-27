; ============================================
; 洛谷客户端 安装包脚本
; ============================================

!define APP_NAME "洛谷"
!define APP_VERSION "1.0.1.1"
!define APP_PUBLISHER "Luogu Client"
!define APP_EXE "Luogu.exe"
!define SOURCE_DIR "dist\win-unpacked"

; 安装包基本信息
Name "${APP_NAME}"
OutFile "dist\洛谷 Setup ${APP_VERSION}.exe"
InstallDir "$PROGRAMFILES64\${APP_NAME}"
InstallDirRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" "InstallLocation"
RequestExecutionLevel admin
VIProductVersion "1.0.1.1"
VIAddVersionKey "FileDescription" "洛谷客户端安装程序"
VIAddVersionKey "ProductName" "洛谷"
VIAddVersionKey "CompanyName" "Luogu Client"
VIAddVersionKey "LegalCopyright" "Copyright (C) 2026"
VIAddVersionKey /LANG=2052 "FileVersion" "1.0.1.1"
VIAddVersionKey /LANG=2052 "ProductVersion" "1.0.1.1"

; 安装界面
!include "MUI2.nsh"

!define MUI_ABORTWARNING
!define MUI_ICON "${NSISDIR}\Contrib\Graphics\Icons\modern-install.ico"
!define MUI_UNICON "${NSISDIR}\Contrib\Graphics\Icons\modern-uninstall.ico"

!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_WELCOME
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_UNPAGE_FINISH

!insertmacro MUI_LANGUAGE "SimpChinese"

; ============================================
; 安装段
; ============================================
Section "Install" SEC01
  SetOutPath "$INSTDIR"
  
  ; 把 win-unpacked 里所有文件复制进安装目录
  File /r "${SOURCE_DIR}\*.*"
  
  ; 创建桌面快捷方式
  CreateShortcut "$DESKTOP\${APP_NAME}.lnk" "$INSTDIR\${APP_EXE}"
  
  ; 创建开始菜单快捷方式
  CreateDirectory "$SMPROGRAMS\${APP_NAME}"
  CreateShortcut "$SMPROGRAMS\${APP_NAME}\${APP_NAME}.lnk" "$INSTDIR\${APP_EXE}"
  CreateShortcut "$SMPROGRAMS\${APP_NAME}\卸载.lnk" "$INSTDIR\uninstall.exe"
  
  ; 写注册表（用于"添加/删除程序"）
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" "DisplayName" "${APP_NAME}"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" "DisplayVersion" "${APP_VERSION}"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" "Publisher" "${APP_PUBLISHER}"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" "InstallLocation" "$INSTDIR"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" "UninstallString" "$INSTDIR\uninstall.exe"
  WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" "NoModify" 1
  WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" "NoRepair" 1
  
  ; 生成卸载程序
  WriteUninstaller "$INSTDIR\uninstall.exe"
SectionEnd

; ============================================
; 卸载段
; ============================================
Section "Uninstall"
  ; 删除安装目录所有文件
  RMDir /r "$INSTDIR"
  
  ; 删除桌面快捷方式
  Delete "$DESKTOP\${APP_NAME}.lnk"
  
  ; 删除开始菜单
  RMDir /r "$SMPROGRAMS\${APP_NAME}"
  
  ; 删除注册表
  DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}"
SectionEnd