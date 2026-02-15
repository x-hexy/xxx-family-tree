# XY Family Tree

一个基于 Web 的家族图谱应用，聚焦“家族单元（夫妻卡/单人卡）”展示与编辑，帮助家人快速理解人物与关系。

## Current Status

当前主线实现已切换到 **V2 家庭单元模型**：
- 图谱节点：家庭单元卡（单人卡 / 夫妻双人卡）
- 图谱连线：单元到单元关系（`parent_child` / `sibling`）
- 支持自由建线、删线、重连端点
- 同代拖拽锁定同一水平线，并具备防重叠

## Key Features

- 人物信息管理（姓名、代际、头像等）
- 单元卡展示与交互
  - 点击头像选中个人
  - 双人卡内支持“夫妻左右位置互换”
- 单元关系编辑
  - 创建关系线
  - 删除关系线
  - 重连关系线端点
- 视图模式
  - 焦点树（2 跳）
  - 父系
  - 母系
  - 全景
- 搜索定位
- 只读分享链接
- 导出 PNG / PDF
- 卷轴风格 UI

## Tech Stack

- React + TypeScript + Vite
- Zustand
- React Flow (`@xyflow/react`)
- Tailwind CSS
- Supabase (Postgres + Storage)

## Project Structure

```text
src/
  components/
    graph/               # 图谱节点/连线/交互
    layout/              # 顶部栏、左右面板、弹窗
  lib/                   # Supabase 持久化
  pages/                 # 编辑页、只读页
  store/                 # Zustand 状态管理
  types/                 # 类型定义（含 familyUnit）
supabase/
  schema.sql             # V1 表结构
  schema_v2.sql          # V2 家庭单元表结构
  migration_v1_to_v2.sql # V1 -> V2 迁移
  cleanup_auto_relations.sql
  storage_policies_avatars.sql
```

## Quick Start

```bash
npm install
npm run dev
```

默认地址：
- `http://localhost:5173/`（编辑）
- `http://localhost:5173/view/:token`（只读）

## Supabase Setup

1. 在 Supabase 创建项目。
2. 执行基础表结构：`supabase/schema.sql`
3. 执行 V2 表结构：`supabase/schema_v2.sql`
4. 执行迁移脚本：`supabase/migration_v1_to_v2.sql`
5. （可选）清理历史自动线：`supabase/cleanup_auto_relations.sql`
6. 执行头像 bucket 策略：`supabase/storage_policies_avatars.sql`
7. 配置 `.env`：

```bash
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Avatar Persistence Note

头像保存策略：
- 优先上传到 Supabase Storage `avatars` bucket
- 若上传失败，会降级将 data URL 保存到 `members.avatar_url`
- 因此刷新页面后头像不会丢失

## Build

```bash
npm run build
npm run preview
```

## Documentation

- `requirements.md`
- `system_requirements.md`
- `architecture.md`
- `design.md`
- `information_architecture.md`
- `view_specification.md`
- `traceability_matrix.md`
- `implementation_traceability.md`
