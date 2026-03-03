# 家族图谱应用系统需求文档（system_requirements）

## 1. 系统目标
- 系统以”家庭单元关系图”作为核心，降低复杂家族关系理解成本。
- 支持注册用户编辑自己的家谱，只读分享链接无需登录。
- 支持 Supabase 数据持久化、头像存储、图谱导出。

## 2. 系统边界
- 前端：React + TypeScript + React Flow。
- 后端能力：Supabase Postgres + Supabase Storage + Supabase Auth。
- 当前包含：邮箱密码用户体系、单树 owner 模型、只读分享。
- 当前不包含：多树管理、协作编辑、细粒度 RBAC、服务端渲染导出。

## 3. 数据模型

### 3.1 身份层（新增）
- `auth.users`：Supabase Auth 内置用户表，存储 uid、email 等。
- `trees`：家谱树元数据，每用户一棵，字段包含 `id`、`owner_id（→ auth.users）`、`name`、`created_at`。
- `share_settings`：per-tree 分享配置，字段包含 `tree_id（FK → trees）`、`token`、`enabled`。

### 3.2 人物层
- `members`：成员基础信息与 `avatar_url`，新增 `tree_id（FK → trees）`。

### 3.3 单元层（V2）
- `family_units`：家庭单元（单人/夫妻），新增 `tree_id（FK → trees）`。
- `family_unit_members`：单元成员映射与角色（`single|partner1|partner2`）。
- `unit_relations`：单元关系（`parent_child|sibling`）。

### 3.4 兼容层
- 旧表 `relationships` 保留用于兼容迁移，主渲染已切换到 V2 单元关系。

## 4. 功能性系统需求

### 4.1 用户与树管理（新增）
- `SR-AUTH-001`：支持邮箱 + 密码注册，注册成功后自动创建 `trees` 记录。
- `SR-AUTH-002`：支持邮箱 + 密码登录，登录态通过 Supabase session 管理。
- `SR-AUTH-003`：支持登出，清除本地 session。
- `SR-AUTH-004`：编辑页（`/`）未登录时跳转到登录页（`/login`）。
- `SR-AUTH-005`：登录成功后加载当前用户对应的 tree，进入编辑页。
- `SR-AUTH-006`：`/view/:token` 无需登录，通过 token 查找对应 tree 并加载只读数据。

### 4.2 数据隔离（新增）
- `SR-ISO-001`：所有读写操作携带 `tree_id`，通过 RLS 确保用户只能访问自己的树。
- `SR-ISO-002`：share_settings 按 `tree_id` 关联，token 全局唯一。
- `SR-ISO-003`：`/view/:token` 查询路径通过 token → tree_id 映射，仅允许读操作（anon 角色）。

### 4.3 既有功能（保持不变）
- `SR-001`：支持加载 V2 快照（units/unitMembers/unitRelations + members）。
- `SR-002`：支持单元关系新增、删除、重连并同步数据库。
- `SR-003`：支持同代拖拽锁 Y 与同代防重叠。
- `SR-004`：支持视图模式（焦点树/父系/母系/全景）。
- `SR-005`：支持点击单元卡中的个人头像/姓名选中成员。
- `SR-006`：夫妻卡自动按男左女右排序（基于姓名性别推断）。
- `SR-007`：头像上传优先走 Storage，失败后数据列降级兜底。
- `SR-008`：连接锚点（上下两端）支持高命中与可视反馈（连接中/可连接状态高亮）。
- `SR-009`：关系类型支持由代际差异自动推断（同代=sibling，不同代=parent_child）。
- `SR-010`：连接失败提供可执行提示，不出现静默失败。
- `SR-011`：智能布局：基于子树宽度自动分配节点位置，含碰撞检测与自动避让。
- `SR-012`：一键自动整理：清除手动位置回到自动布局。
- `SR-013`：全景模式父系左排、母系右排（基于名称含”外”字判断）。
- `SR-014`：父系/母系视图支持两段式根节点搜索（祖先链优先、全局回退）。
- `SR-015`：父系/母系视图支持跨分支连线（纳入另一分支的父节点到可见集合）。
- `SR-016`：右侧编辑面板支持收起/展开。
- `SR-017`：顶栏仅保留”父母/子女”连线可见性开关。

## 5. 非功能需求
- `NFR-001`：拖拽、缩放、连线操作流畅。
- `NFR-002`：关系线命中区域足够大，避免误操作。
- `NFR-003`：错误提示清晰，状态可恢复。
- `NFR-004`：关系线与节点视觉层级清晰，连线不被卡片遮蔽。
- `NFR-005`：RLS 策略确保数据隔离，任何用户无法读写他人的树数据。
- `NFR-006`：前端路由守卫确保编辑页在 session 失效后重定向到登录页。

## 6. 存储与安全要求
- `avatars` bucket 需存在且策略正确（authenticated 用户可上传到自己 tree_id 路径）。
- RLS 全面切换为 `authenticated` 角色策略，废弃原 `anon` 全开策略。
- `/view/:token` 只读路径：通过 Postgres Function 或 anon 专用 token 查询策略实现，不依赖 authenticated session。

## 7. 迁移要求
- 提供 `schema_v2.sql` 与 `migration_v1_to_v2.sql`（V1→V2 单元模型，已完成）。
- 提供 `schema_multiuser.sql`（新增 trees 表、为各表加 tree_id、重写 RLS）。
- 提供 `migration_to_multiuser.sql`（将现有数据挂载到第一个注册账号的 tree）。
- 迁移后 share_settings 从单行（id=1）改为 per-tree 多行。
