# CloudNexus Website

A modern cloud infrastructure management dashboard built with React, featuring real-time analytics, cost optimization, and multi-cloud support.

## Features

- 📊 **Real-Time Insights** - Monitor infrastructure usage and performance with live telemetry
- 💸 **Cost Optimization** - Identify waste automatically and surface actionable recommendations
- ☁️ **Multi-Cloud Support** - Unified control plane for AWS, Azure, and GCP
- 🔒 **Built-In Security** - Enterprise-grade encryption and access controls
- 🔮 **Usage Forecasting** - ML-powered predictions for demand planning
- ⚡ **Automatic Scaling** - Elastic infrastructure that responds to demand spikes

## Setup Instructions

### Prerequisites
- Node.js 18+ and npm

### Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up EmailJS (for OTP authentication):**
   - Go to [EmailJS](https://www.emailjs.com/)
   - Create a free account and set up an email service
   - Copy your Service ID, Template ID, and Public Key
   - Update `src/App.jsx` lines 6-8 with your credentials:
     ```javascript
     const EMAILJS_SERVICE_ID  = "your_service_id";
     const EMAILJS_TEMPLATE_ID = "your_template_id";
     const EMAILJS_PUBLIC_KEY  = "your_public_key";
     ```

### Development

Start the development server:
```bash
npm run dev
```

The app will open at `http://localhost:5173`

### Building

Build for production:
```bash
npm run build
```

Preview production build:
```bash
npm run preview
```

## Project Structure

```
CloudNexus_Website/
├── src/
│   ├── App.jsx          # Main application component
│   └── main.jsx         # React entry point
├── index.html           # HTML template
├── vite.config.js       # Vite configuration
├── package.json         # Dependencies and scripts
└── README.md            # This file
```

## Authentication Flow

1. User enters credentials on the sign-in or registration page
2. System validates credentials against localStorage
3. OTP is generated and sent via EmailJS
4. User verifies OTP within 60 seconds
5. User session is stored in localStorage
6. Dashboard becomes accessible

## AI Billing & Usage Monitoring

Tracks spend across AI provider APIs (OpenAI, Anthropic, Gemini, Azure OpenAI, AWS Bedrock, Vertex AI) the same
way the existing AWS/Azure/GCP panels track cloud spend, with budget thresholds and email alerts.

**Architecture:** the Python billing backend (`Billing_tool/Cloudnexus-billing-main/backend/ai_usage_collectors.py`)
polls each provider's own usage/cost API on a background thread (`main.py`, every `AI_BILLING_POLL_INTERVAL_MINUTES`,
default 30). It never writes to SQLite directly — the Node monitoring backend (`cloudnexus_db.cjs`) is the sole
database writer, so Python hands normalized results to Node's `/internal/ai-billing/*` routes, authenticated with a
shared `AI_BILLING_INTERNAL_SECRET`. Node stores the usage events, evaluates budgets (warning at `warn_pct`, default
70%, and exceeded at 100%, debounced once per period), and sends alert emails through the existing SMTP setup.

**Required env vars** (add to the root `.env` — both processes read it):
- `AI_BILLING_INTERNAL_SECRET` — shared secret between the two backends. Generate with `openssl rand -hex 32`.
- `AI_BILLING_POLL_INTERVAL_MINUTES` — optional, defaults to `30`.
- `ENCRYPTION_KEY` — already required for cloud credentials; AI provider keys are encrypted with the same key.

**Onboarding a provider key** — from the Admin Portal → **AI Billing** → *Add Provider Key*:
| Provider | Fields required |
|---|---|
| OpenAI | Admin API key (Organization → Admin keys, needs usage/cost read scope) |
| Anthropic | Admin API key (Console → Organization → Admin keys) |
| Azure OpenAI | Subscription ID, Tenant ID, Client ID, Client Secret (service principal with Cost Management Reader on the subscription) |
| AWS Bedrock | Access Key ID, Secret Access Key, Region (IAM user/role with `ce:GetCostAndUsage`) |
| Gemini / Vertex AI | GCP Project ID, Service Account JSON (needs `roles/billing.viewer` on the linked billing account — without it, that key is reported as "billing export not connected" and simply skipped each poll, not treated as an error) |

Then set a budget (org-wide, per team, or per key) from the same screen to start getting warning/exceeded emails.

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

## License

MIT

## Support

For issues or questions, please refer to the documentation or create an issue in the repository.
