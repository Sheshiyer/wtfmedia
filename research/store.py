"""SQLite queue, fenced leases, deletion and pre-call budget reservations."""
import hashlib
import json
import os
import sqlite3
import time
from contextlib import contextmanager
from pathlib import Path
from uuid import uuid4
from .budget import BudgetExceeded, STATE_KEY, PHASE_MAX, PHASES, MODEL_RESERVE, admission_spec


class Conflict(Exception):
    pass


class Gone(Exception):
    pass


class Stopped(Exception):
    pass


class QueueFull(Exception):
    pass


def encode(value):
    return json.dumps(value, sort_keys=True, separators=(',', ':'), ensure_ascii=False)


def digest(value):
    return hashlib.sha256(value.encode()).hexdigest()


class Store:
    def __init__(self, path):
        self.path = str(path)
        Path(path).parent.mkdir(parents=True, exist_ok=True, mode=0o700)
        if Path(path).parent.stat().st_mode & 0o077 or Path(path).is_symlink():
            raise ValueError('private state directory required')
        descriptor = os.open(path, os.O_CREAT | os.O_RDWR, 0o600)
        os.close(descriptor)
        os.chmod(path, 0o600)
        with self.db() as db:
            db.executescript('''
                CREATE TABLE IF NOT EXISTS jobs (
                    id TEXT PRIMARY KEY, body_hash TEXT NOT NULL, body TEXT NOT NULL,
                    result TEXT NOT NULL, status TEXT NOT NULL, state TEXT NOT NULL DEFAULT '{}',
                    lease TEXT, expires REAL NOT NULL DEFAULT 0, created REAL NOT NULL,
                    kind TEXT NOT NULL DEFAULT 'research'
                );
                CREATE TABLE IF NOT EXISTS deleted (hash TEXT PRIMARY KEY);
                CREATE TABLE IF NOT EXISTS calls (
                    job TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
                    key TEXT NOT NULL, kind TEXT NOT NULL, reserve INTEGER NOT NULL,
                    billed INTEGER, receipt TEXT, response TEXT, tries INTEGER NOT NULL DEFAULT 0,
                    PRIMARY KEY(job, key)
                );
            ''')
        os.chmod(path, 0o600)

    @contextmanager
    def db(self):
        db = sqlite3.connect(self.path, timeout=20, isolation_level=None)
        db.row_factory = sqlite3.Row
        db.execute('PRAGMA foreign_keys=ON')
        db.execute('PRAGMA secure_delete=ON')
        db.execute('PRAGMA journal_mode=DELETE')
        db.execute('PRAGMA synchronous=FULL')
        try:
            db.execute('BEGIN IMMEDIATE')
            yield db
            db.commit()
        except BudgetExceeded:
            # Admission may persist the global circuit breaker before denying dispatch.
            db.commit()
            raise
        except BaseException:
            db.rollback()
            raise
        finally:
            db.close()

    def submit(self, body, kind='research'):
        body_hash = digest(encode(body))
        job_id = body['id']
        with self.db() as db:
            if db.execute('SELECT 1 FROM deleted WHERE hash=?', (digest(job_id),)).fetchone():
                raise Gone()
            row = db.execute('SELECT * FROM jobs WHERE id=?', (job_id,)).fetchone()
            if row:
                if row['body_hash'] != body_hash:
                    raise Conflict()
                return {'id': job_id, 'status': row['status']}
            if db.execute("SELECT COUNT(*) FROM jobs WHERE status IN ('queued','running')").fetchone()[0] >= 100:
                raise QueueFull()
            sections = body.get('sections', []) if body.get('section') else []
            sections = [s for s in sections if s['key'] != body.get('section')]
            result = dict(id=job_id, status='queued', sections=sections, sources=body.get('sources', []),
                          progress=[], warnings=[], clarification=None)
            db.execute('INSERT INTO jobs(id,body_hash,body,result,status,created,kind) VALUES(?,?,?,?,?,?,?)',
                       (job_id, body_hash, encode(body), encode(result), 'queued', time.time(), kind))
        return {'id': job_id, 'status': 'queued'}

    def get(self, job_id):
        with self.db() as db:
            row = db.execute('SELECT * FROM jobs WHERE id=?', (job_id,)).fetchone()
            if not row:
                return None
            result = json.loads(row['result'])
            result['status'] = row['status']
            result['cost'] = self.cost(db, job_id)
            if db.execute("SELECT 1 FROM calls WHERE job=? AND kind='tool' AND (billed IS NULL OR (?=1 AND tries>1))", (job_id, json.loads(row['body']).get('budgetPolicyVersion') == 1)).fetchone():
                result['warnings'].append('Tool cost includes reserved estimates where receipts unavailable')
            return result

    @staticmethod
    def cost(db, job_id):
        rows = db.execute('SELECT kind,billed,reserve,tries FROM calls WHERE job=?', (job_id,)).fetchall()
        versioned = json.loads(db.execute('SELECT body FROM jobs WHERE id=?', (job_id,)).fetchone()[0]).get('budgetPolicyVersion') == 1
        # Unknown charges keep their full reservation; never report them as free.
        return {'toolMicro': sum(r['billed'] if r['billed'] is not None and (not versioned or r['tries'] <= 1) else max(r['reserve'], r['billed'] or 0)
                                 for r in rows if r['kind'] == 'tool'),
                'modelUsd': None if any(r['kind'] == 'model' and r['billed'] is None for r in rows)
                else sum(r['billed'] or 0 for r in rows if r['kind'] == 'model') / 1000000}

    def cancel(self, job_id):
        with self.db() as db:
            row = db.execute('SELECT status FROM jobs WHERE id=?', (job_id,)).fetchone()
            if not row:
                db.execute('INSERT OR IGNORE INTO deleted VALUES(?)', (digest(job_id),))
                return {'id': job_id, 'status': 'cancelled'}
            status = row['status']
            if status in ('queued', 'running'):
                status = 'cancelled'
                db.execute("UPDATE jobs SET status=?,lease=NULL,expires=0 WHERE id=?", (status, job_id))
            return {'id': job_id, 'status': status}

    def delete(self, job_id):
        with self.db() as db:
            db.execute('INSERT OR IGNORE INTO deleted VALUES(?)', (digest(job_id),))
            db.execute('DELETE FROM jobs WHERE id=?', (job_id,))

    def claim(self, ttl=120):
        now = time.time()
        with self.db() as db:
            db.execute("DELETE FROM jobs WHERE kind='chat' AND created<?", (now - 180,))
            row = db.execute("SELECT * FROM jobs WHERE kind='research' AND (status='queued' OR (status='running' AND expires<?)) ORDER BY created LIMIT 1", (now,)).fetchone()
            if not row:
                return None
            lease = uuid4().hex
            db.execute("UPDATE jobs SET status='running',lease=?,expires=? WHERE id=?", (lease, now + ttl, row['id']))
            return row['id'], lease, json.loads(row['body']), json.loads(row['result']), json.loads(row['state'])

    def claim_id(self, job_id):
        with self.db() as db:
            row = db.execute("SELECT * FROM jobs WHERE id=? AND kind='chat' AND status='queued'", (job_id,)).fetchone()
            if not row:
                return None
            lease = uuid4().hex
            db.execute("UPDATE jobs SET status='running',lease=?,expires=? WHERE id=?", (lease, time.time() + 120, job_id))
            return job_id, lease

    @staticmethod
    def guard(db, job_id, lease):
        row = db.execute("SELECT * FROM jobs WHERE id=? AND lease=? AND status='running' AND expires>?",
                         (job_id, lease, time.time())).fetchone()
        if not row:
            raise Stopped()
        return row

    def heartbeat(self, job_id, lease):
        with self.db() as db:
            self.guard(db, job_id, lease)
            db.execute('UPDATE jobs SET expires=? WHERE id=?', (time.time() + 120, job_id))

    def save(self, job_id, lease, result, state, status='running'):
        with self.db() as db:
            row = self.guard(db, job_id, lease)
            owned = json.loads(row['state']).get(STATE_KEY)
            state = {k: v for k, v in state.items() if k != STATE_KEY}
            if owned is not None:
                state[STATE_KEY] = owned
            db.execute('UPDATE jobs SET result=?,state=?,status=? WHERE id=?',
                       (encode(result), encode(state), status, job_id))

    @staticmethod
    def budget_state(row):
        if json.loads(row['body']).get('budgetPolicyVersion') != 1:
            raise ValueError('versioned budget requires recorded policy')
        state = json.loads(row['state'])
        budget = state.setdefault(STATE_KEY, {'version': 1, 'phases': {}, 'calls': {}})
        return state, budget

    def allowance(self, job_id, lease, phase, needed=0, hold=0, keys=None):
        if phase not in PHASES or any(type(v) is not int or not 0 <= v <= 5000000 for v in (needed, hold)):
            raise ValueError('invalid allowance')
        keys = keys or []
        if not isinstance(keys, list) or len(keys) > 256 or any(not isinstance(k, str) or len(k) > 100 for k in keys):
            raise ValueError('invalid planned calls')
        with self.db() as db:
            row = self.guard(db, job_id, lease)
            _, budget = self.budget_state(row)
            spent = db.execute('SELECT COALESCE(SUM(MAX(reserve,COALESCE(billed,0))),0) FROM calls WHERE job=?', (job_id,)).fetchone()[0]
            maximum = json.loads(row['body'])['budgetMicro']
            if budget.get('stopped'):
                raise BudgetExceeded(limit=budget['stopped'])
            cached = sum(db.execute('SELECT 1 FROM calls WHERE job=? AND key=? AND response IS NOT NULL', (job_id, key)).fetchone() is not None for key in set(keys))
            needed = max(0, needed - cached * MODEL_RESERVE)
            if spent + needed + hold > maximum:
                raise BudgetExceeded(kind='job_reservation', phase=phase, used=spent, maximum=maximum)
            return {'remaining': maximum - spent, 'cachedCount': cached, 'callsRemaining': max(0, PHASE_MAX - budget['phases'].get(phase, 0))}

    def admit(self, job_id, lease, key, spec):
        """One lease-fenced transaction owns cache lookup, reservation and dispatched count."""
        spec = admission_spec(spec)
        with self.db() as db:
            row = self.guard(db, job_id, lease)
            state, budget = self.budget_state(row)
            prior = db.execute('SELECT * FROM calls WHERE job=? AND key=?', (job_id, key)).fetchone()
            if budget.get('stopped'):
                raise BudgetExceeded(limit=budget['stopped'])
            if prior and prior['response'] is not None:
                return json.loads(prior['response'])
            phase, amount = spec['phase'], spec['amount']
            if prior and prior['tries'] >= 2:
                raise BudgetExceeded(kind='call_retries', phase=phase, used=prior['tries'], maximum=2)
            used = budget['phases'].get(phase, 0)
            if used >= PHASE_MAX:
                raise BudgetExceeded(kind='stage_calls', phase=phase, used=used, maximum=PHASE_MAX)
            spent = db.execute('SELECT COALESCE(SUM(MAX(reserve,COALESCE(billed,0))),0) FROM calls WHERE job=?', (job_id,)).fetchone()[0]
            maximum = json.loads(row['body'])['budgetMicro']
            if spent + amount + spec['hold'] > maximum:
                budget['stopped'] = dict(kind='job_reservation', phase=phase, used=spent, maximum=maximum)
                db.execute('UPDATE jobs SET state=? WHERE id=?', (encode(state), job_id))
                raise BudgetExceeded(limit=budget['stopped'])
            if prior:
                db.execute('UPDATE calls SET reserve=reserve+?,tries=tries+1 WHERE job=? AND key=?', (amount, job_id, key))
            else:
                db.execute('INSERT INTO calls(job,key,kind,reserve,tries) VALUES(?,?,?,?,1)', (job_id, key, spec['kind'], amount))
            budget['phases'][phase] = used + 1
            budget['calls'][key] = {'phase': phase, 'amount': amount}
            db.execute('UPDATE jobs SET state=? WHERE id=?', (encode(state), job_id))
        return None

    def reserve(self, job_id, lease, key, kind, amount):
        with self.db() as db:
            row = self.guard(db, job_id, lease)
            if json.loads(row['body']).get('budgetPolicyVersion') == 1:
                raise ValueError('atomic admission required')
            prior = db.execute('SELECT * FROM calls WHERE job=? AND key=?', (job_id, key)).fetchone()
            if prior:
                if prior['response'] is not None:
                    return json.loads(prior['response'])
                if prior['tries'] >= 2:
                    raise BudgetExceeded(kind='call_retries', used=2, maximum=2)
                return None
            spent = db.execute('SELECT COALESCE(SUM(MAX(reserve,COALESCE(billed,0))),0) FROM calls WHERE job=?', (job_id,)).fetchone()[0]
            if spent + amount > json.loads(row['body'])['budgetMicro']:
                raise BudgetExceeded(kind='job_reservation', used=spent, maximum=json.loads(row['body'])['budgetMicro'])
            db.execute('INSERT INTO calls(job,key,kind,reserve) VALUES(?,?,?,?)', (job_id, key, kind, amount))
        return None

    def started(self, job_id, lease, key):
        with self.db() as db:
            job = self.guard(db, job_id, lease)
            if json.loads(job['body']).get('budgetPolicyVersion') == 1:
                raise ValueError('atomic admission required')
            row = db.execute('SELECT tries FROM calls WHERE job=? AND key=?', (job_id, key)).fetchone()
            if row is None or row['tries'] >= 2:
                raise BudgetExceeded(kind='call_retries', used=2, maximum=2)
            db.execute('UPDATE calls SET tries=tries+1 WHERE job=? AND key=?', (job_id, key))

    def settle(self, job_id, lease, key, billed, receipt, response):
        with self.db() as db:
            row = self.guard(db, job_id, lease)
            state = json.loads(row['state'])
            budget = state.get(STATE_KEY)
            entry = budget.get('calls', {}).get(key) if budget else None
            if entry and billed is not None and billed > entry['amount']:
                budget['stopped'] = dict(kind='provider_cost_overrun', phase=entry['phase'], used=billed, maximum=entry['amount'])
                db.execute('UPDATE jobs SET state=? WHERE id=?', (encode(state), job_id))
            db.execute('UPDATE calls SET billed=?,receipt=?,response=? WHERE job=? AND key=?',
                       (billed, receipt, encode(response) if response is not None else None, job_id, key))
