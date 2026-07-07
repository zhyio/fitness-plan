# Fitness Plan (极简云同步健身计划)

这是一个面向移动端的单用户私用健身记录 PWA。应用使用静态 HTML/CSS/JS 构建，托管在 GitHub Pages，通过 Supabase 保存私有训练数据；当 Supabase 或 CDN 不可用时，会自动降级到本地 IndexedDB 缓存。

## 核心功能

* **单用户免登**：应用固定使用 `87553652@qq.com` 作为私有数据标识，不提供注册、登录或多账号切换。
* **分部位记录**：支持胸、肩、腿、背、腹五个部位的训练动作、组数、次数、重量记录。
* **今日总览与部位分化**：底部可在总览和分部位模式之间切换，右侧快捷按钮用于快速切换训练部位。
* **动作模板复用**：添加过的动作会保存最近一次组数、次数和重量，之后可直接套用。
* **动作要领笔记**：每个动作可记录发力重点、动作幅度、呼吸节奏等个人提示。
* **超量训练组**：目标组之外额外提供 2 个过量组，过量组不影响目标完成百分比。
* **训练统计**：支持本周、本月训练天数统计和历史日历回看。
* **隔夜重置**：每天凌晨 2:00 后打开应用，会把前一天已完成训练归档到历史并重置今日打卡状态。

## 部署配置

线上地址：
[https://zhyio.github.io/fitness-plan/](https://zhyio.github.io/fitness-plan/)

技术组成：

* **托管**：GitHub Pages 静态托管。
* **前端**：`index.html` + `assets/app.css` + `assets/app.js`，无构建步骤。
* **本地缓存**：IndexedDB 保存离线训练数据、历史快照、更新时间和待同步标记。
* **云端同步**：Supabase `fitness_data` 表，按固定 `user_id` 读取和 upsert 单条私有数据。
* **恢复策略**：启动时比较本地 `updated_at` 和云端 `updated_at`；本地有待同步改动时优先保留本地并推回云端。
* **同步状态**：页面顶部显示本地保存、待同步、同步中、已同步或本地模式状态。

Supabase 表结构：

```sql
create table public.fitness_data (
  id uuid default gen_random_uuid() primary key,
  user_id text not null unique,
  exercises jsonb not null default '{"chest":[], "shoulder":[], "legs":[], "back":[], "abs":[]}'::jsonb,
  custom_exercises jsonb not null default '{}'::jsonb,
  history jsonb not null default '[]'::jsonb,
  last_reset text,
  updated_at timestamp with time zone default now()
);
```

## 本地开发

直接启动静态服务器即可：

```bash
python3 -m http.server 5179 --bind 127.0.0.1
```

然后打开 [http://127.0.0.1:5179/](http://127.0.0.1:5179/)。

## PWA 使用

在手机 Safari 或 Chrome 打开线上地址后，选择“添加到主屏幕”。应用包含 `manifest.webmanifest` 和 `sw.js`，可以缓存核心静态资源，并在网络波动时继续使用本地数据。
