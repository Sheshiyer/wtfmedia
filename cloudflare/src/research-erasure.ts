import type { DB } from "./db.ts";
import { deleteResearchRun, type ResearchRunnerEnv } from "./research-runner.ts";

/** Retain only job IDs until the private runner confirms removal. */
export async function erasePendingResearchJobs(env: ResearchRunnerEnv & { DB: DB }, email: string, fetchRunner: typeof fetch = fetch): Promise<boolean> {
  const rows = await env.DB.prepare("SELECT j.run_id FROM research_erasure_jobs j JOIN member_users m ON m.id = j.member_id WHERE m.email = ?").bind(email).all<{ run_id: string }>();
  for (const row of rows.results) {
    try {
      await deleteResearchRun(env, row.run_id, fetchRunner);
      await env.DB.prepare("DELETE FROM research_erasure_jobs WHERE run_id = ? AND member_id IN (SELECT id FROM member_users WHERE email = ?)").bind(row.run_id, email).run();
    } catch { return false; }
  }
  return true;
}
