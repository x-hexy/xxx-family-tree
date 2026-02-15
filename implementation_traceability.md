# 实现追溯（implementation_traceability）

## 1. REQ-F-001 人物信息管理与详情编辑
- 代码：`src/components/layout/RightPanel.tsx`, `src/store/useFamilyStore.ts`
- 状态：已实现
- 备注：头像/姓名点击可选中个人并联动详情。

## 2. REQ-F-002 家庭单元模型
- 代码：`src/types/familyUnit.ts`, `src/lib/familyUnitPersistence.ts`, `src/components/graph/UnitNode.tsx`
- 状态：已实现
- 备注：单人卡与夫妻卡共存。

## 3. REQ-F-003 单元关系线编辑
- 代码：`src/components/graph/FamilyGraph.tsx`, `src/store/useFamilyStore.ts`
- 状态：已实现
- 备注：支持创建/删除/重连，含去重与失败回滚。

## 4. REQ-F-004 图谱交互
- 代码：`src/components/graph/FamilyGraph.tsx`, `src/components/layout/TopBar.tsx`
- 状态：已实现
- 备注：缩放、平移、搜索、选中态均可用。

## 5. REQ-F-005 同代锁 Y 与防重叠
- 代码：`src/components/graph/FamilyGraph.tsx`
- 状态：已实现
- 备注：拖拽过程与落点都执行约束。

## 6. REQ-F-006 视图模式
- 代码：`src/components/layout/TopBar.tsx`, `src/components/graph/FamilyGraph.tsx`
- 状态：已实现（需继续优化分支算法）

## 7. REQ-F-007 头像上传持久化
- 代码：`src/lib/familyPersistence.ts`, `src/store/useFamilyStore.ts`, `supabase/storage_policies_avatars.sql`
- 状态：已实现
- 备注：Storage 失败时降级写 DB，刷新不丢图。

## 8. REQ-F-008 只读分享
- 代码：`src/components/layout/ShareDialog.tsx`, `src/pages/ReadOnlyPage.tsx`, `src/store/useFamilyStore.ts`
- 状态：已实现

## 9. REQ-F-009 导出
- 代码：`src/components/layout/ExportDialog.tsx`
- 状态：已实现

## 10. REQ-UX-001 卷轴风格
- 代码：`src/index.css`, `src/components/*`, `src/pages/*`
- 状态：已实现（持续打磨）

## 11. 数据与迁移相关
- V2 Schema：`supabase/schema_v2.sql`
- V1->V2 Migration：`supabase/migration_v1_to_v2.sql`
- 自动线清理：`supabase/cleanup_auto_relations.sql`
