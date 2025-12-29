<p align="center">
  <img src="assets/icon.png" alt="DamageTracking Logo" width="120" height="120">
</p>

<h1 align="center">DamageTracking</h1>

<p align="center">
  <strong>AI Vision Damage Detection</strong>
</p>

<p align="center">
  <a href="https://github.com/adverant/Adverant-Nexus-Plugin-DamageTracking/actions"><img src="https://github.com/adverant/Adverant-Nexus-Plugin-DamageTracking/workflows/CI/badge.svg" alt="CI Status"></a>
  <a href="https://github.com/adverant/Adverant-Nexus-Plugin-DamageTracking/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-Apache%202.0-blue.svg" alt="License"></a>
  <a href="https://marketplace.adverant.ai/plugins/damage-tracking"><img src="https://img.shields.io/badge/Nexus-Marketplace-purple.svg" alt="Nexus Marketplace"></a>
  <a href="https://discord.gg/adverant"><img src="https://img.shields.io/discord/123456789?color=7289da&label=Discord" alt="Discord"></a>
</p>

<p align="center">
  <a href="#features">Features</a> -
  <a href="#quick-start">Quick Start</a> -
  <a href="#use-cases">Use Cases</a> -
  <a href="#pricing">Pricing</a> -
  <a href="#documentation">Documentation</a>
</p>

---

## Protect Your Properties with AI

**DamageTracking** is a Nexus Marketplace plugin that uses computer vision AI to detect property damage, automate repair estimates, and streamline claims documentation. From pre-stay inspections to post-checkout damage assessment, protect your investment with intelligent damage detection.

### Why DamageTracking?

- **AI Photo Analysis**: Computer vision detects damage in inspection photos automatically
- **Automated Estimates**: Instant repair cost estimates based on damage type and severity
- **Claims Documentation**: Generate comprehensive damage reports for insurance claims
- **Before/After Comparison**: Visual side-by-side comparison of property condition
- **Vendor Coordination**: Integrated work order management for repairs

---

## Features

### AI-Powered Damage Detection

| Feature | Description |
|---------|-------------|
| **Photo Analysis** | Upload photos and AI identifies damage, stains, scratches, and wear |
| **Damage Classification** | Categorize by type: structural, cosmetic, appliance, furniture |
| **Severity Scoring** | 1-10 severity rating with confidence scores |
| **Location Mapping** | Visual property map showing damage locations |

### Inspection Workflow

| Feature | Description |
|---------|-------------|
| **Pre-Stay Inspection** | Document property condition before guest arrival |
| **Post-Checkout Inspection** | Systematic review after guest departure |
| **Comparison Engine** | Automatic before/after photo matching and comparison |
| **Inspector App** | Mobile app for guided room-by-room inspections |

### Repair Management

| Feature | Description |
|---------|-------------|
| **Cost Estimation** | AI-generated repair cost estimates based on damage type |
| **Vendor Network** | Connect with local repair vendors and contractors |
| **Work Orders** | Create and track repair work orders |
| **Invoice Tracking** | Capture repair invoices and match to damage records |

---

## Quick Start

### Installation

```bash
nexus plugin install nexus-damage-tracking
```

### Create an Inspection

```bash
curl -X POST "https://api.adverant.ai/proxy/nexus-damage-tracking/api/v1/inspections" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "propertyId": "prop_abc123",
    "type": "post_checkout",
    "reservationId": "res_xyz789",
    "inspectorId": "user_123"
  }'
```

### Upload Inspection Photos

```bash
curl -X POST "https://api.adverant.ai/proxy/nexus-damage-tracking/api/v1/inspections/insp_001/photos" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -F "photos=@living_room.jpg" \
  -F "room=living_room"
```

---

## Use Cases

### Vacation Rental Operators

#### 1. Guest Accountability
Document property condition before and after every stay. AI-powered comparison makes it easy to identify new damage and associate it with specific guests.

#### 2. Faster Turnarounds
Quick mobile inspections with AI analysis mean you spend less time on documentation and more time preparing for the next guest.

### Insurance & Claims

#### 3. Claims Documentation
Generate comprehensive damage reports that meet insurance requirements. Timestamped photos, AI analysis, and repair estimates in one document.

---

## Pricing

| Feature | Starter | Professional | Enterprise |
|---------|---------|--------------|------------|
| **Price** | $59/mo | $149/mo | $449/mo |
| **Properties** | Up to 20 | Up to 100 | Unlimited |
| **AI Analyses/month** | 100 | 500 | Unlimited |
| **Photo Storage** | 5 GB | 50 GB | Unlimited |
| **Inspections/month** | 50 | 250 | Unlimited |

[View on Nexus Marketplace](https://marketplace.adverant.ai/plugins/damage-tracking)

---

## API Overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/inspections` | Create new inspection |
| `GET` | `/inspections` | List inspections |
| `POST` | `/inspections/:id/photos` | Upload inspection photos |
| `GET` | `/inspections/:id/analysis` | Get AI analysis results |
| `POST` | `/damages` | Report damage manually |
| `POST` | `/work-orders` | Create work order |
| `GET` | `/reports/:inspectionId` | Generate damage report |

Full API documentation: [docs/api-reference/endpoints.md](docs/api-reference/endpoints.md)

---

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup

```bash
git clone https://github.com/adverant/Adverant-Nexus-Plugin-DamageTracking.git
cd Adverant-Nexus-Plugin-DamageTracking
npm install
npm run prisma:generate
npm run dev
```

---

## Community & Support

- **Documentation**: [docs.adverant.ai/plugins/damage-tracking](https://docs.adverant.ai/plugins/damage-tracking)
- **Discord**: [discord.gg/adverant](https://discord.gg/adverant)
- **Email**: support@adverant.ai

---

## License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

---

<p align="center">
  <strong>Built with care by <a href="https://adverant.ai">Adverant</a></strong>
</p>
