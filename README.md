# 户型还原模型

根据看房视频还原的家：写实第一视角漫游、可拖动家具的平面图、整体 3D 模型。
线上地址：<https://model.yyzzrr.top/>（也可用 <http://39.97.61.240:8090/>）

## 目录

| 路径 | 内容 |
| --- | --- |
| `src/index.html` | 页面源码（户型数据、家具、平面图、3D 漫游都在这一个文件里）。同一份也发布在 claude.ai 上 |
| `src/frames/` | 视频截图，房间详情里“视频里看到的”用 |
| `src/tex/` | 从视频里裁出来的贴图：入户门、厨房墙砖、木地板、柜子木纹、窗外景色 |
| `vendor/` | three.js 0.147.0（MIT，见 `three-LICENSE`），服务器版从本站加载，不走国外 CDN |
| `scripts/check.mjs` | 部署前检查：脚本能解析、室内面积 = 139.5 m²、推荐家具没有冲突、定制柜不压墙、每个房间都走得进去 |
| `scripts/smoke3d.cjs` | 部署前用真实的 three.js 把每种家具和装饰都构建一遍，拦住 3D 代码里的运行错误 |
| `scripts/build.sh` | 生成服务器版 `dist/`：补全 HTML 外壳、three.js 改为本站加载、去掉 Google 字体 |
| `deploy/nginx-model.conf`、`deploy/nginx-house-8090.conf` | 服务器上 nginx 配置的副本（参考用）：域名走 443（HTTPS，Let's Encrypt 证书自动续期），8090 端口保留 |

户型尺寸改 `src/index.html` 里的 `const G = {…}` 轴线；每个房间、墙、门窗、定制柜都按这些轴线定位。

## 自动部署

推到 `main` 分支后，GitHub Actions（`.github/workflows/deploy.yml`）会：

1. `node scripts/check.mjs` 和 `node scripts/smoke3d.cjs`，任何一项不通过就停下，不部署；
2. `bash scripts/build.sh` 打包；
3. 用 `deploy` 用户把 `dist/` 上传到服务器 `/var/www/house-releases/<时间>-<提交号>/`；
4. 把 `/var/www/house-releases/current` 链接一次性切到新版本（nginx 就是从这里读的），只保留最近 5 个版本；
5. 请求一次线上地址，确认能打开。

在 GitHub 仓库的 Actions 页能看到每次部署的记录；也可以在那里手动点 “Run workflow” 重新部署。

### 一次性设置

仓库 Settings → Secrets and variables → Actions → New repository secret：

- 名称：`DEPLOY_SSH_KEY`
- 内容：部署私钥的全部内容（本机 `C:\Users\niyin\.ssh\3d-model-deploy`，从 `-----BEGIN` 到 `-----END…KEY-----` 整段）

这把钥匙只能登录服务器上的 `deploy` 用户，它只能写 `/var/www/house-releases`，不能用 root。

### 提交后自动推送（可选）

```bash
bash scripts/install-hooks.sh
```

装好后每次在 `main` 上 `git commit`，都会自动 `git push`，随即触发部署。

### 本地预览

```bash
node scripts/check.mjs && bash scripts/build.sh && python -m http.server 8000 --directory dist
```

然后打开 <http://localhost:8000/>。

### 回滚到上一个版本

```bash
ssh deploy@39.97.61.240 'cd /var/www/house-releases && ls -1dt 2*/'
ssh deploy@39.97.61.240 'cd /var/www/house-releases && ln -sfn "$PWD/<要回到的版本目录>" current.tmp && mv -Tf current.tmp current'
```
