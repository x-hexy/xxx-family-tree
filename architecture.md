# 家族图谱应用架构文档（architecture）

## 1. 总体架构
- 前端单页应用（React + Zustand + React Flow）。
- Supabase 作为统一后端能力：
- Postgres（业务数据）
- Storage（头像）

## 2. 模块划分

### 2.1 Store 层（`useFamilyStore`）
- 聚合状态：
- `members`、`units`、`unitMembers`、`unitRelations`
- `selectedMemberId`、`selectedUnitId`
- `viewMode`、线条可见性、布局缓存
- 关键动作：
- 单元关系增删改（add/reconnect/delete）
- 夫妻位置互换（swapUnitPartners）
- 头像更新（upload + fallback）

### 2.2 Persistence 层
- `familyUnitPersistence.ts`：V2 单元模型读写。
- `familyPersistence.ts`：旧模型兼容 + 头像上传。

### 2.3 Graph 层
- `FamilyGraph.tsx`：主图谱渲染与交互。
- `UnitNode.tsx`：单元卡（单人/双人、头像点击选人、互换按钮）。
- `RelationshipEdge.tsx`：连线样式与选中高亮。

## 3. 数据流
1. `initializeData()` 先加载 legacy，再尝试 V2 快照。
2. 图谱读取 V2 数据渲染单元与关系。
3. 用户操作（拖拽/连线/互换）先本地更新，再异步同步 Supabase。
4. 同步失败时通过 `syncError` 通知 UI。

## 4. 关键设计决策
- 决策 A：主图从“人-人关系”切换为“单元-单元关系”。
- 决策 B：默认不自动生成单元连线，关系由用户手工建立。
- 决策 C：头像上传失败时降级存数据库，保证刷新不丢。
- 决策 D：全景可拖拽持久化，非全景自动布局。

## 5. 当前约束
- 右侧编辑面板仍以成员编辑为主，单元编辑能力处于过渡阶段。
- 关系合法性校验当前以去重/自连防护为主，尚未做复杂家谱规则引擎。
