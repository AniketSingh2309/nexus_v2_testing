# ☁️ CloudNexus — Multi-Cloud Monitoring Dashboard

A production-grade, real-time monitoring system for AWS, GCP, and Azure — built with React + Node.js + Socket.IO. Inspired by Zabbix, Nagios, and Prometheus.

---

## 🚀 Quick Start (VS Code)

### Prerequisites
- **Node.js** v18 or later ([nodejs.org](https://nodejs.org))
- **npm** v9+
- VS Code with the recommended extensions (optional)

---

### 1. Install dependencies

Open two terminals in VS Code.

**Terminal 1 — Backend:**
```bash
cd backend
npm install
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm install
```

---

### 2. Configure environment (optional for mock mode)

```bash
cd backend
cp .env.example .env
# Edit .env if you want pre-configured cloud credentials
```

---

### 3. Start the servers

**Terminal 1 — Backend (port 3001):**
```bash
cd backend
npm run dev        # with nodemon (auto-restart)
# or
npm start          # production
```

**Terminal 2 — Frontend (port 5173):**
```bash
cd frontend
npm run dev
```

Open **http://localhost:5173** in your browser.

---

## 🎮 Usage

### Mock Mode (no credentials needed)
The app starts in **Mock mode** by default with realistic sample data for all three providers. Click any tab to explore the UI.

### Real Mode — Connecting Cloud Accounts
Click **"Connect"** tab or **"🔌 Connect"** button in the topbar:

#### AWS
1. Create an IAM user with `ReadOnlyAccess` policy
2. Generate Access Keys in IAM Console
3. Paste Access Key ID + Secret in the AWS form
4. Select regions to scan
5. Click **Connect AWS Account**
> **Note:** EC2 disk usage metrics rely on the AWS CloudWatch Agent (`CWAgent`). Install and configure the CloudWatch Agent on instances if you want filesystem/disk metrics.
>> **IAM Role alternative:** Create a role with trust relationship, paste the Role ARN

#### GCP
1. Create a Service Account in Google Cloud Console
2. Grant **roles/viewer** + **roles/monitoring.viewer**
3. Create and download a JSON key
4. Upload or paste the JSON in the GCP form
5. Enter your Project ID
6. Click **Connect GCP Project**

#### Azure
1. Register an app in Azure Active Directory (App registrations)
2. Create a Client Secret
3. Assign **Reader** role at Subscription scope:
   ```bash
   az role assignment create \
     --role Reader \
     --assignee <clientId> \
     --scope /subscriptions/<subscriptionId>
   ```
4. Fill in Tenant ID, Client ID, Client Secret, Subscription ID
5. Click **Connect Azure Subscription**

---

## 📁 Project Structure

```
cloudnexus/
├── backend/
│   ├── server.js              # Express + Socket.IO server
│   ├── services/
│   │   ├── awsService.js      # AWS SDK v3 integration (EC2, RDS, S3, Lambda, EKS...)
│   │   ├── gcpService.js      # Google APIs (Compute, GKE, SQL, GCS, Functions...)
│   │   ├── azureService.js    # Azure SDK (VMs, AKS, SQL, Storage, Cosmos...)
│   │   └── alertService.js    # Alert aggregation + threshold rules
│   └── utils/
│       ├── credentialStore.js # AES-256-GCM in-memory credential store
│       └── normalizer.js      # Cross-cloud resource normalizer
│
└── frontend/
    └── src/
        ├── App.jsx                        # Main app with real + mock data switching
        ├── components/
        │   ├── Topbar.jsx                 # Search, filters, mode toggle
        │   ├── ProviderCard.jsx           # AWS / GCP / Azure summary cards
        │   ├── ServiceDetailTable.jsx     # Sortable resource table
        │   ├── NetworkTopologyMap.jsx     # Interactive network graph
        │   ├── AlertsPanel.jsx            # Alert list with acknowledge
        │   ├── ResourceDetailDrawer.jsx   # Slide-in resource details
        │   ├── CloudConnectModal.jsx      # Cloud account connection forms
        │   ├── MetricRow.jsx              # KPI metric strips
        │   └── OverviewCharts.jsx         # Cost, health, family charts
        ├── hooks/
        │   └── useSocket.js               # WebSocket real-time hook
        └── utils/
            ├── api.js                     # REST API client
            ├── theme.js                   # Colors, formatting, icons
            └── mockData.js                # Rich sample data (35 resources)
```

---

## ✨ Features

| Feature | Description |
|---|---|
| 🔴 Real-time updates | WebSocket via Socket.IO — 5-min auto-refresh + instant on-connect |
| 🌐 Multi-cloud | AWS, GCP, Azure in one unified view |
| 🗺️ Network topology | Interactive force-directed graph of all resources + connections |
| ⚠️ Smart alerts | CloudWatch + Cloud Monitoring + Azure Monitor + auto-generated threshold alerts |
| 🔍 Global search | Filter by name, type, region across all providers |
| 📊 Overview charts | Cost breakdown, health distribution, service family breakdown |
| 🗄️ Resource drawer | Click any resource for full details: specs, metrics, connections, tags |
| 🛡️ Secure credentials | AES-256-GCM encrypted in memory — never written to disk |
| 🌙 Dark mode | Automatic via OS preference |
| 📱 Responsive | Works on tablet and mobile |

---

## 🔧 AWS Resources Fetched
EC2 Instances · RDS Instances · S3 Buckets · Lambda Functions · EKS Clusters · ElastiCache · Application Load Balancers · SQS Queues · VPCs · CloudWatch Alarms

## 🔵 GCP Resources Fetched
Compute Engine VMs · GKE Clusters · Cloud SQL · Cloud Storage · Cloud Functions · BigQuery Datasets · Pub/Sub Topics · VPC Networks · Cloud Monitoring Alerts

## 🔷 Azure Resources Fetched
Virtual Machines · AKS Clusters · SQL Databases · Storage Accounts · Cosmos DB · Event Hub · Function Apps · Virtual Networks · Azure Monitor Alerts

---

## 🔒 Security Notes

- All cloud credentials are **AES-256-GCM encrypted** in server memory using a random session key
- Credentials are **never written to disk**, never logged, never sent to third parties
- The backend only calls **read-only** cloud APIs
- Credentials are lost when the server restarts (by design) — reconnect via the UI
- For production: use a proper secrets manager (AWS Secrets Manager, GCP Secret Manager, Azure Key Vault)

---

## 🛠 Troubleshooting

**Backend won't start:**
```bash
# Check Node.js version
node --version   # must be 18+

# Re-install dependencies
rm -rf node_modules && npm install
```

**"Backend offline" banner in UI:**
- Make sure backend is running on port 3001
- Check for port conflicts: `lsof -i :3001`

**AWS connection fails:**
- Verify IAM user has `ReadOnlyAccess`
- Check the selected region matches where your resources are
- For STS errors, ensure your IAM user has `sts:GetCallerIdentity`

**GCP connection fails:**
- Ensure `cloudasset.googleapis.com` and `compute.googleapis.com` are enabled
- Service account needs `roles/viewer` at project level

**Azure connection fails:**
- Verify the Service Principal has `Reader` role at subscription scope
- Double-check Tenant ID, Client ID, and Secret value (not secret ID)
