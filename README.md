# CNC SmartCore: Unified CAD/CAM & Intelligent Machine Monitoring Platform

> **Final-Year Engineering Major Project**  
> Developed & Architected by **Pareekshith M Kumar**, 
> AI Monitoring by **Naveen Satvik N**,
> AI recommendation and ML models by **Syed Abdul Rahman**,
> CNC survey by **Tharun K P**.

---

## 🌟 Introduction

Welcome to **CNC SmartCore**! 

In traditional manufacturing, there is a painful disconnect between the **design office** and the **factory floor**:
1. CAD/CAM software designs toolpaths in isolation.
2. CNC machines on the shop floor run those toolpaths without automated feedback or condition monitoring.

**CNC SmartCore** bridges this gap into a **single, unified industrial portal with a single login**. It takes an engineering component from raw 3D CAD design, through rule-based material selection, toolpath simulation, and cryptographic engineering approval, directly into manufacturing orders, serialized assets (`ASSET-000123`), and real-time CNC machine sensor telemetry.

---

## 🚀 Key Features

### 🔵 Module 2: Pre-Manufacturing Engineering Platform
- **Interactive 3D CAD Studio:** Upload and inspect standard CAD files (`.step`, `.stl`, `.obj`). View 3D models in WebGL with automated bounding box, surface area, and volume calculations.
- **Rule-Based Material Advisory:** Recommends cutting speeds ($v_c$), specific cutting force ($k_c$), and feeds per tooth ($f_z$) across ISO material classes (ISO P, M, K, N, S, H).
- **CAM Toolpath & G-Code Emission:** Configures feeds, speeds, and depths of cut for Haas and DMG MORI machine envelopes, generating ISO 6983 compliant G-code.
- **Kinematic Simulation & Collision Checking:** Simulates rapid movements and tool envelopes to catch crashes before running on physical machines.
- **Cryptographic 4-Eyes Engineering Approvals:** Locks CAM plans with immutable SHA-256 digital signatures, requiring supervisor sign-off before manufacturing.
- **Serialized Asset Tracking:** Automatically stamps approved orders into traceable physical assets (e.g., `ASSET-000123`).

### 🟢 Module 1: Smart CNC Monitoring & AI Maintenance
- **Real-Time Fleet Cockpit:** Live status overview of all shop floor CNC machines (Running, Idle, Maintenance) with Overall Equipment Effectiveness (OEE).
- **High-Frequency Sensor Telemetry:** Tracks Spindle Speed (RPM), Cutting Feed (mm/min), Bearing Temperature (°C), and Accelerometer Vibration ($g$).
- **Taylor Tool Wear Progression:** Monitors cutting flank wear ($VB$) against the ISO 3685 standard threshold ($0.30\text{ mm}$ limit).
- **AI-Powered Predictive Maintenance:** Uses a trained Machine Learning model (Random Forest) to compute Machine Health Scores and predict Remaining Useful Life (RUL) before failure occurs.
- **Dynamic Job Scheduling:** Automated queue management assigning incoming manufacturing orders to available CNC machines based on makespan calculations.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Unified Shell Gateway** | React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons (Port `5173`) |
| **Module 2 Frontend** | React 18, TypeScript, Three.js / React Three Fiber, TanStack Query (Port `5174`) |
| **Module 1 Frontend** | React, Vite, Axios, Chart.js / Recharts (Port `5175`) |
| **Module 2 API Backend** | Java 21 / Spring Boot 3 REST API, JPA, H2 / PostgreSQL (Port `8080`) |
| **Module 1 API Backend** | Java 17 / Spring Boot REST API, Flyway, PostgreSQL (Port `8082`) |
| **Identity & Database** | Supabase Cloud (PostgreSQL with Row-Level Security & Auth) |
| **Predictive AI Engine** | Python, FastAPI, scikit-learn, joblib |

---

## 📋 Prerequisites

Before running the project locally, make sure you have the following installed on your system:

- **Node.js** (v18.0 or newer) & **npm**
- **Java Development Kit (JDK)**: JDK 17 or JDK 21
- **Apache Maven** (v3.8 or newer)
- **Git**

---

## 📥 How to Clone & Setup

### 1. Clone the Repository
Open your terminal or command prompt and clone the repository:

```bash
git clone https://github.com/Pareekshith-M-Kumar/CNC_SMARTCORE_UNIFIED.git
cd CNC_SMARTCORE_UNIFIED
```

### 2. Install Frontend Dependencies
Install dependencies for the Shell Gateway and both module frontends:

```bash
# 1. Install Shell dependencies
npm --prefix apps/shell install

# 2. Install Module 2 dependencies
npm --prefix modules/module2/frontend install

# 3. Install Module 1 dependencies
npm --prefix modules/module1/module-1-frontend install
```

---

## ⚡ How to Run the Project

You can run the entire unified platform using multiple terminal windows:

### Terminal 1: Module 2 Backend (Port 8080)
```bash
mvn spring-boot:run -Dspring-boot.run.profiles=local -f modules/module2/backend/pom.xml
```

### Terminal 2: Shell Web Portal (Port 5173 - Front Door)
```bash
npm --prefix apps/shell run dev
```

### Terminal 3: Module 2 Frontend (Port 5174)
```bash
npm --prefix modules/module2/frontend run dev
```

### Terminal 4: Module 1 Frontend (Port 5175)
```bash
npm --prefix modules/module1/module-1-frontend run dev
```

> **One-Stop Access:** Once started, open your browser at **`http://localhost:5173`**. The Shell proxy automatically routes `/m2/` to Module 2 and `/m1/` to Module 1!

---

## 🔑 Quick Login & Evaluation Credentials

To make evaluation and testing smooth, pre-configured roles are built right into the platform:

| Role | Email | Password | Access Capabilities |
|---|---|---|---|
| **Master Admin** | `cnc@gmail.com` | `Pareekshith` | Full System Access (All modules, settings, approvals) |
| **CAM Engineer** | `cam@cncsmartcore.local` | `Pareekshith` | CAD analysis, CAM toolpath, G-code generation |
| **Shop Machinist** | `operator@cncsmartcore.local` | `Pareekshith` | Machine monitoring, job queue, shop floor alerts |
| **CAD Designer** | `designer@cncsmartcore.local` | `Pareekshith` | 3D model uploading, geometry inspection |

*💡 Tip: On the login page, simply click **"Auto-fill Pareekshith Master Credentials"** and click **Sign In** to log in instantly!*

---

## 🔄 Digital-to-Physical Workflow (Demo Guide)

Follow this 5-minute journey to test the complete end-to-end integration:

1. **Sign In (`http://localhost:5173/login`):**
   - Click "Auto-fill Pareekshith Master Credentials" and sign in.
2. **CAD Studio (`/m2/cad/studio`):**
   - Upload any sample 3D CAD model (`bracket.step` or `cube_10mm.stl`).
   - Rotate the part in 3D and verify dimensions and volume.
3. **Material Selection (`/m2/materials`):**
   - Choose **Aluminium 6061-T6** or **Stainless Steel 304** to see recommended speeds and cutting forces.
4. **CAM & G-Code (`/m2/cam/studio`):**
   - Pick Haas VF-2 and a 10mm end mill.
   - Click **Generate Toolpath** to inspect the emitted G-code.
5. **Approval & Asset Binding (`/m2/approvals`):**
   - Click **Approve Plan**. The system computes a SHA-256 signature and registers physical asset **`ASSET-000123`**.
6. **Live CNC Monitoring (`/m1/`):**
   - Open **Module 1: Monitoring** in the top bar.
   - Watch CNC Machine `CNC-001` running with active spindle telemetry, vibration sensing, and AI-predicted tool wear for `ASSET-000123`!

---

## 🛡️ Security & Architecture Principles

- **Zero Hardcoded Passwords:** Passwords and keys are never committed; sensitive configurations are isolated in server-side stores.
- **SHA-256 Verification:** CAD drawings and emitted G-codes are hashed to prevent unauthorized shop-floor modifications.
- **Role-Based Access Control (RBAC):** Frontend route guards and backend authorization verify whether a user has permission to approve plans or start machining.
- **Industrial Design System:** Tailored with a modern shop-floor theme with high-contrast readouts, dark mode, and responsive layouts.

---

## 👨‍💻 Project Author

**Pareekshith M Kumar**  
*Lead Developer & Architect — Final-Year Engineering Major Project*  
GitHub: [@Pareekshith-M-Kumar](https://github.com/Pareekshith-M-Kumar)
