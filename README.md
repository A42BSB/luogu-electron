# 洛谷桌面客户端（Luogu Electron）

基于 Electron 的洛谷桌面客户端，套壳浏览器方案，体验接近网页版，但：

- ✅ 不跳转系统浏览器
- ✅ 新标签页弹新 Electron 窗口
- ✅ 中文菜单栏
- ✅ Ctrl+R 刷新
- ✅ 登录态持久保存
- ✅ 可打包为 Windows 安装包

## 功能特性

- 洛谷站内链接：当前窗口或新窗口打开
- 站外链接：应用内处理，不弹浏览器
- 右键中文菜单（复制 / 搜索 / 新窗口打开）
- Cookie 长期化，基本免重复登录

## 使用方式

### 方式一：安装包（推荐）
去 Releases 页面下载 `洛谷 Setup x.x.x.exe`，双击安装。

### 方式二：开发者运行
```bash
npm install
npm start
```
需要本机有 Electron 二进制，可用 ELECTRON_OVERRIDE_DIST_PATH 指定。

## 项目结构
## 技术栈
Electron 43 / NSIS / Resource Hacker

## 声明
仅供学习 Electron 打包流程，与洛谷官方无关。

## 许可证
MIT License
