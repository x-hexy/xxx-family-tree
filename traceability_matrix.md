# 需求追溯矩阵（traceability_matrix）

## 1. 需求到实现文档映射

| 需求ID | 需求摘要 | system_requirements | architecture | design | view_specification | implementation_traceability |
|---|---|---|---|---|---|---|
| REQ-F-001 | 人物信息管理与详情编辑 | SR-001, SR-005 | Store 2.1, Data Flow 3 | 2.1 | 5 | 对应条目 REQ-F-001 |
| REQ-F-002 | 家庭单元模型 | SR-001 | 决策 A | 2.1 | 1 | 对应条目 REQ-F-002 |
| REQ-F-003 | 单元关系线编辑 | SR-002 | Store 2.1, Graph 2.3 | 2.2 | 4 | 对应条目 REQ-F-003 |
| REQ-F-004 | 图谱交互 | SR-004 | Graph 2.3 | 2.2, 2.3 | 1,2 | 对应条目 REQ-F-004 |
| REQ-F-005 | 同代锁 Y 与防重叠 | SR-003 | Graph 2.3 | 2.3 | 3 | 对应条目 REQ-F-005 |
| REQ-F-006 | 视图模式 | SR-004 | Graph 2.3 | 3 | 1,6 | 对应条目 REQ-F-006 |
| REQ-F-007 | 头像上传持久化 | SR-007 | Persistence 2.2, 决策 C | 4 | - | 对应条目 REQ-F-007 |
| REQ-F-008 | 只读分享 | SR-001(share settings load) | Data Flow 3 | - | - | 对应条目 REQ-F-008 |
| REQ-F-009 | 导出 PNG/PDF | 现有系统能力 | 架构边界 1 | - | - | 对应条目 REQ-F-009 |
| REQ-UX-001 | 卷轴风格与高保真交互 | NFR-001, NFR-002 | Graph/UI 层 | 全文 | 全文 | 对应条目 REQ-UX-001 |
