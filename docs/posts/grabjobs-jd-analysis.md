---
title: 从 GrabJobs 真实 JD 看北欧 Data Engineer 岗位特点
---

# 从 GrabJobs 真实 JD 看北欧 Data Engineer 岗位特点

> 样本：2026-08-24 从 GrabJobs 抓取的 7 个瑞典正在招聘的 Data Engineer 岗位。
> 原始数据见 [GrabJobs 北欧 Data Engineer JD 清单](./grabjobs-jd-list)。
> 样本量不大，但行业跨度（零售/游戏/航空/能源/安全/通信）已经足以勾勒出北欧 DE 岗位的共性。

## 一、最醒目的信号：Senior 占绝对多数

7 个 JD，5 个是 Senior，2 个是普通 Data Engineer——但普通岗也要求 3-4 年经验。没有一个 junior 岗。

这不是偶然。北欧数据团队的 HC 本来就少，招一个人要过 4-8 个人的共识面试（见之前的[面试指南](./nordic-de-interview)），所以倾向招"能独立交付"的人：

- Flower：要求"4+ 年生产级数据系统经验"、"能自主做技术决策"（Flightradar24）
- Securitas：要求"3+ 年数据工程"+"Databricks 专家"
- 咨询岗：要求"多年经验"+ "能独立交付"

**对你意味着什么**：如果你在国内主要做"工具人"式的执行工作，简历里一定要突出"独立负责过某个数据产品的全生命周期"——北欧公司要的是能自己扛事的人，不是执行者。

## 二、现代数据栈是绝对主线

把 7 个 JD 的技术栈词频拉一下：

| 技术 | 出现次数 | 说明 |
| --- | --- | --- |
| SQL | 7/7 | 全部要求，且经常是"强 SQL" |
| Spark / PySpark | 4 | Glue/Spark、Spark |
| dbt | 3 | 咨询岗、Securitas（DLT 替代）、Telavox |
| Airflow | 3 | 咨询岗、Flightradar24、Securitas |
| Kafka / 流式 | 3 | Arrowhead、Flightradar24、Telavox（CDC） |
| Snowflake / BigQuery / Databricks | 5 | 现代云数仓全面取代传统 EDW |
| Terraform / IaC | 3 | Flower、Flightradar24、Telavox 系 |

**两个值得注意的点**：

1. **传统 ETL 工具几乎消失**。7 个 JD 里只有 Arrowhead 和 Securitas 还在用 Azure Data Factory，而 Securitas 的定位就是"ETL Specialist"——Databricks DLT 正在取代 ADF 的位置。
2. **SQL 是永远的基本盘**。"Strong SQL" 几乎出现在每个 JD 里。你在简历里写"SQL"不够，要能展示建模、调优、窗口函数这类深度能力。

## 三、云平台绑定明确，没有"多云"叙事

- **AWS**：Flightradar24（全 AWS 原生）、咨询岗
- **Azure**：Arrowhead（SQL Server 生态）、Securitas
- **GCP**：Telavox（BigQuery + dbt）

北欧公司的数据栈通常**只深度绑定一个云**，JD 里几乎不提"多云"或"混合云"。这意味着：

- 你的简历如果写"精通多个云"，不如写"在 X 云上有 3 年以上生产经验"更有说服力
- 面试大概率会深挖你简历里那个云的具体服务细节（比如 Glue 的 job 参数、BigQuery 的 slot 成本）

## 四、Hybrid 是默认，但规则具体到"每周哪一天"

只要写了工作模式的 JD，都是混合办公：

- 咨询岗：**"每周 1 天远程（周一或周五）"**——规则精确到天
- Flower：混合办公
- Securitas：Hybrid，依国家而定
- Flightradar24：**明确"需驻场"**

没有一个是"远程全职"。这和北欧文化吻合：办公室社交（fika、coffee chat）被视为团队工作的一部分（见[北欧面试文化礼仪](./nordic-interview-culture)）。

**对你意味着什么**：如果你以为北欧可以"远程入职"，要调整预期——多数公司要求你人在当地。Flightradar24 更是直接写明"不提供 relocation"，这是对海外申请者的明确过滤。

## 五、文化信号已经写进了 JD

北欧公司的 JD 不只是技术要求，还直接暴露了他们的文化：

- **H&M：「无需提交求职信」**——北欧式直接沟通的极致体现。这也侧面印证了我们[求职信](./cover-letter-nordic)一文里说的：北欧求职信要求克制、事实导向，而 H&M 干脆连这层形式都不要了
- **Flower：把完整面试流程写进 JD**（Talent Partner → Head of Wholesale → 团队 → VP Engineering）——透明度是北欧企业的默认值，4 轮面试流程和行业主流一致
- **Arrowhead：「持续面试，找到合适人选即停止」**——说明他们相信"慢即是快"，这也是北欧招聘周期 6-12 周的原因之一
- **Flightradar24：直接写明不提供 relocation**——把话说在明处

## 六、福利条款具体得像采购清单

- H&M：30 天假期 + 25% 员工折扣 + wellness 4000 SEK/年 + 集体协议养老金 + HIP 激励
- Arrowhead：6 个月试用期 + 宠物友好办公室
- Securitas：要求掌握 FinOps（cluster sizing、autoscaling、Photon 成本优化）

北欧 JD 很少用"有竞争力的薪酬"这种空话，而是把具体的福利数字写出来。**而 30 天带薪假期是法律底线，不是福利亮点**——瑞典法定假期就是 25 天起，加上集体协议的通常更多。

## 七、行业分布：DE 不在互联网

7 个公司横跨 6 个行业：时尚零售、游戏、航空追踪、能源交易、安全服务、通信平台。

北欧没有中国式的"互联网大厂垄断数据岗位"格局。Data Engineer 在传统行业（零售、能源、安全）里是真正的稀缺岗位，待遇和挑战往往不输科技公司。这对你的求职策略意味着：

- **别只盯着科技公司**。H&M、Securitas 这种体量的传统巨头，数据团队规模大、预算足、项目系统性强
- **能源和游戏是北欧特色赛道**。Flower 做电力交易、Arrowhead 做《Helldivers 2》，这类岗位在中国基本不存在，是差异化竞争点

## 八、两个前沿信号

1. **AI 工具进入岗位描述**：Telavox 的 JD 明确写了"希望一起探索 Claude 和类似 AI 工具在分析工程中的角色"。北欧数据团队已经在认真思考 AI 如何改变数据工程——面试时聊聊你用 AI 工具加速开发的具体案例，会是加分项。
2. **成本意识岗位化**：Securitas 把 FinOps 写进"要求"而非"加分"，说明北欧企业已经默认数据工程师要为云成本负责。**简历里能写"通过优化把某条管道成本降了 X%"会非常对味**——正好和你 Temu 时期做成本优化的经验匹配。

## 九、对照你的简历：几个可落地的行动

结合你自己的情况，这 7 个 JD 给出几个具体信号：

1. **把 Flink 相关经验从简历主位撤下来**（之前已做）——7 个 JD 里 0 个提到 Flink，北欧主流是 Spark + dbt + 云数仓
2. **突出 SQL 深度**：这 7 个 JD 全部要求 SQL，且 5 个要求"强 SQL"——值得在简历里单独一条
3. **强化云平台叙事**：你在 Databricks/Deltalake 上的经验正好命中 Securitas 和咨询岗，可以针对这两类岗位定制投递
4. **准备 FinOps / 成本故事**：Securitas、Telavox 都关心成本管理，你之前 ~40% 存储成本优化的案例可以直接复用
5. **接受 hybrid 现实**：把"可 onsite Stockholm/Malmö"写进投递意向，比写"remote"更现实

## 样本局限

- 只有 7 个 JD，且都来自 GrabJobs 一个渠道，样本偏差存在
- 全部在瑞典（Malmö 2 个来自南部），未覆盖丹麦/挪威/芬兰
- GrabJobs 上的岗位偏中小企业和咨询，大厂（Spotify、Klarna 这类）通常走自己的招聘页

结论：**北欧 DE 市场要的不是"会用工具的人"，而是"能独立交付、懂成本、会沟通的数据工程师"**。继续补样本（目标 30 个）可以再验证这些结论的稳健性。
