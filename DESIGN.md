# WeJob - 设计系统

**版本**: v2.0
**更新时间**: 2026-06-17
**状态**: ✅ 已应用到项目

---

## 产品定位

- **产品类型**: AI驱动的求职辅助Web应用
- **目标用户**: 求职者（应届生、海归、在职跳槽）
- **空间定位**: 智能求职工具

### 设计关键词
**Professional Smart** — 专业 + 智能 + 微温暖

### 记忆点
用户记住 WeJob 是**更智能、更专业**的工具

---

## 美学方向

| 维度 | 选择 | 理由 |
|------|------|------|
| **美学** | Professional Smart | 专业可信 + 科技智能 + 微温暖 |
| **装饰度** | 克制 | 靠排版和留白传达品质 |
| **布局** | 网格 + 卡片 | 结构清晰、层次分明 |
| **色彩** | 深墨色主色 + 蓝色点缀 | 避免泛用紫蓝渐变 |

### Safe Choices（专业标配）
- 深色导航栏 + 毛玻璃效果
- 清晰的数据表格
- 卡片式功能模块

### Risks（辨识度来源）
- 放弃紫蓝渐变，用**深墨色 + 蓝色**替代
- 冷白背景传达**严肃专业**
- 数据区用**深色背景 + 白字**形成对比
- 微妙的**琥珀色点缀**传递温暖

---

## 色彩系统

```css
/* 主色 */
--color-primary: #0F172A;       /* 深墨色 - 专业可信 */
--color-primary-light: #1E293B; /* 浅墨色 */

/* 强调色 */
--color-accent: #3B82F6;       /* 科技蓝 - 智能现代 */
--color-accent-light: #60A5FA; /* 浅蓝 */
--color-accent-warm: #F59E0B;   /* 琥珀色 - 微温暖点缀 */

/* 语义色 */
--color-success: #10B981;       /* 成功绿 - 薪资数据 */
--color-warning: #F59E0B;        /* 警告色 */
--color-error: #EF4444;         /* 错误色 */

/* 背景色 */
--color-bg: #FAFBFC;           /* 冷白 - 干净专业 */
--color-surface: #FFFFFF;        /* 纯白卡片 */

/* 文字色 */
--color-text: #0F172A;         /* 主文字 */
--color-text-secondary: #64748B; /* 次要文字 */
--color-text-muted: #94A3B8;    /* 弱化文字 */

/* 边框色 */
--color-border: #E2E8F0;       /* 默认边框 */
--color-border-light: #F1F5F9;  /* 浅色边框 */
```

### Tailwind 色板映射

| CSS变量 | Tailwind类 | 用途 |
|---------|------------|------|
| `--color-primary` | `bg-slate-900` | 主按钮、深色区域 |
| `--color-accent` | `text-blue-500` / `bg-blue-500` | 链接、强调 |
| `--color-success` | `text-emerald-500` | 成功状态、薪资数字 |
| `--color-bg` | `bg-[#FAFBFC]` | 页面背景 |

---

## 字体系统

### 主字体
```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
```

### 字体规则
- **标题**: 使用 `font-bold` + `tracking-tight` (紧凑字间距)
- **正文**: 使用 `text-slate-600` 或 `text-slate-500`
- **数据**: 使用 `font-variant-numeric: tabular-nums` 保证数字对齐

### 字号层级
| 元素 | 尺寸 | 类名 |
|------|------|------|
| Hero标题 | 4xl-6xl | `text-4xl md:text-5xl lg:text-6xl` |
| 页面标题 | 3xl-4xl | `text-3xl md:text-4xl` |
| 卡片标题 | xl | `text-xl` |
| 正文 | base-lg | `text-base` 或 `text-lg` |
| 辅助文字 | sm | `text-sm` |
| 标签/徽章 | xs | `text-xs` |

---

## 间距系统

### 基础单位
**4px**

### 间距刻度
| 名称 | 值 | Tailwind类 |
|------|-----|-----------|
| xs | 4px | `space-1` |
| sm | 8px | `space-2` |
| md | 12px | `space-3` |
| lg | 16px | `space-4` 或 `gap-4` |
| xl | 20px | `space-5` |
| 2xl | 24px | `space-6` |
| 3xl | 32px | `space-8` |
| 4xl | 40px | `space-10` |
| 5xl | 48px | `space-12` |

---

## 圆角系统

| 用途 | 圆角 | Tailwind类 |
|------|------|-----------|
| 小元素（标签、徽章） | 6px | `rounded-md` |
| 按钮、输入框 | 8-10px | `rounded-lg` |
| 卡片 | 12-16px | `rounded-xl` |
| 大容器（弹窗、模态框） | 20-24px | `rounded-2xl` |

---

## 阴影系统

```css
--shadow-sm: 0 1px 2px rgba(0,0,0,0.04);   /* 微阴影 */
--shadow-md: 0 4px 12px rgba(0,0,0,0.06);   /* 卡片悬浮 */
--shadow-lg: 0 8px 30px rgba(0,0,0,0.08);  /* 大卡片、弹窗 */
```

---

## 组件规范

### Logo
```tsx
<div className="logo-icon">
  <span className="text-lg">W</span>
</div>
```

### 按钮
```tsx
// 主要按钮 - 用于主要CTA
<button className="btn btn-primary">主要操作</button>

// 次要按钮 - 用于次要操作
<button className="btn btn-secondary">次要操作</button>

// 强调按钮 - 用于数据操作
<button className="btn btn-accent">强调操作</button>
```

### 卡片
```tsx
<div className="card p-8">
  {/* 卡片内容 */}
</div>
```

### 输入框
```tsx
<input className="input" placeholder="请输入..." />
```

### 标签
```tsx
<span className="tag tag-primary">主要标签</span>
<span className="tag tag-success">成功标签</span>
<span className="tag tag-warning">警告标签</span>
```

### 功能图标
```tsx
<div className="feature-icon feature-icon-blue">📄</div>  // 蓝色 - 简历
<div className="feature-icon feature-icon-green">💰</div>  // 绿色 - 薪资
<div className="feature-icon feature-icon-amber">🎯</div>  // 琥珀色 - 面试
```

---

## 动画系统

### 过渡时长
- **Micro**: 50-100ms — hover状态
- **Short**: 150ms — 按钮点击
- **Medium**: 200-300ms — 卡片悬浮
- **Long**: 400-700ms — 页面切换

### 动画类
```css
/* 淡入动画 */
.animate-fadeIn {
  animation: fadeIn 0.5s ease-out;
}

/* 脉冲动画（用于主要CTA） */
.animate-pulse-subtle {
  animation: pulse-subtle 2s ease-in-out infinite;
}
```

### 使用规则
- Hero区域使用淡入动画
- 按钮CTA可使用脉冲动画吸引注意
- 避免过度动画，保持专业感

---

## 布局规范

### 容器宽度
`max-w-7xl` (1280px) — 全站容器

### 栅格
- 功能卡片: 3列 (md:grid-cols-3)
- 数据展示: 4列 (md:grid-cols-4)
- 痛点列表: 2列 (md:grid-cols-2)

### 间距节奏
- Section间距: `py-20` (80px)
- 卡片间距: `gap-6` 或 `gap-8`
- 内部间距: `p-6` 或 `p-8`

---

## 设计决策日志

| 日期 | 决策 | 理由 |
|------|------|------|
| 2026-06-17 | 采用Professional Smart风格 | 专业感+智能+温暖，符合产品定位 |
| 2026-06-17 | 深墨色主色替代紫蓝渐变 | 避免AI产品泛用配色，建立辨识度 |
| 2026-06-17 | 琥珀色点缀 | 在冷色调中注入温暖感 |
| 2026-06-17 | 克制装饰 | 靠排版和留白传达品质感 |

---

## 应用指南

### 新增页面
1. 使用 `bg-[#FAFBFC]` 作为页面背景
2. 使用 `card` 类作为内容容器
3. 使用 `btn btn-primary/secondary/accent` 作为按钮
4. 使用 `section-title` + `section-subtitle` 作为区域标题

### 修改样式
1. 优先使用现有的CSS变量
2. 使用Tailwind的工具类
3. 避免添加新的渐变色
4. 保持圆角一致性

### 图标使用
- 使用Lucide React图标库
- 功能区使用Emoji图标增强辨识度
- 保持图标尺寸一致 (24px或28px)
