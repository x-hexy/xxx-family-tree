# 实现追溯（implementation_traceability）

## 1. REQ-F-001 人物信息管理与详情查看
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

## 4. REQ-F-004 画布交互
- 代码：`src/components/graph/FamilyGraph.tsx`, `src/components/layout/TopBar.tsx`
- 状态：已实现
- 备注：缩放、平移、搜索、选中均可用。

## 5. REQ-F-005 同代锁 Y 与防重叠
- 代码：`src/components/graph/FamilyGraph.tsx`（`handleNodeDrag`/`handleNodeDragStop`/`resolveNonOverlapX`）
- 状态：已实现
- 备注：拖拽过程与落点都执行约束。

## 6. REQ-F-006 视图模式
- 代码：`src/components/layout/TopBar.tsx`, `src/components/graph/FamilyGraph.tsx`（`visibleUnitIds` useMemo）
- 状态：已实现
- 备注：
- 父系/母系采用两段式根节点搜索：先搜祖先链，未命中则搜全局 unit。
- 父系根关键词：`["爷", "奶"]`；母系根关键词：`["外公", "外婆", "外"]`。
- 支持跨分支连线：可见集合内 unit 的另一分支父节点也纳入可见集合。

## 7. REQ-F-007 头像上传持久化
- 代码：`src/lib/familyPersistence.ts`, `src/store/useFamilyStore.ts`, `supabase/storage_policies_avatars.sql`
- 状态：已实现
- 备注：Storage 失败时降级写 DB，刷新不丢失。

## 8. REQ-F-008 只读分享
- 代码：`src/components/layout/ShareDialog.tsx`, `src/pages/ReadOnlyPage.tsx`, `src/store/useFamilyStore.ts`
- 状态：已实现

## 9. REQ-F-009 导出
- 代码：`src/components/layout/ExportDialog.tsx`
- 状态：已实现

## 10. REQ-UX-001 卷轴风格
- 代码：`src/index.css`, `src/components/*`, `src/pages/*`
- 状态：已实现（持续打磨）

## 11. REQ-UX-002 低压力连线体验
- 代码：`src/components/graph/UnitNode.tsx`, `src/components/graph/FamilyGraph.tsx`, `src/components/graph/RelationshipEdge.tsx`, `src/index.css`
- 状态：已实现
- 备注：
- 上下两端锚点（简化操作认知）。
- 自动推断关系类型：同代=sibling，不同代=parent_child。
- 失败提示：连接未命中时给出明确提示。
- 可见性增强：边线交互宽度、重连半径、层级与高亮反馈均已增强。

## 12. REQ-F-010 智能布局与自动整理
- 代码：`src/components/graph/FamilyGraph.tsx`（`calculateTreeLayout`）, `src/store/useFamilyStore.ts`（`layoutRequestVersion`/`triggerAutoArrange`）
- 状态：已实现
- 备注：
- 基于子树宽度分配 X 坐标，逐代从上到下分配。
- 主父节点机制：多父时优先父系（不含"外"字）。
- 全景排序：父系左、母系右。
- 同行碰撞检测：重叠时向右推移 + 居中修正。
- 一键自动整理：`layoutRequestVersion` 触发清除手动位置。

## 13. REQ-F-011 右侧面板可收起展开
- 代码：`src/pages/EditorPage.tsx`
- 状态：已实现
- 备注：`▶/◀` 切换按钮，`rightPanelOpen` state 控制。

## 14. REQ-F-012 跨分支连线
- 代码：`src/components/graph/FamilyGraph.tsx`（`visibleUnitIds` 中 `crossBranchParents` 逻辑）
- 状态：已实现
- 备注：父系/母系视图中，已可见 unit 的另一分支父节点也纳入可见集合。

## 15. REQ-F-013 用户注册
- 代码：`src/pages/LoginPage.tsx`, `src/lib/auth.ts`
- 状态：已实现
- 备注：邮箱 + 密码注册，Supabase Auth；邮箱确认场景有提示文案。

## 16. REQ-F-014 用户登录 / 登出
- 代码：`src/pages/LoginPage.tsx`, `src/components/layout/TopBar.tsx`, `src/lib/auth.ts`
- 状态：已实现
- 备注：登录后跳转编辑页；TopBar 右上角"退出登录"按钮调用 `signOut()`。

## 17. REQ-F-015 注册时自动创建家谱树
- 代码：`src/pages/LoginPage.tsx`（注册成功后调用 `getOrCreateTree(user.id)`）, `src/lib/treePersistence.ts`
- 状态：已实现
- 备注：`getOrCreateTree` 幂等，登录时也会调用以确保树始终存在。

## 18. REQ-F-016 编辑页访问控制
- 代码：`src/hooks/useAuthGuard.ts`, `src/pages/EditorPage.tsx`
- 状态：已实现
- 备注：未登录时重定向 `/login`；订阅 `onAuthStateChange` 处理 token 过期与主动登出。

## 19. REQ-F-017 分享链接无需登录只读访问
- 代码：`src/pages/ReadOnlyPage.tsx`, `src/lib/treePersistence.ts`（`getTreeByToken`）, `supabase/schema_multiuser.sql`（`get_tree_by_token` SECURITY DEFINER 函数）
- 状态：已实现
- 备注：anon 角色通过 RPC 函数读取分享数据；RLS 策略确保非授权数据不可见。

## 20. REQ-F-018 历史数据自动归属
- 代码：`supabase/migration_to_multiuser.sql`
- 状态：已实现（SQL 脚本待在 Supabase 控制台执行）
- 备注：将所有无 `tree_id` 的历史记录归属到第一个注册账号的树。

## 21. 数据与迁移相关
- V2 Schema：`supabase/schema_v2.sql`
- V1->V2 Migration：`supabase/migration_v1_to_v2.sql`
- 多用户 Schema：`supabase/schema_multiuser.sql`
- 多用户迁移：`supabase/migration_to_multiuser.sql`
- 头像存储策略：`supabase/storage_policies_avatars.sql`
- 自动关系清理：`supabase/cleanup_auto_relations.sql`
