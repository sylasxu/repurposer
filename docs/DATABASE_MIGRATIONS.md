# 数据库迁移指南

Repurposer 后端使用 [SQLAlchemy 2.0](https://www.sqlalchemy.org/) 作为 ORM，[Alembic](https://alembic.sqlalchemy.org/) 作为数据库迁移工具。

## 为什么用 Alembic

SQLAlchemy 的 `Base.metadata.create_all()` 只能在数据库为空时创建表，**无法安全地修改已有表的列、约束或类型**。随着项目演进，给已有表加列、改 nullable、加索引是常态。Alembic 是 SQLAlchemy 官方维护的迁移工具，可以：

- 记录每次 schema 变更的版本历史
- 支持升级（upgrade）和回滚（downgrade）
- 自动生成迁移脚本（autogenerate），减少手写 SQL
- 在 CI/CD 中显式控制数据库版本

## 环境准备

确保 PostgreSQL 已启动（本地开发通常由 `docker compose up -d db` 或 `./scripts/dev.sh` 自动拉起），并且 `apps/api/.env` 中的 `DATABASE_URL` 配置正确。

## 常用命令

所有命令都在 `apps/api` 目录下执行：

```bash
cd apps/api
```

### 应用迁移到最新版本

```bash
uv run alembic upgrade head
```

### 查看当前数据库版本

```bash
uv run alembic current
```

### 生成新的自动迁移

修改了 `app/models/tables.py` 或 `app/models/schemas.py` 后：

```bash
uv run alembic revision --autogenerate -m "describe your change"
```

生成的脚本会放在 `migrations/versions/` 目录。生成后**务必人工检查**，autogenerate 对复杂约束、enum 改名、默认值等场景不一定完全准确。

### 回滚迁移

```bash
# 回滚一级
uv run alembic downgrade -1

# 回滚到初始状态
uv run alembic downgrade base
```

### 查看迁移历史

```bash
uv run alembic history
```

## 自动迁移（应用启动）

`app/models/database.py` 的 `init_db()` 会在 FastAPI lifespan 中调用：

```python
command.upgrade(alembic_cfg, "head")
```

此外，`./scripts/dev.sh` 在启动 API 之前也会显式执行：

```bash
uv run alembic upgrade head
```

这意味着日常本地开发 `./scripts/dev.sh` 启动时，数据库会自动同步到最新版本。

但以下场景建议显式执行迁移：

- 首次在新机器/新数据库上运行
- CI/CD 部署流程
- 生产环境（避免依赖应用启动时的隐式迁移）

## 重要约定

1. **不要手动改数据库**：所有 schema 变更都通过 Alembic 迁移脚本完成。
2. **提交迁移脚本**：`migrations/versions/*.py` 是代码的一部分，需要提交到 git。
3. **人工审查 autogenerate 结果**：生成迁移后打开脚本检查，确保它确实表达了你的意图。
4. **模型导入**：`migrations/env.py` 已导入 `app.models.tables`，确保 autogenerate 能检测到所有模型。
5. **同步 vs 异步驱动**：主应用使用 `postgresql+asyncpg`，Alembic 使用 `postgresql+psycopg2`，`env.py` 会自动转换 URL。

## 常见问题

### 启动时报 "Can't locate revision identified by xxxx"

通常是因为本地 `alembic_version` 表里记录的版本和 `migrations/versions/` 目录不一致。解决办法：

```bash
# 如果数据库是空的或可以重建
uv run alembic downgrade base
uv run alembic upgrade head

# 如果只是版本记录错乱，可以手动修正
uv run alembic stamp head
```

### autogenerate 没有检测到变化

检查 `migrations/env.py` 是否正确导入了包含模型定义的模块。本项目已导入 `app.models.tables`。

### 想从零开始重建本地数据库

```bash
# 谨慎：这会删除所有数据
uv run python -c "
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from app.config import settings
from app.models.database import Base

async def reset():
    engine = create_async_engine(settings.database_url)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()

asyncio.run(reset())
"
uv run alembic upgrade head
```

生产环境**绝对不要**这样做。
