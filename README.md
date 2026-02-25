# 家族图谱 · Family Tree

> 免下载 App，5 分钟建好你的家谱，一键分享给全家人。

一个基于 Web 的在线家谱应用。以"家庭单元（夫妻卡 / 单人卡）"为核心节点，帮助家人快速梳理人物与世代关系，并通过分享链接让亲友只读查看。

---

## 功能概览

### 核心功能

| 功能 | 说明 |
|------|------|
| **注册 / 登录** | 邮箱 + 密码，注册后自动创建专属家谱树 |
| **家庭单元编辑** | 单人卡 / 夫妻卡，夫妻自动男左女右排列 |
| **关系线管理** | 自由创建父子、兄弟关系线；支持删除与端点重连 |
| **头像上传** | 即时预览，持久化到 Supabase Storage |
| **智能布局** | 基于子树宽度自动排版，同代防重叠，一键整理 |
| **多视图模式** | 焦点树 · 父系 · 母系 · 全景 |
| **只读分享链接** | 生成专属链接，访客无需注册即可查看 |
| **导出图谱** | 支持导出 PNG / PDF |

### 视图模式

- **焦点树** — 以选中单元为中心，展示 2 跳邻域
- **父系** — 定位爷爷奶奶分支，向下展开
- **母系** — 定位外公外婆分支，向下展开
- **全景** — 展示全量节点，支持自由拖拽持久化

---

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端框架 | React 18 + TypeScript + Vite |
| 状态管理 | Zustand |
| 图形渲染 | React Flow (`@xyflow/react`) |
| 样式 | Tailwind CSS |
| 后端 / 数据库 | Supabase (Auth + Postgres + Storage) |
| 部署 | Vercel |

---

## 快速开始（本地开发）

### 1. 克隆与安装依赖

```bash
git clone https://github.com/x-hexy/xxx-family-tree.git
cd xxx-family-tree
npm install
```

### 2. 配置环境变量

创建 `.env.local` 文件：

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

> 仅使用 `anon` public key，**不要**将 `service_role` key 放入前端。

### 3. 配置 Supabase 数据库

在 Supabase SQL Editor 依序执行：

```
supabase/schema.sql                  # 基础成员与关系表
supabase/schema_v2.sql               # V2 家庭单元表结构
supabase/schema_multiuser.sql        # 多用户：trees 表、RLS 策略、share token 函数
supabase/storage_policies_avatars.sql # 头像存储策略（按 tree_id 隔离）
```

若数据库中已有历史数据，额外执行：

```
supabase/migration_to_multiuser.sql  # 将历史数据归属到第一个注册账号
```

### 4. 启动开发服务器

```bash
npm run dev
```

访问地址：

- `http://localhost:5173/login` — 登录 / 注册
- `http://localhost:5173/` — 编辑页（需登录）
- `http://localhost:5173/view/:token` — 只读分享页（无需登录）

---

## 项目结构

```
.
├── docs/                           # 产品与技术文档
│   ├── requirements.md             # 功能需求
│   ├── system_requirements.md      # 系统需求
│   ├── architecture.md             # 架构设计
│   ├── design.md                   # UI/UX 设计规范
│   ├── view_specification.md       # 视图规范
│   ├── information_architecture.md
│   ├── wireframes.md
│   ├── traceability_matrix.md
│   └── implementation_traceability.md
├── src/
│   ├── components/
│   │   ├── graph/                  # 图谱节点 / 连线 / 交互
│   │   └── layout/                 # 顶栏、左右面板、弹窗
│   ├── hooks/
│   │   └── useAuthGuard.ts         # 路由登录守卫
│   ├── lib/
│   │   ├── auth.ts                 # Supabase Auth 封装
│   │   ├── supabase.ts             # Supabase 客户端
│   │   ├── treePersistence.ts      # trees / share_settings 读写
│   │   ├── familyUnitPersistence.ts # V2 单元模型读写
│   │   └── familyPersistence.ts    # 成员 / 头像持久化
│   ├── pages/
│   │   ├── LoginPage.tsx           # 登录 / 注册页
│   │   ├── EditorPage.tsx          # 编辑页（需登录）
│   │   ├── ReadOnlyPage.tsx        # 只读分享页
│   │   └── NotFoundPage.tsx        # 404 页
│   ├── store/
│   │   └── useFamilyStore.ts       # Zustand 全局状态
│   └── types/                      # TypeScript 类型定义
├── supabase/
│   ├── schema.sql                  # V1 基础表
│   ├── schema_v2.sql               # V2 家庭单元表
│   ├── schema_multiuser.sql        # 多用户 trees 表 + RLS
│   ├── migration_to_multiuser.sql  # 历史数据迁移
│   └── storage_policies_avatars.sql
├── index.html
├── vercel.json                     # Vercel SPA 路由配置
└── package.json
```

---

## 数据架构

```
auth.users  (Supabase Auth)
    │
    └── trees (每用户一棵家谱树)
            │
            ├── members              (家族成员)
            ├── family_units         (家庭单元：单人卡 / 夫妻卡)
            │       └── family_unit_members  (成员归属单元)
            ├── unit_relations       (单元间关系线)
            └── share_settings       (分享链接 token)
```

### 访问控制（RLS）

| 路径 | 角色 | 权限 |
|------|------|------|
| `/` 编辑页 | 已登录用户 | 读写自己的树 |
| `/view/:token` 分享页 | 任何人（含匿名） | 只读对应树 |
| 其他用户数据 | 任何人 | 无权访问 |

---

## 构建与部署

```bash
# 构建生产包
npm run build

# 本地预览生产包
npm run preview
```

### Vercel 部署

1. 在 Vercel 中导入此 GitHub 仓库
2. 设置环境变量：`VITE_SUPABASE_URL`、`VITE_SUPABASE_ANON_KEY`
3. 推送到 `master` 自动触发部署

---

## 文档

详细产品与技术文档位于 [`docs/`](docs/) 目录：

- [功能需求](docs/requirements.md)
- [系统需求](docs/system_requirements.md)
- [架构设计](docs/architecture.md)
- [UI/UX 设计规范](docs/design.md)
- [视图规范](docs/view_specification.md)
- [信息架构](docs/information_architecture.md)
- [线框图](docs/wireframes.md)
- [需求追溯矩阵](docs/traceability_matrix.md)
- [实现追溯](docs/implementation_traceability.md)
