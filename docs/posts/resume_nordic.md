---
title: Ryan Su
description: Data Engineer — Nordic Resume
---

# Ryan Su

<div class="resume-meta">
  Data Engineer<br>
  Hangzhou, China · open to relocation / remote in the Nordics<br>
  <a href="mailto:ryan.su@noribear.cn">ryan.su@noribear.cn</a>
</div>

## Profile

Data engineer with 5+ years across cross-border e-commerce, retail intelligence, and IoT. Worked mainly with Spark, Flink, and dimensional modeling; experienced in stabilizing ETL baselines, improving data quality, and reducing storage cost. Comfortable collaborating across teams and communicating in English.

## Work Experience

### Temu | Data Warehouse Engineer

**Jun 2024 – Jun 2025** · Cross-border E-commerce · [temu.com](https://www.temu.com/)

- Worked with the team to design and iterate core transaction-domain models (orders, shopping cart) for cross-border analytics.
- Optimized transaction ETL pipelines to stabilize hourly baselines and improve on-time data delivery.
- Collaborated on performance and quality fixes: resolved data skew, removed redundant computations, refined DQC rules.
- Delivered reports and data services for business and analytics teams; handled high-priority ad-hoc data extraction under tight deadlines.

### Clobotics | Big Data Engineer

**Mar 2022 – Jun 2024** · Retail Intelligence · [clobotics.com](https://clobotics.com/retail/)

- Helped build the retail data pipeline and core data models from scratch (0 → 1).
- Delivered data reports and analytics services for customers and internal business units.

### Enmonster | Senior Data Warehouse Engineer

**Nov 2019 – Mar 2022** · Shared-Charging IoT · [enmonster.com](https://www.enmonster.com/product)

- Co-authored data development standards and the company-wide metric system as part of a core team.
- Designed and optimized finance-domain models across the detail (DWD) and summary (DWS) layers.
- Supported a company-level settlement project, turning complex data logic from requirements into production.

## Projects

### Temu | Shopping Cart Data Governance Initiative

**Problem:** Hourly baselines in the transaction domain frequently missed deadlines while storage costs kept rising.

**Solution:**

- Introduced daily snapshot tables for downstream analytics and trimmed ~15% of non-core fields from hourly snapshots, reducing data volume at the source.
- Used Bloom filters to detect changed data, converting full recomputes into incremental ones and cutting redundant computation by ~90%.
- Applied bucketed joins between fact and dimension tables, replacing global shuffles with bucket-local shuffles.
- Consolidated DQC rules and re-architected historical log storage to improve compression.

**Result:** Baselines finished 1 hour earlier, storage costs dropped ~40%, and the DQC timeout rate fell from 10% to 0.

---

### Temu | Real-time GMV Monitoring Dashboard

**Problem:** Business needed real-time, multi-dimensional visibility into global transactions, including cumulative GMV since midnight.

**Solution:**

- Built a dual-stream join pipeline in FlinkSQL, correlating payment events with user dimensions in real time.
- Aggregated live GMV by country, payment channel, and user type.
- Wrote results to MySQL for immediate reporting.

**Result:** Enabled analysis across 7 dimensions, processing millions of transactions daily with second-level accuracy.

---

### Clobotics | Delta Lake-based Data Delivery Pipeline

**Problem:** Algorithm outputs were scattered across MySQL, MongoDB, and file systems; manual CSV/Excel handoffs caused delivery cycles of 3+ days.

**Solution:**

- Adopted Delta Lake as the core storage format, using versioning, upsert/delete, and storage-compute separation for frequent data corrections at controlled cost.
- Used Spark as the unified processing engine to handle heterogeneous sources and file formats with native operators.

**Result:** Cut delivery cycles from 3+ days to under 1 day, improving business responsiveness while keeping cluster resource consumption in check.

---

### Enmonster | Data Warehouse Migration & Governance

**Problem:** The CDH-based platform was costly and unstable, and the warehouse lacked unified standards for data domains and layered development, causing inconsistent metric definitions.

**Solution:**

- Co-defined development standards covering data domains, layering, processes, and the metric system.
- Rebuilt models with dimensional modeling: separated core and extended DWD models, denormalized frequent dimensions, added lightweight DWS summarization, and implemented complex metric logic at the ADS layer.
- Supported the company-level finance project throughout the migration.

**Result:** Standardized development practices; registered 50+ metrics and reduced data inconsistency by 50%+; migrated 10+ core models and 600+ scheduled jobs without downtime for downstream consumers.

## Skills

- **Data Warehousing:** Dimensional modeling (Kimball), DWD/DWS/ADS layered architecture
- **Data Governance:** Compute & storage governance, data quality (DQC) design and tuning
- **Query & Processing:** HiveSQL, SparkSQL, Spark, FlinkSQL, Delta Lake
- **Big Data Stack:** Hadoop, Hive, Spark, Flink, Doris
- **Platforms:** Alibaba Cloud DataWorks, Databricks

## Languages

- **Chinese (Mandarin):** Native
- **English:** Professional working proficiency <!-- 请按真实水平调整 -->

## Links

- LinkedIn: <https://www.linkedin.com/in/your-profile> <!-- 请替换为真实链接 -->
- GitHub: <https://github.com/jwsmai>

## Education

### Hefei University | B.Eng. in Software Engineering

**Jun 2016 – Jul 2020** · Full-time undergraduate

---

<!-- Optional, common in Nordic CVs — fill in if you like:

## Interests

- Cycling, hiking, and photography
- Coffee & fika culture
- ...

-->
