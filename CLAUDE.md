# Repurposer — Claude 工作规范

> 这份文档记录 Repurposer 项目的前端约定与常见坑点，供 AI 协作时遵守。

## 技术栈
- 前端框架：TanStack Router / TanStack Start (React 19 + SSR)
- UI 组件：shadcn/ui（base-ui 版本）
- 样式：Tailwind CSS v4
- 图标：lucide-react（唯一图标来源）
- 国际化：i18next + react-i18next
- 状态：React Context + hooks（本项目不用 Redux/Zustand）

## shadcn/base-ui 约定

### 用 `render` prop，不用 `asChild`
本项目使用的 shadcn 组件基于 **base-ui**，它们的触发器组件（`Button`、`DialogTrigger`、`DropdownMenuTrigger`、`PopoverTrigger`、`SidebarMenuButton`、`TooltipTrigger` 等）**不支持 Radix 风格的 `asChild`**，而是使用 `render` prop 来指定渲染元素。

错误：
```tsx
<Button asChild><Link to="/" /></Button>
```

正确：
```tsx
<Button render={<Link to="/" />}>Label</Button>
```

### 图标
- 所有图标必须从 `lucide-react` 引入。
- 禁止在项目里手写 SVG icon（除非是第三方 Logo 且没有 lucide 替代）。
- 尺寸约定：
  - 顶栏/卡片操作图标：`h-5 w-5`
  - 行内/pill 内图标：`h-4 w-4`，更小的辅助图标 `h-3.5 w-3.5`
  - Sidebar 导航图标：`h-4.5 w-4.5`（展开/折叠保持一致，见下）

## 组件使用规范

### 圆角与按钮
- **统一小圆角**：按钮、输入、卡片、pill、下拉触发器一律用默认 `rounded-md`（卡片/面板可 `rounded-lg`）。
- **禁止 `rounded-full`**，仅以下两类例外：
  1. 真正的圆形图标按钮（如输入框右下角的「发送」箭头 `h-9 w-9 rounded-full`）。
  2. 状态徽标 / 红点（通知角标）。
- 同一行的控件高度要对齐：操作区控件统一 `h-9`，与发送按钮同高。
- pill / 下拉触发器**文字不加粗**（不要加 `font-medium`），保持轻量。

### 弹层组件（DropdownMenu / Popover / Select）
- **列表型单选**（点一下即选中并关闭）：用 `DropdownMenu` + `DropdownMenuItem`。
- **多控件设置面板**（需要保持打开、同时调多个值）：用 `Popover`，里面放分段按钮组。
- 触发器一律 `render={<Button variant="outline" size="sm" className="h-9 …" />}`，按钮里放「图标 + 文案 + `ChevronDown`」。
- 选项要表达「当前选中」用 `Check` 图标；底部弹层（footer 里的下拉）记得 `side="top"` 向上弹。
- 表单里的纯下拉用 `Select`；prompt 操作条里的参数选择用上面的 pill 模式，不要混用样式。

### 卡片立体感：ring + shadow，不要 border
- 卡片/输入框的「边 + 浮起」效果用**两层 box-shadow**实现，不要用真实 `border`：
  ```tsx
  <Card className="ring-1 ring-border shadow-xl">
  ```
  - `ring-1 ring-border` = 1px 发丝描边（模拟 border，不占布局、跨主题自动适配、缩放不糊）。
  - `shadow-xl` / `shadow-lg` = 外圈环境阴影。
- 真实 `border` 只在确实需要「占位的分隔线」时用；区块之间能不画 divider 就不画。

### Composer / 输入卡片
- 结构：左侧 `Transcript` 竖向方块作为**上传入口**（点了触发隐藏 `<input type="file">`），右侧 `Textarea`。
- 底部操作条：左边是参数 pill（Speaker / Tone / Format…），右边是积分 chip + 圆形发送按钮，整行 `items-center` 对齐、控件 `h-9`。
- 卡片内边距用 `CardContent` 控制（`Card` 加 `py-0` 去掉自带纵向 padding，避免双重 padding）。
- 不要在卡片中部加 divider/border 把输入区和操作区分开，保持一体。

## 产品定位

Repurposer 面向**欧洲知识型演讲市场**，核心定位是**把演讲变成可复用的知识资产**，而非“ viral 短视频剪辑”。

- **目标用户**：学术会议演讲者、企业峰会讲者、研究机构。
- **核心渠道**：LinkedIn、机构官网、邮件 Newsletter。
- **核心输出**：LinkedIn 长帖、金句卡、多语言摘要、Newsletter 内容、核心洞察、博客文章等。
- **多语言是入场门票**：输出必须覆盖欧洲主流语言（FR/DE/ES/IT/EN 等）。
- **GDPR / EU 数据驻留**：面向欧洲机构销售时的核心卖点；后端部署需支持 EU 区域。

因此前端文案、工具网格、示例占位符都应围绕 **knowledge assets / LinkedIn / multi-language** 展开，避免使用“抖音/TikTok/爆款/viral”等描述。

## 国际化 (i18n)

### 字典结构
- 源语言是中文：`src/lib/i18n/locales/zh.ts` 是类型源 (`Resources`)。
- 英文 `en.ts` 必须满足 `en: Resources`，这样缺 key 会在 TypeScript 阶段报错。

### 新增文案
1. 先在 `zh.ts` 里加 key/value。
2. 同步到 `en.ts` 的相同结构。
3. 组件里用 `const { t } = useTranslation()`，不要硬编码。

### 插值
```ts
t("home.allProjects", { count: projects.length })
```

### SSR
- 首屏默认渲染**英文**，避免 hydration 不匹配。
- `I18nProvider` 在水合后读取 `repurposer-lang` cookie 再切换。

## 主题

### 默认
- 默认跟随系统 `prefers-color-scheme`。
- **默认按暗色处理**：首次访问或 `system` 偏好均先以暗色渲染，避免 SSR/水合闪烁。
- 用户手动切换后写入 `localStorage`，key 为 `repurposer-theme`（值：`system|light|dark`）。

### 防闪烁 (FOUC)
`__root.tsx` 的 `head` 里包含一段阻塞式 inline script，在首次绘制前读取 localStorage 并给 `document.documentElement` 加上/移除 `dark` 类。不要删掉这段脚本。

### 切换动画
- 使用 View Transition API 做圆形扩散揭开效果（从点击位置 clip-path 放大）。
- 浏览器不支持或用户开启 `prefers-reduced-motion` 时退化为直接切换。
- CSS 中禁用了默认的 cross-fade：
  ```css
  ::view-transition-old(root),
  ::view-transition-new(root) {
    animation: none;
    mix-blend-mode: normal;
  }
  ```

## 路由

### 动态 Link
TanStack Router 对 `to` 是字面量类型约束。动态参数必须写成：
```tsx
<Link to="/projects/$id" params={{ id: project.id }} />
```
不要写模板字符串：
```tsx
// 错误
<Link to={`/projects/${project.id}`} />
```

## SSR 安全

### 禁止在服务端调用浏览器 API
- `window`、`document`、`localStorage`、`matchMedia` 等只能出现在 `useEffect`、事件处理函数或 anti-FOUC inline script 中。
- `useState` 初始值必须保证服务端和客户端一致，否则会出现 hydration 错误。

## Tailwind

### 颜色
- 使用 shadcn 主题变量：`bg-background`、`text-foreground`、`text-muted-foreground`、`bg-card`、`border-border`。
- 不要直接写死颜色值（如 `#333`）。

### 布局
- 页面主内容必须放在 `SidebarInset` 内；不要自己写 `min-h-screen w-full` 覆盖 sidebar 结构。

## Sidebar 与导航

- Sidebar 采用 `SidebarProvider` + `Sidebar collapsible="icon"` 实现可折叠，**默认折叠**（`SidebarProvider defaultOpen={false}`）。
- 导航项用 `SidebarMenuButton` + `render={<Link to="..." />}`，不要用 `asChild`。
- **无右边框**：`Sidebar` 上加 `group-data-[side=left]:border-r-0`，背景与主区融合（见 UI 设计规范）。
- 结构布局：
  - **Header**：Logo + 折叠按钮（同一行）+「邀请成员」`SidebarMenuButton`。
  - **Content**：导航按 Create / Post 分组——Create 含 Home、Brand template、Library；Post 含 Projects、Speakers。
  - **Footer**：用户头像下拉（`DropdownMenu`，`side="top"` 向上弹，含 Profile / Settings / Logout）放在最上面，其下是账户项（Subscription / Learning / Help）。
- 导航/账户图标统一 `h-4.5 w-4.5`；`sidebarMenuButtonVariants` 里展开 `[&_svg]:size-4.5`、折叠 `group-data-[collapsible=icon]:[&_svg]:size-4.5`，保持一致。
- **折叠态居中对齐**：放在 Header/Footer 里的头像/邀请按钮要居中，给容器加 `group-data-[state=collapsed]:items-center`，按钮自身折叠态用 `w-12` 方块；**不要**把这类按钮塞进 `SidebarMenu`（会被列表的 padding 限宽，导致折叠态偏移 4px）。
- 新增 sidebar 入口时，同步更新 `zh.ts`/`en.ts` 的 `nav.*` key。

## UI 设计规范

整体风格：克制、轻量、统一。参考要点：

- **圆角**：全局小圆角（`rounded-md` / `rounded-lg`），避免 `rounded-full`（圆形图标按钮、红点除外）。
- **边框与阴影**：优先用 `ring-1 ring-border` 做发丝描边 + `shadow-*` 做浮起，少用实线 `border`；能不画 divider 就不画。
- **Sidebar 融入主区**：`--sidebar` 颜色等于 `--background`（`styles.css` 中两个主题都已对齐），且无右边框，让侧栏和内容区无缝衔接。
- **颜色**：只用 shadcn 主题变量（`bg-background`/`text-foreground`/`text-muted-foreground`/`bg-card`/`ring-border` 等），不写死色值。
- **字重**：正文与控件保持常规字重，pill / 次级按钮文字不加粗。
- **数据 vs 文案**：界面文案一律走 i18n；用户数据（演讲者名、项目标题等）按原文展示，不要因为是中文就当成「未国际化」——但**默认值不要落在某条数据上**（如 Speaker 默认显示本地化的占位 “Speaker”，让用户主动选）。

## Brand template 页面

- 路径 `/brand-template`，左侧设置面板 + 右侧实时预览。
- 设置项包括字体、主色、强调色、Logo、默认 CTA、语言调性；预览实时反映到 quote card 与 LinkedIn post 样例卡片。
- 新增设置项时同步扩展 `brandTemplate.*` i18n key。

## 提交信息
- 使用 conventional commits，例如：
  - `feat: add theme toggle with view transition`
  - `fix: correct SidebarMenuButton render usage`
  - `docs: update i18n and theme conventions`
