# Hermit Landing Page Parallax Redesign

## Goal

Upgrade the public Hermit landing page so it feels premium and product-led, using the two supplied dashboard screenshots as the centerpiece. The hero should behave like an Apple-style parallax sequence: the first screenshot leads, then fades out while the second fades in as the user scrolls. The result should feel polished, restrained, and high-trust rather than flashy or gimmicky.

## Scope

In scope:
- Replace the current synthetic dashboard mockup in the landing-page hero with a real product showcase built from the supplied screenshots.
- Implement a pinned, scroll-driven hero transition where screenshot one hands off to screenshot two.
- Refine surrounding hero styling, spacing, and supporting section presentation so the page feels cohesive and premium.
- Improve supporting hover and motion treatment where appropriate, while keeping scroll motion as the primary interaction.

Out of scope:
- Backend or API changes.
- Dashboard application changes.
- New landing-page sections unrelated to the hero story.
- Marketing copy expansion beyond what is needed to support the redesigned hero.

## Product Intent

The landing page should communicate three things immediately:

1. Hermit is a serious security product, not a generic SaaS shell.
2. The product already exists and looks credible in real use.
3. The experience is carefully designed, with motion serving storytelling rather than decoration.

The screenshots are product evidence, not filler artwork. They should be presented in a way that preserves legibility and makes the transition between overview and secrets management feel intentional.

## Recommended Direction

Use a single pinned hero stage with scroll-linked crossfade and depth motion.

Both screenshots live in the same visual stage. As the user scrolls through the hero:
- Screenshot one starts as the dominant frame.
- Screenshot one subtly scales and drifts back as progress increases.
- Screenshot two fades in, moves forward, and becomes the dominant frame.
- Copy remains stable and readable while the visual stage performs the handoff.

This direction best matches the requested Apple-like parallax behavior while keeping the story concise and premium.

## Page Structure

### Hero

The hero should become a tall, cinematic introduction with enough scroll distance for the image handoff to feel smooth. It should include:
- A compact navigation/header consistent with the current page structure.
- A high-confidence headline and short supporting sentence.
- Primary and secondary CTAs kept visually subordinate to the product imagery.
- A sticky visual stage containing the screenshot transition.

The hero must not feel crowded. Copy should frame the product showcase, not compete with it.

### Supporting Sections

The existing `Features`, `How it works`, and `Security` sections can remain conceptually intact, but should be visually re-tuned to follow the hero:
- More deliberate vertical spacing.
- Reduced “template” feeling from repeated card treatments.
- Better continuity in color, surfaces, and typography.

The lower page should validate what the hero implies, rather than introducing a separate visual language.

## Visual Language

The page should feel expensive, restrained, and product-centric.

Visual principles:
- Dark overall presentation, but not flat black everywhere.
- Warm graphite, soft bone, and muted metallic highlight tones to bridge the light and dark screenshots.
- Sharper typography hierarchy and more disciplined whitespace.
- Fewer obvious decorative textures or busy background effects.
- Motion that feels physically paced and intentional.

The aesthetic target is premium trust, not startup exuberance. Surfaces should feel calm and precise.

## Motion Design

### Primary Motion

The hero transition is the centerpiece:
- The hero visual stage is sticky during a defined scroll range.
- Scroll progress drives opacity, scale, and vertical translation for both screenshots.
- Screenshot one exits gradually rather than disappearing abruptly.
- Screenshot two enters with a subtle forward emphasis.

The effect should read as a controlled product handoff, not a slideshow.

### Secondary Motion

Secondary motion should support polish:
- Buttons and cards may use subtle hover response.
- Entrance reveals may be used sparingly for lower sections.
- Mouse-driven tilt should not be the core hero behavior.

If any motion competes with the hero transition, remove it.

## Interaction Constraints

- The hero must work on desktop and mobile.
- On reduced-motion environments, the page should fall back to a simpler non-distracting presentation.
- Screenshot legibility should be preserved; overlays or treatments must not muddy the product UI.
- Hover should be additive only. The landing page should still feel complete without pointer interaction.

## Implementation Shape

Primary implementation target:
- `apps/web/src/components/landing-page.tsx`

Likely implementation pieces:
- Replace `DashboardMockup` with a real screenshot showcase component.
- Use `motion/react` scroll primitives such as `useScroll` and transform mappings instead of manual mouse-position rotation.
- Add or wire in the screenshot assets for use in the web app.
- Rework hero spacing, background treatment, and section transitions around the new visual centerpiece.

Potential supporting adjustments:
- Minor updates in global styles only if needed for motion utility classes or supporting polish.

## Technical Notes

- Prefer a single source of truth for scroll progress within the hero component.
- Keep the component decomposition clear enough that hero motion logic and supporting page sections remain understandable.
- Avoid overfitting the layout to one viewport size; tune for responsive behavior from the start.
- Preserve accessibility and reasonable performance by avoiding unnecessary layered effects.

## Testing and Verification

Verification should include:
- Manual review at desktop and mobile widths.
- Validation that the scroll handoff feels smooth and does not jitter.
- Check that reduced-motion behavior is acceptable.
- Confirm CTAs and navigation remain usable throughout hero interaction.
- Confirm no visual regressions in supporting sections.

## Risks and Mitigations

### Risk: Motion feels gimmicky

Mitigation:
- Keep transforms subtle.
- Use fewer effects with better timing.
- Prioritize opacity, scale, and position over flashy filters.

### Risk: Screenshots clash visually

Mitigation:
- Build a hero frame and color treatment that intentionally accommodates both screenshots.
- Use spacing, shadow, and backdrop treatment to unify them.

### Risk: Hero overwhelms the rest of the page

Mitigation:
- Keep lower sections quieter and cleaner.
- Let the hero carry the strongest visual statement.

## Success Criteria

The redesign is successful if:
- The landing page immediately feels more premium than the current version.
- The two screenshots become the clear centerpiece of the page.
- The first screenshot visibly hands off to the second during scroll in a smooth, Apple-like way.
- The rest of the page supports the hero without diluting it.
- The landing page feels interactive and polished even without relying on hover tricks.
