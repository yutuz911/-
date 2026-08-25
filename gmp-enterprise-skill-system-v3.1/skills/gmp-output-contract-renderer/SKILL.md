---
name: gmp-output-contract-renderer
description: GMP报告稳定输出与UI渲染辅助技能。配合主技能gmp-deviation-capa-assistant使用，负责JSON Schema输出契约、Markdown/HTML一致渲染、交互式报告模板、企业资料投递入口UI和打印/复制/筛选等展示功能；不单独判断质量结论。
metadata:
  display_name: GMP输出契约与报告渲染辅助
  role: auxiliary
  system_group: gmp-enterprise-skill-system
  pairs_with:
    - gmp-deviation-capa-assistant
---

# GMP输出契约与报告渲染辅助

## 定位

本技能是 `gmp-deviation-capa-assistant` 的辅助技能，解决企业级使用中的稳定性和展示问题：同类输入应生成同样字段，同一个结构化报告应能稳定渲染为Markdown、HTML、管理层摘要、CAPA表和QA审核清单。

本技能不单独做GMP质量判断，不决定偏差等级、根因结论、产品质量影响、CAPA批准或批次放行。它负责输出契约、JSON约束、UI模板和展示层一致性。

## 触发场景

当用户提出以下需求时，使用本技能，并可与主技能组合：

- 要求“输出形式稳定”“固定字段”“JSON约束”“给程序调用”“批量生成报告”。
- 要求把偏差报告渲染成设计清晰、交互式、可打印、可复制摘要、可筛选CAPA的HTML。
- 要求企业资料投递入口、知识库管理台、长期学习看板、预测提醒看板。
- 要求优化UI设计、减少长文字阅读压力、给评委演示。
- 要求确保Markdown、HTML和JSON三种输出结论一致。

## 必读参考

- 输出结构和稳定性检查，读取 [references/output-contracts.md](references/output-contracts.md)。
- 偏差调查报告JSON字段，读取 [references/schemas/deviation-report.schema.json](references/schemas/deviation-report.schema.json)。
- 企业知识包JSON字段，读取 [references/schemas/enterprise-knowledge-pack.schema.json](references/schemas/enterprise-knowledge-pack.schema.json)。
- 长期学习和预测提醒JSON字段，读取 [references/schemas/learning-alerts.schema.json](references/schemas/learning-alerts.schema.json)。
- 生成交互式报告页面时，参考 [assets/interactive-report-template.html](assets/interactive-report-template.html)。
- 生成企业资料投递和学习入口页面时，参考 [assets/company-compliance-portal.html](assets/company-compliance-portal.html)。

## 输出契约

复杂输出必须先组织成结构化对象，再渲染：

- 偏差报告使用 `deviation-report.schema.json`。
- 企业资料投递和个性化知识包使用 `enterprise-knowledge-pack.schema.json`。
- 长期学习、CAPA复查和GMP预测提醒使用 `learning-alerts.schema.json`。

用户明确要求JSON时，只输出符合对应Schema的JSON对象，不附加解释性段落。用户没有要求JSON时，不必暴露完整JSON，但展示层仍必须遵循同一字段结构。

## UI原则

- 面向药企质量、QA、生产、QC和评委演示，视觉应克制、清晰、专业。
- 使用报告式控制台，而不是营销落地页；重点是让长报告可扫读、可展开、可复制、可打印。
- 参考 Hallmark 类产品页的清爽留白、清晰信息层级和克制配色，但不要复制品牌元素。
- 避免紫色渐变、装饰性光斑、过度花哨的大标题。
- 优先使用左侧/顶部导航、风险快照、折叠模块、结构化表格、状态标签和固定操作栏。
- HTML必须单文件自包含，不依赖外部CSS、JS或网络资源。
- 打印时隐藏按钮和导航，保留报告主体。

## 稳定性自查

渲染前检查：

- JSON字段是否完整，未知信息是否进入 `information_gaps`。
- 同一结论是否在摘要、风险快照、质量影响和QA关注点中保持一致。
- CAPA是否能按纠正措施/预防措施筛选。
- 长文字是否进入折叠模块或表格，不挤压首屏。
- 是否包含合规声明：AI输出是草案，最终由企业QA或授权人员确认。
