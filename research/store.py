"""SQLite queue, fenced leases, deletion and pre-call budget reservations."""
import hashlib
import json
import os
import sqlite3
import time
from contextlib import contextmanager
from pathlib import Path
from uuid import uuid4


class Conflict(Exception):
    pass


class Gone(Exception):
    pass


class Stopped(Exception):
    pass


class BudgetExceeded(Exception):
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
            if db.execute("SELECT 1 FROM calls WHERE job=? AND kind='tool' AND billed IS NULL", (job_id,)).fetchone():
                result['warnings'].append('Tool cost includes reserved estimates where receipts unavailable')
            return result

    @staticmethod
    def cost(db, job_id):
        rows = db.execute('SELECT kind,billed,reserve FROM calls WHERE job=?', (job_id,)).fetchall()
        # Unknown charges keep their full reservation; never report them as free.
        return {'toolMicro': sum(r['billed'] if r['billed'] is not None else r['reserve']
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
            self.guard(db, job_id, lease)
            db.execute('UPDATE jobs SET result=?,state=?,status=? WHERE id=?',
                       (encode(result), encode(state), status, job_id))

    def reserve(self, job_id, lease, key, kind, amount):
        with self.db() as db:
            row = self.guard(db, job_id, lease)
            prior = db.execute('SELECT * FROM calls WHERE job=? AND key=?', (job_id, key)).fetchone()
            if prior:
                if prior['response'] is not None:
                    return json.loads(prior['response'])
                if prior['tries'] >= 2:
                    raise BudgetExceeded('call retry limit')
                return None
            spent = db.execute('SELECT COALESCE(SUM(MAX(reserve,COALESCE(billed,0))),0) FROM calls WHERE job=?', (job_id,)).fetchone()[0]
            if spent + amount > json.loads(row['body'])['budgetMicro']:
                raise BudgetExceeded('budget reserved')
            db.execute('INSERT INTO calls(job,key,kind,reserve) VALUES(?,?,?,?)', (job_id, key, kind, amount))
        return None

    def started(self, job_id, lease, key):
        with self.db() as db:
            self.guard(db, job_id, lease)
            row = db.execute('SELECT tries FROM calls WHERE job=? AND key=?', (job_id, key)).fetchone()
            if row is None or row['tries'] >= 2:
                raise BudgetExceeded('call retry limit')
            db.execute('UPDATE calls SET tries=tries+1 WHERE job=? AND key=?', (job_id, key))

    def settle(self, job_id, lease, key, billed, receipt, response):
        with self.db() as db:
            self.guard(db, job_id, lease)
            db.execute('UPDATE calls SET billed=?,receipt=?,response=? WHERE job=? AND key=?',
                       (billed, receipt, encode(response) if response is not None else None, job_id, key))
