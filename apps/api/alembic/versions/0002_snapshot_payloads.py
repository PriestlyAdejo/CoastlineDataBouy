"""add payload snapshots tables

Revision ID: 0002_snapshot_payloads
Revises: 0001_init
Create Date: 2026-04-30
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "0002_snapshot_payloads"
down_revision = "0001_init"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("telemetry_samples", sa.Column("payload", sa.JSON(), nullable=True))
    op.execute("UPDATE telemetry_samples SET payload = '{}' WHERE payload IS NULL")
    op.alter_column("telemetry_samples", "payload", nullable=False)

    op.add_column("health_snapshots", sa.Column("payload", sa.JSON(), nullable=True))
    op.execute("UPDATE health_snapshots SET payload = '{}' WHERE payload IS NULL")
    op.alter_column("health_snapshots", "payload", nullable=False)

    op.create_table(
        "env_snapshots",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("node_id", sa.String(length=64), nullable=False),
        sa.Column("ts", sa.String(length=64), nullable=False),
        sa.Column("payload", sa.JSON(), nullable=False),
    )
    op.create_index("ix_env_snapshots_node_id", "env_snapshots", ["node_id"])
    op.create_index("ix_env_snapshots_ts", "env_snapshots", ["ts"])

    op.create_table(
        "acoustic_meta_snapshots",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("node_id", sa.String(length=64), nullable=False),
        sa.Column("ts", sa.String(length=64), nullable=False),
        sa.Column("payload", sa.JSON(), nullable=False),
    )
    op.create_index("ix_acoustic_meta_snapshots_node_id", "acoustic_meta_snapshots", ["node_id"])
    op.create_index("ix_acoustic_meta_snapshots_ts", "acoustic_meta_snapshots", ["ts"])


def downgrade() -> None:
    op.drop_index("ix_acoustic_meta_snapshots_ts", table_name="acoustic_meta_snapshots")
    op.drop_index("ix_acoustic_meta_snapshots_node_id", table_name="acoustic_meta_snapshots")
    op.drop_table("acoustic_meta_snapshots")

    op.drop_index("ix_env_snapshots_ts", table_name="env_snapshots")
    op.drop_index("ix_env_snapshots_node_id", table_name="env_snapshots")
    op.drop_table("env_snapshots")

    op.drop_column("health_snapshots", "payload")
    op.drop_column("telemetry_samples", "payload")
