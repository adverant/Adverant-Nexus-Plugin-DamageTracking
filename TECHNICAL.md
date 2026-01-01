# DamageTracking Technical Specification

Complete technical reference for integrating the DamageTracking plugin.

---

## API Reference

### Base URL

```
https://api.adverant.ai/proxy/nexus-damagetracking/api/v1/damage
```

All endpoints require authentication via Bearer token in the Authorization header.

---

### Endpoints

#### Analyze Images for Damage

```http
POST /inspect
```

Analyzes uploaded images using computer vision to detect and classify damage.

**Request Body (multipart/form-data):**
```
propertyId: prop_abc123
unitId: unit_xyz (optional)
inspectionType: pre_stay | post_checkout | routine | incident
room: living_room | bedroom | bathroom | kitchen | exterior | other
photos: (binary files - up to 20 images)
referenceInspectionId: insp_prev123 (optional - for comparison)
notes: Additional context for the AI
```

**Response:**
```json
{
  "success": true,
  "data": {
    "inspectionId": "insp_abc123",
    "propertyId": "prop_abc123",
    "status": "completed",
    "summary": {
      "totalImages": 15,
      "imagesWithDamage": 3,
      "damageCount": 5,
      "estimatedTotalCost": 850,
      "severityBreakdown": {
        "severe": 0,
        "moderate": 2,
        "minor": 3
      }
    },
    "damages": [
      {
        "id": "dmg_xyz789",
        "imageId": "img_001",
        "type": "scratch",
        "category": "furniture",
        "location": "living_room",
        "description": "Deep scratch on hardwood floor near couch",
        "severity": "moderate",
        "severityScore": 6,
        "confidence": 0.94,
        "boundingBox": {
          "x": 120,
          "y": 340,
          "width": 200,
          "height": 50
        },
        "estimatedRepairCost": {
          "min": 150,
          "max": 300,
          "average": 225
        },
        "repairType": "floor_refinishing",
        "isNewDamage": true,
        "comparedTo": "insp_prev123"
      }
    ],
    "comparison": {
      "referenceInspectionId": "insp_prev123",
      "newDamages": 2,
      "unchangedDamages": 1,
      "repairedDamages": 0
    },
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

---

#### Get Damage Reports

```http
GET /reports/:propertyId
```

Retrieves damage reports for a property.

**Query Parameters:**
- `status`: `open | in_progress | repaired | claimed`
- `severity`: `minor | moderate | severe`
- `category`: `structural | furniture | appliance | flooring | wall | other`
- `dateFrom`: ISO 8601 date
- `dateTo`: ISO 8601 date
- `limit`: Number of results
- `offset`: Pagination offset

**Response:**
```json
{
  "success": true,
  "data": {
    "propertyId": "prop_abc123",
    "reports": [
      {
        "reportId": "rpt_abc123",
        "inspectionId": "insp_xyz789",
        "createdAt": "2024-01-15T10:30:00Z",
        "inspectionType": "post_checkout",
        "reservationId": "res_def456",
        "guestName": "John Smith",
        "summary": {
          "damageCount": 3,
          "totalEstimatedCost": 450,
          "severityMax": "moderate"
        },
        "status": "open",
        "claimStatus": null
      }
    ],
    "pagination": {
      "total": 24,
      "limit": 20,
      "offset": 0
    },
    "aggregates": {
      "totalDamages": 45,
      "totalEstimatedCost": 12500,
      "averagePerInspection": 520
    }
  }
}
```

---

#### Generate Cost Estimate

```http
POST /estimate
```

Generates detailed repair cost estimates for identified damages.

**Request Body:**
```json
{
  "inspectionId": "insp_abc123",
  "damageIds": ["dmg_xyz789", "dmg_abc456"],
  "location": {
    "city": "Miami",
    "state": "FL",
    "zipCode": "33139"
  },
  "urgency": "standard | rush",
  "includeVendorQuotes": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "estimateId": "est_abc123",
    "inspectionId": "insp_abc123",
    "damages": [
      {
        "damageId": "dmg_xyz789",
        "description": "Deep scratch on hardwood floor",
        "repairOptions": [
          {
            "type": "spot_repair",
            "description": "Sand and refinish affected area",
            "cost": {
              "labor": 150,
              "materials": 50,
              "total": 200
            },
            "duration": "2-4 hours",
            "recommended": true
          },
          {
            "type": "full_refinish",
            "description": "Complete floor refinishing",
            "cost": {
              "labor": 800,
              "materials": 200,
              "total": 1000
            },
            "duration": "1-2 days",
            "recommended": false
          }
        ]
      }
    ],
    "vendorQuotes": [
      {
        "vendorId": "vendor_abc",
        "vendorName": "Miami Floor Pros",
        "rating": 4.8,
        "quote": 185,
        "availability": "Next business day",
        "warranty": "90 days"
      }
    ],
    "totalEstimate": {
      "min": 350,
      "max": 550,
      "recommended": 425
    },
    "generatedAt": "2024-01-15T10:30:00Z",
    "validUntil": "2024-01-22T10:30:00Z"
  }
}
```

---

#### Get Damage Analytics

```http
GET /analytics
```

Returns damage trends and analytics across properties.

**Query Parameters:**
- `propertyId`: Filter by property (optional)
- `period`: `week | month | quarter | year`
- `groupBy`: `property | category | severity | room`

**Response:**
```json
{
  "success": true,
  "data": {
    "period": {
      "start": "2024-01-01",
      "end": "2024-01-31"
    },
    "overview": {
      "totalInspections": 150,
      "totalDamages": 45,
      "damageRate": 0.30,
      "totalEstimatedCost": 12500,
      "totalActualCost": 9800,
      "costVariance": -0.22
    },
    "trends": {
      "damagesByWeek": [
        { "week": "2024-W01", "count": 8, "cost": 2100 },
        { "week": "2024-W02", "count": 12, "cost": 3500 }
      ]
    },
    "byCategory": [
      {
        "category": "furniture",
        "count": 18,
        "percentage": 0.40,
        "totalCost": 5200
      },
      {
        "category": "flooring",
        "count": 12,
        "percentage": 0.27,
        "totalCost": 4800
      }
    ],
    "bySeverity": {
      "minor": { "count": 28, "percentage": 0.62 },
      "moderate": { "count": 14, "percentage": 0.31 },
      "severe": { "count": 3, "percentage": 0.07 }
    },
    "topDamageTypes": [
      { "type": "scratch", "count": 15, "avgCost": 180 },
      { "type": "stain", "count": 12, "avgCost": 85 }
    ],
    "propertyComparison": [
      {
        "propertyId": "prop_abc123",
        "propertyName": "Beach House",
        "damageCount": 8,
        "damageRate": 0.35,
        "totalCost": 2100
      }
    ]
  }
}
```

---

#### Create Inspection

```http
POST /inspections
```

Creates a new inspection record.

**Request Body:**
```json
{
  "propertyId": "prop_abc123",
  "unitId": "unit_xyz (optional)",
  "type": "pre_stay | post_checkout | routine | incident",
  "reservationId": "res_def456 (optional)",
  "inspectorId": "user_123",
  "scheduledAt": "2024-01-20T14:00:00Z",
  "notes": "Check for reported stain in bedroom"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "inspectionId": "insp_new123",
    "propertyId": "prop_abc123",
    "type": "post_checkout",
    "status": "pending",
    "inspectorId": "user_123",
    "scheduledAt": "2024-01-20T14:00:00Z",
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

---

#### Create Work Order

```http
POST /work-orders
```

Creates a repair work order for damages.

**Request Body:**
```json
{
  "inspectionId": "insp_abc123",
  "damageIds": ["dmg_xyz789"],
  "vendorId": "vendor_abc",
  "priority": "standard | urgent | emergency",
  "scheduledDate": "2024-01-22",
  "notes": "Guest checking in on 1/25, needs completion by 1/24",
  "budget": 300
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "workOrderId": "wo_abc123",
    "inspectionId": "insp_abc123",
    "status": "pending",
    "vendor": {
      "id": "vendor_abc",
      "name": "Miami Floor Pros",
      "phone": "+1-555-123-4567"
    },
    "damages": [
      {
        "damageId": "dmg_xyz789",
        "description": "Deep scratch on hardwood floor"
      }
    ],
    "scheduledDate": "2024-01-22",
    "budget": 300,
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

---

#### Generate Damage Report

```http
GET /reports/:inspectionId/download
```

Generates a downloadable PDF damage report.

**Query Parameters:**
- `format`: `pdf | html`
- `includePhotos`: `true | false`
- `includeEstimates`: `true | false`

**Response:**
```json
{
  "success": true,
  "data": {
    "reportUrl": "https://cdn.adverant.ai/reports/rpt_abc123.pdf",
    "expiresAt": "2024-01-22T10:30:00Z",
    "format": "pdf",
    "pages": 5,
    "fileSize": 2450000
  }
}
```

---

## Authentication

### Bearer Token

```bash
curl -X POST "https://api.adverant.ai/proxy/nexus-damagetracking/api/v1/damage/inspect" \
  -H "Authorization: Bearer YOUR_NEXUS_API_TOKEN" \
  -F "propertyId=prop_abc123" \
  -F "inspectionType=post_checkout" \
  -F "photos=@photo1.jpg"
```

### Token Scopes

| Scope | Description |
|-------|-------------|
| `damage:read` | View inspections and reports |
| `damage:write` | Create inspections |
| `damage:analyze` | Run AI damage analysis |
| `damage:estimates` | Generate cost estimates |
| `damage:workorders` | Manage work orders |

---

## Rate Limits

| Tier | Requests/Minute | Inspections/Month |
|------|-----------------|-------------------|
| Starter | 30 | 100 |
| Professional | 60 | 500 |
| Enterprise | 120 | Unlimited |

---

## Data Models

### Inspection

```typescript
interface Inspection {
  inspectionId: string;
  propertyId: string;
  unitId?: string;
  type: InspectionType;
  status: InspectionStatus;
  reservationId?: string;
  inspectorId: string;
  scheduledAt?: string;
  completedAt?: string;
  summary?: InspectionSummary;
  damages: Damage[];
  photos: InspectionPhoto[];
  notes?: string;
  createdAt: string;
}

type InspectionType = 'pre_stay' | 'post_checkout' | 'routine' | 'incident';
type InspectionStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
```

### Damage

```typescript
interface Damage {
  id: string;
  inspectionId: string;
  imageId: string;
  type: DamageType;
  category: DamageCategory;
  location: string;
  description: string;
  severity: Severity;
  severityScore: number;
  confidence: number;
  boundingBox?: BoundingBox;
  estimatedRepairCost: CostRange;
  repairType: string;
  status: DamageStatus;
  isNewDamage?: boolean;
  comparedTo?: string;
  createdAt: string;
}

type DamageType = 'scratch' | 'stain' | 'crack' | 'dent' | 'tear' |
                  'burn' | 'water_damage' | 'mold' | 'broken' | 'missing' | 'other';
type DamageCategory = 'structural' | 'furniture' | 'appliance' |
                      'flooring' | 'wall' | 'fixture' | 'other';
type Severity = 'minor' | 'moderate' | 'severe';
type DamageStatus = 'identified' | 'estimated' | 'work_ordered' |
                    'in_repair' | 'repaired' | 'claimed';
```

### Work Order

```typescript
interface WorkOrder {
  workOrderId: string;
  inspectionId: string;
  damageIds: string[];
  vendorId: string;
  status: WorkOrderStatus;
  priority: Priority;
  scheduledDate: string;
  completedDate?: string;
  budget: number;
  actualCost?: number;
  notes?: string;
  invoiceUrl?: string;
  createdAt: string;
}

type WorkOrderStatus = 'pending' | 'scheduled' | 'in_progress' |
                       'completed' | 'cancelled';
type Priority = 'standard' | 'urgent' | 'emergency';
```

---

## SDK Integration

### JavaScript/TypeScript SDK

```typescript
import { NexusClient } from '@nexus/sdk';

const nexus = new NexusClient({
  apiKey: process.env.NEXUS_API_KEY,
});

// Create inspection
const inspection = await nexus.damage.createInspection({
  propertyId: 'prop_abc123',
  type: 'post_checkout',
  reservationId: 'res_xyz789',
});

// Upload and analyze photos
const analysis = await nexus.damage.inspect({
  inspectionId: inspection.inspectionId,
  photos: [
    fs.readFileSync('./living_room.jpg'),
    fs.readFileSync('./bedroom.jpg'),
  ],
  room: 'living_room',
});

console.log(`Found ${analysis.damages.length} damages`);
console.log(`Estimated cost: $${analysis.summary.estimatedTotalCost}`);

// Generate estimate
const estimate = await nexus.damage.generateEstimate({
  inspectionId: inspection.inspectionId,
  damageIds: analysis.damages.map(d => d.id),
  location: { city: 'Miami', state: 'FL' },
});

// Create work order
const workOrder = await nexus.damage.createWorkOrder({
  inspectionId: inspection.inspectionId,
  damageIds: [analysis.damages[0].id],
  vendorId: estimate.vendorQuotes[0].vendorId,
  priority: 'standard',
});
```

### Python SDK

```python
from nexus import NexusClient

client = NexusClient(api_key=os.environ["NEXUS_API_KEY"])

# Create inspection
inspection = client.damage.create_inspection(
    property_id="prop_abc123",
    type="post_checkout",
    reservation_id="res_xyz789"
)

# Analyze photos
with open("living_room.jpg", "rb") as f:
    analysis = client.damage.inspect(
        inspection_id=inspection.inspection_id,
        photos=[f.read()],
        room="living_room"
    )

print(f"Found {len(analysis.damages)} damages")
print(f"Estimated cost: ${analysis.summary.estimated_total_cost}")

# Get analytics
analytics = client.damage.get_analytics(
    property_id="prop_abc123",
    period="month"
)

print(f"Damage rate: {analytics.overview.damage_rate * 100}%")
```

---

## Computer Vision Capabilities

### Damage Detection Types

| Type | Description | Accuracy |
|------|-------------|----------|
| Scratches | Surface scratches on floors, furniture | 94% |
| Stains | Liquid stains, discoloration | 92% |
| Cracks | Structural cracks, broken items | 96% |
| Dents | Impact damage on walls, appliances | 91% |
| Tears | Fabric tears, upholstery damage | 93% |
| Burns | Heat damage, cigarette burns | 95% |
| Water Damage | Water stains, warping | 90% |
| Mold | Visible mold growth | 88% |

### Image Requirements

| Specification | Requirement |
|---------------|-------------|
| Minimum Resolution | 1280x720 |
| Recommended Resolution | 1920x1080+ |
| Formats | JPEG, PNG, HEIC |
| Max File Size | 10 MB per image |
| Max Images per Request | 20 |

---

## Error Handling

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `INVALID_REQUEST` | 400 | Malformed request |
| `INVALID_IMAGE` | 400 | Image cannot be processed |
| `PROPERTY_NOT_FOUND` | 404 | Property does not exist |
| `INSPECTION_NOT_FOUND` | 404 | Inspection does not exist |
| `AUTHENTICATION_REQUIRED` | 401 | Missing or invalid token |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `QUOTA_EXCEEDED` | 402 | Monthly inspection limit |
| `ANALYSIS_FAILED` | 500 | AI analysis error |

---

## Deployment Requirements

### Container Specifications

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| CPU | 1000m | 2000m |
| Memory | 2Gi | 4Gi |
| Storage | 5Gi | 10Gi |
| Timeout | 5 min | 10 min |

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXUS_API_KEY` | Yes | Nexus platform API key |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `MAGEAGENT_URL` | Yes | MageAgent AI service URL |
| `FILEPROCESS_URL` | Yes | File processing service URL |
| `STORAGE_BUCKET` | Yes | Image storage bucket |

### Health Checks

```yaml
livenessProbe:
  httpGet:
    path: /live
    port: 8080
  initialDelaySeconds: 30

readinessProbe:
  httpGet:
    path: /ready
    port: 8080
  initialDelaySeconds: 5
```

---

## Quotas and Limits

| Limit | Starter | Professional | Enterprise |
|-------|---------|--------------|------------|
| Inspections/Month | 100 | 500 | Unlimited |
| AI Analyses/Month | 100 | 500 | Unlimited |
| Photo Storage | 5 GB | 50 GB | Unlimited |
| Properties | 20 | 100 | Unlimited |
| Report Retention | 90 days | 1 year | 5 years |

---

## Support

- **Documentation**: [docs.adverant.ai/plugins/damagetracking](https://docs.adverant.ai/plugins/damagetracking)
- **API Status**: [status.adverant.ai](https://status.adverant.ai)
- **Support Email**: support@adverant.ai
- **Discord**: [discord.gg/adverant](https://discord.gg/adverant)
