# Fitness Plan (极简云同步健身计划)

这是一个专为移动端设计的单文件无服务器 Web 应用，采用纯 HTML/CSS/JS 构建，无任何构建工具和庞大依赖。它能帮助你方便地记录、打卡和管理健身进度，并且支持免费的全球跨设备云同步（基于 Supabase）。

## ✨ 核心功能
* **赛博朋克深色美学**：全局径向渐变背景、霓虹色彩呼吸动效与玻璃态拟物 UI 结合，点击拥有弹簧般的真实阻尼回馈。
* **分部位记录**：通过底部固定 Tab 快速切换 胸、肩、腿、背 的每日动作计划。
* **自动记忆库**：填入过的自定义新动作会被记忆，下次使用时在输入框下方自动补全，极大提升输入效率。
* **智能隔夜重置**：每日凌晨 2:00 根据时区界限，将当天的各组圆圈状态丝滑归零，免除每日手动建表的烦恼。
* **无缝云端同步**：基于 Supabase 云引擎与乐观更新 (Optimistic UI) 理念，点亮圆环无延迟的同时，能跨越手机、电脑实现毫秒级数据同步保护。

## 🚀 部署配置
项目当前已部署在 GitHub Pages，可以通过以下链接访问：
[🔗 点击打开应用](https://zhyio.github.io/fitness-plan/)

**技术配置：**
* **前端托管**：GitHub Pages 静态托管（免费 & 无服务器）。
* **后端数据库**：Supabase（Serverless PostgreSQL），当前分配给项目的免费版具有充足稳定的读写容量。
* **核心表结构 (`fitness_data`)**：
  ```sql
  create table public.fitness_data (
    id uuid default gen_random_uuid() primary key,
    user_id text not null default 'default_user',
    exercises jsonb not null default '{"chest":[], "shoulder":[], "legs":[], "back":[]}'::jsonb,
    custom_exercises jsonb not null default '{}'::jsonb,
    last_reset text,
    updated_at timestamp with time zone default now()
  );
  ```

## 📱 移动端沉浸体验提示
建议在手机的浏览器（Safari 或 Chrome）中打开网页后，选择底部的 **"添加到主屏幕" (Add to Home Screen)**。
由于代码已做特定适配，从桌面直接点击图标进入，它将完全隐藏顶栏和底栏，展现出原生 App 般的沉浸版全屏操控体验。

## 🛠 开发扩展
该应用代码都在 `index.html` 一个文件内。
* **自定义样式**：可以直接在文件 `<style>` 标签的 `:root` 变量区（`--accent-chest` 等）更改自己喜欢的部位代表颜色。
* **动画调试**：可到 `@keyframes slideUpFade` 和 `@keyframes neonPulse` 内修改交互动态。
* **云端库**：代码接入了 Jsdelivr 全球 CDN 以保证网络通畅加载 Supabase JS，如果某天离线，代码也会平滑降级并在本地照常工作。
