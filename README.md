# 洛谷客户端（非官方）

基于 Electron 的洛谷桌面客户端。

## 下载

可从[Releases](https://github.com/A42Null/luogu-electron/releases/latest)中下载。

若下载速度慢，可前往[镜像站](https://luogu-electron-cdn.pages.dev/releases)下载。（实测速度在4MB/s~20MB/s之间）

菜单“帮助”中可开启 Cloudflare 镜像源，用于加速检查更新和下载。

## 技术说明

- 支持 GitHub / Cloudflare 双更新源
- Cloudflare Pages 反代 GitHub Releases
- 构建产物为纯英文命名，避免编码问题

## 协议

[MIT](https://github.com/A42Null/luogu-electron/blob/main/LICENSE)

## 使用须知

本客户端本质是一个桌面壳，所有网络请求均来自嵌入式浏览器，与你直接使用浏览器访问洛谷无异。

请对自身账号安全负责：

* 不要在使用本客户端时安装来路不明的插件
* 不要将账号、Cookie 等信息提供给第三方工具
* 不要通过本客户端制造异常访问或高频请求

如因上述行为触发洛谷风控，属于可预期的技术后果，与本客户端无关。

以上内容使用Hy3润色。

根据 https://www.luogu.com.cn/discuss/1337298 ，此应用并非“高科技”，只不过是个“经过加工的浏览器（[electron](https://electronjs.org)）”。  
`1.0.2-alpha.5`版本及以后的应用图标为作者自行绘制，未使用洛谷官方美术资源或商标，与洛谷官方无关。
