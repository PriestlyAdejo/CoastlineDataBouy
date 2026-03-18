from __future__ import annotations

import sqlite3
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable


@dataclass(frozen=True)
class IndexPaths:
    db_path: Path


SCHEMA = """
CREATE TABLE IF NOT EXISTS artifacts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  node_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  ts_start TEXT,
  ts_end TEXT,
  path TEXT NOT NULL,
  size_bytes INTEGER,
  sha256 TEXT,
  meta_json TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS ix_artifacts_node_kind_ts ON artifacts(node_id, kind, ts_start);

CREATE TABLE IF NOT EXISTS uploads (
  artifact_id INTEGER PRIMARY KEY,
  status TEXT NOT NULL, -- pending|in_progress|done|failed
  remote_ref TEXT,
  last_error TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY(artifact_id) REFERENCES artifacts(id)
);
"""


def open_db(db_path: Path) -> sqlite3.Connection:
    db_path.parent.mkdir(parents=True, exist_ok=True)
    con = sqlite3.connect(str(db_path))
    con.execute("PRAGMA journal_mode=WAL;")
    con.execute("PRAGMA synchronous=NORMAL;")
    return con


def init_db(con: sqlite3.Connection) -> None:
    con.executescript(SCHEMA)
    con.commit()


def add_artifact(
    con: sqlite3.Connection,
    *,
    node_id: str,
    kind: str,
    path: str,
    ts_start: str | None = None,
    ts_end: str | None = None,
    size_bytes: int | None = None,
    sha256: str | None = None,
    meta_json: str | None = None,
) -> int:
    cur = con.execute(
        """
        INSERT INTO artifacts(node_id, kind, ts_start, ts_end, path, size_bytes, sha256, meta_json)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (node_id, kind, ts_start, ts_end, path, size_bytes, sha256, meta_json),
    )
    con.commit()
    return int(cur.lastrowid)


def list_artifacts(con: sqlite3.Connection, *, node_id: str, kind: str, limit: int = 100) -> Iterable[dict]:
    cur = con.execute(
        """
        SELECT id, node_id, kind, ts_start, ts_end, path, size_bytes, sha256, meta_json, created_at
        FROM artifacts
        WHERE node_id = ? AND kind = ?
        ORDER BY ts_start DESC, id DESC
        LIMIT ?
        """,
        (node_id, kind, limit),
    )
    cols = [d[0] for d in cur.description]
    for row in cur.fetchall():
        yield dict(zip(cols, row, strict=True))


def get_pending_upload_artifacts(
    con: sqlite3.Connection, *, node_id: str, kinds: list[str], limit: int = 50
) -> list[dict]:
    qs = ",".join(["?"] * len(kinds))
    cur = con.execute(
        f"""
        SELECT a.id, a.node_id, a.kind, a.ts_start, a.ts_end, a.path, a.size_bytes, a.sha256, a.meta_json
        FROM artifacts a
        LEFT JOIN uploads u ON u.artifact_id = a.id
        WHERE a.node_id = ? AND a.kind IN ({qs}) AND (u.status IS NULL OR u.status != 'done')
        ORDER BY a.ts_start ASC, a.id ASC
        LIMIT ?
        """,
        [node_id, *kinds, limit],
    )
    cols = [d[0] for d in cur.description]
    return [dict(zip(cols, row, strict=True)) for row in cur.fetchall()]


def set_upload_status(
    con: sqlite3.Connection,
    *,
    artifact_id: int,
    status: str,
    remote_ref: str | None = None,
    last_error: str | None = None,
) -> None:
    con.execute(
        """
        INSERT INTO uploads(artifact_id, status, remote_ref, last_error, attempts, updated_at)
        VALUES (?, ?, ?, ?, 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
        ON CONFLICT(artifact_id) DO UPDATE SET
          status=excluded.status,
          remote_ref=COALESCE(excluded.remote_ref, uploads.remote_ref),
          last_error=excluded.last_error,
          attempts=uploads.attempts + 1,
          updated_at=strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
        """,
        (artifact_id, status, remote_ref, last_error),
    )
    con.commit()

