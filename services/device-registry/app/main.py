"""
Device Registry Service - Core device CRUD operations.
"""
import os
import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI, Depends, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy import select, func, String
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID, INET, MACADDR
from sqlalchemy import Index
import uuid
from datetime import datetime
from pydantic_settings import BaseSettings

# OpenTelemetry
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor
from opentelemetry.instrumentation.redis import RedisInstrumentor

# Kafka
from aiokafka import AIOKafkaProducer
import json

# Logging
from pythonjsonlogger import jsonlogger

# --- Configuration ---
class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://meridian:meridian_dev@localhost:5432/meridian"
    REDIS_URL: str = "redis://localhost:6379/0"
    KAFKA_BOOTSTRAP_SERVERS: str = "localhost:9092"
    SERVICE_NAME: str = "device-registry"
    LOG_LEVEL: str = "INFO"
    OTEL_EXPORTER_OTLP_ENDPOINT: str = "http://localhost:4317"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()

# --- Logging Setup ---
log_handler = logging.StreamHandler()
log_handler.setFormatter(jsonlogger.JsonFormatter(
    "%(timestamp)s %(level)s %(name)s %(message)s",
    timestamp=True,
))
root_logger = logging.getLogger()
root_logger.addHandler(log_handler)
root_logger.setLevel(settings.LOG_LEVEL)

logger = logging.getLogger(__name__)

# --- OpenTelemetry ---
trace.set_tracer_provider(TracerProvider())
tracer = trace.get_tracer(__name__)
otlp_exporter = OTLPSpanExporter(endpoint=settings.OTEL_EXPORTER_OTLP_ENDPOINT, insecure=True)
trace.get_tracer_provider().add_span_processor(BatchSpanProcessor(otlp_exporter))

# --- Database ---
engine = create_async_engine(settings.DATABASE_URL, echo=False, pool_pre_ping=True)
async_session_maker = async_sessionmaker(engine, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


class Location(Base):
    __tablename__ = "locations"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    site_name: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    building_rack: Mapped[str | None] = mapped_column(String(50), nullable=True)
    description: Mapped[str | None] = mapped_column(String(500), nullable=True)
    latitude: Mapped[float | None] = mapped_column(nullable=True)
    longitude: Mapped[float | None] = mapped_column(nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (Index("ix_locations_site_name", "site_name"),)


class Device(Base):
    __tablename__ = "devices"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    hostname: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    ip_address: Mapped[str] = mapped_column(INET, unique=True, nullable=False, index=True)
    mac_address: Mapped[str | None] = mapped_column(MACADDR, unique=True, nullable=True)
    device_type: Mapped[str] = mapped_column(String(50), nullable=False)  # router, switch, firewall, ap, server
    vendor: Mapped[str] = mapped_column(String(50), nullable=False)
    model: Mapped[str] = mapped_column(String(50), nullable=False)
    serial_number: Mapped[str | None] = mapped_column(String(100), unique=True, nullable=True)
    firmware_version: Mapped[str | None] = mapped_column(String(50), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="online", nullable=False)  # online, warning, offline, maintenance, decommissioned
    location_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True, index=True)
    security_score: Mapped[int] = mapped_column(default=100)
    compliance_status: Mapped[str] = mapped_column(String(20), default="pending")  # compliant, non_compliant, pending
    security_zone: Mapped[str] = mapped_column(String(20), default="trusted")  # trusted, dmz, untrusted
    active_sessions: Mapped[int] = mapped_column(default=0)
    failed_logins: Mapped[int] = mapped_column(default=0)
    last_config_change: Mapped[datetime | None] = mapped_column(nullable=True)
    last_vulnerability_scan: Mapped[datetime | None] = mapped_column(nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        Index("ix_devices_hostname", "hostname"),
        Index("ix_devices_ip", "ip_address"),
        Index("ix_devices_site", "location_id"),
        Index("ix_devices_status", "status"),
    )


# --- Pydantic Schemas ---
class LocationBase(BaseModel):
    site_name: str = Field(..., min_length=1, max_length=100)
    building_rack: str | None = Field(None, max_length=50)
    description: str | None = Field(None, max_length=500)
    latitude: float | None = Field(None, ge=-90, le=90)
    longitude: float | None = Field(None, ge=-180, le=180)


class LocationCreate(LocationBase):
    pass


class LocationResponse(LocationBase):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class DeviceBase(BaseModel):
    hostname: str = Field(..., min_length=1, max_length=100)
    ip_address: str  # validated by INET type
    mac_address: str | None = None
    device_type: str = Field(..., pattern="^(router|switch|firewall|ap|server)$")
    vendor: str = Field(..., min_length=1, max_length=50)
    model: str = Field(..., min_length=1, max_length=50)
    serial_number: str | None = Field(None, max_length=100)
    firmware_version: str | None = Field(None, max_length=50)
    status: str = Field(default="online", pattern="^(online|warning|offline|maintenance|decommissioned)$")
    location_id: uuid.UUID | None = None
    security_score: int = Field(default=100, ge=0, le=100)
    compliance_status: str = Field(default="pending", pattern="^(compliant|non_compliant|pending)$")
    security_zone: str = Field(default="trusted", pattern="^(trusted|dmz|untrusted)$")
    active_sessions: int = Field(default=0, ge=0)
    failed_logins: int = Field(default=0, ge=0)


class DeviceCreate(DeviceBase):
    pass


class DeviceUpdate(BaseModel):
    hostname: str | None = Field(None, min_length=1, max_length=100)
    ip_address: str | None = None
    mac_address: str | None = None
    device_type: str | None = Field(None, pattern="^(router|switch|firewall|ap|server)$")
    vendor: str | None = Field(None, min_length=1, max_length=50)
    model: str | None = Field(None, min_length=1, max_length=50)
    serial_number: str | None = Field(None, max_length=100)
    firmware_version: str | None = Field(None, max_length=50)
    status: str | None = Field(None, pattern="^(online|warning|offline|maintenance|decommissioned)$")
    location_id: uuid.UUID | None = None
    security_score: int | None = Field(None, ge=0, le=100)
    compliance_status: str | None = Field(None, pattern="^(compliant|non_compliant|pending)$")
    security_zone: str | None = Field(None, pattern="^(trusted|dmz|untrusted)$")
    active_sessions: int | None = Field(None, ge=0)
    failed_logins: int | None = Field(None, ge=0)


class DeviceResponse(DeviceBase):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class DeviceListResponse(BaseModel):
    devices: list[DeviceResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


# --- Kafka Producer ---
kafka_producer: AIOKafkaProducer | None = None


async def get_kafka_producer() -> AIOKafkaProducer:
    global kafka_producer
    if kafka_producer is None:
        kafka_producer = AIOKafkaProducer(
            bootstrap_servers=settings.KAFKA_BOOTSTRAP_SERVERS,
            value_serializer=lambda v: json.dumps(v).encode(),
        )
        await kafka_producer.start()
    return kafka_producer


async def emit_event(event_type: str, aggregate_id: str, payload: dict):
    producer = await get_kafka_producer()
    event = {
        "event_id": str(uuid.uuid4()),
        "event_type": event_type,
        "aggregate_id": aggregate_id,
        "payload": payload,
        "timestamp_ms": int(datetime.utcnow().timestamp() * 1000),
        "metadata": {"service_name": settings.SERVICE_NAME},
    }
    await producer.send_and_wait("device-events", value=event, key=aggregate_id.encode())


# --- Database Dependency ---
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_maker() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


# --- Lifespan ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting Device Registry Service")
    # Create tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    # Start Kafka producer
    global kafka_producer
    kafka_producer = AIOKafkaProducer(
        bootstrap_servers=settings.KAFKA_BOOTSTRAP_SERVERS,
        value_serializer=lambda v: json.dumps(v).encode(),
    )
    await kafka_producer.start()
    logger.info("Service started")

    yield

    # Shutdown
    if kafka_producer:
        await kafka_producer.stop()
    await engine.dispose()
    logger.info("Service stopped")


# --- FastAPI App ---
app = FastAPI(
    title="Device Registry Service",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# OpenTelemetry
FastAPIInstrumentor.instrument_app(app)
SQLAlchemyInstrumentor().instrument(engine=engine)
RedisInstrumentor().instrument()

# --- Health ---
@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": settings.SERVICE_NAME}


# --- API Routes ---
@app.post("/api/v1/locations", response_model=LocationResponse, status_code=status.HTTP_201_CREATED)
async def create_location(location: LocationCreate, db: AsyncSession = Depends(get_db)):
    loc = Location(**location.model_dump())
    db.add(loc)
    await db.flush()
    await db.refresh(loc)
    await emit_event("SiteCreated", str(loc.id), {
        "name": loc.site_name,
        "description": loc.description,
        "building": loc.building_rack,
        "latitude": loc.latitude,
        "longitude": loc.longitude,
    })
    return loc


@app.get("/api/v1/locations", response_model=list[LocationResponse])
async def list_locations(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Location).order_by(Location.site_name))
    return result.scalars().all()


@app.get("/api/v1/locations/{location_id}", response_model=LocationResponse)
async def get_location(location_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    loc = await db.get(Location, location_id)
    if not loc:
        raise HTTPException(status_code=404, detail="Location not found")
    return loc


@app.post("/api/v1/devices", response_model=DeviceResponse, status_code=status.HTTP_201_CREATED)
async def create_device(device: DeviceCreate, db: AsyncSession = Depends(get_db)):
    # Validate location exists
    if device.location_id:
        loc = await db.get(Location, device.location_id)
        if not loc:
            raise HTTPException(status_code=400, detail="Location not found")

    dev = Device(**device.model_dump())
    db.add(dev)
    await db.flush()
    await db.refresh(dev)

    await emit_event("DeviceCreated", str(dev.id), {
        "hostname": dev.hostname,
        "ipAddress": dev.ip_address,
        "macAddress": dev.mac_address,
        "siteId": str(dev.location_id) if dev.location_id else None,
        "deviceType": dev.device_type,
        "vendor": dev.vendor,
        "model": dev.model,
        "serialNumber": dev.serial_number,
        "firmwareVersion": dev.firmware_version,
    })
    return dev


@app.get("/api/v1/devices", response_model=DeviceListResponse)
async def list_devices(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    site_id: uuid.UUID | None = Query(None),
    status: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    query = select(Device)
    count_query = select(func.count(Device.id))

    if site_id:
        query = query.where(Device.location_id == site_id)
        count_query = count_query.where(Device.location_id == site_id)
    if status:
        query = query.where(Device.status == status)
        count_query = count_query.where(Device.status == status)

    total = (await db.execute(count_query)).scalar_one()
    query = query.order_by(Device.hostname).offset((page - 1) * page_size).limit(page_size)
    devices = (await db.execute(query)).scalars().all()

    return DeviceListResponse(
        devices=devices,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size,
    )


@app.get("/api/v1/devices/{device_id}", response_model=DeviceResponse)
async def get_device(device_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    dev = await db.get(Device, device_id)
    if not dev:
        raise HTTPException(status_code=404, detail="Device not found")
    return dev


@app.put("/api/v1/devices/{device_id}", response_model=DeviceResponse)
async def update_device(device_id: uuid.UUID, device: DeviceUpdate, db: AsyncSession = Depends(get_db)):
    dev = await db.get(Device, device_id)
    if not dev:
        raise HTTPException(status_code=404, detail="Device not found")

    update_data = device.model_dump(exclude_unset=True)
    previous_values = {k: getattr(dev, k) for k in update_data.keys()}

    for key, value in update_data.items():
        setattr(dev, key, value)

    await db.flush()
    await db.refresh(dev)

    await emit_event("DeviceUpdated", str(dev.id), {
        "changedFields": list(update_data.keys()),
        "previousValues": {k: str(v) for k, v in previous_values.items()},
        "newValues": {k: str(v) for k, v in update_data.items()},
    })
    return dev


@app.delete("/api/v1/devices/{device_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_device(device_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    dev = await db.get(Device, device_id)
    if not dev:
        raise HTTPException(status_code=404, detail="Device not found")
    await db.delete(dev)
    await emit_event("DeviceDeleted", str(device_id), {})


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)