"""init tables

Revision ID: 0001_init
Revises: 
Create Date: 2026-03-18
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "0001_init"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "telemetry_samples",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("node_id", sa.String(length=64), nullable=False, index=True),
        sa.Column("ts", sa.String(length=64), nullable=False, index=True),
        sa.Column("source", sa.String(length=32), nullable=False),
        sa.Column("seq", sa.Integer(), nullable=True),
        sa.Column("arduino_ms", sa.BigInteger(), nullable=True),
        sa.Column("onboard_temp_c", sa.Float(), nullable=True),
        sa.Column("onboard_rh_pct", sa.Float(), nullable=True),
        sa.Column("accel_x", sa.Float(), nullable=True),
        sa.Column("accel_y", sa.Float(), nullable=True),
        sa.Column("accel_z", sa.Float(), nullable=True),
        sa.Column("pack_v", sa.Float(), nullable=True),
    )
    op.create_index("ix_telemetry_node_ts", "telemetry_samples", ["node_id", "ts"])

    op.create_table(
        "health_snapshots",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("node_id", sa.String(length=64), nullable=False, index=True),
        sa.Column("ts", sa.String(length=64), nullable=False, index=True),
        sa.Column("status", sa.String(length=16), nullable=False),
        sa.Column("cpu_pct", sa.Float(), nullable=True),
        sa.Column("mem_pct", sa.Float(), nullable=True),
        sa.Column("cpu_temp_c", sa.Float(), nullable=True),
        sa.Column("storage_mount_ok", sa.Integer(), nullable=True),
        sa.Column("storage_mountpoint", sa.String(length=256), nullable=True),
        sa.Column("storage_free_bytes", sa.BigInteger(), nullable=True),
        sa.Column("storage_total_bytes", sa.BigInteger(), nullable=True),
    )
    op.create_index("ix_health_node_ts", "health_snapshots", ["node_id", "ts"])

    op.create_table(
        "alerts",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("alert_id", sa.String(length=128), nullable=False),
        sa.Column("node_id", sa.String(length=64), nullable=False, index=True),
        sa.Column("ts", sa.String(length=64), nullable=False, index=True),
        sa.Column("severity", sa.String(length=16), nullable=False),
        sa.Column("status", sa.String(length=16), nullable=False),
        sa.Column("type", sa.String(length=64), nullable=False),
        sa.Column("title", sa.String(length=256), nullable=False),
        sa.Column("detail", sa.String(length=2048), nullable=True),
    )
    op.create_unique_constraint("uq_alerts_alert_id", "alerts", ["alert_id"])


def downgrade() -> None:
    op.drop_table("alerts")
    op.drop_index("ix_health_node_ts", table_name="health_snapshots")
    op.drop_table("health_snapshots")
    op.drop_index("ix_telemetry_node_ts", table_name="telemetry_samples")
    op.drop_table("telemetry_samples")

