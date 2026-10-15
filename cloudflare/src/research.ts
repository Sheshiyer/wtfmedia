import type { DB } from './db.ts';
import { boundedText, bounded, sectionsValid, validatedResult, ResearchError, tiers, type ResearchDocument } from './research-contract.ts';
import { researchAvailable, researchRunner, deleteResearchRun, type ResearchRunnerEnv } from './research-runner.ts';
type Env = ResearchRunnerEnv & {
    DB: DB;
};
type Row = {
    id: string;
    member_id: number;
    revision: number;
    current_run_id: string | null;
    document_json: string;
    updated_at: string;
};
const reply = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'cache-control': 'private, no-store', 'x-content-type-options': 'nosniff' } });
const active = (s: string) => s === 'queued' || s === 'running' || s === 'cancel_pending';
const validId = (s: string) => /^rbrief_[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(s);
const view = (d: ResearchDocument, owner: boolean) => ({ ...d, notes: owner ? d.notes : '', notesApproved: owner ? d.notesApproved : false, messages: owner ? d.messages : [], canEdit: owner });
export async function handleResearch(request: Request, env: Env, memberId: number, deps: {
    fetchRunner?: typeof fetch;
} = {}): Promise<Response> {
    const db = env.DB;
    const path = new URL(request.url).pathname.replace(/\/$/, '').split('/').slice(4);
    const [id, action, version] = path;
    const method = request.method;
    const runner = (p: string, m = 'GET', b?: unknown) => researchRunner(env, p, m, b, deps.fetchRunner);
    const load = () => db.prepare('SELECT * FROM research_briefs WHERE id = ?').bind(id).first<Row>();
    async function save(row: Row, doc: ResearchDocument, runId = row.current_run_id, payload?: unknown) {
        doc = { ...doc, revision: row.revision + 1, updatedAt: new Date().toISOString() };
        const json = JSON.stringify(doc);
        if (new TextEncoder().encode(json).length > 1800000)
            throw new ResearchError(413, 'research_too_large');
        const statements = [db.prepare('UPDATE research_briefs SET revision = ?, document_json = ?, updated_at = ?, current_run_id = ? WHERE id = ? AND member_id = ? AND revision = ?').bind(doc.revision, json, doc.updatedAt, runId, row.id, memberId, row.revision), db.prepare('INSERT INTO research_versions(brief_id,revision,document_json,created_at) SELECT id,revision,document_json,updated_at FROM research_briefs WHERE id = ? AND revision = ? AND document_json = ? ON CONFLICT DO NOTHING').bind(row.id, doc.revision, json)];
        if (payload)
            statements.push(db.prepare('INSERT INTO research_runs(run_id,brief_id,payload_json) SELECT ?,id,? FROM research_briefs WHERE id = ? AND current_run_id = ? AND document_json = ? ON CONFLICT DO NOTHING').bind(runId, JSON.stringify(payload), row.id, runId, json));
        const results = await db.batch(statements);
        if (!results[0].meta?.changes)
            throw new ResearchError(409, 'research_conflict');
        return doc;
    }
    async function submit(runId: string) {
        const run = await db.prepare('SELECT payload_json,submitted FROM research_runs WHERE run_id = ?')
            .bind(runId).first<{
            payload_json: string;
            submitted: number;
        }>();
        if (!run)
            throw new ResearchError(409, 'research_conflict');
        if (run.submitted)
            return;
        const submitted = await runner('/jobs', 'POST', JSON.parse(run.payload_json));
        if (submitted.id !== runId || !['queued', 'running', 'completed', 'partial', 'failed', 'cancelled', 'clarification'].includes(submitted.status)) {
            throw new ResearchError(502, 'invalid_research_result');
        }
        await db.prepare('UPDATE research_runs SET submitted = 1 WHERE run_id = ?').bind(runId).run();
    }
    async function finishCancellation(row: Row, doc: ResearchDocument) {
        if (!row.current_run_id) return save(row, {...doc, status:'cancelled'});
        const runId = row.current_run_id;
        const acknowledgement = await runner('/jobs/' + runId + '/cancel', 'POST', {});
        if (acknowledgement.id !== runId || !['cancelled','completed','partial','failed','clarification'].includes(acknowledgement.status)) {
            throw new ResearchError(503,'research_cancel_pending');
        }
        let produced: Partial<ResearchDocument> = {};
        let cost = {...doc.cost,modelUsd:null as number|null};
        let warnings = ['Cancellation confirmed; the final cost receipt is unavailable.'];
        try {
            const result = validatedResult(await runner('/jobs/' + runId),runId);
            if (result.cost && !active(result.status!)) {
                cost = {toolMicro:doc.cost.toolMicro+result.cost.toolMicro,modelUsd:doc.cost.modelUsd===null||result.cost.modelUsd===null?null:doc.cost.modelUsd+result.cost.modelUsd};
                warnings = result.warnings ?? [];
                produced = {sections:result.sections,sources:result.sources,progress:result.progress,clarification:result.clarification};
            }
        } catch {}
        return save(row,{...doc,...produced,status:'cancelled',cost,warnings},null);
    }
    async function start(row: Row, doc: ResearchDocument, input: Record<string, any>, ready = false) {
        if (active(doc.status))
            throw new ResearchError(409, 'research_running');
        if (!ready && !await researchAvailable(env, deps.fetchRunner))
            throw new ResearchError(503, 'research_not_configured');
        if (input.section !== undefined && !tiers.includes(input.section))
            throw new ResearchError(400, 'invalid_request');
        if (input.clarification !== undefined && !bounded(input.clarification, 2000))
            throw new ResearchError(400, 'invalid_request');
        let section = input.section ?? null;
        if (input.clarification && input.section === undefined && doc.status === 'clarification' && row.current_run_id) {
            const previous = await db.prepare('SELECT payload_json FROM research_runs WHERE run_id = ? AND brief_id = ?').bind(row.current_run_id,row.id).first<{payload_json:string}>();
            const priorSection = previous ? JSON.parse(previous.payload_json).section : null;
            if (tiers.includes(priorSection)) section = priorSection;
        }
        const runId = 'rrun_' + crypto.randomUUID();
        const payload = { id: runId, title: doc.title, notes: doc.notes, notesApproved: doc.notesApproved, section, clarification: input.clarification ?? null, sections: section ? doc.sections : [], sources: section ? doc.sources.filter(s => s.kind !== 'alpha_reference').slice(0, 80) : [], budgetMicro: 5000000 };
        const saved = await save(row, { ...doc, status: 'queued', progress: [], warnings: [], clarification: null }, runId, payload);
        // Submission is retried from the identical durable payload on the next poll.
        try {
            await submit(runId);
        }
        catch (error) {
            if (error instanceof ResearchError && error.status === 502) {
                const current = await db.prepare('SELECT * FROM research_briefs WHERE id = ?').bind(row.id).first<Row>();
                if (current && current.revision === saved.revision)
                    await save(current, { ...saved, status: 'failed', warnings: ['Research runner rejected the job. Please retry after configuration is checked.'] });
                throw error;
            }
        }
        return saved;
    }
    try {
        if (path.length > 3 || id && !validId(id))
            return reply({ error: 'not_found' }, 404);
        let input: Record<string, any> = {};
        if (['POST', 'PATCH'].includes(method)) {
            const raw = await boundedText(request, method === 'PATCH' ? 500000 : 150000, 413);
            try {
                input = JSON.parse(raw);
            }
            catch {
                throw new ResearchError(400, 'invalid_request');
            }
            if (!input || Array.isArray(input) || typeof input !== 'object')
                throw new ResearchError(400, 'invalid_request');
        }
        if (!id) {
            if (method === 'GET') {
                const rows = await db.prepare("SELECT id, json_extract(document_json,'$.title') AS title, json_extract(document_json,'$.status') AS status, updated_at AS updatedAt, revision, json_extract(document_json,'$.shared') AS shared, member_id = ? AS canEdit FROM research_briefs WHERE member_id = ? OR json_extract(document_json,'$.shared') = 1 ORDER BY updated_at DESC LIMIT 100").bind(memberId, memberId).all<{
                    shared: number;
                    canEdit: number;
                }>();
                return reply({ configured: await researchAvailable(env, deps.fetchRunner), briefs: rows.results.map(r => ({ ...r, shared: !!r.shared, canEdit: !!r.canEdit })) });
            }
            if (method !== 'POST')
                return reply({ error: 'not_found' }, 404);
            validateEdit(input, true);
            if (!await researchAvailable(env, deps.fetchRunner))
                throw new ResearchError(503, 'research_not_configured');
            const now = new Date().toISOString();
            const doc: ResearchDocument = { id: 'rbrief_' + crypto.randomUUID(), title: input.title.trim(), notes: input.notes ?? '', notesApproved: input.notesApproved === true, episodeId: input.episodeId ?? null, shared: false, status: 'draft', revision: 1, updatedAt: now, sections: [], sources: [], messages: [], progress: [], warnings: [], clarification: null, cost: { toolMicro: 0, modelUsd: 0 } };
            const json = JSON.stringify(doc);
            await db.batch([db.prepare('INSERT INTO research_briefs(id,member_id,revision,document_json,updated_at) VALUES (?,?,1,?,?)').bind(doc.id, memberId, json, now), db.prepare('INSERT INTO research_versions(brief_id,revision,document_json,created_at) VALUES (?,1,?,?)').bind(doc.id, json, now)]);
            try {
                return reply({ brief: view(await start({ id: doc.id, member_id: memberId, revision: 1, current_run_id: null, document_json: json, updated_at: now }, doc, {}, true), true) }, 201);
            } catch (error) {
                if (error instanceof Error && error.message.includes('research_active_limit')) {
                    await db.prepare('DELETE FROM research_briefs WHERE id = ? AND member_id = ? AND revision = 1 AND current_run_id IS NULL').bind(doc.id,memberId).run();
                }
                throw error;
            }
        }
        let row = await load();
        if (!row)
            throw new ResearchError(404, 'not_found');
        let doc = JSON.parse(row.document_json) as ResearchDocument;
        const owner = row.member_id === memberId;
        if (!owner && (!doc.shared || method !== 'GET' || !!action))
            throw new ResearchError(404, 'not_found');
        if (owner && doc.status === 'cancel_pending' && ((method === 'GET' && !action) || (method === 'POST' && action === 'run'))) {
            const expectedRevision = row.revision;
            if (method === 'POST' && input.revision !== expectedRevision) throw new ResearchError(409,'research_conflict');
            try { doc = await finishCancellation(row,doc); row = (await load())!; }
            catch { if (method === 'POST') throw new ResearchError(503,'research_cancel_pending'); }
            if (method === 'POST') input.revision = doc.revision;
        }
        if (doc.status === 'cancel_pending' && method !== 'GET' && method !== 'DELETE' && action !== 'cancel') throw new ResearchError(503,'research_cancel_pending');
        if (doc.status === 'deleting' && !['GET', 'DELETE'].includes(method))
            throw new ResearchError(409, 'research_deletion_pending');
        if (method === 'GET' && action === 'versions' && /^\d+$/.test(version ?? '')) {
            const v = await db.prepare('SELECT document_json FROM research_versions WHERE brief_id = ? AND revision = ?').bind(id, Number(version)).first<{
                document_json: string;
            }>();
            if (!v)
                throw new ResearchError(404, 'not_found');
            return reply({ brief: view(JSON.parse(v.document_json), true) });
        }
        if (method === 'GET' && !action) {
            if (owner && active(doc.status) && doc.status !== 'cancel_pending' && row.current_run_id) {
                const runId = row.current_run_id;
                try {
                try {
                    await submit(runId);
                }
                catch (error) {
                    if (error instanceof ResearchError && error.status === 502)
                        await save(row, { ...doc, status: 'failed', warnings: ['Research runner rejected the saved job.'] });
                    throw error;
                }
                const result = validatedResult(await runner('/jobs/' + runId), runId);
                try {
                    if (!active(result.status!)) {
                        doc = await save(row, { ...doc, ...result, cost: { toolMicro: doc.cost.toolMicro + result.cost!.toolMicro, modelUsd: doc.cost.modelUsd === null || result.cost!.modelUsd === null ? null : doc.cost.modelUsd + result.cost!.modelUsd } });
                    }
                    else {
                        const next = { ...doc, ...result };
                        const json = JSON.stringify(next);
                        await db.prepare('UPDATE research_briefs SET document_json = ? WHERE id = ? AND revision = ? AND current_run_id = ?').bind(json, id, row.revision, runId).run();
                        const fresh = await load();
                        if (!fresh)
                            throw new ResearchError(404, 'not_found');
                        doc = JSON.parse(fresh.document_json);
                    }
                }
                catch (e) {
                    if (!(e instanceof ResearchError && e.status === 409))
                        throw e;
                    const fresh = await load();
                    if (!fresh)
                        throw new ResearchError(404, 'not_found');
                    doc = JSON.parse(fresh.document_json);
                }
                } catch (error) {
                    if (!(error instanceof ResearchError && error.status === 503)) throw error;
                    const fresh = await load();
                    if (!fresh) throw new ResearchError(404,'not_found');
                    doc = JSON.parse(fresh.document_json);
                    doc = {...doc,warnings:[...doc.warnings,'The research runner is temporarily unavailable. Showing the last saved brief.']};
                }
            }
            const versions = owner ? (await db.prepare(`SELECT revision,created_at AS createdAt FROM research_versions WHERE brief_id = ?
              AND json_extract(document_json,'$.status') IN ('completed','partial')
              AND EXISTS (SELECT 1 FROM json_each(document_json,'$.sections')
                WHERE length(trim(json_extract(value,'$.content'))) > 0)
              ORDER BY revision DESC`).bind(id).all()).results : [];
            return reply({ brief: view(doc, owner), versions });
        }
        if (method === 'DELETE' && !action) {
            // Invalidate in-flight poll/chat responses before erasing remote copies.
            doc = await save(row, { ...doc, status: 'deleting', shared: false });
            row = (await load())!;
            const runs = await db.prepare('SELECT run_id FROM research_runs WHERE brief_id = ?').bind(id).all<{
                run_id: string;
            }>();
            for (const run of runs.results)
                await deleteResearchRun(env, run.run_id, deps.fetchRunner);
            const deleted = await db.prepare('DELETE FROM research_briefs WHERE id = ? AND member_id = ? AND revision = ?').bind(id, memberId, row.revision).run();
            if (!deleted.meta?.changes)
                throw new ResearchError(409, 'research_conflict');
            return reply({ deleted: true });
        }
        if (method === 'POST' && action === 'cancel' && !version) {
            if (!active(doc.status)) return reply({brief:view(doc,true)});
            if (doc.status !== 'cancel_pending') {
                doc = await save(row,{...doc,status:'cancel_pending',warnings:['Cancellation is pending. The remote job may still be running.']});
                row = (await load())!;
            }
            try { doc = await finishCancellation(row,doc); }
            catch { throw new ResearchError(503,'research_cancel_pending'); }
            return reply({ brief: view(doc, true) });
        }
        if (method === 'POST' && action === 'chat' && !version) {
            if (!bounded(input.question, 2000) || !input.question.trim())
                throw new ResearchError(400, 'invalid_request');
            if (active(doc.status) || !doc.sections.length)
                throw new ResearchError(409, 'research_not_ready');
            if (doc.messages.length >= 100)
                throw new ResearchError(409, 'research_chat_limit');
            const result = await runner('/chat', 'POST', { question: input.question, messages: doc.messages.slice(-12).map(m => ({ role: m.role, content: m.content.slice(0, 6000) })), sections: doc.sections, sources: doc.sources, notes: doc.notes, notesApproved: doc.notesApproved });
            if (!bounded(result.answer, 30000) || !result.answer.trim() || !result.cost || !Number.isSafeInteger(result.cost.toolMicro) || result.cost.toolMicro < 0 || !(result.cost.modelUsd === null || Number.isFinite(result.cost.modelUsd) && result.cost.modelUsd >= 0))
                throw new ResearchError(502, 'invalid_research_result');
            doc = await save(row, { ...doc, messages: [...doc.messages, { role: 'user', content: input.question }, { role: 'assistant', content: result.answer }], cost: { toolMicro: doc.cost.toolMicro + result.cost.toolMicro, modelUsd: doc.cost.modelUsd === null || result.cost.modelUsd === null ? null : doc.cost.modelUsd + result.cost.modelUsd } });
            return reply({ brief: view(doc, true) });
        }
        if ((method === 'PATCH' && !action) || (method === 'POST' && ['run', 'restore'].includes(action) && !version)) {
            if (input.revision !== row.revision)
                throw new ResearchError(409, 'research_conflict');
            if (active(doc.status))
                throw new ResearchError(409, 'research_running');
            if (action === 'run')
                return reply({ brief: view(await start(row, doc, input), true) });
            if (action === 'restore') {
                if (!Number.isSafeInteger(input.version))
                    throw new ResearchError(400, 'invalid_request');
                const v = await db.prepare('SELECT document_json FROM research_versions WHERE brief_id = ? AND revision = ?').bind(id, input.version).first<{
                    document_json: string;
                }>();
                if (!v)
                    throw new ResearchError(404, 'not_found');
                doc = { ...JSON.parse(v.document_json), shared: doc.shared, cost: doc.cost, status: 'draft' };
            }
            else {
                validateEdit(input, false);
                doc = { ...doc, ...Object.fromEntries(['title', 'notes', 'notesApproved', 'episodeId', 'shared', 'sections'].filter(k => input[k] !== undefined).map(k => [k, input[k]])) };
                if (doc.notes && !doc.notesApproved)
                    throw new ResearchError(400, 'notes_consent_required');
            }
            return reply({ brief: view(await save(row, doc, null), true) });
        }
        return reply({ error: 'not_found' }, 404);
    }
    catch (e) {
        if (e instanceof Error && e.message.includes('research_active_limit')) return reply({error:'research_active_limit'},429);
        return e instanceof ResearchError ? reply({ error: e.code }, e.status) : reply({ error: 'research_unavailable' }, 503);
    }
}
function validateEdit(input: Record<string, any>, create: boolean) {
    if (input.episodeId != null && (typeof input.episodeId !== 'string' || !/^[A-Za-z0-9_-]{11}$/.test(input.episodeId))) throw new ResearchError(400,'invalid_episode_id');
    if ((create || input.title !== undefined) && (!bounded(input.title, 200) || input.title.trim().length < 2) || input.notes !== undefined && !bounded(input.notes, 12000) || input.notesApproved !== undefined && typeof input.notesApproved !== 'boolean' || input.episodeId !== undefined && input.episodeId !== null && (!bounded(input.episodeId, 100) || !input.episodeId.trim()) || input.shared !== undefined && typeof input.shared !== 'boolean' || input.sections !== undefined && !sectionsValid(input.sections))
        throw new ResearchError(400, 'invalid_request');
    if (create && input.notes && input.notesApproved !== true)
        throw new ResearchError(400, 'notes_consent_required');
}
