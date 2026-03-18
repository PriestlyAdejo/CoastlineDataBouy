from __future__ import annotations

from sqlalchemy import BigInteger, DateTime, Float, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from .db import Base


class TelemetrySample(Base):
    __tablename__ = "telemetry_samples"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    node_id: Mapped[str] = mapped_column(String(64), index=True)
    ts: Mapped[str] = mapped_column(String(64), index=True)  # store RFC3339 for now

    source: Mapped[str] = mapped_column(String(32))
    seq: Mapped[int | None] = mapped_column(Integer, nullable=True)
    arduino_ms: Mapped[int | None] = mapped_column(BigInteger, nullable=True)

    onboard_temp_c: Mapped[float | None] = mapped_column(Float, nullable=True)
    onboard_rh_pct: Mapped[float | None] = mapped_column(Float, nullable=True)

    accel_x: Mapped[float | None] = mapped_column(Float, nullable=True)
    accel_y: Mapped[float | None] = mapped_column(Float, nullable=True)
    accel_z: Mapped[float | None] = mapped_column(Float, nullable=True)

    pack_v: Mapped[float | None] = mapped_column(Float, nullable=True)


class HealthSnapshot(Base):
    __tablename__ = "health_snapshots"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    node_id: Mapped[str] = mapped_column(String(64), index=True)
    ts: Mapped[str] = mapped_column(String(64), index=True)
    status: Mapped[str] = mapped_column(String(16))

    cpu_pct: Mapped[float | None] = mapped_column(Float, nullable=True)
    mem_pct: Mapped[float | None] = mapped_column(Float, nullable=True)
    cpu_temp_c: Mapped[float | None] = mapped_column(Float, nullable=True)

    storage_mount_ok: Mapped[int | None] = mapped_column(Integer, nullable=True)
    storage_mountpoint: Mapped[str | None] = mapped_column(String(256), nullable=True)
    storage_free_bytes: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    storage_total_bytes: Mapped[int | None] = mapped_column(BigInteger, nullable=True)


class Alert(Base):
    __tablename__ = "alerts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    alert_id: Mapped[str] = mapped_column(String(128), unique=True, index=True)
    node_id: Mapped[str] = mapped_column(String(64), index=True)
    ts: Mapped[str] = mapped_column(String(64), index=True)
    severity: Mapped[str] = mapped_column(String(16))
    status: Mapped[str] = mapped_column(String(16))
    type: Mapped[str] = mapped_column(String(64))
    title: Mapped[str] = mapped_column(String(256))
    detail: Mapped[str | None] = mapped_column(String(2048), nullable=True)

