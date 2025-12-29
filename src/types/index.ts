// Type definitions for Damage Tracking Service

export interface User {
  userId: string;
  email: string;
  role: string;
}

export interface PhotoMetadata {
  url: string;
  timestamp: Date;
  gps?: {
    latitude: number;
    longitude: number;
    accuracy: number;
  };
  metadata?: {
    device?: string;
    orientation?: number;
    width?: number;
    height?: number;
  };
}

export interface AIDetectionResult {
  detected: boolean;
  confidence: number;
  damageType?: string;
  severity?: string;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  metadata?: Record<string, any>;
}

export interface ChecklistItem {
  name: string;
  condition: string;
  notes?: string;
  photos?: string[];
}

export interface RoomChecklist {
  room: string;
  items: ChecklistItem[];
}

export interface InspectionReport {
  inspectionId: string;
  propertyId: string;
  inspectionType: string;
  scheduledAt: Date;
  completedAt?: Date;
  inspector: string;
  overallCondition?: string;
  roomChecklists: RoomChecklist[];
  damages: DamageReport[];
  photos: PhotoMetadata[];
  notes?: string;
}

export interface DamageReport {
  id: string;
  room: string;
  location: string;
  damageType: string;
  severity: string;
  description: string;
  photos: string[];
  estimatedCost?: number;
  responsibleParty?: string;
}

export interface VendorPerformanceMetrics {
  totalJobs: number;
  completedJobs: number;
  cancelledJobs: number;
  avgCompletionTime?: number;
  avgResponseTime?: number;
  onTimeRate?: number;
  qualityScore?: number;
  rating?: number;
}

export interface WorkOrderUpdate {
  status?: string;
  actualCost?: number;
  completionNotes?: string;
  photosAfter?: string[];
}

export interface CVDetectionRequest {
  imageUrl: string;
  propertyId: string;
  room: string;
  options?: {
    detectDamage?: boolean;
    compareImages?: boolean;
    beforeImageUrl?: string;
  };
}

export interface CVDetectionResponse {
  success: boolean;
  detections: Array<{
    type: string;
    confidence: number;
    boundingBox: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
    severity: string;
    estimatedCost?: number;
  }>;
  metadata?: Record<string, any>;
}

export interface NexusStoragePayload {
  type: 'damage_pattern' | 'inspection_insight' | 'vendor_performance';
  data: Record<string, any>;
  tags: string[];
  importance?: number;
}

export interface NotificationPayload {
  type: 'inspection_scheduled' | 'damage_detected' | 'work_order_created' | 'work_order_completed';
  recipients: string[];
  data: Record<string, any>;
  channels?: ('email' | 'sms' | 'push')[];
}

export interface EventPayload {
  eventType: string;
  entityType: 'inspection' | 'damage' | 'work_order' | 'vendor';
  entityId: string;
  data: Record<string, any>;
  timestamp: Date;
}

export interface S3UploadResult {
  url: string;
  key: string;
  bucket: string;
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ServiceError {
  code: string;
  message: string;
  details?: Record<string, any>;
}
