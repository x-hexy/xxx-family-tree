# 家族图谱应用架构文档（architecture）

## 1. 总体架构
- 前端单页应用（React + Zustand + React Flow）。
- Supabase 作为统一后端能力：
  - Auth（邮箱密码用户体系）
  - Postgres（结构化数据 + RLS 数据隔离）
  - Storage（头像）

## 2. 页面与路由

```
/login          → 登录/注册页（未登录用户的唯一入口）
/               → 编辑页（需登录，加载当前用户的 tree）
/view/:token    → 只读分享页（无需登录，通过 token 加载 tree）
```

- 路由守卫：`/` 页检测 Supabase session，未登录则跳转 `/login`。
- `/login` 在已登录时跳转 `/`。
- `/view/:token` 不经过守卫，始终可访问。

## 3. 模块划分

### 3.1 Auth 层（新增）
- `src/lib/auth.ts`：封装 Supabase Auth 操作（signUp、signIn、signOut、getSession、onAuthStateChange）。
- `src/pages/LoginPage.tsx`：登录/注册 UI，注册成功后触发 `initTree(userId)` 自动建树。
- `src/hooks/useAuthGuard.ts`：路由守卫 hook，在编辑页检测 session，无 session 则 redirect。

### 3.2 Store 层（`useFamilyStore`）
- 聚合状态：
  - `treeId`（当前用户树 ID，从 trees 表加载）
  - `members`、`units`、`unitMembers`、`unitRelations`
  - `selectedMemberId`、`selectedUnitId`、`focusUnitId`
  - `viewMode`、线条可见性（`showParentChildLines`）
  - `nodePositions`（全景手动布局缓存）
  - `layoutRequestVersion`（自动整理触发器）
  - `filterGenerations`（代际筛选）
- 关键动作：
  - 单元关系增删改（add/reconnect/delete）
  - 头像更新（upload + fallback）
  - 自动整理触发（triggerAutoArrange）
  - 节点位置保存（setNodePosition/setNodePositions）

### 3.3 Persistence 层
- `familyUnitPersistence.ts`：V2 单元模型读写，所有查询携带 `tree_id` 过滤。
- `familyPersistence.ts`：旧模型兼容 + 头像上传。
- `treePersistence.ts`（新增）：trees 表 CRUD、share_settings per-tree 读写。

### 3.4 Graph 层
- `FamilyGraph.tsx`：主图渲染、智能布局（`calculateTreeLayout`）、视图过滤、交互编排。
- `UnitNode.tsx`：单元卡（单人/双人、头像选人、自动男左女右、上下锚点）。
- `RelationshipEdge.tsx`：关系线样式、捆绑 Bézier、高亮反馈。

## 4. 数据库 Schema（多用户版本）

```sql
-- 新增表
trees (
  id          text PRIMARY KEY,
  owner_id    uuid NOT NULL REFERENCES auth.users(id),
  name        text NOT NULL DEFAULT '我的家谱',
  created_at  timestamptz DEFAULT now()
)

-- 改造：share_settings 从单行变为 per-tree
share_settings (
  tree_id    text PRIMARY KEY REFERENCES trees(id),
  token      text NOT NULL UNIQUE,
  enabled    boolean DEFAULT true,
  updated_at timestamptz DEFAULT now()
)

-- 各数据表新增 tree_id 列
members         + tree_id text NOT NULL REFERENCES trees(id)
family_units    + tree_id text NOT NULL REFERENCES trees(id)
-- unit_relations / family_unit_members 通过 family_units 级联，无需直接加 tree_id
```

## 5. RLS 策略设计

```
编辑路径（authenticated 用户）:
  trees          → owner_id = auth.uid()
  members        → tree_id IN (SELECT id FROM trees WHERE owner_id = auth.uid())
  family_units   → tree_id IN (SELECT id FROM trees WHERE owner_id = auth.uid())
  unit_relations → from_unit_id 对应的 family_units.tree_id 属于当前用户
  share_settings → tree_id 属于当前用户

只读路径（anon via share token）:
  通过 Postgres Function get_tree_by_token(token) 返回 tree_id，
  anon 对 members/family_units/unit_relations 的 SELECT 限定该 tree_id。
```

## 6. 数据流

### 6.1 编辑流（登录用户）
1. `useAuthGuard` 检查 session，无 session 跳转 `/login`。
2. 登录成功 → 查询 `trees WHERE owner_id = uid` 获取 `treeId`。
3. `loadUnitSnapshot(treeId)` 加载该树全部数据。
4. 用户操作（拖拽/连线/互换）先本地更新，再异步同步 Supabase（携带 `tree_id`）。
5. 同步失败通过 `syncError` 通知 UI。

### 6.2 注册建树流
1. 用户填写邮箱密码 → `supabase.auth.signUp()`。
2. 注册成功回调中执行 `INSERT INTO trees (id, owner_id, name)` 创建树。
3. 若数据库存在历史数据（无 tree_id 的孤立记录），执行迁移脚本将其挂载到此 tree。
4. 跳转编辑页。

### 6.3 只读分享流（无需登录）
1. 浏览器访问 `/view/:token`。
2. 调用 `getTreeByToken(token)` 获取 `tree_id` 与 `enabled` 状态。
3. 若 `enabled=false` 显示"链接已停用"。
4. 否则以 anon 身份加载该 tree 数据（只读）。

## 7. 架构决策

### 7.1 Auth 决策
- 决策 A-1：使用 Supabase Auth 邮箱密码，不引入第三方 OAuth，降低初期复杂度。
- 决策 A-2：每用户只有一棵树（1:1 关系），注册时自动创建，无树选择 UI。
- 决策 A-3：编辑页路由守卫在前端实现（hook），不依赖服务端 middleware。
- 决策 A-4：历史数据迁移策略：首个注册账号自动认领，通过 SQL 迁移脚本完成，不在前端处理。

### 7.2 连线决策
- 决策 E：从"连线后弹窗选类型"改为"按代际差异自动推断类型"。
- 决策 F：简化为上下两端锚点（移除左右锚点），降低认知负担。
- 决策 G：所有关系线统一使用 bottom→top 锚点。
- 决策 I：提高边线交互宽度与连接半径，并提升线条渲染层级，减少遮挡。
- 决策 J：连接失败不静默，直接显示操作提示。

### 7.3 布局决策
- 决策 K：自动布局基于子树宽度分配，每个子节点只归属一个主父节点（多父时优先父系）。
- 决策 L：全景顶层排序按"父系左、母系右"（基于名称含"外"字判断）。
- 决策 M：同行碰撞检测：重叠时向右推移，推完后重新居中对齐父节点。
- 决策 N：一键自动整理通过 `layoutRequestVersion` 触发，清除手动位置回到自动布局。

### 7.4 视图决策
- 决策 O：父系/母系根节点搜索采用两段式——先搜祖先链，未命中则搜全局 unit。
- 决策 P：父系/母系可见集合纳入跨分支父节点，以渲染跨分支连线。
- 决策 Q：夫妻卡自动按男左女右排序（基于姓名性别推断），移除手动互换按钮。

## 8. 当前约束
- 右侧编辑面板以成员详情为主（可收起/展开），单元编辑能力仍在演进。
- 父系/母系识别仍部分依赖姓名关键词，后续可改为显式标签或规则引擎。
- 多用户协作编辑（多人同时编辑一棵树）不在当前范围内。
