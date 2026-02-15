# 家族图谱应用系统需求文档（system_requirements）

## 1. 系统目标
- 系统以“家庭单元关系图”为核心，降低连线复杂度。
- 支持无登录编辑/只读分享。
- 支持 Supabase 数据持久化、头像存储、导出。

## 2. 系统边界
- 前端：React + TypeScript + React Flow。
- 后端能力：Supabase Postgres + Supabase Storage。
- 当前不包含：用户体系、细粒度 RBAC、服务端渲染导出。

## 3. 数据模型（当前实现）

### 3.1 人员层
- `members`：成员基础信息与 `avatar_url`。

### 3.2 单元层（V2）
- `family_units`：家庭单元（单人/夫妻）。
- `family_unit_members`：单元成员映射与角色（`single|partner1|partner2`）。
- `unit_relations`：单元关系（`parent_child|sibling`）。

### 3.3 兼容层
- 旧表 `relationships` 仍保留用于迁移兼容，但主图谱已切 V2 单元关系。

## 4. 功能性系统需求
- SR-001：支持加载 V2 快照（units/unitMembers/unitRelations + members）。
- SR-002：支持单元关系新增、删除、重连并同步数据库。
- SR-003：支持同代拖拽锁 Y 与同代防重叠。
- SR-004：支持视图模式（焦点树/父系/母系/全景）。
- SR-005：支持点击单元卡中的个人头像选中成员。
- SR-006：支持夫妻位置互换并持久化角色。
- SR-007：头像上传优先走 Storage，失败时数据库降级兜底。

## 5. 非功能需求
- NFR-001：图谱操作流畅（拖拽、缩放、连线）。
- NFR-002：关系线命中区域足够大，避免误操作。
- NFR-003：失败提示清晰，状态可恢复。

## 6. 存储与安全要求
- `avatars` bucket 需存在且策略正确。
- 当前模式为无登录应用：若使用 anon 上传，需要对应 storage policy。
- 若转私有桶，需补签名 URL 方案。

## 7. 迁移要求
- 提供 `schema_v2.sql` 与 `migration_v1_to_v2.sql`。
- 迁移脚本不再自动生成 `ur_pc_*` / `ur_sb_*` 连线。
- 提供 `cleanup_auto_relations.sql` 清理旧自动线。
