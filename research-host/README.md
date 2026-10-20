# Staging research hosting

This Worker is staging-only. `ResearchContainer` runs the existing Python engine;
`ResearchState` owns transactional SQLite job state, leases, provider receipts,
budget reservations and deletion tombstones. The container never falls back to
local storage when remote configuration is present. Existing app briefs remain
in staging D1. No Alpha corpus binding or production resources are introduced.

Required Worker secrets: `RESEARCH_RUNNER_TOKEN`, `RESEARCH_STATE_TOKEN`,
`RESEARCH_STATE_URL`, `TREG_TOKEN`, `OPENROUTER_API_KEY`.
Research uses GLM 5.3 directly through OpenRouter. Before deploying this version,
configure the OpenRouter secret on this Worker; an Edge-only secret is not inherited.
Existing OmniRoute secrets are not forwarded to the container.
The state URL is this Worker's HTTPS URL followed by `/state`. Use distinct random
runner/state tokens; the Edge only gets the runner token and base URL. Never put
provider credentials into the frontend or image.

The authenticated `/state` endpoint accepts only named store operations. Every
operation is one synchronous SQLite transaction. A 120-second expiring lease
fences restarted workers. A one-minute scheduled check wakes the singleton
container only when queued/running research exists. Idle containers sleep after
five minutes. Completed or cancelled jobs are not rerun. Unknown provider costs
retain reservations; attempts remain bounded after an interrupted provider call.

`npm ci`, `npm test`, `npm run typecheck`, then `npm run deploy`. The deployment
configuration pins a tested image in the Cloudflare managed registry. To update
Python code, build `research/Dockerfile` with `research/` as context, test its
imports, push with `wrangler containers push`, and update the image digest before
committing the deployment candidate. Docker must be running for image updates. Configure secrets with Wrangler's protected stdin/file mechanisms. No
local `.env`, SQLite database, or research state enters the Docker context.

Container restarts preserve Durable Object data. Rolling back code does not roll
back storage. Do not delete either Durable Object namespace to roll back a deploy.
Existing laptop-run jobs are not migrated into the remote queue; saved D1 reports
remain readable. A fresh run uses the hosted runner.

Research V2 adds guest/company/industry input, six-channel coverage, model
metadata and safe failure details to job/result JSON. It does not add tables.
The existing `save`/`get` Durable Object operations preserve these fields.
Old runner images cannot accept V2 inputs: deploy compatible Edge readers, the
tested new image, then the V2 form. Keep the prior image digest and recorded
Worker versions for rollback; disable new V2 submissions before rolling back
to an old image. Do not claim V2 is hosted until its image is actually deployed.

The first staging image used the same hash-locked dependencies assembled offline
with `uv pip install --python <Python-3.13> --target <dependency-directory>
--offline --require-hashes -r research/requirements.lock`. The temporary build
recipe replaced only the dependency-install step with a copy of that verified
directory into the Python 3.13 site-packages directory; repository source and
image entrypoint were unchanged. No existing virtualenv or private state was copied.
