# AGENTS.md — 部署与运维约定（stevenzxs fork）

本文件约束本仓库（`stevenzxs/evershop` fork）的部署流程与服务器运维规则。通用代码规范见 `CLAUDE.md` 与 `wiki/`。

## 部署架构（shop.stevenzxs.cn，104.244.90.25）

```
公网 → Caddy (sub2api-caddy, 80/443) → evershop 容器 (127.0.0.1:3000)
                                        ├─ 挂载: /opt/evershop/{config,translations,media}
                                        ├─ DB: sub2api-postgres:5432 / dbname=evershop
                                        └─ 网络: deploy_sub2api-network
```

## 可复现部署流水线（禁止补丁式部署）

一律走「本地干净构建 → 上传 → 服务器组装镜像 → 候选验证 → 切换」：

1. `git archive HEAD` 导出干净源码（不接受工作区直接打包）
2. WSL Ubuntu（glibc，Node v20.20.2 与生产一致）执行：`npm install` → `npm run compile` → `npm run compile:db` → 回归测试（`node --test tests/regression/`）→ `npm run build`。Windows 产物**不可**直接部署（sharp 等原生模块平台不符）
3. `tar.gz` 经 scp 上传（**禁用 PowerShell 管道传二进制，会损坏**；传后 `sha256sum` 校验）
4. 服务器侧只做 `FROM node:20-bookworm-slim + COPY` 组镜像（零重计算；不要用 alpine，glibc 依赖）
5. 候选容器（3001 端口）验证通过后再切换；切换即停旧容器、改名保留、新容器接管 3000
6. 中文/含非 ASCII 内容的 SQL、配置、CSV 一律 base64 编码传输，禁止经 PowerShell 管道直传（会乱码）

## 硬性规则：服务器上不保存旧的部署文件

服务器磁盘仅 19G，**每次部署产物（解压目录 + 镜像层）约 1.6GB，不清理必打满**（2026-11-02 已因此磁盘 95% 故障一次）。每次部署完成后必须执行：

```bash
# 1. 删除解压产物（tar.gz 保留即可，需要时可再解压）
rm -rf /opt/evershop/releases/*/app

# 2. tar.gz 最多保留最近 1 个
cd /opt/evershop/releases && ls -t */app.tar.gz | tail -n +2 | xargs -r rm -f

# 3. evershop-local 镜像最多保留最近 1 个（当前运行），旧的一律删除
docker images evershop-local --format '{{.ID}} {{.CreatedAt}}' | sort -rk2 | tail -n +2 | awk '{print $1}' | xargs -r docker rmi

# 4. 悬空层清理
docker image prune -f
```

回滚策略：**只保留 1 个备份容器**（`evershop-before-*`，最近一次的上一版）。更早的回滚点不保留——数据库有 `backups/` 定期 dump，代码有 git，历史镜像不必留。

## 多语言内容维护

- 内容（分类/产品/菜单名）用**英文源串**录入；翻译存 DB 表 `translation_override(locale, source, target)`
- 新增翻译：`docker exec evershop node /app/scripts/translation-upsert.mjs <locale> <source> <target>`，30 秒内自动热生效，**禁止重启容器**
- 字典热刷新由 `translationdb` 模块自动完成（30s 指纹轮询）；CSV 文件仅作基础层，改动 CSV 才需要重启

## 变更纪律

- 先改源码提交 git，再走流水线部署；禁止在服务器容器内直接改文件后 `docker commit`
- 每次部署在 `/opt/evershop/releases/<tag>-<date>/` 留 `container-before.json`（切换前的容器规格快照）
- DB 变更（迁移/手工 UPDATE）前先备份：`docker exec sub2api-postgres pg_dump -U sub2api -d evershop -Fc` → `/opt/evershop/backups/`
