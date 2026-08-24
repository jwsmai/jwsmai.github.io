---
title: "Dimensional Modeling vs. Medallion Architecture"
description: "A practical comparison of dimensional modeling and the medallion (bronze/silver/gold) architecture, with use cases, trade-offs, and when to choose each."
date: 2026-08-24
tags:
  - Data Engineering
  - Data Modeling
  - Medallion Architecture
  - Data Warehouse
---

# Dimensional Modeling vs. Medallion Architecture

Two terms come up constantly in modern data engineering: **dimensional modeling** and the **medallion architecture** (also called the *multi-hop* or *bronze–silver–gold* architecture). They are often mentioned in the same breath, but they solve **different problems** and operate at **different layers** of the stack.

This post explains each approach, then compares them directly so you know **when and how to combine them**.

---

## What Is Dimensional Modeling?

Dimensional modeling is a **technique for structuring data for analytics and reporting**. It was popularized by **Ralph Kimball** in the 1990s for data warehouses. The core idea is to model data as:

- **Fact tables** — the measurable events (sales, orders, clicks, sign-ups). Each row is a business event, and it stores numeric *measures* plus foreign keys to dimensions.
- **Dimension tables** — the descriptive context around those events (customer, product, time, store, employee). Each row is a distinct entity with attributes for filtering, grouping, and labeling.

### Key concepts

| Concept | Description | Example |
| --- | --- | --- |
| **Fact table** | Stores measurements of business events | `fact_sales` with `amount`, `quantity`, `order_id` |
| **Dimension table** | Stores descriptive attributes | `dim_customer`, `dim_product`, `dim_date`, `dim_store` |
| **Star schema** | Facts at the center, dimensions connected directly around them | Fact + 4–6 dimensions joined in a star |
| **Snowflake schema** | Dimensions are further normalized into multiple related tables | `dim_product` split into `dim_brand` and `dim_category` |
| **Slowly Changing Dimensions (SCD)** | Handles how dimension values change over time | SCD Type 1 (overwrite), Type 2 (history), Type 3 (current + previous) |
| **Conformed dimensions** | Shared dimensions reused across multiple facts for consistency | One `dim_date` used by both `fact_sales` and `fact_inventory` |
| **Grain** | The level of detail a single fact row represents | "One row per order line item" |

### When to use it
- **Business intelligence and reporting**: dashboards, monthly P&L, cohort analysis.
- **OLAP workloads**: heavy `GROUP BY`, slicing, dicing, drilling down.
- **Where business users need consistency**: conformed dimensions guarantee that "revenue" means the same thing in every report.

### Strengths & weaknesses

**Strengths**
- Highly **intuitive for business users** — dimensions map to how people naturally think.
- **Fast query performance** for aggregation because of pre-joined, denormalized structures.
- Well-understood, mature best practices (SCD, surrogate keys, conformed dimensions).

**Weaknesses**
- **Modeling is opinionated and requires upfront design** — you must decide grain and dimensions before loading.
- **Less flexible** for new/unexplored analysis — ad-hoc questions may not fit the existing model.
- Can become **rigid when business requirements change quickly**.
- Historically built for batch ETL into a **warehouse**, not streaming or raw exploration.

---

## What Is the Medallion Architecture?

The medallion architecture is a **logical design pattern for organizing data pipelines in a lakehouse** (e.g., Databricks Delta Lake, Snowflake, Iceberg). It organizes data into **layers of increasing refinement and quality**:

### The three layers

| Layer | Name | Purpose | Characteristics |
| --- | --- | --- | --- |
| 🥉 **Bronze** | Raw | **Landing zone** — ingest source data as-is | Append-only, immutable, original fidelity; data is preserved exactly as received |
| 🥈 **Silver** | Refined | **Cleaned, deduplicated, validated** data | Conformed schema, quality checks, joins, evolution-ready; still "near-raw" but usable for analytics |
| 🥇 **Gold** | Curated | **Business-level, performance-optimized** data | Aggregated, feature-engineered, denormalized for specific reports, ML features, and dashboards |

### Key principles
- **Incremental refinement**: data improves in quality and usability as it moves through layers.
- **Re-processing / re-computation**: you can rebuild any layer from the layer below it (lineage is preserved).
- **Cheap storage, expensive compute**: raw bronze data is cheap to store, so you keep everything and refine only what you need.
- **Streaming and batch unified**: the same layers work for both batch and real-time pipelines.
- **Separation of concerns**: the bronze layer isolates you from upstream schema changes.

### When to use it
- **Lakehouse / data mesh platforms** where raw data must be stored for future analysis.
- **Data science and ML** where you need raw + clean + curated versions of the same data.
- **When source schemas change often** — bronze absorbs the shock; you only fix what breaks in silver/gold.
- **When teams need flexibility** to discover new use cases without a heavy upfront model.

### Strengths & weaknesses

**Strengths**
- **Incremental and forgiving** — you don't need to fully design the schema upfront.
- **Excellent for iterative/exploratory analytics** and ML.
- **Resilient to source changes** — raw data is preserved.
- Supports **streaming + batch** with the same structure.

**Weaknesses**
- Bronze/silver layers can **accumulate storage costs** if not managed.
- **Gold layer still needs good modeling** to be performant for BI — the architecture itself doesn't define reporting models.
- More layers = **more pipelines to build and monitor**.
- Can encourage **data swamp** if naming/quality governance is weak.

---

## Dimensional Modeling vs. Medallion Architecture: Direct Comparison

> The key insight: **these are not competing alternatives — they answer different questions.** Dimensional modeling is *how to structure data for business reporting*. Medallion is *how to organize the pipeline layers of a lakehouse*. A real system uses **both**.

| Dimension | Dimensional Modeling | Medallion Architecture |
| --- | --- | --- |
| **Core question** | How should analytics data be **structured** for reporting? | How should data be **staged/processed** through the pipeline? |
| **Primary output** | Fact & dimension tables (star/snowflake schema) | Bronze, silver, gold layer tables |
| **Focus** | **Query performance** & business usability | **Data quality, lineage, re-processing** |
| **Upfront design** | High — grain & dimensions decided early | Low — start raw, refine iteratively |
| **Flexibility** | Lower — model is opinionated | Higher — easy to add new use cases |
| **Best for** | BI dashboards, OLAP, consistent metrics | Lakehouse, ML, exploration, streaming |
| **Handles source changes** | Poorly (schema changes break model) | Well (bronze absorbs upstream changes) |
| **Streaming support** | Not its focus (batch ETL origin) | Native (streaming + batch) |
| **Where it lives** | Semantic / reporting layer | Physical pipeline / storage layer |
| **Maturity** | ~30 years of best practices | Rapidly growing modern standard |

---

## How They Work Together (the practical answer)

In a modern lakehouse, **the medallion architecture and dimensional modeling are layered on top of each other**:

```
Raw sources ──▶ 🥉 Bronze (raw landing)
                   │
                   ▼
                 🥈 Silver (cleaned, conformed, deduplicated)
                   │
                   ▼
                 🥇 Gold (curated business layer)
                   │
                   └──▶ STAR SCHEMA (dimensional modeling)
                          fact_sales
                          dim_customer / dim_product / dim_date
```

### A realistic pattern

1. **Bronze** — land all source files (JSON, CDC logs, DB dumps) as-is. Append-only, keep everything.
2. **Silver** — clean, deduplicate, validate types, apply SCD logic. Produce conformed, well-typed tables.
3. **Gold** — apply **dimensional modeling** here: build `fact_*` and `dim_*` tables in a star schema for BI tools and dashboards.

So **dimensional modeling is the destination (gold layer), and the medallion layers are the journey that gets you there cleanly.**

### Example: e-commerce

| Layer | Content |
| --- | --- |
| Bronze | Raw order JSON events from Kafka, raw MySQL product dump |
| Silver | `orders_cleaned`, `products_normalized` — deduplicated, type-correct, valid |
| Gold | `dim_customer`, `dim_product`, `dim_date`, `fact_orders` — star schema for dashboards |
| BI | Power BI / Metabase queries the star schema; SLAs guarantee consistent "revenue" |

---

## How to Choose (decision guide)

**Lean toward dimensional modeling when:**
- You're building a **classic BI / reporting** layer for business stakeholders.
- You need **consistent, governed metrics** shared across the company.
- Query performance for fixed dashboards matters more than ad-hoc exploration.

**Lean toward medallion when:**
- You're on a **lakehouse** and need to preserve raw data for ML and future analysis.
- Sources change frequently and you want to **decouple** from upstream breakage.
- You need **streaming + batch** unified, or heavy iterative exploration.

**Use both (recommended for most data teams):**
- Medallion to organize the pipeline and guarantee quality.
- Dimensional modeling in the gold layer to serve fast, reliable BI.

---

## Summary

- **Dimensional modeling** = a **modeling technique** for structuring analytical data (facts + dimensions) to make reporting fast and intuitive.
- **Medallion architecture** = a **pipeline organization pattern** (bronze → silver → gold) that makes data processing clean, re-processable, and resilient.
- They are **complementary**, not competing. In practice, medallion layers carry raw→refined→curated data, and the curated (gold) layer is where you apply dimensional modeling to serve BI.

> **Interview tip**: If a data engineering interviewer asks about these, the strongest answer connects them: "Medallion handles *how data flows and stays clean*; dimensional modeling handles *how the final analytical data is shaped*. You need both — silver gives you quality, gold gives you structure."

---

## References & Further Reading

- Ralph Kimball & Margy Ross, *The Data Warehouse Toolkit* — the canonical source on dimensional modeling.
- Databricks documentation, *Medallion Architecture* — the reference for bronze/silver/gold.
- Bill Inmon's enterprise warehouse approach as an alternative to Kimball's dimensional modeling.
