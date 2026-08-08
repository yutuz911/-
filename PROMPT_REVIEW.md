# Prompt Review

## Approved base prompt structure

The system builds prompts from four controlled inputs only:

- MBTI type from a 16-value allowlist.
- Style from a 4-value allowlist.
- Aspect ratio from a 3-value allowlist.
- The uploaded image as the identity reference.

The user cannot directly inject free-form prompt text in the MVP.

## Safety position

The prompt intentionally asks for:

- Original MBTI-inspired archetypes, not internet mascot copies.
- Stylized illustrated portraits, not photorealistic impersonation.
- Clear face visibility, flattering composition, and fictional decorative context.
- No nudity, sexualization, gore, hate symbols, political endorsement, documents, logos, or watermarks.

## Current generated prompt example

```text
Create an original personalized illustrated portrait based on the uploaded person's facial identity. MBTI type: ENFP. Persona archetype: Wonder Herald. Mood and identity: enthusiastic, warm, spontaneous, possibility-seeking. Visual palette: turquoise, mango, cloud white. Symbolic environment: confetti trails, maps, bright portals. Wardrobe direction: colorful layered outfit, lively accessories. Style: premium storybook illustration, polished character design, soft cinematic lighting. Composition: 1:1 avatar-ready portrait, face clearly visible, respectful and flattering. Do not copy existing copyrighted MBTI mascot artwork, anime characters, brand characters, logos, watermarks, or internet reference images. Do not sexualize the person, alter age deceptively, create nudity, gore, hate symbols, political endorsement, or identity documents. Keep the output fictional, decorative, and clearly stylized rather than photorealistic impersonation.
```

## Audit result

This prompt is approved for the MVP because it:

- Uses original archetype language.
- Contains explicit copyright and brand-avoidance language.
- Preserves user likeness only for a stylized avatar.
- Blocks major content safety categories.
- Does not request public figures, official documents, or political persuasion.

## Code enforcement

`src/prompt-audit.js` runs before every image generation. If a future version adds custom user prompt text, that text must pass the same audit before calling the image provider.
