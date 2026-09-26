from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Literal
import random
import os
import httpx
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="Network Device Inventory Manager API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class Device(BaseModel):
    id: str
    hostname: str
    ip: str
    vendor: str
    model: str
    site: str
    lat: float
    lng: float
    status: Literal["online", "warning", "offline"]
    security_score: int = 100
    last_vulnerability_scan: str | None = None
    compliance_status: Literal["compliant", "non-compliant", "pending"] = "pending"
    firmware_version: str = "unknown"
    last_config_change: str | None = None
    active_sessions: int = 0
    failed_logins: int = 0
    security_zone: Literal["trusted", "dmz", "untrusted"] = "trusted"


class Vulnerability(BaseModel):
    cve_id: str
    severity: Literal["critical", "high", "medium", "low"]
    description: str
    affected_device_id: str
    discovered_date: str
    remediation_status: Literal["open", "in-progress", "resolved"]


class SecurityEvent(BaseModel):
    id: str
    device_id: str
    event_type: Literal["brute_force", "port_scan", "config_change", "anomaly"]
    severity: Literal["critical", "high", "medium", "low"]
    timestamp: str
    description: str
    source_ip: str | None = None


def random_public_ip() -> str:
    octets = [
        random.randint(1, 223),
        random.randint(0, 255),
        random.randint(0, 255),
        random.randint(1, 254),
    ]
    if octets[0] == 10 or (octets[0] == 172 and 16 <= octets[1] <= 31) or (octets[0] == 192 and octets[1] == 168):
        octets[1] = (octets[1] + 32) % 256
    return ".".join(map(str, octets))


random.seed(42)
DEVICES: list[Device] = [
    Device(id="dev-001", hostname="core-sw-nyc01", ip=random_public_ip(), vendor="Juniper", model="QFX5120", site="New York DC", lat=40.7128, lng=-74.0060, status="online", security_score=95, last_vulnerability_scan="2026-09-25T10:30:00Z", compliance_status="compliant", firmware_version="20.4R1", last_config_change="2026-09-20T14:22:00Z", active_sessions=2, failed_logins=0, security_zone="trusted"),
    Device(id="dev-002", hostname="edge-rtr-nyc01", ip=random_public_ip(), vendor="Cisco", model="ASR 9001", site="New York DC", lat=40.7128, lng=-74.0060, status="online", security_score=88, last_vulnerability_scan="2026-09-24T08:15:00Z", compliance_status="compliant", firmware_version="16.12.4", last_config_change="2026-09-18T11:45:00Z", active_sessions=1, failed_logins=2, security_zone="trusted"),
    Device(id="dev-003", hostname="fw-nyc01", ip=random_public_ip(), vendor="Palo Alto", model="PA-5200", site="New York DC", lat=40.7128, lng=-74.0060, status="warning", security_score=72, last_vulnerability_scan="2026-09-23T16:30:00Z", compliance_status="non-compliant", firmware_version="10.1.8", last_config_change="2026-09-15T09:20:00Z", active_sessions=5, failed_logins=15, security_zone="dmz"),
    Device(id="dev-004", hostname="srv-nyc01", ip=random_public_ip(), vendor="Dell", model="PowerEdge R750", site="New York DC", lat=40.7128, lng=-74.0060, status="online", security_score=90, last_vulnerability_scan="2026-09-25T12:00:00Z", compliance_status="compliant", firmware_version="2.18.1", last_config_change="2026-09-19T16:30:00Z", active_sessions=0, failed_logins=1, security_zone="trusted"),
    Device(id="dev-005", hostname="ap-nyc01", ip=random_public_ip(), vendor="Cisco", model="Catalyst 9300", site="New York DC", lat=40.7128, lng=-74.0060, status="online", security_score=85, last_vulnerability_scan="2026-09-22T14:45:00Z", compliance_status="compliant", firmware_version="17.9.4", last_config_change="2026-09-17T10:15:00Z", active_sessions=8, failed_logins=3, security_zone="trusted"),
    Device(id="dev-006", hostname="core-sw-lon01", ip=random_public_ip(), vendor="Arista", model="7060CX2", site="London DC", lat=51.5074, lng=-0.1278, status="online", security_score=92, last_vulnerability_scan="2026-09-25T09:00:00Z", compliance_status="compliant", firmware_version="4.28.1F", last_config_change="2026-09-21T13:40:00Z", active_sessions=3, failed_logins=0, security_zone="trusted"),
    Device(id="dev-007", hostname="edge-rtr-lon01", ip=random_public_ip(), vendor="Cisco", model="ASR 9001", site="London DC", lat=51.5074, lng=-0.1278, status="online", security_score=86, last_vulnerability_scan="2026-09-24T11:20:00Z", compliance_status="compliant", firmware_version="16.12.4", last_config_change="2026-09-19T15:25:00Z", active_sessions=2, failed_logins=4, security_zone="trusted"),
    Device(id="dev-008", hostname="fw-lon01", ip=random_public_ip(), vendor="Fortinet", model="FortiGate 600E", site="London DC", lat=51.5074, lng=-0.1278, status="online", security_score=78, last_vulnerability_scan="2026-09-23T10:10:00Z", compliance_status="pending", firmware_version="7.2.5", last_config_change="2026-09-16T08:55:00Z", active_sessions=4, failed_logins=8, security_zone="dmz"),
    Device(id="dev-009", hostname="srv-lon01", ip=random_public_ip(), vendor="HP", model="ProLiant DL380", site="London DC", lat=51.5074, lng=-0.1278, status="warning", security_score=68, last_vulnerability_scan="2026-09-22T17:30:00Z", compliance_status="non-compliant", firmware_version="1.95.2", last_config_change="2026-09-14T12:10:00Z", active_sessions=1, failed_logins=12, security_zone="trusted"),
    Device(id="dev-010", hostname="sw-lon01", ip=random_public_ip(), vendor="Juniper", model="EX4300", site="London DC", lat=51.5074, lng=-0.1278, status="online", security_score=91, last_vulnerability_scan="2026-09-25T13:45:00Z", compliance_status="compliant", firmware_version="21.1R1", last_config_change="2026-09-20T17:50:00Z", active_sessions=0, failed_logins=1, security_zone="trusted"),
    Device(id="dev-011", hostname="acc-lon01", ip=random_public_ip(), vendor="Ubiquiti", model="U6 Pro", site="London DC", lat=51.5074, lng=-0.1278, status="offline", security_score=65, last_vulnerability_scan="2026-09-20T09:00:00Z", compliance_status="non-compliant", firmware_version="4.3.21", last_config_change="2026-09-10T14:30:00Z", active_sessions=0, failed_logins=25, security_zone="untrusted"),
    Device(id="dev-012", hostname="core-sw-tky01", ip=random_public_ip(), vendor="Cisco", model="Nexus 9300", site="Tokyo DC", lat=35.6762, lng=139.6503, status="online", security_score=94, last_vulnerability_scan="2026-09-25T08:00:00Z", compliance_status="compliant", firmware_version="17.3.5", last_config_change="2026-09-22T10:20:00Z", active_sessions=2, failed_logins=0, security_zone="trusted"),
    Device(id="dev-013", hostname="edge-rtr-tky01", ip=random_public_ip(), vendor="Juniper", model="MX204", site="Tokyo DC", lat=35.6762, lng=139.6503, status="online", security_score=89, last_vulnerability_scan="2026-09-24T12:30:00Z", compliance_status="compliant", firmware_version="21.2R1", last_config_change="2026-09-18T16:40:00Z", active_sessions=1, failed_logins=3, security_zone="trusted"),
    Device(id="dev-014", hostname="fw-tky01", ip=random_public_ip(), vendor="Palo Alto", model="PA-5200", site="Tokyo DC", lat=35.6762, lng=139.6503, status="warning", security_score=75, last_vulnerability_scan="2026-09-23T14:15:00Z", compliance_status="pending", firmware_version="10.1.6", last_config_change="2026-09-15T11:25:00Z", active_sessions=6, failed_logins=18, security_zone="dmz"),
    Device(id="dev-015", hostname="srv-tky01", ip=random_public_ip(), vendor="Dell", model="PowerEdge R750", site="Tokyo DC", lat=35.6762, lng=139.6503, status="online", security_score=87, last_vulnerability_scan="2026-09-25T11:00:00Z", compliance_status="compliant", firmware_version="2.18.1", last_config_change="2026-09-19T14:50:00Z", active_sessions=0, failed_logins=2, security_zone="trusted"),
    Device(id="dev-016", hostname="core-sw-syd01", ip=random_public_ip(), vendor="Arista", model="7280R", site="Sydney DC", lat=-33.8688, lng=151.2093, status="online", security_score=93, last_vulnerability_scan="2026-09-25T07:30:00Z", compliance_status="compliant", firmware_version="4.29.1F", last_config_change="2026-09-21T12:15:00Z", active_sessions=3, failed_logins=0, security_zone="trusted"),
    Device(id="dev-017", hostname="edge-rtr-syd01", ip=random_public_ip(), vendor="Cisco", model="ASR 9001", site="Sydney DC", lat=-33.8688, lng=151.2093, status="online", security_score=85, last_vulnerability_scan="2026-09-24T10:45:00Z", compliance_status="compliant", firmware_version="16.12.4", last_config_change="2026-09-18T17:30:00Z", active_sessions=2, failed_logins=5, security_zone="trusted"),
    Device(id="dev-018", hostname="fw-syd01", ip=random_public_ip(), vendor="Fortinet", model="FortiGate 100F", site="Sydney DC", lat=-33.8688, lng=151.2093, status="online", security_score=80, last_vulnerability_scan="2026-09-23T11:20:00Z", compliance_status="pending", firmware_version="7.0.8", last_config_change="2026-09-16T09:40:00Z", active_sessions=4, failed_logins=10, security_zone="dmz"),
    Device(id="dev-019", hostname="srv-syd01", ip=random_public_ip(), vendor="HP", model="ProLiant DL380", site="Sydney DC", lat=-33.8688, lng=151.2093, status="warning", security_score=70, last_vulnerability_scan="2026-09-22T16:00:00Z", compliance_status="non-compliant", firmware_version="1.94.3", last_config_change="2026-09-13T15:20:00Z", active_sessions=1, failed_logins=14, security_zone="trusted"),
    Device(id="dev-020", hostname="sw-syd01", ip=random_public_ip(), vendor="Juniper", model="EX4300", site="Sydney DC", lat=-33.8688, lng=151.2093, status="online", security_score=90, last_vulnerability_scan="2026-09-25T12:30:00Z", compliance_status="compliant", firmware_version="21.1R1", last_config_change="2026-09-20T18:45:00Z", active_sessions=0, failed_logins=1, security_zone="trusted"),
    Device(id="dev-021", hostname="core-sw-par01", ip=random_public_ip(), vendor="Cisco", model="Catalyst 9500", site="Paris DC", lat=48.8566, lng=2.3522, status="online", security_score=96, last_vulnerability_scan="2026-09-25T09:45:00Z", compliance_status="compliant", firmware_version="17.9.4a", last_config_change="2026-09-22T14:10:00Z", active_sessions=2, failed_logins=0, security_zone="trusted"),
    Device(id="dev-022", hostname="edge-rtr-par01", ip=random_public_ip(), vendor="Juniper", model="MX204", site="Paris DC", lat=48.8566, lng=2.3522, status="online", security_score=87, last_vulnerability_scan="2026-09-24T13:15:00Z", compliance_status="compliant", firmware_version="21.2R1", last_config_change="2026-09-19T15:55:00Z", active_sessions=1, failed_logins=4, security_zone="trusted"),
    Device(id="dev-023", hostname="fw-par01", ip=random_public_ip(), vendor="Palo Alto", model="PA-5200", site="Paris DC", lat=48.8566, lng=2.3522, status="online", security_score=76, last_vulnerability_scan="2026-09-23T15:30:00Z", compliance_status="pending", firmware_version="10.1.7", last_config_change="2026-09-15T10:50:00Z", active_sessions=5, failed_logins=16, security_zone="dmz"),
    Device(id="dev-024", hostname="srv-par01", ip=random_public_ip(), vendor="Dell", model="PowerEdge R750", site="Paris DC", lat=48.8566, lng=2.3522, status="online", security_score=88, last_vulnerability_scan="2026-09-25T10:15:00Z", compliance_status="compliant", firmware_version="2.18.1", last_config_change="2026-09-20T16:20:00Z", active_sessions=0, failed_logins=2, security_zone="trusted"),
    Device(id="dev-025", hostname="sw-par01", ip=random_public_ip(), vendor="Arista", model="7060CX2", site="Paris DC", lat=48.8566, lng=2.3522, status="online", security_score=91, last_vulnerability_scan="2026-09-25T11:40:00Z", compliance_status="compliant", firmware_version="4.28.1F", last_config_change="2026-09-21T13:25:00Z", active_sessions=0, failed_logins=1, security_zone="trusted"),
    Device(id="dev-026", hostname="ap-par01", ip=random_public_ip(), vendor="Ubiquiti", model="U6 Pro", site="Paris DC", lat=48.8566, lng=2.3522, status="online", security_score=84, last_vulnerability_scan="2026-09-22T18:00:00Z", compliance_status="compliant", firmware_version="4.3.21", last_config_change="2026-09-17T11:40:00Z", active_sessions=7, failed_logins=3, security_zone="trusted"),
    Device(id="dev-027", hostname="srv-par02", ip=random_public_ip(), vendor="HP", model="ProLiant DL380", site="Paris DC", lat=48.8566, lng=2.3522, status="warning", security_score=67, last_vulnerability_scan="2026-09-21T19:30:00Z", compliance_status="non-compliant", firmware_version="1.93.5", last_config_change="2026-09-12T16:45:00Z", active_sessions=1, failed_logins=20, security_zone="trusted"),
    Device(id="dev-028", hostname="fw-par02", ip=random_public_ip(), vendor="Fortinet", model="FortiGate 100F", site="Paris DC", lat=48.8566, lng=2.3522, status="online", security_score=79, last_vulnerability_scan="2026-09-23T12:45:00Z", compliance_status="pending", firmware_version="7.0.8", last_config_change="2026-09-16T10:30:00Z", active_sessions=4, failed_logins=9, security_zone="dmz"),
    Device(id="dev-029", hostname="core-sw-ber01", ip=random_public_ip(), vendor="Cisco", model="Nexus 9300", site="Berlin DC", lat=52.52, lng=13.405, status="online", security_score=95, last_vulnerability_scan="2026-09-25T08:30:00Z", compliance_status="compliant", firmware_version="17.3.5", last_config_change="2026-09-22T11:35:00Z", active_sessions=2, failed_logins=0, security_zone="trusted"),
    Device(id="dev-030", hostname="edge-rtr-ber01", ip=random_public_ip(), vendor="Juniper", model="MX204", site="Berlin DC", lat=52.52, lng=13.405, status="online", security_score=86, last_vulnerability_scan="2026-09-24T14:00:00Z", compliance_status="compliant", firmware_version="21.2R1", last_config_change="2026-09-18T18:20:00Z", active_sessions=1, failed_logins=4, security_zone="trusted"),
    Device(id="dev-031", hostname="fw-ber01", ip=random_public_ip(), vendor="Palo Alto", model="PA-5200", site="Berlin DC", lat=52.52, lng=13.405, status="online", security_score=74, last_vulnerability_scan="2026-09-23T16:15:00Z", compliance_status="non-compliant", firmware_version="10.1.5", last_config_change="2026-09-14T12:00:00Z", active_sessions=6, failed_logins=22, security_zone="dmz"),
    Device(id="dev-032", hostname="srv-ber01", ip=random_public_ip(), vendor="Dell", model="PowerEdge R750", site="Berlin DC", lat=52.52, lng=13.405, status="online", security_score=89, last_vulnerability_scan="2026-09-25T10:00:00Z", compliance_status="compliant", firmware_version="2.18.1", last_config_change="2026-09-20T17:10:00Z", active_sessions=0, failed_logins=2, security_zone="trusted"),
    Device(id="dev-033", hostname="sw-ber01", ip=random_public_ip(), vendor="Arista", model="7280R", site="Berlin DC", lat=52.52, lng=13.405, status="online", security_score=92, last_vulnerability_scan="2026-09-25T11:25:00Z", compliance_status="compliant", firmware_version="4.29.1F", last_config_change="2026-09-21T14:40:00Z", active_sessions=0, failed_logins=1, security_zone="trusted"),
    Device(id="dev-034", hostname="ap-ber01", ip=random_public_ip(), vendor="Ubiquiti", model="U6 Pro", site="Berlin DC", lat=52.52, lng=13.405, status="online", security_score=83, last_vulnerability_scan="2026-09-22T19:15:00Z", compliance_status="compliant", firmware_version="4.3.21", last_config_change="2026-09-17T12:50:00Z", active_sessions=6, failed_logins=3, security_zone="trusted"),
    Device(id="dev-035", hostname="srv-ber02", ip=random_public_ip(), vendor="HP", model="ProLiant DL380", site="Berlin DC", lat=52.52, lng=13.405, status="warning", security_score=66, last_vulnerability_scan="2026-09-21T20:00:00Z", compliance_status="non-compliant", firmware_version="1.92.8", last_config_change="2026-09-11T17:30:00Z", active_sessions=1, failed_logins=18, security_zone="trusted"),
    Device(id="dev-036", hostname="fw-ber02", ip=random_public_ip(), vendor="Fortinet", model="FortiGate 600E", site="Berlin DC", lat=52.52, lng=13.405, status="offline", security_score=60, last_vulnerability_scan="2026-09-19T09:00:00Z", compliance_status="non-compliant", firmware_version="6.4.8", last_config_change="2026-09-08T13:45:00Z", active_sessions=0, failed_logins=35, security_zone="untrusted"),
]

VULNERABILITIES: list[Vulnerability] = [
    Vulnerability(cve_id="CVE-2024-1234", severity="critical", description="Remote code execution in SSH daemon", affected_device_id="dev-003", discovered_date="2026-09-20T10:00:00Z", remediation_status="open"),
    Vulnerability(cve_id="CVE-2024-5678", severity="high", description="Buffer overflow in web interface", affected_device_id="dev-008", discovered_date="2026-09-18T14:30:00Z", remediation_status="in-progress"),
    Vulnerability(cve_id="CVE-2024-9012", severity="medium", description="Information disclosure in SNMP", affected_device_id="dev-014", discovered_date="2026-09-22T09:15:00Z", remediation_status="open"),
    Vulnerability(cve_id="CVE-2024-3456", severity="low", description="Weak default credentials", affected_device_id="dev-011", discovered_date="2026-09-15T16:45:00Z", remediation_status="resolved"),
    Vulnerability(cve_id="CVE-2024-7890", severity="critical", description="Authentication bypass in API", affected_device_id="dev-031", discovered_date="2026-09-19T11:20:00Z", remediation_status="open"),
    Vulnerability(cve_id="CVE-2024-2345", severity="high", description="Denial of service in routing protocol", affected_device_id="dev-023", discovered_date="2026-09-21T13:00:00Z", remediation_status="in-progress"),
    Vulnerability(cve_id="CVE-2024-6789", severity="medium", description="Cross-site scripting in admin panel", affected_device_id="dev-028", discovered_date="2026-09-17T15:30:00Z", remediation_status="open"),
    Vulnerability(cve_id="CVE-2024-0123", severity="low", description="Missing security headers", affected_device_id="dev-009", discovered_date="2026-09-16T10:45:00Z", remediation_status="resolved"),
]

SECURITY_EVENTS: list[SecurityEvent] = [
    SecurityEvent(id="evt-001", device_id="dev-003", event_type="brute_force", severity="high", timestamp="2026-09-25T14:30:00Z", description="Multiple failed login attempts detected", source_ip="192.168.1.100"),
    SecurityEvent(id="evt-002", device_id="dev-011", event_type="port_scan", severity="medium", timestamp="2026-09-25T13:45:00Z", description="Port scanning activity detected", source_ip="10.0.0.50"),
    SecurityEvent(id="evt-003", device_id="dev-008", event_type="config_change", severity="low", timestamp="2026-09-25T12:00:00Z", description="Firewall rule configuration changed", source_ip=None),
    SecurityEvent(id="evt-004", device_id="dev-031", event_type="anomaly", severity="critical", timestamp="2026-09-25T10:15:00Z", description="Unusual traffic pattern detected", source_ip="172.16.0.25"),
    SecurityEvent(id="evt-005", device_id="dev-014", event_type="brute_force", severity="high", timestamp="2026-09-25T09:30:00Z", description="SSH brute force attack blocked", source_ip="203.0.113.45"),
    SecurityEvent(id="evt-006", device_id="dev-023", event_type="config_change", severity="medium", timestamp="2026-09-25T08:00:00Z", description="ACL configuration modified", source_ip=None),
    SecurityEvent(id="evt-007", device_id="dev-036", event_type="anomaly", severity="high", timestamp="2026-09-24T23:45:00Z", description="Device offline unexpectedly", source_ip=None),
    SecurityEvent(id="evt-008", device_id="dev-028", event_type="port_scan", severity="low", timestamp="2026-09-24T22:15:00Z", description="Internal network scan detected", source_ip="192.168.2.10"),
]


@app.get("/health")
async def health_check():
    return {"status": "ok", "message": "Backend is running"}


@app.get("/api/devices")
async def get_devices():
    return {
        "devices": [d.model_dump() for d in DEVICES],
        "total": len(DEVICES),
    }


LATLNG_API_KEY = os.environ.get("LATLNG_API_KEY", "")
LATLNG_BASE_URL = "https://api.latlng.work"


@app.get("/api/geocode")
async def geocode(q: str):
    if not LATLNG_API_KEY:
        return {"error": "missing_api_key", "features": []}
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(
                f"{LATLNG_BASE_URL}/api",
                params={"q": q},
                headers={"X-Api-Key": LATLNG_API_KEY},
            )
            resp.raise_for_status()
            return resp.json()
    except Exception as exc:
        return {"error": str(exc), "features": []}


@app.get("/api/security/vulnerabilities")
async def get_vulnerabilities(device_id: str | None = None):
    filtered = VULNERABILITIES if device_id is None else [v for v in VULNERABILITIES if v.affected_device_id == device_id]
    return {
        "vulnerabilities": [v.model_dump() for v in filtered],
        "total": len(filtered),
        "by_severity": {
            "critical": len([v for v in filtered if v.severity == "critical"]),
            "high": len([v for v in filtered if v.severity == "high"]),
            "medium": len([v for v in filtered if v.severity == "medium"]),
            "low": len([v for v in filtered if v.severity == "low"]),
        }
    }


@app.get("/api/security/compliance")
async def get_compliance_report():
    compliant = len([d for d in DEVICES if d.compliance_status == "compliant"])
    non_compliant = len([d for d in DEVICES if d.compliance_status == "non-compliant"])
    pending = len([d for d in DEVICES if d.compliance_status == "pending"])
    avg_security_score = sum(d.security_score for d in DEVICES) / len(DEVICES) if DEVICES else 0
    
    return {
        "overall_compliance_rate": round((compliant / len(DEVICES)) * 100, 1) if DEVICES else 0,
        "device_status": {
            "compliant": compliant,
            "non_compliant": non_compliant,
            "pending": pending
        },
        "average_security_score": round(avg_security_score, 1),
        "by_site": {
            site: {
                "compliance_rate": round((len([d for d in DEVICES if d.site == site and d.compliance_status == "compliant"]) / len([d for d in DEVICES if d.site == site])) * 100, 1) if len([d for d in DEVICES if d.site == site]) > 0 else 0,
                "avg_security_score": round(sum(d.security_score for d in DEVICES if d.site == site) / len([d for d in DEVICES if d.site == site]), 1) if len([d for d in DEVICES if d.site == site]) > 0 else 0
            }
            for site in set(d.site for d in DEVICES)
        }
    }


@app.get("/api/security/events")
async def get_security_events(severity: str | None = None, limit: int = 50):
    filtered = SECURITY_EVENTS
    if severity:
        filtered = [e for e in SECURITY_EVENTS if e.severity == severity]
    return {
        "events": [e.model_dump() for e in filtered[:limit]],
        "total": len(filtered),
        "by_severity": {
            "critical": len([e for e in SECURITY_EVENTS if e.severity == "critical"]),
            "high": len([e for e in SECURITY_EVENTS if e.severity == "high"]),
            "medium": len([e for e in SECURITY_EVENTS if e.severity == "medium"]),
            "low": len([e for e in SECURITY_EVENTS if e.severity == "low"]),
        }
    }


@app.get("/api/devices/{device_id}/security")
async def get_device_security(device_id: str):
    device = next((d for d in DEVICES if d.id == device_id), None)
    if not device:
        return {"error": "Device not found"}
    
    device_vulnerabilities = [v for v in VULNERABILITIES if v.affected_device_id == device_id]
    device_events = [e for e in SECURITY_EVENTS if e.device_id == device_id]
    
    return {
        "device_id": device.id,
        "security_score": device.security_score,
        "compliance_status": device.compliance_status,
        "security_zone": device.security_zone,
        "last_vulnerability_scan": device.last_vulnerability_scan,
        "active_sessions": device.active_sessions,
        "failed_logins": device.failed_logins,
        "vulnerabilities": [v.model_dump() for v in device_vulnerabilities],
        "recent_events": [e.model_dump() for e in device_events[-5:]]
    }


class ScanRequest(BaseModel):
    device_id: str | None = None
    site: str | None = None
    scan_type: Literal["quick", "full"] = "quick"


class ScanProgress(BaseModel):
    scan_id: str
    device_id: str | None = None
    site: str | None = None
    status: Literal["queued", "in_progress", "completed", "failed"]
    progress: int
    start_time: str
    end_time: str | None = None
    vulnerabilities_found: int = 0
    scan_type: Literal["quick", "full"] = "quick"


# In-memory scan progress storage
SCAN_PROGRESS: dict[str, ScanProgress] = {}


@app.post("/api/security/scan")
async def trigger_scan(request: ScanRequest):
    """Trigger vulnerability scan for device or site"""
    scan_id = f"scan-{random.randint(10000, 99999)}"
    
    if request.device_id:
        device = next((d for d in DEVICES if d.id == request.device_id), None)
        if not device:
            return {"error": "Device not found"}
        
        progress = ScanProgress(
            scan_id=scan_id,
            device_id=request.device_id,
            site=None,
            status="in_progress",
            progress=0,
            start_time=datetime.now().isoformat(),
            end_time=None,
            vulnerabilities_found=0,
            scan_type=request.scan_type
        )
    elif request.site:
        devices = [d for d in DEVICES if d.site == request.site]
        if not devices:
            return {"error": "Site not found"}
        
        progress = ScanProgress(
            scan_id=scan_id,
            device_id=None,
            site=request.site,
            status="in_progress",
            progress=0,
            start_time=datetime.now().isoformat(),
            end_time=None,
            vulnerabilities_found=0,
            scan_type=request.scan_type
        )
    else:
        return {"error": "Either device_id or site must be specified"}
    
    SCAN_PROGRESS[scan_id] = progress
    
    # Simulate scan progress (in real implementation, this would be async)
    async def simulate_scan():
        for i in range(1, 101):
            await asyncio.sleep(0.05)  # Simulate scan time
            if scan_id in SCAN_PROGRESS:
                SCAN_PROGRESS[scan_id].progress = i
                if i == 100:
                    SCAN_PROGRESS[scan_id].status = "completed"
                    SCAN_PROGRESS[scan_id].end_time = datetime.now().isoformat()
                    # Random vulnerabilities found
                    SCAN_PROGRESS[scan_id].vulnerabilities_found = random.randint(0, 3)
    
    import asyncio
    asyncio.create_task(simulate_scan())
    
    return {
        "scan_id": scan_id,
        "status": "started",
        "target": request.device_id or request.site,
        "scan_type": request.scan_type
    }


@app.get("/api/security/scan/{scan_id}")
async def get_scan_progress(scan_id: str):
    """Get scan progress by scan ID"""
    progress = SCAN_PROGRESS.get(scan_id)
    if not progress:
        return {"error": "Scan not found"}
    return progress.model_dump()


@app.put("/api/security/vulnerabilities/{vulnerability_id}/remediation")
async def update_remediation(vulnerability_id: str, update: dict):
    """Update vulnerability remediation status"""
    vulnerability = next((v for v in VULNERABILITIES if v.cve_id == vulnerability_id), None)
    if not vulnerability:
        return {"error": "Vulnerability not found"}
    
    if "remediation_status" in update:
        vulnerability.remediation_status = update["remediation_status"]
    
    return vulnerability.model_dump()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)