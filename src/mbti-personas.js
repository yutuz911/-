const MBTI_PERSONAS = {
  INTJ: {
    title: "Strategic Architect",
    palette: "charcoal, silver, deep teal",
    symbols: "blueprints, constellations, crystalline geometry",
    temperament: "quiet, precise, future-focused, self-contained",
    wardrobe: "structured modern coat, minimal accessories"
  },
  INTP: {
    title: "Curious Inventor",
    palette: "ink blue, soft gray, electric cyan",
    symbols: "floating notes, puzzles, speculative diagrams",
    temperament: "analytical, playful, abstract, observant",
    wardrobe: "relaxed layered jacket, practical details"
  },
  ENTJ: {
    title: "Commanding Strategist",
    palette: "black, ivory, decisive crimson",
    symbols: "banners, city skylines, tactical light grids",
    temperament: "confident, organized, ambitious, direct",
    wardrobe: "sharp blazer, bold silhouette"
  },
  ENTP: {
    title: "Spark Catalyst",
    palette: "violet, brass, bright aqua",
    symbols: "sparks, debate cards, kinetic inventions",
    temperament: "witty, experimental, persuasive, restless",
    wardrobe: "expressive jacket, asymmetrical accents"
  },
  INFJ: {
    title: "Insightful Guide",
    palette: "midnight green, pearl, muted gold",
    symbols: "lanterns, forests, layered mandalas",
    temperament: "empathetic, mysterious, principled, visionary",
    wardrobe: "soft cloak-like layers, elegant natural textures"
  },
  INFP: {
    title: "Dream Weaver",
    palette: "rose, moss, twilight blue",
    symbols: "paper moons, wildflowers, handwritten stories",
    temperament: "gentle, imaginative, idealistic, emotionally rich",
    wardrobe: "flowing cardigan, handmade accents"
  },
  ENFJ: {
    title: "Radiant Mentor",
    palette: "sunlit coral, warm white, olive",
    symbols: "stage lights, open hands, blooming arcs",
    temperament: "charismatic, supportive, expressive, purposeful",
    wardrobe: "polished warm-toned outfit, graceful lines"
  },
  ENFP: {
    title: "Wonder Herald",
    palette: "turquoise, mango, cloud white",
    symbols: "confetti trails, maps, bright portals",
    temperament: "enthusiastic, warm, spontaneous, possibility-seeking",
    wardrobe: "colorful layered outfit, lively accessories"
  },
  ISTJ: {
    title: "Steady Keeper",
    palette: "navy, slate, antique brass",
    symbols: "archives, clocks, orderly stone paths",
    temperament: "reliable, composed, detail-minded, grounded",
    wardrobe: "classic coat, neat functional tailoring"
  },
  ISFJ: {
    title: "Gentle Guardian",
    palette: "sage, cream, soft copper",
    symbols: "hearth light, pressed flowers, protective circles",
    temperament: "nurturing, attentive, loyal, calm",
    wardrobe: "soft knit layers, timeless gentle styling"
  },
  ESTJ: {
    title: "Civic Captain",
    palette: "royal blue, white, steel",
    symbols: "columns, checklists, signal flags",
    temperament: "practical, decisive, orderly, responsible",
    wardrobe: "clean formal jacket, authoritative posture"
  },
  ESFJ: {
    title: "Community Host",
    palette: "peach, emerald, polished gold",
    symbols: "gathering tables, ribbons, warm lights",
    temperament: "sociable, caring, organized, expressive",
    wardrobe: "welcoming refined outfit, soft polished details"
  },
  ISTP: {
    title: "Quiet Tactician",
    palette: "graphite, olive, signal orange",
    symbols: "tools, motion trails, mechanical fragments",
    temperament: "cool, capable, independent, hands-on",
    wardrobe: "utility jacket, compact technical gear"
  },
  ISFP: {
    title: "Aesthetic Wanderer",
    palette: "lavender, clay, leaf green",
    symbols: "brush strokes, trails, small glowing charms",
    temperament: "sensitive, artistic, present, understated",
    wardrobe: "casual artful layers, tactile fabrics"
  },
  ESTP: {
    title: "Momentum Ace",
    palette: "red, carbon black, chrome",
    symbols: "speed lines, spotlights, street energy",
    temperament: "bold, energetic, adaptable, action-first",
    wardrobe: "sporty jacket, dynamic stance"
  },
  ESFP: {
    title: "Joy Performer",
    palette: "hot pink, lemon, sky blue",
    symbols: "music pulses, stage sparkle, festival ribbons",
    temperament: "vivacious, friendly, expressive, sensory",
    wardrobe: "playful standout outfit, celebratory accents"
  }
};

function normalizeMbti(value) {
  const mbti = String(value || "").trim().toUpperCase();
  return Object.prototype.hasOwnProperty.call(MBTI_PERSONAS, mbti) ? mbti : null;
}

function sanitizeDesignerName(value) {
  const cleaned = String(value || "设计人：王星")
    .replace(/[^\u4e00-\u9fa5a-zA-Z0-9 _\-:：]/g, "")
    .trim()
    .slice(0, 18);
  return cleaned || "设计人：王星";
}

function buildImagePrompt({ mbti, style = "lowpoly", aspectRatio = "1:1", designerName = "设计人：王星" }) {
  const persona = MBTI_PERSONAS[mbti];
  const styleGuide = {
    lowpoly: "Gen Z low-poly geometric cartoon poster, faceted polygon shapes, bold clean outlines, bright color-blocking, playful collectible character design, modern Chinese social-media avatar aesthetic",
    storybook: "premium storybook illustration, polished character design, soft cinematic lighting",
    anime: "original anime-inspired illustration, clean linework, expressive but respectful likeness",
    editorial: "stylized editorial portrait, tasteful graphic composition, high-end magazine finish",
    sticker: "cute collectible avatar sticker, crisp outline, lively pose, simple readable background"
  }[style] || "Gen Z low-poly geometric cartoon poster, faceted polygon shapes, bold clean outlines";
  const safeDesignerName = sanitizeDesignerName(designerName);

  return [
    "Create an original personalized illustrated portrait based on the uploaded person's facial identity.",
    `MBTI type: ${mbti}. Persona archetype: ${persona.title}.`,
    `Mood and identity: ${persona.temperament}.`,
    `Visual palette: ${persona.palette}.`,
    `Symbolic environment: ${persona.symbols}.`,
    `Wardrobe direction: ${persona.wardrobe}.`,
    `Style: ${styleGuide}.`,
    `Composition: ${aspectRatio} main poster image, face clearly visible, youthful, playful, clean, respectful and flattering.`,
    `Typography layout: include a bold MBTI label "${mbti}". Leave clean space in the lower-right corner for a tiny designer credit "${safeDesignerName}". Keep typography minimal, clean, and trendy.`,
    "Use the uploaded reference only as broad inspiration for geometric low-poly character energy and MBTI atlas layout; create a new original design with new props, pose, clothing, and composition.",
    "Do not copy existing copyrighted MBTI mascot artwork, anime characters, brand characters, logos, watermarks, or internet reference images.",
    "Do not sexualize the person, alter age deceptively, create nudity, gore, hate symbols, political endorsement, or identity documents.",
    "Keep the output fictional, decorative, and clearly stylized rather than photorealistic impersonation."
  ].join(" ");
}

module.exports = {
  MBTI_PERSONAS,
  normalizeMbti,
  sanitizeDesignerName,
  buildImagePrompt
};
