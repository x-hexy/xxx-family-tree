# XY Family Tree

一个面向家庭关系梳理的 Web 家族图谱应用。  
目标是让海外子女和亲友通过“姓名 + 照片 + 关系”快速认亲，并支持只读分享与导出。

## Features

- 家族成员管理：新增、编辑、删除成员
- 关系管理：建立/删除父母、子女、配偶、兄弟姐妹关系
- 树状图谱布局：按代际分层展示（祖辈在上，小辈在下）
- 人物照片：支持上传并在节点卡片展示
- 图谱检索：按姓名搜索并自动定位节点
- 只读分享：Token 链接、开关启停、刷新 Token
- 导出能力：PNG / PDF，支持当前视图与全图导出
- UI 主题：家谱卷轴风格（古典高雅精致）

## Tech Stack

- React + TypeScript + Vite
- React Router
- Zustand
- React Flow (`@xyflow/react`)
- ELK (`elkjs`) for layered layout
- Tailwind CSS
- `html-to-image` + `jspdf` for export

## Project Structure

```text
src/
  components/
    graph/               # 图谱渲染与布局
    layout/              # 顶栏、侧栏、导出/分享弹窗
  pages/                 # 编辑页、只读页
  store/                 # Zustand 状态管理
  data/                  # Mock 数据
  types/                 # 类型定义与外部模块声明
docs (*.md)              # 需求、架构、设计、追溯文档
```

## Quick Start

```bash
npm install
npm run dev
```

默认地址：

- `http://localhost:5173/` 编辑页
- `http://localhost:5173/view/:token` 只读页

## Build

```bash
npm run build
npm run preview
```

## Requirements Traceability

项目内已维护需求到设计/实现追溯文档：

- `requirements.md`
- `system_requirements.md`
- `architecture.md`
- `design.md`
- `information_architecture.md`
- `wireframes.md`
- `traceability_matrix.md`
- `implementation_traceability.md`

## Current Notes

- 当前数据主要为前端本地状态（含分享配置 localStorage 模拟）。
- 若用于生产，建议接入后端 API、对象存储与鉴权系统。
