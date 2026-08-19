# Archived: 20-Second Product Promo Walkthrough

> Historical pre-v1.0 plan preserved during the One Brain GSD initialization.
> It is not part of the approved eight-phase roadmap and must not be routed as
> active Phase 1 work.

## Plan

- [ ] Confirm Hyperframes access: Hyperframes is not currently callable or installable in this session.
- [ ] If Hyperframes becomes available, create a new 20-second product promo from the webapp flow and brand assets.
- [ ] If Hyperframes stays unavailable, create a separate local Remotion composition instead of replacing the existing 41-second walkthrough.
- [ ] Retain the webapp/product promise: "the WTF catalogue, made askable, with answers cited to the second."
- [ ] Restructure the timeline to exactly 600 frames at 30 fps:
  - 0-90 frames: hook with wordmark and product promise.
  - 90-210 frames: catalogue/library value with episode cards and transcript jump.
  - 210-360 frames: Ask WTF interaction with typed question, grounded answer, and citation pills.
  - 360-480 frames: connections/crew proof, showing cross-episode themes and agent workflow.
  - 480-600 frames: closing product CTA, "stop scrubbing. start asking."
- [ ] Tighten on-screen copy for promo pacing:
  - Replace long explanatory body text with short captions.
  - Keep only one primary claim per scene.
  - Avoid clipped or small text at 1280x720.
- [ ] Keep the existing `WtfmediaWalkthrough` composition and output intact.
- [ ] Add new output naming:
  - Render target: `video/out/wtfmedia-20s-product-promo.mp4`.
  - Still checks: hook, Ask WTF, outro.
- [ ] Render still frames first and visually inspect them.
- [ ] Render the final MP4.
- [ ] Verify with `ffprobe`: H.264, 1280x720, 30 fps, 600 frames, 20 seconds.
- [ ] Extract exact encoded frames from the MP4 and visually check nonblank output.

## Check-In

Corrected implementation: make a new 20-second promo deliverable and do not replace the existing 41-second walkthrough. Hyperframes is preferred if its plugin tools become available; otherwise the fallback is a new Remotion composition/output alongside the existing one.

## Review

- Pending implementation and verification after check-in.
