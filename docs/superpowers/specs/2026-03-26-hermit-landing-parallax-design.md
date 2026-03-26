# Hermit Landing Page Inkdrop-Inspired Hero Redesign

## Goal

Redesign the public Hermit landing page around an Inkdrop-style hero image treatment using the supplied Hermit dashboard screenshot as the centerpiece. The page should shift from the current dark, synthetic product-marketing layout to a lighter, calmer, product-first presentation that feels premium and credible.

The hero must place the real Hermit UI at the center of the page and make it react to pointer movement with a restrained low-angle parallax tilt. The sections below the hero should also be restyled so the page reads as one cohesive system rather than a new hero dropped into an old landing page.

## Scope

In scope:
- Replace the current hero composition with a centered, Inkdrop-inspired layout.
- Use the supplied Hermit dashboard screenshot as the dominant hero image.
- Add a low-angle mouse-reactive parallax tilt to the hero screenshot.
- Restyle the surrounding landing page sections so they visually align with the new hero.
- Update copy hierarchy, spacing, surfaces, and section rhythm as needed to support the new direction.

Out of scope:
- Backend or API work.
- Dashboard application UI changes.
- Creating new marketing sections unrelated to the current landing page structure.
- Heavy 3D or scroll-driven animation systems.

## Approved Direction

The approved direction is:
- Follow Inkdrop's hero structure closely.
- Keep the screenshot interaction restrained and premium.
- Use low-angle parallax tilt on hover rather than dramatic 3D motion.
- Restyle the surrounding landing page to match the hero rather than leaving the old visual system in place.

This is a direct product-first redesign, not a loose inspiration pass.

## Product Intent

The landing page should communicate four things immediately:

1. Hermit is a real, usable product with a credible interface.
2. Hermit is built for security-sensitive secret operations, not generic team productivity.
3. The product experience is calm, deliberate, and trustworthy.
4. Motion is present to reinforce quality and depth, not to compete for attention.

The real screenshot is the primary proof point. It should carry most of the visual weight in the hero.

## Visual Direction

The page should move to a light editorial product-marketing style inspired by Inkdrop's homepage structure, adapted for Hermit.

Visual principles:
- Warm light background rather than deep black.
- Subtle beige, bone, and quiet stone tones instead of high-contrast neon or saturated gradients.
- Thin borders, soft shadows, and restrained layering.
- Spacious layout with a clear center axis.
- Strong headline typography with quiet supporting text.
- Product-first composition where the Hermit screenshot is the hero object.

The target feeling is premium software confidence. It should feel composed and expensive, not flashy, futuristic, or overly engineered.

## Page Structure

### Header

The header should be simplified and visually integrated with the lighter landing page direction:
- Hermit logo and brand at left.
- Minimal navigation links.
- Primary CTA on the right.
- Clean light surface treatment with subtle border or transparency only if needed.

The header should support the hero, not dominate it.

### Hero

The hero should follow Inkdrop's general structure:
- Compact eyebrow or trust signal above the headline.
- Large centered headline.
- Concise product-focused supporting paragraph.
- Clear primary CTA and optional secondary CTA.
- Large centered Hermit screenshot beneath the copy as the dominant visual.

The hero should feel vertically generous and calm. The screenshot should be large enough to immediately read as real product evidence.

### Supporting Sections

The sections below the hero should be visually rebuilt to match the lighter product-first language:
- More editorial spacing and rhythm.
- Fewer dark heavy containers.
- Cleaner cards and quieter separators.
- Product and security messaging rewritten to feel calm and precise.

Existing conceptual sections such as features, workflow, and security can remain, but their styling should be re-authored to fit the new system.

## Hero Screenshot Treatment

The Hermit screenshot should be presented as a premium product frame:
- Large centered image with controlled max width.
- Rounded container or application-window framing if that improves presentation.
- Soft ambient shadow to create lift from the background.
- Clean crop that preserves the dashboard's credibility and legibility.

The screenshot should not be overdecorated. Any framing device must stay subordinate to the product UI.

## Motion Design

### Primary Motion

The main interactive effect is a low-angle mouse-reactive parallax tilt on the hero screenshot:
- Small rotation on both X and Y axes based on pointer position.
- Motion range should stay restrained.
- Slight shadow drift and highlight response may accompany the tilt.
- The screenshot should smoothly ease back to neutral on pointer leave.

This should read as depth and polish, not as a demo gimmick.

### Motion Constraints

- No aggressive 3D transforms.
- No large zoom pulses or dramatic perspective swings.
- No scroll-pinned hero choreography.
- Motion should degrade gracefully when pointer interaction is unavailable.

### Reduced Motion

For reduced-motion environments:
- Disable the tilt effect.
- Preserve the same layout and visual hierarchy.
- Keep the hero complete and credible without animation.

## Responsive Behavior

The redesign must work across desktop and mobile:
- Desktop gets the full screenshot scale and hover interaction.
- Tablet keeps the same composition with reduced visual density where needed.
- Mobile keeps the centered structure but removes or minimizes pointer-based motion.

The screenshot should remain legible and should not be cropped in a way that destroys the usefulness of the visual proof.

## Copy Direction

Copy should shift from feature-heavy platform language to calmer product storytelling:
- Lead with clarity and trust.
- Emphasize secret operations, access control, auditability, and real product usability.
- Keep supporting text concise.
- Avoid dense buzzword stacking.

The screenshot already proves product breadth. Copy should frame that proof rather than redundantly listing every subsystem.

## Implementation Shape

Primary implementation target:
- `apps/web/src/components/landing-page.tsx`

Potential supporting files:
- `apps/web/src/app/globals.css` if shared global styling needs adjustment.
- Assets in `apps/web/public/landing/` for the hero screenshot.

Expected implementation work:
- Rebuild the hero markup around the new centered screenshot composition.
- Replace the current synthetic hero preview cards.
- Introduce client-side pointer tracking for low-angle tilt.
- Rework section surfaces, spacing, and typography to fit the lighter system.
- Keep the page understandable without splitting the landing page into unnecessary complexity.

## Technical Notes

- Keep tilt logic isolated and easy to reason about.
- Clamp pointer-driven transforms so the effect stays subtle.
- Respect reduced-motion preferences in code, not just in design intent.
- Avoid unnecessary libraries if the interaction can be implemented cleanly in the existing stack.
- Maintain accessibility and CTA usability regardless of motion state.

## Testing and Verification

Verification should include:
- Manual review at desktop, tablet, and mobile widths.
- Check that the screenshot tilt feels subtle and smooth.
- Confirm the screenshot returns cleanly to neutral on pointer leave.
- Validate reduced-motion behavior.
- Confirm the lighter hero and the sections below it feel visually consistent.
- Confirm no obvious regressions in navigation and CTA behavior.

## Risks and Mitigations

### Risk: The page feels too derivative of Inkdrop

Mitigation:
- Follow the composition closely, but use Hermit's own copy, screenshot, tones, and trust language.
- Keep the product and security posture specific to Hermit.

### Risk: The tilt interaction feels gimmicky

Mitigation:
- Use a very low transform range.
- Prioritize smooth easing over visible motion.
- Keep the screenshot readable at all times.

### Risk: The hero and lower sections feel disconnected

Mitigation:
- Restyle the full landing page around the hero's lighter visual system.
- Reuse the same background palette, border treatment, spacing logic, and tone of copy below the fold.

## Success Criteria

The redesign is successful if:
- The landing page clearly resembles the product-first clarity of Inkdrop's hero treatment.
- The Hermit screenshot becomes the unquestioned focal point of the page.
- The hover interaction adds polish without drawing attention away from the product UI.
- The lower landing page sections feel like a continuation of the hero rather than a separate design.
- Hermit feels more premium, credible, and product-real than the current implementation.
