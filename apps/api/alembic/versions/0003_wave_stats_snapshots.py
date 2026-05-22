"""add wave_stats_snapshots table

Revision ID: 0003_wave_stats_snapshots
Revises: 0002_snapshot_payloads
Create Date: 2026-05-22
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "0003_wave_stats_snapshots"
down_revision = "0002_snapshot_payloads"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "wave_stats_snapshots",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("node_id", sa.String(length=64), nullable=False),
        sa.Column("ts", sa.String(length=64), nullable=False),
        sa.Column("payload", sa.JSON(), nullable=False),
    )
    op.create_index("ix_wave_stats_snapshots_node_id", "wave_stats_snapshots", ["node_id"])
    op.create_index("ix_wave_stats_snapshots_ts", "wave_stats_snapshots", ["ts"])


def downgrade() -> None:
    op.drop_index("ix_wave_stats_snapshots_ts", table_name="wave_stats_snapshots")
    op.drop_index("ix_wave_stats_snapshots_node_id", table_name="wave_stats_snapshots")
    op.drop_table("wave_stats_snapshots")
