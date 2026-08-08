const REQUIRED_GUARDRAILS = [
  "Do not copy existing copyrighted MBTI mascot artwork",
  "Do not sexualize the person",
  "identity documents",
  "clearly stylized rather than photorealistic impersonation"
];

const BLOCKLIST = [
  {
    category: "copyright_or_brand_character",
    severity: "block",
    pattern: /\b(disney|pixar|marvel|dc comics|mickey|minnie|doraemon|pokemon|pikachu|naruto|one piece|luffy|sailor moon|ghibli|studio ghibli|harry potter)\b/i,
    message: "Avoid copying named copyrighted characters, studios, franchises, or mascots."
  },
  {
    category: "public_figure_or_impersonation",
    severity: "block",
    pattern: /\b(celebrity|famous actor|president|prime minister|as\s+if\s+they\s+are|impersonate|deepfake|photorealistic\s+copy)\b/i,
    message: "Avoid public-figure impersonation and photorealistic identity deception."
  },
  {
    category: "identity_document",
    severity: "block",
    pattern: /\b(passport|driver'?s license|national id|id card|certificate|badge|visa|official document)\b/i,
    message: "Do not generate identity documents, certificates, badges, or official records."
  },
  {
    category: "sexual_content",
    severity: "block",
    pattern: /\b(nude|nudity|sexual|erotic|lingerie|fetish|onlyfans|nsfw)\b/i,
    message: "Do not generate sexualized or nude content."
  },
  {
    category: "violence_or_gore",
    severity: "block",
    pattern: /\b(gore|blood splatter|dismember|torture|corpse|graphic violence)\b/i,
    message: "Do not generate gore or graphic violence."
  },
  {
    category: "hate_or_extremism",
    severity: "block",
    pattern: /\b(nazi|swastika|kkk|terrorist propaganda|hate symbol|racial slur)\b/i,
    message: "Do not generate hateful, extremist, or harassing content."
  },
  {
    category: "political_endorsement",
    severity: "block",
    pattern: /\b(vote for|campaign poster|political endorsement|election propaganda|party logo)\b/i,
    message: "Do not generate political endorsements or campaign material using a person's likeness."
  },
  {
    category: "prompt_injection",
    severity: "block",
    pattern: /\b(ignore previous|override safety|bypass policy|jailbreak|system prompt)\b/i,
    message: "Prompt injection language is not allowed."
  }
];

function auditPrompt(prompt) {
  const text = String(prompt || "");
  const safetyScanText = stripNegativeGuardrails(text);
  const findings = [];

  for (const rule of BLOCKLIST) {
    if (rule.pattern.test(safetyScanText)) {
      findings.push({
        category: rule.category,
        severity: rule.severity,
        message: rule.message
      });
    }
  }

  const missingGuardrails = REQUIRED_GUARDRAILS.filter((guardrail) => !text.includes(guardrail));
  for (const guardrail of missingGuardrails) {
    findings.push({
      category: "missing_guardrail",
      severity: "review",
      message: `Missing required guardrail: ${guardrail}`
    });
  }

  const blocked = findings.some((finding) => finding.severity === "block");
  const needsReview = findings.some((finding) => finding.severity === "review");

  return {
    approved: !blocked && !needsReview,
    status: blocked ? "blocked" : needsReview ? "needs_review" : "approved",
    findings,
    checklist: [
      { item: "Original MBTI archetype, not a copied internet mascot", passed: !hasCategory(findings, "copyright_or_brand_character") },
      { item: "No public figure, deepfake, or photorealistic impersonation request", passed: !hasCategory(findings, "public_figure_or_impersonation") },
      { item: "No sexual, violent, hateful, political, or official-document content", passed: !hasCriticalSafetyFinding(findings) },
      { item: "Required safety guardrails are present in the prompt", passed: missingGuardrails.length === 0 }
    ]
  };
}

function stripNegativeGuardrails(text) {
  return String(text || "")
    .replace(/\bDo not\b[^.]*\./gi, "")
    .replace(/\bAvoid\b[^.]*\./gi, "")
    .replace(/\brather than\b[^.]*\./gi, "");
}

function assertPromptApproved(prompt) {
  const audit = auditPrompt(prompt);
  if (!audit.approved) {
    const error = new Error("Generated prompt did not pass safety audit.");
    error.status = 400;
    error.publicMessage = "生成提示词未通过安全审核，请换一种更中性的风格后重试。";
    error.audit = audit;
    throw error;
  }
  return audit;
}

function hasCategory(findings, category) {
  return findings.some((finding) => finding.category === category);
}

function hasCriticalSafetyFinding(findings) {
  const critical = new Set([
    "identity_document",
    "sexual_content",
    "violence_or_gore",
    "hate_or_extremism",
    "political_endorsement"
  ]);
  return findings.some((finding) => critical.has(finding.category));
}

module.exports = {
  auditPrompt,
  assertPromptApproved
};
