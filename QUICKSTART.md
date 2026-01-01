# DamageTrack Quick Start Guide

AI-powered property damage detection using computer vision to streamline dispute resolution. Get your first automated inspection running in under 5 minutes.

## Prerequisites

| Requirement | Version | Purpose |
|-------------|---------|---------|
| Nexus Platform | 1.0.0+ | Plugin runtime environment |
| Node.js | 20+ | JavaScript runtime (for SDK) |
| API Key | - | Authentication |

## Installation Methods

### Method 1: Nexus Marketplace (Recommended)

1. Navigate to **Marketplace** in your Nexus Dashboard
2. Search for "DamageTrack"
3. Click **Install** and select your pricing tier
4. The plugin activates automatically within 60 seconds

### Method 2: Nexus CLI

```bash
nexus plugin install nexus-damagetracking
nexus config set DAMAGETRACKING_API_KEY your-api-key-here
```

### Method 3: API Installation

```bash
curl -X POST https://api.adverant.ai/v1/plugins/install \
  -H "Authorization: Bearer YOUR_NEXUS_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "pluginId": "nexus-damagetracking",
    "tier": "professional",
    "autoActivate": true
  }'
```

---

## Your First Operation: Analyze Property Images

### Step 1: Set Your API Key

```bash
export NEXUS_API_KEY="your-api-key-here"
```

### Step 2: Submit Images for Analysis

```bash
curl -X POST "https://api.adverant.ai/proxy/damage/api/v1/inspect" \
  -H "Authorization: Bearer $NEXUS_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "propertyId": "prop-001",
    "inspectionType": "checkout",
    "images": [
      {
        "url": "https://storage.example.com/living-room.jpg",
        "location": "living_room"
      },
      {
        "url": "https://storage.example.com/bedroom.jpg",
        "location": "bedroom"
      }
    ]
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "inspectionId": "insp-abc123",
    "propertyId": "prop-001",
    "damagesDetected": 2,
    "findings": [
      {
        "location": "living_room",
        "damageType": "scratch",
        "severity": "minor",
        "confidence": 0.94,
        "estimatedCost": 150.00,
        "boundingBox": { "x": 120, "y": 340, "width": 80, "height": 40 }
      },
      {
        "location": "bedroom",
        "damageType": "stain",
        "severity": "moderate",
        "confidence": 0.89,
        "estimatedCost": 275.00,
        "boundingBox": { "x": 200, "y": 450, "width": 150, "height": 100 }
      }
    ],
    "totalEstimatedCost": 425.00,
    "analyzedAt": "2025-01-01T10:30:00Z"
  }
}
```

---

## API Reference

**Base URL:** `https://api.adverant.ai/proxy/damage/api/v1`

### Analyze Images for Damage
```bash
curl -X POST "https://api.adverant.ai/proxy/damage/api/v1/inspect" \
  -H "Authorization: Bearer $NEXUS_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "propertyId": "prop-001",
    "inspectionType": "checkout",
    "images": [{"url": "...", "location": "living_room"}]
  }'
```

### Get Damage Reports
```bash
curl -X GET "https://api.adverant.ai/proxy/damage/api/v1/reports/prop-001" \
  -H "Authorization: Bearer $NEXUS_API_KEY"
```

### Generate Cost Estimate
```bash
curl -X POST "https://api.adverant.ai/proxy/damage/api/v1/estimate" \
  -H "Authorization: Bearer $NEXUS_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "inspectionId": "insp-abc123",
    "includeLabor": true,
    "region": "US-CA"
  }'
```

### Get Damage Analytics
```bash
curl -X GET "https://api.adverant.ai/proxy/damage/api/v1/analytics?period=last_90_days" \
  -H "Authorization: Bearer $NEXUS_API_KEY"
```

---

## SDK Examples

### TypeScript

```typescript
import { NexusClient } from '@adverant/nexus-sdk';

const nexus = new NexusClient({
  apiKey: process.env.NEXUS_API_KEY
});

const damageTrack = nexus.plugin('nexus-damagetracking');

// Analyze property images
const inspection = await damageTrack.inspect({
  propertyId: 'prop-001',
  inspectionType: 'checkout',
  images: [
    { url: 'https://storage.example.com/photo1.jpg', location: 'living_room' },
    { url: 'https://storage.example.com/photo2.jpg', location: 'bedroom' }
  ]
});

console.log(`Damages Found: ${inspection.damagesDetected}`);
console.log(`Estimated Cost: $${inspection.totalEstimatedCost}`);

// Get detailed cost estimate
const estimate = await damageTrack.estimate.generate({
  inspectionId: inspection.inspectionId,
  includeLabor: true,
  region: 'US-CA'
});

estimate.lineItems.forEach(item => {
  console.log(`${item.description}: $${item.cost}`);
});
```

### Python

```python
from adverant_nexus import NexusClient
import os

nexus = NexusClient(api_key=os.environ["NEXUS_API_KEY"])
damage_track = nexus.plugin("nexus-damagetracking")

# Analyze property images
inspection = damage_track.inspect(
    property_id="prop-001",
    inspection_type="checkout",
    images=[
        {"url": "https://storage.example.com/photo1.jpg", "location": "living_room"},
        {"url": "https://storage.example.com/photo2.jpg", "location": "bedroom"}
    ]
)

print(f"Damages Found: {inspection.damages_detected}")
print(f"Estimated Cost: ${inspection.total_estimated_cost}")

# Compare check-in vs checkout
comparison = damage_track.compare(
    property_id="prop-001",
    checkin_inspection_id="insp-checkin-123",
    checkout_inspection_id=inspection.inspection_id
)

print(f"New Damages: {len(comparison.new_damages)}")
print(f"Chargeable Amount: ${comparison.chargeable_amount}")
```

---

## Pricing

| Tier | Price | Inspections/mo | Features |
|------|-------|----------------|----------|
| **Starter** | $99/mo | 100 | Basic detection, Reports |
| **Professional** | $299/mo | 500 | Advanced detection, Cost estimation, Analytics |
| **Enterprise** | Custom | Unlimited | Custom models, Insurance integration |

---

## Next Steps

- [Use Cases Guide](./USE-CASES.md) - Real-world implementation scenarios
- [Architecture Overview](./ARCHITECTURE.md) - System design and integration
- [API Reference](./docs/api-reference/endpoints.md) - Complete endpoint documentation

## Support

- **Documentation**: [docs.adverant.ai/plugins/damagetracking](https://docs.adverant.ai/plugins/damagetracking)
- **Community**: [community.adverant.ai](https://community.adverant.ai)
- **Email**: plugins@adverant.ai
