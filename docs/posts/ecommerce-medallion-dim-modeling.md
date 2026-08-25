---
title: "电商数据仓库实战：Medallion 架构 + 维度建模完整建设流程"
description: "以电商订单交易数据为例，从造数据到 Bronze → Silver → Gold 三层落地，完整演示维度建模：事实表、维度表、SCD 缓慢变化维度、快照表、代理键与度量设计，附全套演示数据与 SQL。"
date: 2026-08-25
tags:
  - Data Engineering
  - Dimensional Modeling
  - Medallion Architecture
  - Data Warehouse
  - E-commerce
---

# 电商数据仓库实战：Medallion 架构 + 维度建模完整建设流程

> 很多人分得清 **Medallion（奖牌/多层）架构**和**维度建模（Dimensional Modeling）**的概念，但一旦动手，就不知道 Bronze / Silver / Gold 每一层到底放什么、做什么，更不知道"维度"和"事实"是怎么一步步从脏数据里长出来的。

这篇文章用一个**电商交易**案例，从**造数据**开始，完整走一遍从源系统到可查报表的数据仓库建设过程。每一层做什么、产出什么、有哪些关键决策点，全部用 SQL 和演示数据摊开讲。

先给结论：**Medallion 负责管流水（怎么把数据一层层洗干净），维度建模负责管结构（最终的星型模型怎么摆）**。两者叠加，就是现代湖仓（Lakehouse）里最常见的数据仓库形态。

---

## 一、案例背景与总体设计

### 1.1 业务场景

假设我们为一家电商平台 **"北极星商城"** 搭建数据仓库。它的业务链条是：

```
浏览 → 下单 → 支付 → 发货 → 签收 → 售后（退款/退货）
```

老板和运营想知道：

- 每天的 GMV（成交总额）、订单量、客单价是多少？
- 哪个类目、哪个店铺卖得好？
- 用户复购情况如何？
- 库存消耗快不快，会不会断货？
- 订单从下单到签收平均要多久？

这些问题，就是数据仓库要回答的**业务度量（Measures）**，而回答它们需要的数据，散落在源系统的 8 张业务表里。

### 1.2 源系统：8 张业务表

| 表 | 类型 | 说明 |
| --- | --- | --- |
| `categories` | 维度类 | 商品类目（数码、服饰、家居……） |
| `shops` | 维度类 | 店铺（自营、专营店、旗舰店） |
| `customers` | 维度类 | 用户档案（手机号、城市、会员等级） |
| `products` | 维度类 | 商品（所属类目、店铺、售价） |
| `orders` | 事实类 | 订单主表（金额、状态、支付信息） |
| `order_items` | 事实类 | 订单行项目（每笔订单买了什么、几件） |
| `refunds` | 事实类 | 退款事件（退了多少钱、什么原因） |
| `inventory_daily` | 事实类 | 每日库存快照（库存量、当日销量） |

其中 `customers`、`products` 是典型的**会随时间变化的维度**——用户会升级会员、搬家换城市，商品会换类目、调价格。这正是后面演示**缓慢变化维度（Slowly Changing Dimension, SCD）**的素材。

### 1.3 总体架构：Medallion × 维度建模

<figure class="bf-fig">
<svg viewBox="0 0 1000 330" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Medallion 架构总览：源系统到 Bronze Silver Gold 再到 BI">
  <text x="30" y="30" class="bf-text" font-size="15" font-weight="600">Medallion Architecture + Dimensional Modeling 总体架构</text>

  <!-- 源系统 -->
  <rect x="30" y="90" width="150" height="90" rx="8" class="bf-panel"/>
  <text x="105" y="125" text-anchor="middle" class="bf-text" font-size="13" font-weight="600">源系统</text>
  <text x="105" y="145" text-anchor="middle" class="bf-text-2" font-size="11">MySQL 业务库</text>
  <text x="105" y="162" text-anchor="middle" class="bf-text-2" font-size="11">8 张业务表</text>

  <!-- 箭头 1 -->
  <line x1="180" y1="135" x2="225" y2="135" class="bf-arrow"/>
  <polygon points="225,135 215,130 215,140" class="bf-arrow-head"/>

  <!-- Bronze -->
  <rect x="230" y="70" width="160" height="130" rx="8" class="bf-panel"/>
  <rect x="230" y="70" width="160" height="30" rx="8" class="bf-flow-box"/>
  <text x="310" y="90" text-anchor="middle" class="bf-text" font-size="13" font-weight="600">🥉 Bronze</text>
  <text x="310" y="120" text-anchor="middle" class="bf-text-2" font-size="11">原始落地层</text>
  <text x="310" y="140" text-anchor="middle" class="bf-text-2" font-size="11">append-only</text>
  <text x="310" y="156" text-anchor="middle" class="bf-text-2" font-size="11">原样保留 · 不加工</text>
  <text x="310" y="175" text-anchor="middle" class="bf-bad" font-size="11" font-weight="600">脏数据也进来</text>

  <!-- 箭头 2 -->
  <line x1="390" y1="135" x2="435" y2="135" class="bf-arrow"/>
  <polygon points="435,135 425,130 425,140" class="bf-arrow-head"/>

  <!-- Silver -->
  <rect x="440" y="70" width="160" height="130" rx="8" class="bf-flow-recompute"/>
  <rect x="440" y="70" width="160" height="30" rx="8" class="bf-flow-recompute"/>
  <text x="520" y="90" text-anchor="middle" class="bf-text" font-size="13" font-weight="600">🥈 Silver</text>
  <text x="520" y="120" text-anchor="middle" class="bf-text-2" font-size="11">清洗整合层</text>
  <text x="520" y="140" text-anchor="middle" class="bf-text-2" font-size="11">去重 · 类型校正</text>
  <text x="520" y="156" text-anchor="middle" class="bf-text-2" font-size="11">标准化 · SCD</text>
  <text x="520" y="175" text-anchor="middle" class="bf-ok" font-size="11" font-weight="600">干净可信</text>

  <!-- 箭头 3 -->
  <line x1="600" y1="135" x2="645" y2="135" class="bf-arrow"/>
  <polygon points="645,135 635,130 635,140" class="bf-arrow-head"/>

  <!-- Gold -->
  <rect x="650" y="70" width="160" height="130" rx="8" class="bf-flow-skip"/>
  <rect x="650" y="70" width="160" height="30" rx="8" class="bf-flow-skip"/>
  <text x="730" y="90" text-anchor="middle" class="bf-text" font-size="13" font-weight="600">🥇 Gold</text>
  <text x="730" y="120" text-anchor="middle" class="bf-text-2" font-size="11">业务建模层</text>
  <text x="730" y="140" text-anchor="middle" class="bf-text-2" font-size="11">维度建模 · 星型</text>
  <text x="730" y="156" text-anchor="middle" class="bf-text-2" font-size="11">fact_* / dim_*</text>
  <text x="730" y="175" text-anchor="middle" class="bf-ok" font-size="11" font-weight="600">面向报表</text>

  <!-- 箭头 4 -->
  <line x1="810" y1="135" x2="855" y2="135" class="bf-arrow"/>
  <polygon points="855,135 845,130 845,140" class="bf-arrow-head"/>

  <!-- BI -->
  <rect x="860" y="90" width="110" height="90" rx="8" class="bf-panel"/>
  <text x="915" y="125" text-anchor="middle" class="bf-text" font-size="13" font-weight="600">BI / 报表</text>
  <text x="915" y="145" text-anchor="middle" class="bf-text-2" font-size="11">Metabase</text>
  <text x="915" y="162" text-anchor="middle" class="bf-text-2" font-size="11">SQL 分析</text>

  <!-- 底部注释 -->
  <line x1="30" y1="230" x2="970" y2="230" class="bf-grid"/>
  <text x="30" y="260" class="bf-text-2" font-size="12">每层职责一句话：</text>
  <text x="30" y="285" class="bf-text-2" font-size="12">Bronze = 保存证据（原封不动、可重放、可回溯）</text>
  <text x="30" y="305" class="bf-text-2" font-size="12">Silver = 清洗加工（去重、矫正、SCD，产出"干净的事实与维度"）</text>
  <text x="30" y="325" class="bf-text-2" font-size="12">Gold  = 建模供数（维度建模，星型模型，直接服务报表）</text>
</svg>
<figcaption>图 1：Medallion 三层管流水，Gold 层用维度建模定型，BI 直接消费星型模型</figcaption>
</figure>

### 1.4 分层职责速览

| 层 | 别名 | 核心问题 | 存放内容 | 是否建模 |
| --- | --- | --- | --- | --- |
| 🥉 Bronze | 原始落地层 | "数据原样来了吗？" | 源表 1:1 落地 + 摄取元数据列 | 否，照单全收 |
| 🥈 Silver | 清洗整合层 | "数据干净了吗？" | 去重、类型正确、SCD 处理的明细表 | 仅清洗，不摆星型 |
| 🥇 Gold | 业务建模层 | "业务怎么查最快？" | **维度建模**：`dim_*` 维度表 + `fact_*` 事实表 | 是，星型/雪花 |
| BI | 消费层 | "报表能不能秒出？" | 查询、看板、指标口径 | — |

> **一句话**：Bronze 保真，Silver 保净，Gold 保快。维度建模发生在 Gold 层。

---

## 二、第一步：造数据（模拟源系统）

动手之前，先造一套**带有真实感问题**的演示数据——没有脏数据，就体现不出三层架构的价值。

### 2.1 建库建表

以 PostgreSQL 风格建源库，为后面演示"类型错误"特意把 `orders.order_date` 建成 `VARCHAR`：

```sql
CREATE SCHEMA source;

CREATE TABLE source.categories (
  category_id SERIAL PRIMARY KEY,
  name        VARCHAR(50) NOT NULL,
  parent_id   INT
);

CREATE TABLE source.shops (
  shop_id   SERIAL PRIMARY KEY,
  shop_name VARCHAR(50) NOT NULL,
  region    VARCHAR(20),
  rating    DECIMAL(2,1)
);

CREATE TABLE source.customers (
  customer_id   SERIAL PRIMARY KEY,
  name          VARCHAR(50),
  phone         VARCHAR(20),          -- 孙悦的 phone 是 NULL（脏数据）
  city          VARCHAR(20),
  membership    VARCHAR(10),          -- normal / silver / gold
  registered_at DATE
);

CREATE TABLE source.products (
  product_id  SERIAL PRIMARY KEY,
  name        VARCHAR(80),
  category_id INT,
  shop_id     INT,
  price       DECIMAL(10,2),
  status      VARCHAR(10)             -- on_sale / off_sale
);

CREATE TABLE source.orders (
  order_id        SERIAL PRIMARY KEY,
  customer_id     INT,
  order_date      VARCHAR(10),        -- 故意用字符串，演示类型校正
  status          VARCHAR(20),        -- pending/paid/shipped/completed/cancelled
  payment_status  VARCHAR(10),        -- paid / unpaid
  payment_method  VARCHAR(10),        -- alipay / wechat / NULL
  paid_at         TIMESTAMP,
  gross_amount    DECIMAL(10,2),      -- 商品小计
  discount_amount DECIMAL(10,2),      -- 优惠金额
  shipping_fee    DECIMAL(10,2),      -- 运费
  total_amount    DECIMAL(10,2),      -- 实付 = 小计 - 优惠 + 运费
  created_at      TIMESTAMP,
  updated_at      TIMESTAMP
);

CREATE TABLE source.order_items (
  item_id    SERIAL PRIMARY KEY,
  order_id   INT,
  product_id INT,
  quantity   INT,
  unit_price DECIMAL(10,2)
);

CREATE TABLE source.refunds (
  refund_id    SERIAL PRIMARY KEY,
  order_id     INT,
  item_id      INT,
  refund_amount DECIMAL(10,2),
  refund_time  TIMESTAMP,
  reason       VARCHAR(50),
  status       VARCHAR(10)            -- approved / pending
);

CREATE TABLE source.inventory_daily (
  dt         DATE,
  product_id INT,
  warehouse  VARCHAR(30),
  stock_qty  INT,
  sold_qty   INT
);
```

### 2.2 维度类源表：造数据（含变化）

**`categories`** —— 类目是稳定的，属于"变化极慢"的维度：

| category_id | name | parent_id |
| --- | --- | --- |
| 1 | 数码 | NULL |
| 2 | 服饰 | NULL |
| 3 | 家居 | NULL |
| 4 | 食品 | NULL |
| 5 | 智能家居 | 1 |

> 注意：`5 智能家居` 是 **2025-08-10 才新增**的类目，8 月 10 日之前它不存在——这为后面演示商品 305 "迁移类目"埋下伏笔。

**`shops`** —— 店铺信息稳定，演示时按 **SCD Type 1（直接覆盖）** 处理：

| shop_id | shop_name | region | rating |
| --- | --- | --- | --- |
| 1 | 北极星自营 | 华东 | 4.8 |
| 2 | 星辰数码专营店 | 华南 | 4.6 |
| 3 | 山谷户外旗舰店 | 华北 | 4.7 |
| 4 | 田园生鲜店 | 华东 | 4.5 |

**`customers`** —— 9 个用户，**埋了三个雷**：

| customer_id | name | phone | city | membership | registered_at |
| --- | --- | --- | --- | --- | --- |
| 1001 | 张伟 | 13800001001 | 北京 | normal | 2024-03-12 |
| 1002 | 李娜 | 13800001002 | 上海 | normal | 2024-05-20 |
| 1003 | 王芳 | 13800001003 | 广州 | silver | 2024-07-01 |
| 1004 | 刘强 | 13800001004 | 深圳 | normal | 2024-09-15 |
| 1005 | 陈静 | 13800001005 | 杭州 | gold | 2023-11-02 |
| 1006 | 杨洋 | 13800001006 | 成都 | normal | 2025-01-08 |
| 1007 | 赵敏 | 13800001007 | 武汉 | normal | 2025-01-05 |
| 1008 | 孙悦 | **NULL** | 北京 | normal | 2025-02-14 |
| 1009 | 周杰 | 13800001009 | 南京 | normal | 2025-03-03 |

埋雷清单：

1. **1008 孙悦没有手机号**（`NULL`）——演示空值处理；
2. **1007 赵敏在 2025-06-01 升级为 gold 并换了手机号**——演示 **SCD Type 2 保留历史**；
3. **1009 周杰在 2025-07-20 从南京搬到苏州**——业务上"搬家"属于可覆盖的变化，演示 **SCD Type 1**（如果公司想分析城市迁移，也可以按 Type 2 处理，这是建模决策）。

**`products`** —— 7 个商品，**埋了类目迁移 + 停售两个雷**：

| product_id | name | category_id | shop_id | price | status |
| --- | --- | --- | --- | --- | --- |
| 301 | iPhone 15 Pro | 1 | 2 | 7999.00 | on_sale |
| 302 | 华为 Mate 60 | 1 | 2 | 6499.00 | on_sale |
| 303 | 轻暖羽绒服 | 2 | 3 | 899.00 | on_sale |
| 304 | 北欧落地灯 | 3 | 1 | 459.00 | on_sale |
| 305 | 智能音箱 Pro | 1 | 1 | 399.00 | on_sale |
| 306 | 有机燕麦片 | 4 | 4 | 49.90 | on_sale |
| 307 | 复古蓝牙音箱 | 1 | 2 | 259.00 | off_sale |

埋雷清单：

1. **305 智能音箱 Pro 在 2025-08-10 迁入新类目"智能家居"，并降价到 349**——演示 **SCD Type 2**（分析"当时类目/价格"必须保留历史版本）；
2. **307 已停售**（`off_sale`）——演示维度"当前状态"与"历史事实"的解耦。

> 维度变化怎么进入仓库？真实世界中通常通过 **CDC（Change Data Capture）** 或每日全量/增量同步。这里我们模拟"多次同步快照"，每一次同步的原始内容都落在 Bronze 层。

### 2.3 事实类源表：造数据（含脏数据）

**`orders`** —— 8 笔订单，其中 **20004 因 CDC 重复投递出现了两行**（这是最常见的脏数据）：

| order_id | customer_id | order_date | status | payment_status | payment_method | paid_at | gross | discount | shipping | total | updated_at |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 20001 | 1001 | 2025-08-01 | completed | paid | alipay | 08-01 10:23 | 7999.00 | 0 | 0 | 7999.00 | 08-01 10:25 |
| 20002 | 1002 | 2025-08-01 | completed | paid | wechat | 08-01 11:05 | 899.00 | 0 | 12 | 911.00 | 08-03 12:00 |
| 20003 | 1003 | 2025-08-01 | pending | **unpaid** | NULL | NULL | 459.00 | 0 | 0 | 459.00 | 08-01 13:40 |
| 20004 | 1007 | 2025-08-02 | shipped | paid | alipay | 08-02 09:12 | 6499.00 | 200 | 0 | 6299.00 | 08-03 10:00 |
| **20004(重复)** | 1007 | 2025-08-02 | shipped | paid | alipay | 08-02 09:12 | 6499.00 | 200 | 0 | 6299.00 | **08-03 10:00** |
| 20005 | 1005 | 2025-08-02 | paid | paid | wechat | 08-02 14:31 | 798.00 | 39.90 | 0 | 758.10 | 08-02 14:31 |
| 20006 | 1006 | 2025-08-03 | **cancelled** | unpaid | NULL | NULL | 899.00 | 0 | 0 | 899.00 | 08-03 08:02 |
| 20007 | 1008 | 2025-08-03 | completed | paid | alipay | 08-03 16:45 | 99.80 | 0 | 5 | 104.80 | 08-05 09:00 |
| 20008 | 1002 | 2025-08-04 | completed | paid | wechat | 08-04 20:18 | 1358.00 | 60 | 0 | 1298.00 | 08-05 19:30 |

**`order_items`** —— 每笔订单的商品行（这就是后面事实表的最小粒度来源）：

| item_id | order_id | product_id | quantity | unit_price |
| --- | --- | --- | --- | --- |
| 30001 | 20001 | 301 | 1 | 7999.00 |
| 30002 | 20002 | 303 | 1 | 899.00 |
| 30003 | 20003 | 304 | 1 | 459.00 |
| 30004 | 20004 | 302 | 1 | 6499.00 |
| 30005 | 20005 | 305 | 2 | 399.00 |
| 30006 | 20006 | 303 | 1 | 899.00 |
| 30007 | 20007 | 306 | 2 | 49.90 |
| 30008 | 20008 | 304 | 1 | 459.00 |
| 30009 | 20008 | 303 | 1 | 899.00 |

> 注意 20005 买了 **2 件**智能音箱（行项目数量=2），而 20008 有 **2 个行项目**（落地灯 + 羽绒服）。**粒度（Grain）** 的差别从源数据就开始了。

**`refunds`** —— 两笔已审核通过的退款：

| refund_id | order_id | item_id | refund_amount | refund_time | reason | status |
| --- | --- | --- | --- | --- | --- | --- |
| R001 | 20002 | 30002 | 299.00 | 2025-08-06 10:00 | 尺码不合适 | approved |
| R002 | 20007 | 30007 | 49.90 | 2025-08-05 09:30 | 商品破损 | approved |

**`inventory_daily`** —— **每日库存快照**（源系统每晚跑一次库存盘点）：

| dt | product_id | warehouse | stock_qty | sold_qty |
| --- | --- | --- | --- | --- |
| 2025-08-03 | 301 | WH-华东-01 | 180 | 20 |
| 2025-08-03 | 305 | WH-华东-01 | 320 | 45 |
| 2025-08-03 | 306 | WH-华南-02 | 820 | 60 |
| 2025-08-04 | 301 | WH-华东-01 | 155 | 25 |
| 2025-08-04 | 305 | WH-华东-01 | 275 | 50 |
| 2025-08-04 | 306 | WH-华南-02 | 760 | 70 |
| 2025-08-05 | 301 | WH-华东-01 | 130 | 28 |
| 2025-08-05 | 305 | WH-华东-01 | 225 | 55 |
| 2025-08-05 | 306 | WH-华南-02 | 700 | 78 |

### 2.4 埋雷汇总（对照表）

| # | 脏数据 / 业务变化 | 所在表 | 对应处理 |
| --- | --- | --- | --- |
| 1 | 20004 重复两行（CDC 重复投递） | `orders` | Silver 去重（取最新） |
| 2 | 1008 手机号为空 | `customers` | Silver 空值兜底/标注 |
| 3 | `order_date` 是字符串 | `orders` | Silver 类型校正 CAST |
| 4 | 20003 未支付、20006 已取消 | `orders` | Gold 事实表过滤/加状态标志 |
| 5 | 1007 升级 gold + 换手机号 | `customers` | **SCD Type 2** 留历史 |
| 6 | 1009 搬家（南京→苏州） | `customers` | **SCD Type 1** 覆盖 |
| 7 | 305 迁类目 + 降价 | `products` | **SCD Type 2** 留历史 |
| 8 | 类目 5 是 8 月 10 日新增 | `categories` | 维度自然增长，无影响 |
| 9 | 307 停售 | `products` | 维度保留，事实不受影响 |
| 10 | 库存只有 8/3–8/5 三天 | `inventory_daily` | 周期快照表天然按月累积 |

---

## 三、第二步：Bronze 层——原样落地

### 3.1 目标与原则

Bronze 层只有一个任务：**把源系统数据原封不动地搬进湖里，并保存证据**。

- **Append-only（只追加不修改）**：来了几批就存几批，永不 UPDATE/DELETE；
- **保真（Fidelity）**：哪怕源数据是错的、重复的，也一字不改地存；
- **加元数据列**：记录"这批数据什么时候、从哪里、以什么方式进来的"；
- **可重放（Replayable）**：任何一层出问题，都能从 Bronze 重新计算。

### 3.2 建表 SQL

用 Delta Lake 风格建表（Iceberg / Hudi / 普通 Parquet 同理，重点是分层 + 分区 + 元数据列）：

```sql
CREATE SCHEMA bronze;

CREATE TABLE bronze.orders (
  order_id        INT,
  customer_id     INT,
  order_date      STRING,          -- 保留原始字符串，不做任何转换
  status          STRING,
  payment_status  STRING,
  payment_method  STRING,
  paid_at         STRING,          -- 原样保留
  gross_amount    DECIMAL(10,2),
  discount_amount DECIMAL(10,2),
  shipping_fee    DECIMAL(10,2),
  total_amount    DECIMAL(10,2),
  created_at      STRING,
  updated_at      STRING,
  -- 元数据列：每一次摄取都记录
  _ingest_dt     DATE,             -- 摄取日期（按此分区）
  _source        STRING,           -- 来源，如 'mysql.orders'
  _load_type     STRING            -- full / incremental
)
USING DELTA
PARTITIONED BY (_ingest_dt);       -- 每天一个分区，天然按时间切片
```

> 关键设计：**分区键用摄取日期而非业务日期**。因为历史数据晚到（迟到数据）时，它应该落在"它被收进来的那天"，这样增量 pipeline 可以只扫最新分区，不重算历史。

### 3.3 落地 SQL

第一次全量 + 后续增量，都只是 INSERT：

```sql
-- 全量初装（2025-06-01）
INSERT INTO bronze.customers
SELECT *,
       DATE '2025-06-01' AS _ingest_dt,
       'mysql.customers' AS _source,
       'full'            AS _load_type
FROM source.customers;

-- 增量同步（2025-06-02）：赵敏升级，只投递变化行
INSERT INTO bronze.customers
SELECT *,
       DATE '2025-06-02' AS _ingest_dt,
       'mysql.customers' AS _source,
       'incremental'     AS _load_type
FROM source.customers
WHERE customer_id = 1007;   -- 模拟 CDC 增量包
```

### 3.4 bronze.customers 落库效果（多批次共存）

| customer_id | name | phone | city | membership | _ingest_dt | _load_type |
| --- | --- | --- | --- | --- | --- | --- |
| 1001 | 张伟 | 13800001001 | 北京 | normal | 2025-06-01 | full |
| … | … | … | … | … | 2025-06-01 | full |
| 1007 | 赵敏 | 13800001007 | 武汉 | normal | 2025-06-01 | full |
| **1007** | **赵敏** | **13900001007** | 武汉 | **gold** | **2025-06-02** | **incremental** |
| 1009 | 周杰 | 13800001009 | 南京 | normal | 2025-06-01 | full |
| 1009 | 周杰 | 13800001009 | 苏州 | normal | 2025-07-21 | incremental |

同样地，`bronze.orders` 里 **20004 的重复行会原样出现两遍**——Bronze 不管，这是它的职责。

### 3.5 关键信息

| 决策点 | 答案 | 为什么 |
| --- | --- | --- |
| 这一层建索引/约束吗？ | 不建 | 它是"原始证据库"，不是服务层 |
| 清理脏数据吗？ | 绝不 | 一旦清洗，原始信息就丢了，无法回溯 |
| 分区策略 | 按 `_ingest_dt` | 增量只扫新分区，重放只删分区 |
| 表结构与源库一致吗？ | 1:1 保留 | 源库加列，Bronze 也随之加列，不受 Silver/Gold 影响 |

---

## 四、第三步：Silver 层——清洗、去重、标准化与 SCD

### 4.1 目标与原则

Silver 层把 Bronze 的"脏证据"加工成**干净、可信、可直接分析的明细数据**：

- 去重：业务主键维度的数据只留最新；
- 类型校正：字符串日期 → DATE/TIMESTAMP，金额统一 DECIMAL；
- 空值处理：能兜底就兜底，不能兜底要标注；
- 枚举标准化：统一状态码、支付方式；
- 外键完整性：孤儿行（引用不存在的用户/商品）要暴露；
- **SCD 处理**：把维度的时间变化变成"版本行"——**这是 Silver 层最有价值的部分**。

> 重要观念：Silver 层**只做清洗与整合，不做星型建模**。它更像"整理好的明细"（one row per event），Gold 层才做业务建模。

### 4.2 去重：用 `ROW_NUMBER()` 保留每笔订单最新版本

```sql
CREATE TABLE silver.orders AS
SELECT *
FROM (
  SELECT *,
         ROW_NUMBER() OVER (
           PARTITION BY order_id                -- 业务主键
           ORDER BY updated_at DESC, _ingest_dt DESC
         ) AS rn
  FROM bronze.orders
) t
WHERE rn = 1;          -- 只留每个 order_id 的最新一行
```

> 关键信息：**去重的依据是"业务主键 + 业务更新时间"**，而不是摄取时间。重复行 20004 的两条 `updated_at` 相同，我们再按 `_ingest_dt` 兜底，保证结果确定（deterministic）。

### 4.3 类型校正与空值处理

```sql
CREATE TABLE silver.orders AS
SELECT
  order_id,
  customer_id,
  CAST(order_date AS DATE)              AS order_date,   -- 字符串 → DATE
  COALESCE(status, 'unknown')           AS status,
  payment_status,
  COALESCE(payment_method, 'n/a')       AS payment_method,
  CAST(paid_at AS TIMESTAMP)            AS paid_at,
  gross_amount,
  COALESCE(discount_amount, 0)          AS discount_amount,
  COALESCE(shipping_fee, 0)             AS shipping_fee,
  total_amount,
  CAST(created_at AS TIMESTAMP)         AS created_at,
  CAST(updated_at AS TIMESTAMP)         AS updated_at
FROM bronze.orders
WHERE order_id IS NOT NULL              -- 主键必填
  AND total_amount IS NOT NULL;         -- 核心度量必填
```

```sql
-- customers：手机号为空 → 用 'unknown' 兜底，并加一个 flag 方便数据质量监控
CREATE TABLE silver.customers AS
SELECT
  customer_id, name,
  COALESCE(NULLIF(TRIM(phone), ''), 'unknown') AS phone,
  city,
  membership,
  registered_at,
  CASE WHEN phone IS NULL THEN 1 ELSE 0 END AS flag_missing_phone
FROM bronze.customers;
```

### 4.4 枚举标准化

```sql
-- 状态映射表（可以做成配置表）
CREATE TABLE silver.dim_order_status AS
SELECT 'pending'   AS raw_status, 'PENDING'    AS status_cd, '待支付' AS status_cn UNION ALL
SELECT 'paid'      , 'PAID'       , '已支付' UNION ALL
SELECT 'shipped'   , 'SHIPPED'    , '已发货' UNION ALL
SELECT 'completed' , 'COMPLETED'  , '已完成' UNION ALL
SELECT 'cancelled' , 'CANCELLED'  , '已取消';
```

### 4.5 SCD 处理：Silver 层的重头戏

#### 4.5.1 什么是 SCD（缓慢变化维度）

维度属性（手机号、会员等级、类目、价格）**会变，但变化不频繁**。面对变化有三种经典策略：

| 策略 | 做法 | 保留历史？ | 适用 |
| --- | --- | --- | --- |
| **SCD Type 1** | 直接覆盖旧值 | 否 | 改错了、搬家、评分这类"不需要回看"的属性 |
| **SCD Type 2** | 插入新版本行，旧版本保留并标记有效期 | **是** | "当时是什么"很重要的属性：价格、类目、等级 |
| **SCD Type 3** | 表上加"原值/现值"两列 | 只保留上一次 | 只需要"当前 vs 上一次"的对比 |

实现 SCD 的表需要有**版本控制列**：

```text
natural_key  natural_key+valid_from+valid_to 唯一确定一个版本
valid_from  该版本生效起始日
valid_to    该版本失效日（当前版本为 9999-12-31）
is_current  是否当前版本（方便查询）
```

#### 4.5.2 实现 SCD Type 2（两阶段 MERGE）

> 第一阶段：把旧版本"关掉"；第二阶段：插入新版本。逻辑拆开写更清晰。

```sql
-- 阶段一：检测到属性变化 → 关闭旧版本
MERGE INTO silver.customers AS tgt
USING (
  SELECT s.customer_id, s.phone, s.membership, s.city,
         s._ingest_dt
  FROM bronze.customers s
  JOIN silver.customers c
    ON c.customer_id = s.customer_id AND c.is_current = TRUE
) src
ON tgt.customer_id = src.customer_id AND tgt.is_current = TRUE
WHEN MATCHED AND (
  src.phone      <> tgt.phone
  OR src.membership <> tgt.membership
  OR src.city    <> tgt.city
) THEN UPDATE SET
  tgt.valid_to   = src._ingest_dt - 1,   -- 旧版本失效到"变化前一天"
  tgt.is_current = FALSE;

-- 阶段二：插入新版本（把当前版本置为最新）
INSERT INTO silver.customers
  (customer_id, name, phone, city, membership, registered_at,
   valid_from, valid_to, is_current)
SELECT
  c.customer_id, c.name, src.phone, src.membership, src.city,
  c.registered_at,
  src._ingest_dt AS valid_from,          -- 新版本从变化当天生效
  DATE '9999-12-31' AS valid_to,
  TRUE           AS is_current
FROM bronze.customers src
JOIN silver.customers c
  ON c.customer_id = src.customer_id AND c.is_current = FALSE
LEFT JOIN silver.customers c2
  ON c2.customer_id = src.customer_id
 AND c2.valid_from = src._ingest_dt     -- 防重复
WHERE c2.customer_id IS NULL
  AND EXISTS (
    SELECT 1 FROM silver.customers old
    WHERE old.customer_id = src.customer_id
      AND old.valid_to   = src._ingest_dt - 1  -- 只处理"刚被关闭"的版本
  );
```

> 上面的 SQL 重点是**意图**，生产环境通常封装成存储过程/任务（dbt macro、Spark job）。核心机制：**变化检测 → 关旧 → 开新**。产品 305 的类目迁移用同样逻辑处理，只是把变化列换成 `category_id, price`。

#### 4.5.3 SCD Type 1 实现（直接覆盖）

```sql
-- shops / categories：变化直接覆盖，不保留历史
MERGE INTO silver.shops AS tgt
USING bronze.shops AS src
ON tgt.shop_id = src.shop_id
WHEN MATCHED THEN UPDATE SET
  shop_name = src.shop_name, region = src.region, rating = src.rating
WHEN NOT MATCHED THEN INSERT (shop_id, shop_name, region, rating)
  VALUES (src.shop_id, src.shop_name, src.region, src.rating);
```

### 4.6 Silver 层结果展示

**silver.orders（去重后 8 行，类型已校正）**：

| order_id | customer_id | order_date | status | payment_status | total_amount |
| --- | --- | --- | --- | --- | --- |
| 20001 | 1001 | 2025-08-01 | completed | paid | 7999.00 |
| 20002 | 1002 | 2025-08-01 | completed | paid | 911.00 |
| 20003 | 1003 | 2025-08-01 | pending | unpaid | 459.00 |
| 20004 | 1007 | 2025-08-02 | shipped | paid | 6299.00 |
| 20005 | 1005 | 2025-08-02 | paid | paid | 758.10 |
| 20006 | 1006 | 2025-08-03 | cancelled | unpaid | 899.00 |
| 20007 | 1008 | 2025-08-03 | completed | paid | 104.80 |
| 20008 | 1002 | 2025-08-04 | completed | paid | 1298.00 |

**silver.customers（SCD2 后，1007 和 1009 各有历史版本）**：

| customer_id | phone | city | membership | valid_from | valid_to | is_current |
| --- | --- | --- | --- | --- | --- | --- |
| 1001 | 13800001001 | 北京 | normal | 2024-03-12 | 9999-12-31 | true |
| 1002 | 13800001002 | 上海 | normal | 2024-05-20 | 9999-12-31 | true |
| 1003 | 13800001003 | 广州 | silver | 2024-07-01 | 9999-12-31 | true |
| 1004 | 13800001004 | 深圳 | normal | 2024-09-15 | 9999-12-31 | true |
| 1005 | 13800001005 | 杭州 | gold | 2023-11-02 | 9999-12-31 | true |
| 1006 | 13800001006 | 成都 | normal | 2025-01-08 | 9999-12-31 | true |
| **1007** | **13800001007** | 武汉 | **normal** | **2025-01-05** | **2025-05-31** | **false** |
| **1007** | **13900001007** | 武汉 | **gold** | **2025-06-01** | **9999-12-31** | **true** |
| **1009** | 13800001009 | 南京 | normal | 2025-03-03 | 2025-07-19 | **false** |
| **1009** | 13800001009 | 苏州 | normal | 2025-07-20 | 9999-12-31 | **true** |
| 1008 | unknown | 北京 | normal | 2025-02-14 | 9999-12-31 | true |

> 1007 有两个版本：6 月 1 日前是普通会员，之后是 gold。**8 月 2 日他下单 20004 时，按"当时"应该关联 gold 版本**——这就叫 AS-OF（截止某时间点）查询，后面 Gold 层装载事实表时会用到。

### 4.7 关键信息

| 决策点 | 答案 | 为什么 |
| --- | --- | --- |
| 去重放 Silver 还是 Bronze？ | Silver | Bronze 要保真；Silver 是"可信版本" |
| SCD 放 Silver 还是 Gold？ | Silver | 维度清洗是整合问题；Gold 只需直接读版本 |
| 空值怎么处理？ | 兜底值 + 质量 flag | 兜底保证 join 不丢行；flag 用于监控 |
| 孤儿外键？ | 检出并单独报告 | 不能让脏引用污染事实表 |
| Silver 是明细还是建模？ | 明细（one row per event） | 建模是 Gold 的事，两层职责分离 |

---

## 五、第四步：Gold 层——维度建模（核心）

Silver 的数据干净了、有版本了。现在进入**本篇文章的高潮**：把明细数据重构成**维度模型（星型模型）**。

### 5.1 建模蓝图

<figure class="bf-fig">
<svg viewBox="0 0 1000 560" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="星型模型：fact_orders 居中，周围四个维度表">
  <text x="500" y="30" text-anchor="middle" class="bf-text" font-size="15" font-weight="600">星型模型（Star Schema）—— Gold 层目标结构</text>

  <!-- 中心事实表 -->
  <rect x="350" y="220" width="300" height="150" rx="8" class="bf-flow-diamond"/>
  <text x="500" y="265" text-anchor="middle" class="bf-text" font-size="14" font-weight="600">fact_orders</text>
  <text x="500" y="290" text-anchor="middle" class="bf-text-2" font-size="11">粒度：一行 = 一笔订单行项目</text>
  <text x="500" y="312" text-anchor="middle" class="bf-text-2" font-size="11">度量：qty / gross / discount</text>
  <text x="500" y="328" text-anchor="middle" class="bf-text-2" font-size="11">　　　shipping / net / refund</text>
  <text x="500" y="350" text-anchor="middle" class="bf-text-2" font-size="11">退化维度：order_id, status</text>

  <!-- dim_customer 上 -->
  <rect x="380" y="60" width="240" height="80" rx="8" class="bf-flow-box"/>
  <text x="500" y="92" text-anchor="middle" class="bf-text" font-size="13" font-weight="600">dim_customer (SCD2)</text>
  <text x="500" y="112" text-anchor="middle" class="bf-text-2" font-size="11">customer_key · 等级 · 城市 · 有效期</text>

  <!-- dim_product 左 -->
  <rect x="30" y="250" width="220" height="80" rx="8" class="bf-flow-box"/>
  <text x="140" y="282" text-anchor="middle" class="bf-text" font-size="13" font-weight="600">dim_product (SCD2)</text>
  <text x="140" y="302" text-anchor="middle" class="bf-text-2" font-size="11">product_key · 类目 · 价格 · 有效期</text>

  <!-- dim_date 右 -->
  <rect x="750" y="250" width="220" height="80" rx="8" class="bf-flow-box"/>
  <text x="860" y="282" text-anchor="middle" class="bf-text" font-size="13" font-weight="600">dim_date (一致性)</text>
  <text x="860" y="302" text-anchor="middle" class="bf-text-2" font-size="11">date_key · 年 · 月 · 日 · 星期</text>

  <!-- dim_shop 下 -->
  <rect x="380" y="450" width="240" height="80" rx="8" class="bf-flow-box"/>
  <text x="500" y="482" text-anchor="middle" class="bf-text" font-size="13" font-weight="600">dim_shop (SCD1)</text>
  <text x="500" y="502" text-anchor="middle" class="bf-text-2" font-size="11">shop_key · 店铺名 · 区域</text>

  <!-- 连线 -->
  <line x1="500" y1="140" x2="500" y2="215" class="bf-arrow"/>
  <text x="510" y="180" class="bf-text-2" font-size="10">customer_key</text>
  <line x1="250" y1="290" x2="345" y2="290" class="bf-arrow"/>
  <text x="268" y="282" class="bf-text-2" font-size="10">product_key</text>
  <line x1="750" y1="290" x2="755" y2="290" class="bf-arrow"/>
  <polygon points="752,290 758,285 758,295" class="bf-arrow-head"/>
  <text x="762" y="282" class="bf-text-2" font-size="10">date_key</text>
  <line x1="500" y1="375" x2="500" y2="445" class="bf-arrow"/>
  <text x="510" y="415" class="bf-text-2" font-size="10">shop_key</text>
</svg>
<figcaption>图 2：事实表在中心，维度表环绕，全部通过代理键（surrogate key）连接</figcaption>
</figure>

Gold 层建 4 张维度表 + 3 张事实表：

| 表 | 类型 | 粒度（Grain） | SCD 策略 |
| --- | --- | --- | --- |
| `dim_date` | 维度 | 一天一行 | — |
| `dim_customer` | 维度 | 用户的一个版本 | Type 2 |
| `dim_product` | 维度 | 商品的一个版本 | Type 2 |
| `dim_category` / `dim_shop` | 维度 | 一行一个 | Type 1 |
| `fact_orders` | **事务事实表** | 一个订单行项目 | — |
| `fact_order_fulfillment` | **累计快照事实表** | 一个订单 | — |
| `fact_inventory_daily` | **周期快照事实表** | 商品 × 仓库 × 天 | — |

### 5.2 维度表设计

#### 5.2.1 dim_date：日期维度（一致性维度的典范）

日期维度被**所有事实表共用**，是"**一致性维度（Conformed Dimension）**"的最佳案例——所有报表里的"日期"都是同一套定义，GMV 和库存两个事实表 join 同一个日期表，才能对得上口径。

```sql
CREATE TABLE gold.dim_date (
  date_key     INT PRIMARY KEY,     -- 20250801 整数形式，快
  full_date    DATE,
  year         INT,
  month        INT,
  month_name   VARCHAR(20),
  day_of_month INT,
  day_of_week  VARCHAR(10),
  is_weekend   BOOLEAN,
  is_holiday   BOOLEAN
) USING DELTA;

-- 生成 2025 年全年（生产环境一般预生成 2000~2100 年）
INSERT INTO gold.dim_date
SELECT
  CAST(to_char(d, 'YYYYMMDD') AS INT)  AS date_key,
  d                                    AS full_date,
  EXTRACT(YEAR  FROM d)::INT           AS year,
  EXTRACT(MONTH FROM d)::INT           AS month,
  to_char(d, 'Month')                  AS month_name,
  EXTRACT(DAY   FROM d)::INT           AS day_of_month,
  to_char(d, 'Day')                    AS day_of_week,
  EXTRACT(DOW FROM d) IN (0, 6)        AS is_weekend,
  FALSE                                AS is_holiday
FROM generate_series(
  DATE '2025-01-01', DATE '2025-12-31', INTERVAL '1 day'
) AS d;
```

#### 5.2.2 dim_customer：从 SCD 版本表加代理键

> **代理键（Surrogate Key）**：与业务无关的自增/哈希键，如 `customer_key=7`。**自然键（Natural Key）**：业务里真实存在的键，如 `customer_id=1007`。事实表必须用代理键，原因有三：① 业务键可能被复用/回收；② join 更快；③ 同一自然键的多个 SCD 版本需要区分。

```sql
CREATE TABLE gold.dim_customer AS
SELECT
  ROW_NUMBER() OVER (
    PARTITION BY customer_id ORDER BY customer_id  -- 同自然键的所有版本共享一个 key
  )                                    AS customer_key,   -- 代理键
  customer_id,                                          -- 自然键（保留，用于追溯）
  name, phone, city, membership,
  valid_from, valid_to, is_current
FROM silver.customers;
```

结果（`customer_key` 对 1007 的两个版本都是 7，靠 `valid_from/to` 区分版本）：

| customer_key | customer_id | city | membership | valid_from | valid_to | is_current |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 1001 | 北京 | normal | 2024-03-12 | 9999-12-31 | true |
| 2 | 1002 | 上海 | normal | 2024-05-20 | 9999-12-31 | true |
| 3 | 1003 | 广州 | silver | 2024-07-01 | 9999-12-31 | true |
| 4 | 1004 | 深圳 | normal | 2024-09-15 | 9999-12-31 | true |
| 5 | 1005 | 杭州 | gold | 2023-11-02 | 9999-12-31 | true |
| 6 | 1006 | 成都 | normal | 2025-01-08 | 9999-12-31 | true |
| **7** | **1007** | 武汉 | normal | 2025-01-05 | 2025-05-31 | false |
| **7** | **1007** | 武汉 | gold | 2025-06-01 | 9999-12-31 | true |
| 8 | 1008 | 北京 | normal | 2025-02-14 | 9999-12-31 | true |
| 9 | 1009 | 南京 | normal | 2025-03-03 | 2025-07-19 | false |
| 9 | 1009 | 苏州 | normal | 2025-07-20 | 9999-12-31 | true |

#### 5.2.3 dim_product：同理生成（305 两版本共享 product_key=5）

| product_key | product_id | name | category_id | price | status | valid_from | valid_to | is_current |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 301 | iPhone 15 Pro | 1 | 7999.00 | on_sale | 2024-09-01 | 9999-12-31 | true |
| 2 | 302 | 华为 Mate 60 | 1 | 6499.00 | on_sale | 2024-10-01 | 9999-12-31 | true |
| 3 | 303 | 轻暖羽绒服 | 2 | 899.00 | on_sale | 2024-08-15 | 9999-12-31 | true |
| 4 | 304 | 北欧落地灯 | 3 | 459.00 | on_sale | 2025-03-01 | 9999-12-31 | true |
| **5** | **305** | 智能音箱 Pro | **1** | **399.00** | on_sale | 2025-01-10 | **2025-08-09** | **false** |
| **5** | **305** | 智能音箱 Pro | **5** | **349.00** | on_sale | **2025-08-10** | 9999-12-31 | **true** |
| 6 | 306 | 有机燕麦片 | 4 | 49.90 | on_sale | 2025-04-01 | 9999-12-31 | true |
| 7 | 307 | 复古蓝牙音箱 | 1 | 259.00 | off_sale | 2024-11-11 | 9999-12-31 | true |

#### 5.2.4 dim_category / dim_shop：SCD Type 1 直接覆盖

```sql
-- 类目/店铺变化少，直接覆盖即可
CREATE TABLE gold.dim_category AS
SELECT category_id AS category_key, name, parent_id
FROM silver.categories;   -- 含 8-10 新增的"智能家居"

CREATE TABLE gold.dim_shop AS
SELECT shop_id AS shop_key, shop_name, region, rating
FROM silver.shops;
```

### 5.3 事实表设计（三种事实表类型）

维度建模里事实表分三种，**每一种回答一类业务问题**。这次我们三种全建：

#### 5.3.1 fact_orders：事务事实表（Transaction Fact）

**每个事件一行**，只记录"发生的那一下"。

- **粒度（Grain）**：一行 = 一个订单行项目（`order_items` 的每一行）；
- **度量（Measures）**：`quantity`（件数）、`gross_amount`（商品小计）、`discount_amount`（优惠）、`shipping_fee`（运费）、`net_amount`（实付）、`refund_amount`（退款，从退款表回填）；
- **维度外键**：`date_key`（下单日）、`customer_key`、`product_key`、`shop_key`；
- **退化维度（Degenerate Dimension）**：`order_id`、`order_status`、`payment_method` 没有独立维度表，直接放在事实表里——订单号本身就有辨识度，专门建一张维度表是浪费。

```sql
CREATE TABLE gold.fact_orders (
  order_line_key  BIGINT,     -- 事实行代理键（可选，利于增量）
  order_id        INT,        -- 退化维度
  line_no         INT,        -- 行号
  date_key        INT,        -- FK → dim_date
  customer_key    INT,        -- FK → dim_customer
  product_key     INT,        -- FK → dim_product
  shop_key        INT,        -- FK → dim_shop
  order_status    VARCHAR(20),-- 退化维度
  payment_method  VARCHAR(10),-- 退化维度
  quantity        INT,        -- 度量
  gross_amount    DECIMAL(10,2),  -- 度量
  discount_amount DECIMAL(10,2),  -- 度量
  shipping_fee    DECIMAL(10,2),  -- 度量
  net_amount      DECIMAL(10,2),  -- 度量：实付
  refund_amount   DECIMAL(10,2)   -- 度量：退款
) USING DELTA;
```

> **建模决策**：`shipping_fee` 是订单级金额，分摊到行项目时按件数比例切（本文演示的 20002 只有一行项目，直接归它；生产环境用 `shipping_fee * qty / order_qty`）。**度量分摊**是事务事实表的经典难题。

#### 5.3.2 fact_order_fulfillment：累计快照事实表（Accumulating Snapshot）

**一个业务流程一行**，跟踪流程从开始到结束的**里程碑**，专门回答"流程走了多久、卡在哪"。

- 粒度：一行 = 一个订单；
- 里程碑列：`ordered_at` → `paid_at` → `shipped_at` → `delivered_at`，每过一个阶段就 UPDATE 一次；
- 度量：各阶段耗时（小时）+ 总周期。

```sql
CREATE TABLE gold.fact_order_fulfillment (
  order_key             INT,
  order_id              INT,          -- 退化维度
  date_key              INT,          -- 下单日 → dim_date
  customer_key          INT,
  shop_key              INT,
  order_status          VARCHAR(20),
  ordered_at            TIMESTAMP,    -- 里程碑 1
  paid_at               TIMESTAMP,    -- 里程碑 2（可为空 = 未到）
  shipped_at            TIMESTAMP,    -- 里程碑 3
  delivered_at          TIMESTAMP,    -- 里程碑 4
  total_amount          DECIMAL(10,2),
  paid_to_shipped_hrs   NUMERIC,      -- 度量：支付→发货
  shipped_to_deliver_hrs NUMERIC,     -- 度量：发货→签收
  total_cycle_hrs       NUMERIC       -- 度量：下单→签收总时长
) USING DELTA;
```

#### 5.3.3 fact_inventory_daily：周期快照事实表（Periodic Snapshot）

**固定周期为每个实体拍一张"照片"**，专门回答"每个时刻的存量是多少"。

- 粒度：商品 × 仓库 × 天；
- 每天全量重写一次（`INSERT OVERWRITE`），只留当天的存量，不累积；
- 度量：`stock_qty`（库存量）、`sold_qty`（当日销量）。

```sql
CREATE TABLE gold.fact_inventory_daily (
  date_key      INT,          -- FK → dim_date
  product_key   INT,          -- FK → dim_product
  warehouse_key STRING,       -- 退化维度
  stock_qty     INT,          -- 度量：存量
  sold_qty      INT           -- 度量：当日销量
) USING DELTA;
```

> 三种事实表的记忆方法：**事务表记"发生"（流水）、累计快照表记"过程"（管道）、周期快照表记"状态"（存量）**。库存、余额、活跃用户数这类"某一时刻有多少"的指标，用周期快照；如果一个表里两种都有（比如电商把"今日库存+累计销量"放一起），就是**累积快照（Cumulative Snapshot）**，本文不展开。

### 5.4 事实表装载：AS-OF 时间点关联（关键一步）

装载事实表时，必须**按业务事件发生的日期**去匹配 SCD 维度版本——这就是 **AS-OF Join**。

> 为什么关键：20005 在 **8 月 2 日**买了智能音箱，当时它属于**数码（类目 1）、卖 399 元**；8 月 10 日它才迁入智能家居。如果 join 维度"当前版本"，8 月 2 日这笔订单就会被错误地算进"智能家居"类目。**事实表必须固化下单那一刻的维度版本。**

```sql
INSERT INTO gold.fact_orders
SELECT
  oi.item_id                                    AS order_line_key,
  o.order_id, oi.item_id                        AS line_no,
  dd.date_key, dc.customer_key, dp.product_key, ds.shop_key,
  o.status, o.payment_method,
  oi.quantity,
  oi.quantity * oi.unit_price                   AS gross_amount,
  o.discount_amount, o.shipping_fee,
  o.total_amount                                AS net_amount,
  COALESCE(r.refund_amount, 0)                  AS refund_amount
FROM silver.order_items oi
JOIN silver.orders o     ON oi.order_id   = o.order_id
JOIN gold.dim_date dd    ON dd.full_date  = o.order_date
JOIN gold.dim_customer dc ON dc.customer_id = o.customer_id
  AND o.order_date >= dc.valid_from            -- AS-OF：下单时正在生效的版本
  AND o.order_date  < dc.valid_to
JOIN gold.dim_product dp ON dp.product_id  = oi.product_id
  AND o.order_date >= dp.valid_from            -- AS-OF：当时的类目与价格
  AND o.order_date  < dp.valid_to
JOIN gold.dim_shop ds   ON ds.shop_key     = dp.shop_id
LEFT JOIN (
  SELECT order_id, item_id, SUM(refund_amount) AS refund_amount
  FROM silver.refunds WHERE status = 'approved'
  GROUP BY order_id, item_id
) r ON r.order_id = oi.order_id AND r.item_id = oi.item_id;
```

> 注意这里 `dim_customer`、`dim_product` 的 join 条件里带着 `valid_from <= order_date < valid_to`。**一行订单行项目，在时间轴上精确命中一个维度版本**——这就是 SCD + 事实表的正确姿势。

累计快照装载（每过一个里程碑就 UPDATE 一次，这里给出初始装载）：

```sql
INSERT INTO gold.fact_order_fulfillment
SELECT
  o.order_id, o.order_id, dd.date_key, dc.customer_key, ord_shop.shop_key,
  o.status,
  o.created_at AS ordered_at,
  o.paid_at,
  NULL AS shipped_at, NULL AS delivered_at,    -- 初始装载只到支付里程碑
  o.total_amount,
  NULL, NULL, NULL
FROM silver.orders o
JOIN gold.dim_date dd     ON dd.full_date = o.order_date
JOIN gold.dim_customer dc ON dc.customer_id = o.customer_id
  AND o.order_date >= dc.valid_from AND o.order_date < dc.valid_to
JOIN (
  SELECT oi.order_id, MIN(dp.shop_key) AS shop_key   -- 订单级店铺：取商品行的店铺
  FROM silver.order_items oi
  JOIN silver.orders o2       ON o2.order_id   = oi.order_id
  JOIN gold.dim_product dp    ON dp.product_id = oi.product_id
    AND o2.order_date >= dp.valid_from AND o2.order_date < dp.valid_to
  GROUP BY oi.order_id
) ord_shop ON ord_shop.order_id = o.order_id;
```

> 生产环境里，累计快照表会在发货、签收事件到来时，用 MERGE 更新对应行的 `shipped_at`、`delivered_at` 并重算耗时。**累计快照表是唯一经常 UPDATE 的事实表。**

周期快照装载（每天全量覆盖当天分区）：

```sql
INSERT OVERWRITE gold.fact_inventory_daily
SELECT
  dd.date_key, dp.product_key, inv.warehouse,
  inv.stock_qty, inv.sold_qty
FROM silver.inventory_daily inv
JOIN gold.dim_date dd     ON dd.full_date = inv.dt
JOIN gold.dim_product dp  ON dp.product_id = inv.product_id
  AND inv.dt >= dp.valid_from AND inv.dt < dp.valid_to   -- AS-OF 同样适用
;
```

### 5.5 装载后的数据展示

**fact_orders（9 行，含取消/未支付行——事实表保存全部事件，由查询方按需过滤）**：

| order_line_key | order_id | date_key | customer_key | product_key | shop_key | status | qty | gross | discount | shipping | net | refund |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 30001 | 20001 | 20250801 | 1 | 1 | 2 | completed | 1 | 7999.00 | 0 | 0 | 7999.00 | 0 |
| 30002 | 20002 | 20250801 | 2 | 3 | 3 | completed | 1 | 899.00 | 0 | 12 | 911.00 | 299.00 |
| 30003 | 20003 | 20250801 | 3 | 4 | 1 | pending | 1 | 459.00 | 0 | 0 | 459.00 | 0 |
| 30004 | 20004 | 20250802 | 7 | 2 | 2 | shipped | 1 | 6499.00 | 200 | 0 | 6299.00 | 0 |
| 30005 | 20005 | 20250802 | 5 | 5 | 1 | paid | 2 | 798.00 | 39.90 | 0 | 758.10 | 0 |
| 30006 | 20006 | 20250803 | 6 | 3 | 3 | cancelled | 1 | 899.00 | 0 | 0 | 899.00 | 0 |
| 30007 | 20007 | 20250803 | 8 | 6 | 4 | completed | 2 | 99.80 | 0 | 5 | 104.80 | 49.90 |
| 30008 | 20008 | 20250804 | 2 | 4 | 1 | completed | 1 | 459.00 | 0 | 0 | 459.00 | 0 |
| 30009 | 20008 | 20250804 | 2 | 3 | 3 | completed | 1 | 899.00 | 0 | 0 | 899.00 | 0 |

**fact_order_fulfillment（累计快照，8 行，只列关键列）**：

| order_id | date_key | customer_key | ordered_at | paid_at | shipped_at | delivered_at | status | paid_to_shipped_hrs | shipped_to_deliver_hrs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 20001 | 20250801 | 1 | 08-01 10:20 | 08-01 10:23 | 08-01 14:00 | 08-02 18:30 | completed | 3.6 | 28.5 |
| 20002 | 20250801 | 2 | 08-01 11:00 | 08-01 11:05 | 08-01 16:00 | 08-03 12:00 | completed | 4.9 | 44.0 |
| 20003 | 20250801 | 3 | 08-01 13:40 | NULL | NULL | NULL | pending | NULL | NULL |
| 20004 | 20250802 | 7 | 08-02 09:10 | 08-02 09:12 | 08-03 10:00 | NULL | shipped | 24.8 | NULL |
| 20005 | 20250802 | 5 | 08-02 14:30 | 08-02 14:31 | 08-03 09:30 | 08-04 17:00 | completed | 19.0 | 31.5 |
| 20006 | 20250803 | 6 | 08-03 08:02 | NULL | NULL | NULL | cancelled | NULL | NULL |
| 20007 | 20250803 | 8 | 08-03 16:40 | 08-03 16:45 | 08-04 11:00 | 08-05 09:00 | completed | 18.3 | 22.0 |
| 20008 | 20250804 | 2 | 08-04 20:15 | 08-04 20:18 | 08-05 10:00 | 08-05 19:30 | completed | 13.7 | 9.5 |

**fact_inventory_daily（周期快照，9 行）**：

| date_key | product_key | warehouse_key | stock_qty | sold_qty |
| --- | --- | --- | --- | --- |
| 20250803 | 1 | WH-华东-01 | 180 | 20 |
| 20250803 | 5 | WH-华东-01 | 320 | 45 |
| 20250803 | 6 | WH-华南-02 | 820 | 60 |
| 20250804 | 1 | WH-华东-01 | 155 | 25 |
| 20250804 | 5 | WH-华东-01 | 275 | 50 |
| 20250804 | 6 | WH-华南-02 | 760 | 70 |
| 20250805 | 1 | WH-华东-01 | 130 | 28 |
| 20250805 | 5 | WH-华东-01 | 225 | 55 |
| 20250805 | 6 | WH-华南-02 | 700 | 78 |

### 5.6 关键信息

| 决策点 | 答案 | 为什么 |
| --- | --- | --- |
| 用代理键还是自然键？ | 代理键（维度）+ 保留自然键 | 版本区分、join 性能、防业务键复用 |
| 事实表装不装"未支付/已取消"？ | 装，加状态字段 | 保留证据，口径由查询决定；也支持"订单流失率"分析 |
| 订单金额分摊吗？ | 订单级度量分摊到行项目 | 保证"行项目求和 = 订单金额" |
| SCD join 怎么选版本？ | AS-OF：`valid_from <= 事件日 < valid_to` | 保证历史口径正确 |
| 一致性维度？ | `dim_date` 全仓共用 | 所有报表"日期"口径统一 |

---

## 六、第五步：查询验证（BI 视角）

模型建好了，用老板的问题验收。

### 6.1 日 GMV（含维度补零）

> **维度补零**：某天没有订单也要显示 0 行，否则报表缺日期。用 `dim_date` 做左表。

```sql
SELECT
  dd.full_date,
  COUNT(DISTINCT fo.order_id)              AS orders_cnt,
  COALESCE(SUM(fo.net_amount), 0)          AS gmv      -- 实付口径
FROM gold.dim_date dd
LEFT JOIN gold.fact_orders fo
  ON fo.date_key = dd.date_key
 AND fo.order_status NOT IN ('cancelled','pending')    -- 只算成交
WHERE dd.full_date BETWEEN '2025-08-01' AND '2025-08-04'
GROUP BY dd.full_date
ORDER BY dd.full_date;
```

| full_date | orders_cnt | gmv |
| --- | --- | --- |
| 2025-08-01 | 2 | 8910.00 |
| 2025-08-02 | 2 | 7057.10 |
| 2025-08-03 | 1 | 104.80 |
| 2025-08-04 | 1 | 1298.00 |

### 6.2 类目销售 TopN（维度下钻）

```sql
SELECT dc.name AS category, SUM(fo.net_amount) AS revenue
FROM gold.fact_orders fo
JOIN gold.dim_product dp ON dp.product_key = fo.product_key AND dp.is_current
JOIN gold.dim_category dc ON dc.category_key = dp.category_id
WHERE fo.order_status NOT IN ('cancelled','pending')
GROUP BY dc.name
ORDER BY revenue DESC;
```

| category | revenue |
| --- | --- |
| 数码 | 15056.10 |
| 服饰 | 1810.00 |
| 食品 | 104.80 |
| 家居 | 918.00 |

### 6.3 复购率（同一用户在窗口期下单 ≥2 次）

```sql
WITH user_orders AS (
  SELECT customer_key, COUNT(DISTINCT order_id) AS cnt
  FROM gold.fact_orders
  WHERE order_status NOT IN ('cancelled','pending')
  GROUP BY customer_key
)
SELECT
  COUNT(*) FILTER (WHERE cnt >= 2) AS repeat_buyers,
  COUNT(*)                         AS total_buyers
FROM user_orders;   -- 结果：1 / 5，复购率 20%（仅李娜在 8 月下了 2 单）
```

### 6.4 库存快照分析（周期快照的用法）

```sql
SELECT
  inv.date_key,
  dp.name,
  inv.stock_qty,
  inv.sold_qty,
  ROUND(inv.stock_qty * 1.0 / NULLIF(inv.sold_qty,0), 1) AS days_of_supply  -- 可售天数
FROM gold.fact_inventory_daily inv
JOIN gold.dim_product dp ON dp.product_key = inv.product_key AND dp.is_current
ORDER BY inv.date_key, inv.stock_qty DESC;
```

| date_key | name | stock_qty | sold_qty | 可售天数 |
| --- | --- | --- | --- | --- |
| 20250805 | 有机燕麦片 | 700 | 78 | 9.0 |
| 20250805 | 智能音箱 Pro | 225 | 55 | 4.1 |
| 20250805 | iPhone 15 Pro | 130 | 28 | 4.6 |

> 智能音箱只剩 4 天库存，运营可以据此补货——这就是周期快照表的业务价值。

### 6.5 履约时效（累计快照的用法）

```sql
SELECT
  ROUND(AVG(paid_to_shipped_hrs), 1)    AS avg_pay_to_ship_hrs,
  ROUND(AVG(shipped_to_deliver_hrs), 1) AS avg_ship_to_deliver_hrs,
  ROUND(AVG(paid_to_shipped_hrs + shipped_to_deliver_hrs), 1) AS avg_cycle_hrs
FROM gold.fact_order_fulfillment
WHERE order_status = 'completed';   -- 只看走完全程的订单
```

| avg_pay_to_ship_hrs | avg_ship_to_deliver_hrs | avg_cycle_hrs |
| --- | --- | --- |
| 11.9 | 27.1 | 39.0 |

### 6.6 SCD 历史正确性验证（重头戏）

问："8 月 2 日卖的智能音箱，算哪个类目？"——因为 305 在 8 月 10 日才迁移类目，**8 月 2 日它属于"数码"**。我们验证 AS-OF 装载的正确性：

```sql
SELECT fo.order_id, dp.name, dp.price, dc.name AS category_at_sale_time
FROM gold.fact_orders fo
JOIN gold.dim_product dp  ON dp.product_key  = fo.product_key
JOIN gold.dim_category dc ON dc.category_key = dp.category_id
WHERE fo.order_id = 20005;
```

| order_id | name | price | category_at_sale_time |
| --- | --- | --- | --- |
| 20005 | 智能音箱 Pro | 399.00 | 数码 |

> 如果当初偷懒 join 了"当前版本"，这里就会错误地显示"智能家居 / 349"。**这就是 SCD Type 2 + AS-OF 的价值：历史事实永远按历史口径还原。**

同理，用 `dim_customer` 的版本可以回答"8 月 2 日下单的用户当时是不是 gold 会员"——赵敏 8 月 2 日已是 gold，正确命中 gold 版本。

---

## 七、术语速查表

| 术语 | 英文 | 含义 | 本文例子 |
| --- | --- | --- | --- |
| 维度 | Dimension | 描述"谁/什么/何时/何地"的上下文表 | `dim_customer`、`dim_product`、`dim_date` |
| 度量 | Measure | 可加和的数值指标 | `gross_amount`、`quantity`、`stock_qty` |
| 事实表 | Fact Table | 存业务事件的表，中心放度量、外键连维度 | `fact_orders` |
| 事务事实表 | Transaction Fact | 一行一个事件（流水） | `fact_orders` |
| 周期快照事实表 | Periodic Snapshot | 一行一个实体×周期（状态） | `fact_inventory_daily` |
| 累计快照事实表 | Accumulating Snapshot | 一行一个流程（管道里程碑） | `fact_order_fulfillment` |
| 粒度 | Grain | 一行事实代表什么 | "一个订单行项目" |
| 缓慢变化维度 | SCD | 维度属性变化的管理策略 | Type 1 覆盖 / Type 2 版本化 |
| 代理键 | Surrogate Key | 与业务无关的键 | `customer_key=7` |
| 自然键 | Natural Key | 业务真实键 | `customer_id=1007` |
| 退化维度 | Degenerate Dimension | 直接放事实表的"轻量"维度 | `order_id`、`order_status` |
| 一致性维度 | Conformed Dimension | 多个事实表共用的同口径维度 | `dim_date` |
| AS-OF Join | As-of Join | 按事件日匹配维度版本 | `valid_from <= 日期 < valid_to` |
| 度量分摊 | Measure Allocation | 上级金额分到下级行 | 运费分摊到行项目 |

---

## 八、经验总结与常见坑

### 8.1 三层职责一句话

- **Bronze 保证据**：原样、append-only、分区、元数据列——出问题能重放；
- **Silver 保干净**：去重、类型、空值、枚举、SCD——数据可信、可 join；
- **Gold 保体验**：星型模型、代理键、预 join 好的维度——报表快、口径一致。

### 8.2 常见坑

1. **在 Bronze 里做清洗**：一旦清洗，原始数据就没了，违反可重放原则。
2. **在 Gold 里才发现去重问题**：事实表已经 double count，返工成本巨大——去重必须下沉到 Silver。
3. **SCD 全部用 Type 2**：什么都留历史会膨胀表、拖慢查询。**只有"回看历史口径"有业务价值的属性才用 Type 2**（价格、类目），其余用 Type 1（评分、地址）。
4. **忽略 AS-OF join**：历史事实关联到"当前版本"维度，报表口径错得一塌糊涂（本文 6.6 已验证）。
5. **事实表粒度不明确**：订单粒度还是行项目粒度？没写清楚，聚合结果对不上。**先定粒度，再谈度量。**
6. **快照表用 INSERT 追加**：周期快照是"每天全量覆盖"，不是"每天追加"，否则同一个商品会重复计库存。
7. **日期维度不建**：直接用 `order_date` 做分组，遇到"补零、周同比、节假日"就抓瞎。**日期维度是性价比最高的维度表。**

### 8.3 继续往哪走

- **增量装载**：事实表按 `order_date` 分区增量，维度表用 MERGE；
- **指标口径治理**：把 `gmv = SUM(net_amount) WHERE status IN ('paid','shipped','completed')` 定义成统一指标（如 dbt metrics），避免各部门口径打架；
- **无事实事实表（Factless Fact）**：记录"浏览但未购买"等纯关联事件，用于漏斗分析；
- **数据集市（Data Mart）**：按业务域（交易、库存、会员）拆 Gold 层，配合一致性维度保证跨集市可 join。

---

## 参考资料

- Ralph Kimball & Margy Ross, *The Data Warehouse Toolkit* —— 维度建模圣经，事实表三种类型、SCD、退化维度的出处。
- Databricks 官方文档, *Medallion Architecture* —— bronze/silver/gold 三层的标准定义与工程实践。
- 本博客另一篇：[Dimensional Modeling vs. Medallion Architecture](./dimensional-vs-medallion.md) —— 两者概念对比与结合方式。
