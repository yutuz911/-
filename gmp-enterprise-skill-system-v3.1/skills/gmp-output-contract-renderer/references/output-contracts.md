# 稳定输出契约与JSON约束

本文件用于保证 `gmp-deviation-capa-assistant` 的输出结构稳定、可检查、可渲染、可归档。生成报告时，应先按结构化契约组织内容，再渲染为用户需要的 Markdown、HTML、表格或JSON。

## 1. 总原则

- JSON优先：复杂报告、企业知识包、长期学习、复查提醒和HTML页面都应先形成结构化数据对象。
- 渲染分离：Markdown和HTML只是展示层，不改变事实、风险等级、CAPA字段和审核边界。
- 字段稳定：同类输出使用同一套字段名，避免每次换标题、换顺序、漏字段。
- 来源可追溯：关键判断必须标注 `basis_type`，区分 `user_fact`、`enterprise_rule`、`external_reference`、`historical_data`、`ai_inference`。
- 缺口显式：没有资料时写入 `information_gaps`，不要补造SOP编号、检测结果、日期或历史趋势。
- 人工复核：最终偏差等级、批次处置、CAPA批准和产品质量影响结论必须保留QA确认边界。

## 2. Schema文件

| 场景 | Schema | 用途 |
|---|---|---|
| 偏差调查报告 | `references/schemas/deviation-report.schema.json` | 标准报告、HTML报告、管理层摘要、CAPA表 |
| 企业资料投递/知识包 | `references/schemas/enterprise-knowledge-pack.schema.json` | 企业SOP、模板、台账投喂后的知识包 |
| 长期学习/预测提醒 | `references/schemas/learning-alerts.schema.json` | CAPA复查、有效性确认、重复偏差、趋势预警 |

## 3. 报告生成流程

1. 抽取用户输入为 `input_facts`，只记录用户明确提供的事实。
2. 引入企业知识包时，写入 `enterprise_rules`，并保留文件名、版本或用户提供来源。
3. 需要法规或外部知识时，引用 `external_references`，并优先使用 `source-governance.md` 的来源分级。
4. 生成 `risk_assessment`、`investigation_plan`、`root_cause_analysis`、`quality_impact_assessment`、`capa_plan`。
5. 用 `information_gaps` 明确待补充资料。
6. 用 `qa_review_points` 明确QA最终审核前必须确认的事项。
7. 渲染为用户指定格式；若用户要求HTML，使用 `assets/interactive-report-template.html` 或同等结构。

## 4. 输出稳定性检查

每次生成正式报告前，自查：

- 是否包含报告编号或临时编号、产品、批号、工序、偏差类型、风险等级建议。
- 是否把“事实、推断、待确认”分开。
- 是否说明风险等级依据。
- 是否存在根因过早归结为“人员失误”的问题。
- CAPA是否区分纠正措施和预防措施。
- CAPA是否包含责任部门、时限、输出证据、有效性确认。
- 是否明确批次处置建议是“建议”，最终需QA确认。
- 是否列出成品检验、补充检测、趋势记录、设备报警、审计追踪等待补充证据。
- 是否能从同一JSON对象稳定生成Markdown和HTML。

## 5. 用户要求JSON时的输出规则

当用户明确要求“输出JSON”“给程序调用”“固定字段”“稳定格式”时：

- 只输出符合对应Schema的JSON对象，不附加解释性段落。
- 字符串字段使用中文自然语言。
- 枚举字段使用Schema中定义的固定值。
- 不确定的字段填 `null` 或放入 `information_gaps`，不要创造事实。
- 数组字段即使为空也保留为空数组。

当用户没有要求JSON时：

- 不必暴露完整JSON，但应使用同一结构生成可读报告。
- HTML中的表格、卡片和筛选按钮应来源于结构化字段，不应另写一套不一致内容。
