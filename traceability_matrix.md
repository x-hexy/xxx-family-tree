# 需求追溯矩阵（Traceability Matrix）

## 1. 目的
- 确保 `requirements.md`、`system_requirements.md`、`architecture.md`、`design.md`、`information_architecture.md`、`wireframes.md` 一致。
- 每条核心需求都能追溯到系统要求、架构方案、设计与线框实现位点。

## 2. 需求到文档映射

| 需求ID | 需求摘要 | 系统需求 | 架构设计 | 交互与视觉设计 | 信息架构 | 线框 |
|---|---|---|---|---|---|---|
| `REQ-F-001` | 成员 CRUD | `system_requirements.md` 3.1, 5 | `architecture.md` 2.1, 5.1 | `design.md` 4.2 | `information_architecture.md` 4.1, 6.1 | `wireframes.md` 2.1 |
| `REQ-F-002` | 关系管理与校验 | `system_requirements.md` 3.2, 5 | `architecture.md` 3.3, 5.1 | `design.md` 4.2 | `information_architecture.md` 4.1, 6.1 | `wireframes.md` 2.3 |
| `REQ-F-003` | 浏览、搜索、缩放 | `system_requirements.md` 3.3, 7 | `architecture.md` 3.1, 5.2 | `design.md` 4.1 | `information_architecture.md` 6.2, 7.2 | `wireframes.md` 2.1, 3.1 |
| `REQ-F-004` | 只读分享（免登录） | `system_requirements.md` 3.4, 5, 6 | `architecture.md` 3.4, 5.2 | `design.md` 3.2 | `information_architecture.md` 2, 3, 4.2 | `wireframes.md` 5.1 |
| `REQ-F-005` | 导出 PNG/PDF | `system_requirements.md` 3.5, 5 | `architecture.md` 3.5, 5.3 | `design.md` 3.1 | `information_architecture.md` 4.1, 7.1 | `wireframes.md` 4.1 |
| `REQ-F-006` | 树状代际分层（祖辈上，小辈下） | `system_requirements.md` 3.3, 11 | `architecture.md` 3.1, 9 | `design.md` 3.1, 4.1, 10 | `information_architecture.md` 6.1, 10 | `wireframes.md` 2.1, 8.5, 9 |
| `REQ-F-007` | 人物照片上传并展示 | `system_requirements.md` 3.1, 3.3, 4.1, 5, 11 | `architecture.md` 3.2, 5.1, 9 | `design.md` 3.1, 4.2, 5, 10 | `information_architecture.md` 4.1, 6.1, 10 | `wireframes.md` 2.1, 2.3, 6, 8.6, 9 |
| `REQ-UX-001` | 家谱卷轴感（古典高雅） | `system_requirements.md` 9, 11 | `architecture.md` 9 | `design.md` 2, 6, 7, 10 | `information_architecture.md` 5.2 | `wireframes.md` 1 |

## 3. 维护规则
1. 新增需求必须先在 `requirements.md` 分配新 ID。
2. 每次修改需求后，同步更新本矩阵对应行。
3. 评审时以本矩阵为准做一致性检查，避免“实现有了但需求未记录”。
