---
title: "数据倾斜（Data Skew）解决方案：四种经典思路图文详解"
description: "用图解 + Spark SQL 详解数据倾斜的解决方案：双层 Group By、热点 Key 单独计算、哈希分组（加盐）Join、转 Broadcast Join，以及空值处理、数据预处理、并行度调优与 AQE 等实战手段。"
date: 2026-08-25
tags:
  - Data Engineering
  - Spark
  - Performance
  - Big Data
---

# 数据倾斜（Data Skew）解决方案：四种经典思路图文详解

> "数据倾斜不是 Bug，而是概率——只要 key 的分布不是完全均匀，倾斜就一定会出现。区别只是你**发现得早**还是 **Stage 卡死之后**才发现。"

数据倾斜是分布式计算里最常见的性能杀手：一个 200 行的 SQL，其他 Task 30 秒跑完，唯独一个 Task 跑了 2 小时；或者某个 Executor 直接 OOM 让整个 Job 失败。

本文用图说话，讲清楚倾斜是怎么发生的，以及四种最实用的解决思路：**双层 Group By**、**热点 Key 单独计算**、**哈希分组（加盐）Join**、**转 Broadcast Join**；在此基础上，还会介绍空值处理、数据预处理、并行度调优与 AQE 等更多实战手段。

---

## 一、先看图：倾斜到底长什么样

### 1.1 数据分布：一个 Key 独大

一个典型的倾斜场景：`GROUP BY user_id`，但某个用户（比如爬虫、大 V、或者 ID 为 `-1` 的兜底值）占了 90% 的数据：

<figure class="bf-fig">
<svg viewBox="0 0 1000 260" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="数据倾斜示意：user_id=999 占了 90% 的数据">
  <text x="30" y="28" class="bf-text" font-size="14" font-weight="600">Key 分布（1000 万行日志）</text>
  <rect x="120" y="50" width="620" height="30" class="skew-bar-hot"/>
  <text x="110" y="70" text-anchor="end" class="bf-text" font-size="12">user_id=999</text>
  <text x="750" y="70" class="bf-bad skew-tag">900 万行 · 90%</text>
  <rect x="120" y="95" width="55" height="30" class="skew-bar"/>
  <text x="110" y="115" text-anchor="end" class="bf-text" font-size="12">user_id=001</text>
  <text x="185" y="115" class="bf-text-2 skew-tag">~3%</text>
  <rect x="120" y="140" width="45" height="30" class="skew-bar"/>
  <text x="110" y="160" text-anchor="end" class="bf-text" font-size="12">user_id=002</text>
  <text x="175" y="160" class="bf-text-2 skew-tag">~2%</text>
  <rect x="120" y="185" width="90" height="30" class="skew-bar"/>
  <text x="110" y="205" text-anchor="end" class="bf-text" font-size="12">其他 998 个</text>
  <text x="220" y="205" class="bf-text-2 skew-tag">~5%</text>
  <line x1="120" y1="225" x2="740" y2="225" class="bf-axis"/>
  <text x="120" y="245" class="bf-text-2" font-size="11">0%</text>
  <text x="430" y="245" class="bf-text-2" font-size="11">50%</text>
  <text x="740" y="245" class="bf-text-2" font-size="11">100%</text>
</svg>
<figcaption>图 1：单个 Key 占 90% 的数据——倾斜的根源</figcaption>
</figure>

### 1.2 执行过程：长尾 Task 拖垮整个 Stage

Spark / Flink 的 Shuffle 阶段把数据按 key 哈希分桶，相同 key 永远进同一个下游 Task。于是：

<figure class="bf-fig">
<svg viewBox="0 0 1000 280" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="长尾 Task 示意：一个 Task 处理 90% 数据">
  <text x="30" y="28" class="bf-text" font-size="14" font-weight="600">Map 端 → Shuffle → Reduce 端 Task 负载</text>
  <text x="30" y="60" class="bf-text-2" font-size="12">Task 1（key=999）</text>
  <rect x="200" y="45" width="560" height="24" class="skew-bar-hot"/>
  <text x="770" y="62" class="bf-bad skew-tag">2 小时 · 90% 数据</text>
  <text x="30" y="105" class="bf-text-2" font-size="12">Task 2（key=001）</text>
  <rect x="200" y="90" width="30" height="24" class="skew-bar"/>
  <text x="240" y="107" class="bf-text-2 skew-tag">30 秒</text>
  <text x="30" y="150" class="bf-text-2" font-size="12">Task 3（key=002）</text>
  <rect x="200" y="135" width="30" height="24" class="skew-bar"/>
  <text x="240" y="152" class="bf-text-2 skew-tag">30 秒</text>
  <text x="30" y="195" class="bf-text-2" font-size="12">Task 4（其余 key）</text>
  <rect x="200" y="180" width="50" height="24" class="skew-bar"/>
  <text x="260" y="197" class="bf-text-2 skew-tag">45 秒</text>
  <line x1="30" y1="225" x2="780" y2="225" class="bf-axis"/>
  <text x="30" y="245" class="bf-bad" font-size="13" font-weight="600">Stage 总耗时 = 最慢 Task 的耗时 = 2 小时</text>
  <text x="30" y="265" class="bf-text-2" font-size="12">其他 Task 早已跑完，资源空转等待——这是倾斜最直观的代价。</text>
</svg>
<figcaption>图 2：长尾效应——Stage 的耗时由最慢的 Task 决定</figcaption>
</figure>

**常见触发场景**：

| 操作 | 倾斜原因 | 典型例子 |
| --- | --- | --- |
| `GROUP BY key` | 少数 key 行数远超其他 | `user_id` 聚合、`ip` 聚合 |
| `JOIN ON key` | 大表某 key 命中海量行 | 用户表 join 行为日志 |
| `COUNT(DISTINCT ...)` | 倾斜 key 数据集中在一个桶 | 热数据去重 |
| 空值/默认值 | `NULL` 或 `''` 全部进入一个桶 | 未填写的 `city` 字段 |

---

## 二、思路一：双层 Group By（两阶段聚合）

### 原理

把**一次大聚合**拆成**两次小聚合**：先在每个分区内做局部聚合（聚合前给 key 加随机盐，把热点 key 打散到多个桶），Shuffle 之后再做一次全局聚合（去盐合并）。

<figure class="bf-fig">
<svg viewBox="0 0 1000 300" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="双层 Group By 流程示意">
  <text x="500" y="26" text-anchor="middle" class="bf-text" font-size="14" font-weight="600">双层 Group By：先局部聚合，再全局聚合</text>

  <rect x="60" y="60" width="200" height="170" class="skew-box"/>
  <text x="160" y="85" text-anchor="middle" class="bf-text" font-size="13" font-weight="600">原始数据</text>
  <text x="160" y="110" text-anchor="middle" class="bf-text-2" font-size="11">key=999 × 900万</text>
  <text x="160" y="130" text-anchor="middle" class="bf-text-2" font-size="11">key=001 × 30万</text>
  <text x="160" y="150" text-anchor="middle" class="bf-text-2" font-size="11">key=002 × 20万</text>
  <text x="160" y="170" text-anchor="middle" class="bf-text-2" font-size="11">…</text>

  <rect x="340" y="60" width="320" height="170" class="skew-box-ok"/>
  <text x="500" y="85" text-anchor="middle" class="bf-text" font-size="13" font-weight="600">第一层：局部聚合（Map 端）</text>
  <text x="500" y="110" text-anchor="middle" class="bf-text-2" font-size="11">给 key 拼接随机盐 salt ∈ [0, N)</text>
  <text x="500" y="130" text-anchor="middle" class="bf-text-2" font-size="11">key=999_0 · key=999_1 · key=999_2 · …</text>
  <text x="500" y="150" text-anchor="middle" class="bf-text-2" font-size="11">同分区内先聚合 → 数据量骤减</text>
  <text x="500" y="180" text-anchor="middle" class="bf-bad skew-tag">Shuffle 量 = 1000万 条 → 少量</text>
  <text x="500" y="205" text-anchor="middle" class="bf-text-2" font-size="11">热点 key 被均匀打散到 N 个桶</text>

  <rect x="740" y="60" width="200" height="170" class="skew-box"/>
  <text x="840" y="85" text-anchor="middle" class="bf-text" font-size="13" font-weight="600">第二层：全局聚合（Reduce 端）</text>
  <text x="840" y="110" text-anchor="middle" class="bf-text-2" font-size="11">去掉盐，按原 key</text>
  <text x="840" y="130" text-anchor="middle" class="bf-text-2" font-size="11">SUM 合并 N 份结果</text>
  <text x="840" y="160" text-anchor="middle" class="bf-ok skew-tag">结果精确</text>

  <line x1="260" y1="145" x2="335" y2="145" class="bf-arrow"/>
  <polygon points="335,145 325,140 325,150" class="bf-arrow-head"/>
  <line x1="660" y1="145" x2="735" y2="145" class="bf-arrow"/>
  <polygon points="735,145 725,140 725,150" class="bf-arrow-head"/>

  <text x="500" y="265" text-anchor="middle" class="bf-text-2" font-size="12">第一层聚合后每个 key 最多只有 N 条记录，第二层 Shuffle 的负载天然均衡。</text>
</svg>
<figcaption>图 3：加盐拆桶 + 两次聚合，热点 key 被均匀摊开</figcaption>
</figure>

### 代码实现

```sql
-- Spark SQL：外层聚合去掉盐，内层聚合拼盐
SELECT
    key,
    SUM(cnt) AS total
FROM (
    SELECT
        key,
        -- 随机加盐：热点 key 打散成 N 份
        CONCAT(key, '_', FLOOR(RAND() * 100)) AS salted_key,
        COUNT(*) AS cnt
    FROM user_logs
    GROUP BY key, CONCAT(key, '_', FLOOR(RAND() * 100))   -- 第一层
) t
GROUP BY key;                                              -- 第二层
```

### 适用场景与注意点

- ✅ 适用于**聚合类**倾斜（`COUNT` / `SUM` / `AVG` / `MAX` / `MIN`）。
- ✅ 实现成本低，不用先识别热点 key，对所有 key 一律加盐。
- ⚠️ 对 `COUNT(DISTINCT key)` 无效——去重逻辑下加盐会重复计算，需要额外去重处理。
- ⚠️ 所有 key 都被加盐，会多产生一层 Shuffle 与中间结果，非倾斜数据有小幅额外开销。

---

## 三、思路二：热点 Key 单独计算（倾斜隔离）

### 原理

思路一是"无差别加盐"，思路二更精准：**先用采样或一次轻量聚合找出热点 key，把它们单独拎出来加盐计算；普通 key 走正常聚合；最后 Union 合并**。

<figure class="bf-fig">
<svg viewBox="0 0 1000 320" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="热点 Key 单独计算流程示意">
  <rect x="400" y="30" width="200" height="36" class="skew-box"/>
  <text x="500" y="52" text-anchor="middle" class="bf-text" font-size="13" font-weight="600">全量数据</text>

  <polygon points="500,85 585,110 500,135 415,110" class="bf-flow-diamond"/>
  <text x="500" y="106" text-anchor="middle" class="bf-text" font-size="11">识别热点</text>
  <text x="500" y="122" text-anchor="middle" class="bf-text" font-size="11">(采样 / count)</text>

  <line x1="500" y1="66" x2="500" y2="82" class="bf-arrow"/>
  <polygon points="500,84 496,77 504,77" class="bf-arrow-head"/>

  <line x1="430" y1="135" x2="280" y2="165" class="bf-arrow"/>
  <polygon points="280,165 288,160 288,170" class="bf-arrow-head"/>
  <text x="350" y="160" class="bf-bad skew-tag">热点 key</text>

  <line x1="570" y1="135" x2="720" y2="165" class="bf-arrow"/>
  <polygon points="720,165 712,160 712,170" class="bf-arrow-head"/>
  <text x="650" y="160" class="bf-ok skew-tag">普通 key</text>

  <rect x="100" y="170" width="330" height="70" class="skew-box-hot"/>
  <text x="265" y="193" text-anchor="middle" class="bf-text" font-size="12" font-weight="600">热点子集：加盐拆桶聚合</text>
  <text x="265" y="213" text-anchor="middle" class="bf-text-2" font-size="11">key_0 + key_1 + … + key_99</text>
  <text x="265" y="228" text-anchor="middle" class="bf-text-2" font-size="11">每个小桶负载均衡</text>

  <rect x="570" y="170" width="330" height="70" class="skew-box-ok"/>
  <text x="735" y="193" text-anchor="middle" class="bf-text" font-size="12" font-weight="600">普通子集：正常聚合</text>
  <text x="735" y="213" text-anchor="middle" class="bf-text-2" font-size="11">数据量小，一个 Stage 完成</text>

  <line x1="265" y1="240" x2="400" y2="275" class="bf-arrow"/>
  <polygon points="400,275 392,270 392,280" class="bf-arrow-head"/>
  <line x1="735" y1="240" x2="600" y2="275" class="bf-arrow"/>
  <polygon points="600,275 608,270 608,280" class="bf-arrow-head"/>

  <rect x="400" y="278" width="200" height="32" class="skew-box"/>
  <text x="500" y="298" text-anchor="middle" class="bf-ok" font-size="13" font-weight="600">UNION → 最终结果</text>
</svg>
<figcaption>图 4：热点 key 与普通 key 分道扬镳，各自用最合适的策略</figcaption>
</figure>

### 代码实现

```sql
-- Step 1：识别热点 key（可只抽样统计，避免全量扫描两次）
CREATE OR REPLACE TEMP VIEW hot_keys AS
SELECT key
FROM user_logs
GROUP BY key
HAVING COUNT(*) > 1000000;   -- 阈值按业务定

-- Step 2：热点 key 单独加盐聚合
CREATE OR REPLACE TEMP VIEW hot_result AS
SELECT key, SUM(cnt) AS total
FROM (
    SELECT
        key,
        CONCAT(key, '_', FLOOR(RAND() * 100)) AS salted_key,
        COUNT(*) AS cnt
    FROM user_logs
    WHERE key IN (SELECT key FROM hot_keys)
    GROUP BY key, CONCAT(key, '_', FLOOR(RAND() * 100))
) h
GROUP BY key;

-- Step 3：普通 key 正常聚合
CREATE OR REPLACE TEMP VIEW cold_result AS
SELECT key, COUNT(*) AS total
FROM user_logs
WHERE key NOT IN (SELECT key FROM hot_keys)
GROUP BY key;

-- Step 4：合并（热点 + 普通）
SELECT * FROM hot_result
UNION ALL
SELECT * FROM cold_result;
```

### 适用场景与注意点

- ✅ 效果最精准：热点 key 被彻底摊开，普通 key 不做无谓开销。
- ✅ 热点 key 数量通常很少，`inner`/`left_anti` 两个 join 的成本可忽略。
- ⚠️ 需要**额外的一次扫描/聚合**来识别热点 key（可改为采样降低开销）。
- ⚠️ 热点集合是**动态**的，离线调度时需重新计算（如每日刷新的热点表）。
- ⚠️ 实现复杂度最高，逻辑分支多，测试用例要覆盖"热/冷/空结果"三态。

---

## 四、思路三：哈希分组 Join（加盐 Join / Skew Join）

### 原理

`JOIN` 场景和聚合不同：不能直接对 key 加盐，否则**两边都找不到对方**。正确做法是：

- **大表**：把倾斜 key 拆成 `key_0, key_1, …, key_{N-1}`（每份只含原 key 的 1/N 数据）；
- **小表**：把对应的行**复制 N 份**，分别打上 `_0 … _N-1` 的盐；
- Join 条件从 `key` 变成 `salted_key`，两边的盐值能一一对上。

<figure class="bf-fig">
<svg viewBox="0 0 1000 330" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="加盐 Join 示意：大表拆桶，小表复制 N 份">
  <text x="250" y="26" text-anchor="middle" class="bf-text" font-size="13" font-weight="600">大表（1000 万行，key=999 占 90%）</text>
  <text x="750" y="26" text-anchor="middle" class="bf-text" font-size="13" font-weight="600">小表（维度表，复制 N=3 份）</text>

  <rect x="90" y="50" width="320" height="60" class="skew-box"/>
  <text x="250" y="78" text-anchor="middle" class="bf-text" font-size="12">key=999_0  (300万行)</text>
  <text x="250" y="96" text-anchor="middle" class="bf-text-2" font-size="11">大表行 → 打盐拆分</text>
  <rect x="90" y="125" width="320" height="60" class="skew-box"/>
  <text x="250" y="153" text-anchor="middle" class="bf-text" font-size="12">key=999_1  (300万行)</text>
  <text x="250" y="171" text-anchor="middle" class="bf-text-2" font-size="11">大表行 → 打盐拆分</text>
  <rect x="90" y="200" width="320" height="60" class="skew-box"/>
  <text x="250" y="228" text-anchor="middle" class="bf-text" font-size="12">key=999_2  (300万行)</text>
  <text x="250" y="246" text-anchor="middle" class="bf-text-2" font-size="11">大表行 → 打盐拆分</text>

  <rect x="590" y="50" width="320" height="60" class="skew-box-ok"/>
  <text x="750" y="78" text-anchor="middle" class="bf-text" font-size="12">key=999_0</text>
  <text x="750" y="96" text-anchor="middle" class="bf-text-2" font-size="11">小表行 → 复制 + 打盐</text>
  <rect x="590" y="125" width="320" height="60" class="skew-box-ok"/>
  <text x="750" y="153" text-anchor="middle" class="bf-text" font-size="12">key=999_1</text>
  <text x="750" y="171" text-anchor="middle" class="bf-text-2" font-size="11">小表行 → 复制 + 打盐</text>
  <rect x="590" y="200" width="320" height="60" class="skew-box-ok"/>
  <text x="750" y="228" text-anchor="middle" class="bf-text" font-size="12">key=999_2</text>
  <text x="750" y="246" text-anchor="middle" class="bf-text-2" font-size="11">小表行 → 复制 + 打盐</text>

  <line x1="410" y1="80" x2="585" y2="80" class="bf-arrow"/>
  <polygon points="585,80 575,75 575,85" class="bf-arrow-head"/>
  <line x1="410" y1="155" x2="585" y2="155" class="bf-arrow"/>
  <polygon points="585,155 575,150 575,160" class="bf-arrow-head"/>
  <line x1="410" y1="230" x2="585" y2="230" class="bf-arrow"/>
  <polygon points="585,230 575,225 575,235" class="bf-arrow-head"/>

  <text x="500" y="290" text-anchor="middle" class="bf-ok" font-size="13" font-weight="600">JOIN 条件：salted_key（含盐）一一匹配</text>
  <text x="500" y="312" text-anchor="middle" class="bf-text-2" font-size="12">每个分桶只有 1/N 的数据 → Shuffle 负载均衡</text>
</svg>
<figcaption>图 5：大表拆 N 桶、小表复制 N 份，Join 键变为含盐 key</figcaption>
</figure>

### 代码实现

```sql
-- 大表：热点 key 打盐拆分（盐 0..2），非热点 key 盐固定为 0
CREATE OR REPLACE TEMP VIEW big_salted AS
SELECT *,
       CONCAT(key, '_',
              IF(key = '999', FLOOR(RAND() * 3), 0)) AS salted_key
FROM big_table;

-- 小表：热点行复制 N=3 份（盐 0,1,2），非热点行盐固定为 0
CREATE OR REPLACE TEMP VIEW small_salted AS
SELECT key, other_cols, CONCAT(key, '_', salt) AS salted_key
FROM (
    -- 热点行复制 3 份
    SELECT s.*, explode(ARRAY(0, 1, 2)) AS salt
    FROM small_table s
    WHERE s.key = '999'
    UNION ALL
    -- 非热点行盐为 0
    SELECT s.*, 0 AS salt
    FROM small_table s
    WHERE s.key <> '999'
) t;

-- 用含盐 key 做 Join，热点 key 被摊到 3 个桶
SELECT b.*, s.other_cols
FROM big_salted b
LEFT JOIN small_salted s ON b.salted_key = s.salted_key;
```

### 适用场景与注意点

- ✅ 解决 **Join 倾斜**，且不依赖 `spark.sql.adaptive` 开关。
- ⚠️ 前提是**知道热点 key 是哪个**；多个热点 key 需要分别维护盐区间。
- ⚠️ 小表要复制 N 份，内存占用 ×N；N 不宜过大（一般 10~100）。
- ⚠️ 若倾斜 key 是小表的 **外键且 join 是内连接**，可以反过来考虑把大表打散后 join 再 group by——但更简单的做法见思路四。

---

## 五、思路四：转 Broadcast Join（广播小表）

### 原理

很多倾斜场景本质是 **大表 join 小表**，比如 10 亿行日志 join 一张 5 万行的用户维度表。默认的 SortMergeJoin 会让两边的数据都走一遍 Shuffle；如果小表足够小，直接把小表**复制到每个 Executor 的内存里**，在 Map 端本地完成 Join，**全程零 Shuffle**，倾斜自然不存在了。

<figure class="bf-fig">
<svg viewBox="0 0 1000 300" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Broadcast Join 示意：小表广播到每个 Executor">
  <text x="500" y="26" text-anchor="middle" class="bf-text" font-size="14" font-weight="600">Broadcast Join：小表送到每个 Executor，Map 端直接 Join</text>

  <rect x="380" y="45" width="240" height="40" class="skew-box-hot"/>
  <text x="500" y="69" text-anchor="middle" class="bf-text" font-size="13" font-weight="600">维度表（< 10MB）</text>

  <line x1="470" y1="85" x2="210" y2="135" class="bf-arrow"/>
  <polygon points="210,135 220,132 218,142" class="bf-arrow-head"/>
  <line x1="500" y1="85" x2="500" y2="135" class="bf-arrow"/>
  <polygon points="500,137 496,130 504,130" class="bf-arrow-head"/>
  <line x1="530" y1="85" x2="790" y2="135" class="bf-arrow"/>
  <polygon points="790,135 780,132 782,142" class="bf-arrow-head"/>
  <text x="280" y="125" class="bf-text-2" font-size="11">广播副本 1</text>
  <text x="515" y="125" class="bf-text-2" font-size="11">广播副本 2</text>
  <text x="700" y="125" class="bf-text-2" font-size="11">广播副本 3</text>

  <rect x="60" y="145" width="260" height="110" class="skew-box-ok"/>
  <text x="190" y="170" text-anchor="middle" class="bf-text" font-size="12" font-weight="600">Executor 1</text>
  <text x="190" y="192" text-anchor="middle" class="bf-text-2" font-size="11">大表分区数据</text>
  <text x="190" y="210" text-anchor="middle" class="bf-text-2" font-size="11">+ 小表副本</text>
  <text x="190" y="235" text-anchor="middle" class="bf-ok skew-tag">本地 Join，零 Shuffle</text>

  <rect x="370" y="145" width="260" height="110" class="skew-box-ok"/>
  <text x="500" y="170" text-anchor="middle" class="bf-text" font-size="12" font-weight="600">Executor 2</text>
  <text x="500" y="192" text-anchor="middle" class="bf-text-2" font-size="11">大表分区数据</text>
  <text x="500" y="210" text-anchor="middle" class="bf-text-2" font-size="11">+ 小表副本</text>
  <text x="500" y="235" text-anchor="middle" class="bf-ok skew-tag">本地 Join，零 Shuffle</text>

  <rect x="680" y="145" width="260" height="110" class="skew-box-ok"/>
  <text x="810" y="170" text-anchor="middle" class="bf-text" font-size="12" font-weight="600">Executor 3</text>
  <text x="810" y="192" text-anchor="middle" class="bf-text-2" font-size="11">大表分区数据</text>
  <text x="810" y="210" text-anchor="middle" class="bf-text-2" font-size="11">+ 小表副本</text>
  <text x="810" y="235" text-anchor="middle" class="bf-ok skew-tag">本地 Join，零 Shuffle</text>

  <text x="500" y="285" text-anchor="middle" class="bf-text-2" font-size="12">没有 Shuffle → 没有按 key 分桶 → 不存在倾斜。代价：小表复制 N 份到各 Executor 内存。</text>
</svg>
<figcaption>图 6：Broadcast Join 用"复制"换"Shuffle"，从根本上消灭倾斜</figcaption>
</figure>

### 代码实现

```sql
-- Spark SQL：用 HINT 强制广播
SELECT /*+ BROADCAST(dim) */
       l.user_id, l.event, d.name
FROM   user_logs l
LEFT JOIN dim_user d ON l.user_id = d.user_id;
```

也可以全局调大广播阈值，让优化器自动广播（谨慎，别把大表广播了）：

```sql
SET spark.sql.autoBroadcastJoinThreshold = 50m;   -- 默认 10m
```

### 适用场景与注意点

- ✅ **小表 join 大表**时的首选，简单粗暴、效果立竿见影。
- ✅ 对 `LEFT JOIN` / `INNER JOIN` 都有效。
- ⚠️ 小表必须能被压进 Executor 内存（默认阈值 10MB，可调但别调太大）。
- ⚠️ 广播表更新频率要可控，否则全集群广播副本的刷新也有开销。
- ⚠️ 真正大表之间的 Join 倾斜，广播不可行，回到思路二/三。

---

## 六、空值 / 默认值倾斜

`NULL`、`''`、`-1`、`unknown` 这类兜底值是最隐蔽的倾斜源——它们经常占 30%+ 数据且聚在同一个桶。

- **过滤**：如果业务上不需要这些值，直接 `WHERE key IS NOT NULL` 过滤。
- **加盐**：如果必须保留，把空值替换成随机值再聚合：

```sql
SELECT
    COALESCE(NULLIF(key, ''), 'unknown') AS key,   -- 归一化
    COUNT(*)
FROM t
GROUP BY COALESCE(NULLIF(key, ''), 'unknown');
```

## 七、数据预处理：写表时预打散

比"查询时救火"更好的做法是**在写表时就避免倾斜**：

- **分桶（Bucketing）**：`CLUSTERED BY (key) INTO 200 BUCKETS`，让物理文件天然按 key 分布；
- **预聚合**：上游把明细先按维度聚合成汇总表，下游查询不再撞倾斜；
- **重分区**：写表时用 `DISTRIBUTE BY` 显式控制数据落盘分布（等价于按 key 重分区）：

```sql
INSERT OVERWRITE TABLE user_logs_rekeyed
SELECT * FROM user_logs
DISTRIBUTE BY key;   -- 按 key 哈希分桶写盘，摊平单个分区
```

## 八、动态调整并行度

- 调大 `spark.sql.shuffle.partitions`（默认 200）——倾斜数据会被切到更多桶，虽然单桶仍倾斜，但峰值压力减小；
- 让 Executor 内存和并行度匹配数据量，降低 OOM 概率。

## 九、Spark AQE（自适应查询执行）

Spark 3.0+ 的 AQE 能在**运行时**自动发现倾斜分区并做拆分，是"免费"的兜底手段：

```sql
SET spark.sql.adaptive.enabled = true;
SET spark.sql.adaptive.coalescePartitions.enabled = true;
SET spark.sql.adaptive.skewJoin.enabled = true;                       -- 自动 skew join
SET spark.sql.adaptive.skewJoin.skewedPartitionFactor = 5;
SET spark.sql.adaptive.skewJoin.skewedPartitionThresholdInBytes = 256m;
```

> 注意：AQE 的 skewJoin 只能处理 **join** 的倾斜，`GROUP BY` 的倾斜仍需手动加盐（思路一/二）。

---

## 十、总结：怎么选

| 场景 | 首选方案 | 一句话理由 |
| --- | --- | --- |
| `GROUP BY` 聚合倾斜 | **双层 Group By**（思路一） | 通用、成本低、一次搞定 |
| 热点 key 明确且少 | **热点 key 单独计算**（思路二） | 最精准，普通 key 零损耗 |
| 大表 join 大表、已知热点 key | **加盐 Join**（思路三） | 拆桶 + 复制，两全其美 |
| 大表 join 小表 | **转 Broadcast Join**（思路四） | 零 Shuffle，治本 |
| 空值/默认值倾斜 | **过滤 + 归一化**（六） | 成本最低，先排查 |
| 不想改 SQL | **AQE 开关**（九） | 白嫖优化，先开起来 |
| 长期稳定任务 | **分桶/预聚合**（七） | 治本于上游 |

**最后一条经验**：遇到任务卡住，先看 Spark UI 里各 Stage 的 Task 耗时分布——如果出现"一柱擎天"的长条，就是倾斜。**优先开 AQE，其次查空值，再考虑加盐**——大多数生产问题到第三步就已经解决了。
