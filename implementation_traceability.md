# 实现追溯矩阵（Implementation Traceability）

## 1. 目的
- 将需求编号（`REQ-*`）直接映射到当前代码文件，保证“需求 -> 设计 -> 实现”可追踪。
- 明确每条需求的实现状态：`已实现` / `部分实现` / `待实现`。

## 2. 需求到代码映射

| 需求ID | 需求摘要 | 主要实现文件 | 当前状态 | 说明 |
|---|---|---|---|---|
| `REQ-F-001` | 成员 CRUD | `src/components/layout/LeftToolbox.tsx`, `src/components/layout/RightPanel.tsx`, `src/store/useFamilyStore.ts` | 已实现（前端内存态） | 已支持新增、编辑、删除成员；删除时联动清理成员关联关系。 |
| `REQ-F-002` | 关系管理与校验 | `src/components/layout/LeftToolbox.tsx`, `src/components/layout/RightPanel.tsx`, `src/store/useFamilyStore.ts` | 已实现（前端内存态） | 已支持建立关系和删除关系，含基础校验（禁止自关联、避免重复关系）。 |
| `REQ-F-003` | 浏览、缩放、搜索定位 | `src/components/graph/FamilyGraph.tsx`, `src/components/layout/TopBar.tsx`, `src/store/useFamilyStore.ts` | 已实现（基础版） | 缩放/平移/选中可用；支持按姓名搜索并自动选中及居中定位节点。 |
| `REQ-F-004` | 只读分享（免登录） | `src/router.tsx`, `src/pages/ReadOnlyPage.tsx`, `src/components/layout/TopBar.tsx`, `src/components/layout/ShareDialog.tsx`, `src/store/useFamilyStore.ts` | 已实现（前端本地模拟） | 支持分享弹窗、链接复制、启停开关、刷新 Token；只读页按 token 和启停状态校验访问。 |
| `REQ-F-005` | 导出 PNG/PDF | `src/components/layout/TopBar.tsx`, `src/components/layout/ExportDialog.tsx`, `src/pages/EditorPage.tsx` | 已实现（前端客户端导出） | 支持选择 PNG/PDF 与当前视图/全图导出，并触发文件下载。 |
| `REQ-F-006` | 树状代际分层（祖辈上、小辈下） | `src/components/graph/FamilyGraph.tsx` | 已实现（ELK 布局版） | 使用 ELK 分层布局并引入家庭中间节点，显著降低父母-子女关系线交叉。 |
| `REQ-F-007` | 人物照片上传并展示 | `src/components/layout/RightPanel.tsx`, `src/components/graph/FamilyGraph.tsx`, `src/store/useFamilyStore.ts`, `src/types/family.ts` | 已实现（前端内存态） | 可上传并即时显示头像；当前未持久化到后端。 |
| `REQ-UX-001` | 家谱卷轴感（古典高雅） | `src/index.css`, `src/components/graph/FamilyGraph.tsx`, `src/pages/EditorPage.tsx`, `src/pages/ReadOnlyPage.tsx`, `src/components/layout/TopBar.tsx`, `src/components/layout/LeftToolbox.tsx`, `src/components/layout/RightPanel.tsx` | 已实现（高保真第二版） | 在第一版基础上新增关系线类型差异化（父母/子女/配偶/兄弟姐妹）与代际章节条（篆刻风标签）。 |

## 3. 关键实现说明（新增需求）

### 3.1 `REQ-F-006` 树状代际分层
- `src/components/graph/FamilyGraph.tsx`
- 按 `generation` 分组并排序。
- 每层横向排布，层与层纵向分隔。
- 连接方向固定为上到下（`targetPosition=Top`，`sourcePosition=Bottom`）。

### 3.2 `REQ-F-007` 人物照片上传
- `src/components/layout/RightPanel.tsx`
- 选中成员后可上传图片文件。
- 使用 `FileReader` 生成即时预览。
- `src/store/useFamilyStore.ts`
- `updateMemberAvatar(memberId, avatarUrl)` 回写成员数据。
- `src/components/graph/FamilyGraph.tsx`
- 节点卡片显示头像；无图时显示占位。

## 4. 维护规则
1. 新需求落地时，先在 `requirements.md` 增加 `REQ` 编号。
2. 每次代码变更后，同步更新本文件“当前状态”和“主要实现文件”。
3. 评审时先看 `traceability_matrix.md`，再看本文件确认是否真正落到代码。
