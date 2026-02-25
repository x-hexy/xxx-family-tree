# 家族图谱应用架构文档（architecture）

## 1. 总体架构
- 前端单页应用（React + Zustand + React Flow）。
- Supabase 作为统一后端能力：
- Postgres（结构化数据）
- Storage（头像）

## 2. 模块划分

### 2.1 Store 层（`useFamilyStore`）
- 聚合状态：
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

### 2.2 Persistence 层
- `familyUnitPersistence.ts`：V2 单元模型读写。
- `familyPersistence.ts`：旧模型兼容 + 头像上传。

### 2.3 Graph 层
- `FamilyGraph.tsx`：主图渲染、智能布局（`calculateTreeLayout`）、视图过滤、交互编排。
- `UnitNode.tsx`：单元卡（单人/双人、头像选人、自动男左女右、上下锚点）。
- `RelationshipEdge.tsx`：关系线样式、捆绑 Bézier、高亮反馈。

## 3. 数据流
1. `initializeData()` 先加载 legacy，再尝试 V2 快照。
2. 视图读取 V2 数据渲染单元与关系。
3. 用户操作（拖拽/连线/互换）先本地更新，再异步同步 Supabase。
4. 同步失败通过 `syncError` 通知 UI。

## 4. 架构决策

### 4.1 连线决策
- 决策 E：从"连线后弹窗选类型"改为"按代际差异自动推断类型"。
- 决策 F：简化为上下两端锚点（移除左右锚点），降低认知负担。
- 决策 G：所有关系线统一使用 bottom→top 锚点。
- 决策 I：提高边线交互宽度与连接半径，并提升线条渲染层级，减少遮挡。
- 决策 J：连接失败不静默，直接显示操作提示。

### 4.2 布局决策
- 决策 K：自动布局基于子树宽度分配，每个子节点只归属一个主父节点（多父时优先父系）。
- 决策 L：全景顶层排序按"父系左、母系右"（基于名称含"外"字判断）。
- 决策 M：同行碰撞检测：重叠时向右推移，推完后重新居中对齐父节点。
- 决策 N：一键自动整理通过 `layoutRequestVersion` 触发，清除手动位置回到自动布局。

### 4.3 视图决策
- 决策 O：父系/母系根节点搜索采用两段式——先搜祖先链，未命中则搜全局 unit。
- 决策 P：父系/母系可见集合纳入跨分支父节点，以渲染跨分支连线。
- 决策 Q：夫妻卡自动按男左女右排序（基于姓名性别推断），移除手动互换按钮。

## 5. 当前约束
- 右侧编辑面板以成员详情为主（可收起/展开），单元编辑能力仍在演进。
- 父系/母系识别仍部分依赖姓名关键词，后续可改为显式标签或规则引擎。
