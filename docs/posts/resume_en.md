---
title: Ryan Su
sidebarTitle: Resume (English)
description: Data Engineer — Resume
---

# Ryan Su

<div class="resume-meta">
  Data Engineer<br>
  Hangzhou, China<br>
  <a href="mailto:ryan.su@noribear.cn">ryan.su@noribear.cn</a>
</div>

## Professional Summary

Data engineer with **5+ years** of experience across cross-border e-commerce and IoT retail. Specialized in **dimensional modeling**, **data governance**, and **real-time analytics**. Proven track record of stabilizing ETL baselines, cutting storage costs, and shortening data delivery cycles.

## Work Experience

### Temu | Senior Data Engineer

**Jun 2024 – Jun 2025** · Cross-border E-commerce · [temu.com](https://www.temu.com/)

- Designed and iterated core **transaction-domain models** (orders, shopping cart), enabling reliable analytics for cross-border commerce.
- Optimized transaction **ETL pipelines**, stabilizing **hourly baselines** and improving on-time data delivery.
- Fixed performance and quality issues: resolved **data skew**, removed redundant computations, and refined **DQC rules**.
- Delivered reports and data services for business and analytics teams; handled high-priority ad-hoc data extractions under tight deadlines.

### Clobotics | Data Engineer

**Mar 2022 – Jun 2024** · Retail Intelligence · [clobotics.com](https://clobotics.com/retail/)

- Built the retail **data pipeline** and **core data models** from scratch (0 → 1).
- Delivered data reports and analytics services for customers and internal business units.

### Enmonster | Data Engineer

**Nov 2019 – Mar 2022** · Shared-Charging IoT · [enmonster.com](https://www.enmonster.com/product)

- Co-authored data development standards and the company-wide **metric system** design as a core team member.
- Designed and optimized **finance-domain models** across the detail (**DWD**) and summary (**DWS**) layers.
- Led data delivery for a company-level settlement project, driving complex data logic from requirements to production.

---

## Projects

### Temu | Shopping Cart Data Governance Initiative

**Problem:** Hourly baselines in the transaction domain frequently missed deadlines, while storage costs kept rising.

**Solution:**

- Introduced **daily snapshot tables** to serve downstream analytics and trimmed **15%** of non-core fields from hourly snapshots, cutting data volume at the source.
- Adopted **Bloom filters** to detect changed data, converting full recomputes into incremental ones and avoiding **90%** of redundant computation.
- Applied **bucketed joins** between fact and dimension tables, replacing global shuffles with efficient bucket-local shuffles.
- Consolidated DQC rules and re-architected historical log storage to improve compression.

**Result:** Baselines finished 1 hour earlier, storage costs dropped **~40%**, and DQC timeout rate fell from **10% to 0**.

---

### Temu | Real-time GMV Monitoring Dashboard

**Problem:** Business needed real-time, multi-dimensional visibility into global market transactions, including cumulative GMV since midnight.

**Solution:**

- Built a **dual-stream join** pipeline in **FlinkSQL**, correlating payment events with user dimensions in real time.
- Aggregated live GMV by country, payment channel, and user type.
- Wrote results to MySQL for immediate reporting.

**Result:** Enabled analysis across **7 dimensions**, processing **millions of transactions** daily with second-level accuracy for decision-making.

---

### Clobotics | Delta Lake-based Data Delivery Pipeline

**Problem:** Algorithm outputs were scattered across MySQL, MongoDB, and file systems; manual CSV/Excel handoffs caused delivery cycles of 3+ days.

**Solution:**

- Adopted **Delta Lake** as the core storage format, leveraging versioning, **upsert/delete** support, and **storage-compute separation** for frequent data corrections at controlled cost.
- Used **Spark** as the unified processing engine to handle heterogeneous sources and file formats with native operators.

**Result:** Cut delivery cycles from **3+ days** to under **1 day**, dramatically improving business responsiveness while keeping cluster resource consumption in check.

---

### Enmonster | Data Warehouse Migration & Governance

**Problem:** The **CDH**-based platform was costly and unstable, and the warehouse lacked unified standards for data domains and layered development, causing inconsistent metric definitions.

**Solution:**

- Co-defined development standards covering data domains, layering, processes, and the metric system.
- Rebuilt models using **dimensional modeling**: separated core and extended **DWD** models, denormalized frequent dimensions, added lightweight **DWS** summarization, and implemented complex metric logic at the **ADS** layer.
- Supported the company-level finance project throughout the migration.

**Result:** Standardized development practices; registered **50+** metrics and cut data inconsistency by **50%+**; migrated **10+** core models and **600+** scheduled jobs without downtime or data loss for downstream consumers.

---

## Skills

- **Data Warehousing:** Dimensional modeling (Kimball), DWD/DWS/ADS layered architecture
- **Data Governance:** Compute & storage governance, data quality (DQC) design and tuning
- **Query & Processing:** HiveSQL, SparkSQL, Spark, FlinkSQL, Delta Lake
- **Big Data Stack:** Hadoop, Hive, Spark, Flink, Doris
- **Platforms:** Alibaba Cloud DataWorks, Databricks

---

## Education

### Hefei University | B.Eng. in Software Engineering

**Jun 2016 – Jul 2020** · Full-time undergraduate
