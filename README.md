# Network Device Inventory Manager

An enterprise-grade, single-source-of-truth web application designed for Network Engineers and System Administrators to systematically track, monitor, and manage network hardware assets across corporate subnets[cite: 1].

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Python](https://img.shields.io/badge/Python-3.11%2B-blue)
![FastAPI](https://img.shields.io/badge/FastAPI-0.111.0-009688)
![Next.js](https://img.shields.io/badge/Next.js-16.3.5-black)

---

## Key Features

* **Centralized Asset Management:** Full CRUD (Create, Read, Update, Delete) operations for network devices including Routers, Switches, Firewalls, Access Points, and Servers[cite: 1].
* **Network Data Validation:** Built-in IPv4/IPv6 string validation and automatic MAC address normalization (`XX:XX:XX:XX:XX:XX`)[cite: 1].
* **Relational Location Mapping:** Track device placement by sites, buildings, and specific server racks[cite: 1].
* **Real-time Analytics Dashboard:** Live performance metrics with waveform visualization, CPU/MEM/TEMP/LAT monitoring, and bandwidth tracking.
* **Interactive Network Topology:** Visual SVG-based topology widget with datacenter navigation, status filtering, and clickable device nodes.
* **Organized Network Modal:** Split-view modal with network topology on the left and device details on the right, including Update, Delete, and New Device actions.
* **Automated API Documentation:** Interactive OpenAPI/Swagger docs generated directly by FastAPI[cite: 1].

---

## Tech Stack & Architecture

* **Frontend:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS, Lucide Icons[cite: 1].
* **Backend:** FastAPI, Pydantic v2, in-memory data store[cite: 1].
* **Mapping:** MapLibre GL JS, deck.gl for 3D globe and arc visualization[cite: 1].

---

## Data Model Overview

The application uses Pydantic models to represent network inventory data[cite: 1]:

* **`Device`**: Stores `hostname`, `ip`, `vendor`, `model`, `site`, `lat`, `lng`, `status`, `security_score`, `compliance_status`, `firmware_version`, `security_zone`, and related telemetry[cite: 1].
* **`Vulnerability`**: Stores `cve_id`, `severity`, `description`, `affected_device_id`, `discovered_date`, `remediation_status`[cite: 1].
* **`SecurityEvent`**: Stores `event_type`, `severity`, `timestamp`, `description`, `source_ip`[cite: 1].
* **`ScanProgress`**: Tracks vulnerability scan progress by `scan_id`[cite: 1].

---

## Waterfall Development Lifecycle Status

This repository strictly adheres to a structured development methodology[cite: 1]:

- [x] **Phase 1: Requirements & SRS Specification** (Completed)[cite: 1]
- [x] **Phase 2: System Design & Architecture** (Completed)[cite: 1]
- [ ] **Phase 3: Implementation & Development** (In Progress)[cite: 1]
- [ ] **Phase 4: Testing & Quality Assurance** (Pending)[cite: 1]
- [ ] **Phase 5: Deployment & Release** (Pending)[cite: 1]

---

## Interface & Functional Updates

### Analytics Widget
- Live signal waveform visualization with real-time updates.
- Dynamic CPU, Memory, Temperature, and Latency metrics with progress bars.
- Bandwidth in/out monitoring with simulated live data.

### Network Topology Widget
- SVG-based topology visualization with support for Star, Bus, Ring, Mesh, Tree, and Hybrid layouts.
- Datacenter navigation with arrow buttons.
- Status filtering (All, Online, Warning, Offline).
- Clickable device nodes that trigger selection.

### Organized Network Modal
- Left panel: Full network topology widget with datacenter arrows, status filters, and clickable device icons.
- Right panel: Selected device details including hostname, IP, vendor, model, site, coordinates, and status.
- Action buttons: Update, Delete, and New Device.
- Tree topology layout with Parent Node, Level 1, and Level 2 device tiers.

---

## Getting Started (Local Development)

### Prerequisites
* **Python 3.11+**
* **Node.js 18+** and npm

### Installation

1. Clone the repository:
    ```bash
    git clone https://github.com/Joel-Freude/Network-Device-Inventory-Manager.git
    cd Network-Device-Inventory-Manager
    ```

2. Start the backend server:
    ```bash
    cd backend
    pip install -r requirements.txt
    uvicorn main:app --reload
    ```

3. In a new terminal, start the frontend development server:
    ```bash
    cd frontend
    npm install
    npm run dev
    ```

4. Access the application services:

* Frontend Dashboard: http://localhost:3000
* FastAPI Interactive Docs (Swagger): http://localhost:8000/docs

4. License
* **Distributed under the MIT License.** 
