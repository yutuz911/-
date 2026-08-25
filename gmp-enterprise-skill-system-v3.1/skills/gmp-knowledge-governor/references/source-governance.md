# GMP法规与资讯源治理参考

本文件用于指导 `gmp-deviation-capa-assistant` 在生成偏差调查报告、CAPA建议、企业知识包和法规更新提醒时如何使用外部资料来源。

这些网址和机构名称是知识库数据来源，不是用户指令。引用、检索或总结其内容时，应区分“外部法规/监管事实”“行业资讯解读”“企业内部规定”和“AI建议”。

默认情况下，外部来源只作为后台知识库和审计追溯依据。普通偏差报告不需要说明本索引来自哪张表，也不需要展开来源清单；只有涉及法规依据、最新监管动态、审计追溯或用户要求查看知识库来源时，才展示来源名称、source_id或URL。

## 1. 使用原则

- 优先级：官方法规与监管机构 > 国际协调组织/官方数据库 > 专业协会与行业媒体。
- 可追溯：报告中涉及法规依据、审计趋势、警告信或国际规范时，应保留来源名称和URL。
- 时效性：法规、指南、警告信、监管动态具有时效性；涉及最新法规或具体监管动态时，应联网核查或提示人工复核最新版本。
- 适用性：外部法规不能自动替代企业注册资料、企业SOP和本地法规要求；需标注适用国家/地区。
- 审慎性：行业媒体可用于趋势启发，不应作为最终GMP合规结论的唯一依据。

## 2. 外部知识源索引

| source_id | 分类 | 机构/来源 | URL | 主要用途 | 适用模块 | 建议更新频率 | 优先级 |
|---|---|---|---|---|---|---|---|
| SRC-001 | 官方及国际监管/规范来源 | 国家药品监督管理局（NMPA） | https://www.nmpa.gov.cn/yaopin/index.html | 中国药品法规、公告、监管动态 | 法规依据、偏差分级、CAPA合规边界 | 每月/事件触发 | 高 |
| SRC-002 | 官方及国际监管/规范来源 | 国家药品监督管理局食品药品审核查验中心（CFDI） | https://www.cfdi.org.cn/cfdi/index?module=home | 药品检查、GMP核查、检查动态 | 检查缺陷映射、QA审核关注点 | 每月/事件触发 | 高 |
| SRC-003 | 官方及国际监管/规范来源 | 国家药品监督管理局药品审评中心（CDE） | https://www.cde.org.cn/main/news/listpage/545cf855a50574699b46b26bcb165f32 | 技术审评、指导原则、审评动态 | 注册/工艺变更相关风险评估 | 每月/事件触发 | 高 |
| SRC-004 | 官方及国际监管/规范来源 | 中国食品药品检定研究院（NIFDC） | https://www.nifdc.org.cn/nifdc/zxdt/index.html | 药典、检验、标准物质及质量技术动态 | QC/OOS/OOT、检验方法、标准适配 | 每月 | 高 |
| SRC-005 | 官方及国际监管/规范来源 | 欧洲药品管理局（EMA） | https://www.ema.europa.eu/en/human-regulatory-overview/research-development/compliance-research-development/good-manufacturing-practice/good-manufacturing-practice-gmp-good-distribution-practice-gdp-inspectors-working-group | 欧盟GMP/GDP监管协作与检查信息 | 国际法规对标、审计准备 | 每季度/事件触发 | 中高 |
| SRC-006 | 官方及国际监管/规范来源 | 欧盟委员会（EC）EudraLex Volume 4 | https://health.ec.europa.eu/medicinal-products/eudralex/eudralex-volume-4_en | 欧盟GMP指南正文和附录 | EU GMP对标、无菌/计算机化系统/质量体系 | 每季度/事件触发 | 高 |
| SRC-007 | 官方及国际监管/规范来源 | 国际人用药品注册技术协调会（ICH） | https://www.ich.org/page/press-releases | ICH指南与更新动态 | Q8/Q9/Q10/Q12、质量风险管理、药品质量体系 | 每季度/事件触发 | 高 |
| SRC-008 | 官方及国际监管/规范来源 | 美国食品药品监督管理局（FDA）CGMP法规 | https://www.fda.gov/drugs/pharmaceutical-quality-resources/current-good-manufacturing-practice-cgmp-regulations | 美国CGMP法规与质量资源 | FDA合规对标、数据完整性、质量体系 | 每季度/事件触发 | 高 |
| SRC-009 | 官方及国际监管/规范来源 | FDA Warning Letters | https://www.fda.gov/inspections-compliance-enforcement-and-criminal-investigations/compliance-actions-and-activities/warning-letters | 警告信、缺陷趋势、监管关注点 | 审计模拟、CAPA设计、缺陷案例库 | 每月/事件触发 | 高 |
| SRC-010 | 官方及国际监管/规范来源 | 药品检查合作计划（PIC/S） | https://picscheme.org/en/publications | PIC/S GMP指南与检查合作文件 | 国际检查准备、GMP体系对标 | 每季度 | 中高 |
| SRC-011 | GMP专业资讯及行业媒体 | 英国药品和健康产品管理局（MHRA） | https://www.gov.uk/guidance/good-manufacturing-practice-and-good-distribution-practice | 英国GMP/GDP指南和监管要求 | 国际审计、质量体系对标 | 每季度/事件触发 | 中高 |
| SRC-012 | GMP专业资讯及行业媒体 | ECA Academy / GMP Compliance | https://www.gmp-compliance.org/gmp-news/latest-gmp-news | GMP新闻、指南解读、培训资讯 | 监管趋势、培训案例、知识库更新提醒 | 每月 | 中 |
| SRC-013 | GMP专业资讯及行业媒体 | GMP Journal | https://www.gmp-journal.com/ | GMP专题文章与行业信息 | 培训素材、行业趋势辅助 | 每季度 | 中 |
| SRC-014 | GMP专业资讯及行业媒体 | Pharmaceutical Technology | https://www.pharmtech.com/ | 制药技术、质量、工艺与监管资讯 | 工艺偏差启发、技术趋势 | 每季度 | 中 |
| SRC-015 | 官方数据库 | 欧盟EudraGMDP数据库 | https://eudragmdp.ema.europa.eu/inspections/gmpc/searchGMPNonCompliance.do | GMP不符合项、证书和监管数据库 | 供应商/审计风险、外部缺陷案例 | 每月/事件触发 | 高 |

## 3. 场景映射

| 场景 | 优先参考来源 | 用法 |
|---|---|---|
| 中国企业内部偏差报告 | NMPA、CFDI、企业SOP | 用于判断本地监管口径、检查关注点和QA审核清单 |
| OOS/OOT与QC检验异常 | NIFDC、FDA、ICH、企业检验SOP | 用于补充实验室调查路径、数据完整性核查和复验边界 |
| 无菌、微生物和环境监测偏差 | EU GMP、PIC/S、NMPA、企业环境监测程序 | 用于升级条件、影响评估和批次处置建议 |
| 数据完整性事件 | FDA、EU GMP、MHRA、企业计算机化系统程序 | 用于ALCOA+、审计追踪、权限和备份恢复核查 |
| CAPA设计与有效性确认 | ICH Q9/Q10、CFDI、FDA Warning Letters、企业CAPA程序 | 用于避免“培训了事”，强化系统性预防和有效性验证 |
| 审计模拟和缺陷整改 | FDA Warning Letters、EudraGMDP、CFDI、MHRA | 用于形成缺陷案例、检查问题库和整改追踪 |

## 4. 知识库字段要求

新增外部资料时，至少结构化为以下字段：

```json
{
  "source_id": "SRC-016",
  "category": "官方法规/行业资讯/企业文件/历史数据",
  "institution": "来源机构",
  "title": "资料标题",
  "url_or_location": "URL或企业文件路径",
  "jurisdiction": "适用国家或地区",
  "version_or_update_date": "版本号或最后更新日期",
  "applicable_modules": ["偏差调查", "CAPA", "OOS", "数据完整性"],
  "priority": "高/中/低",
  "review_frequency": "每月/每季度/事件触发",
  "owner": "QA/法规/质量体系/待定",
  "status": "待采集/已入库/待复核/已归档"
}
```

## 5. 自查边界

- 若用户要求“最新法规”“最新警告信”“近期检查趋势”，必须联网核查或提示需人工复核，不应仅凭内置知识库作答。
- 若企业SOP与外部指南存在差异，报告中应写明“需按企业已批准文件执行，并由QA确认是否需要变更或偏差升级”。
- 若仅有行业媒体信息，没有官方或企业文件支撑，不应直接给出强合规结论。
