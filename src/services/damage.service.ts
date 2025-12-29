import { PrismaClient, Damage, DamageType, Severity, DamageStatus, ResponsibleParty } from '@prisma/client';
import { CVIntegrationService } from './cv-integration.service';
import { S3Util } from '../utils/s3.util';
import { RabbitMQUtil } from '../utils/rabbitmq.util';
import { config } from '../config/config';
import { PaginatedResponse } from '../types';
import axios from 'axios';

interface CreateDamageParams {
  inspectionId: string;
  reservationId?: string;
  propertyId: string;
  room: string;
  location: string;
  damageType: DamageType;
  severity: Severity;
  description: string;
  responsibleParty?: ResponsibleParty;
  estimatedCostManual?: number;
}

interface UpdateDamageParams {
  room?: string;
  location?: string;
  damageType?: DamageType;
  severity?: Severity;
  description?: string;
  status?: DamageStatus;
  responsibleParty?: ResponsibleParty;
  estimatedCostManual?: number;
  actualCost?: number;
  beforePhotoUrl?: string;
  afterPhotoUrl?: string;
}

interface ListDamagesParams {
  page: number;
  limit: number;
  inspectionId?: string;
  propertyId?: string;
  reservationId?: string;
  status?: DamageStatus;
  severity?: Severity;
  aiDetected?: boolean;
}

export class DamageService {
  private cvService: CVIntegrationService;
  private s3Util: S3Util;
  private rabbitMQ: RabbitMQUtil;

  constructor(private prisma: PrismaClient) {
    this.cvService = new CVIntegrationService();
    this.s3Util = new S3Util();
    this.rabbitMQ = new RabbitMQUtil();
  }

  async createDamage(params: CreateDamageParams): Promise<Damage> {
    const damage = await this.prisma.damage.create({
      data: {
        inspectionId: params.inspectionId,
        reservationId: params.reservationId,
        propertyId: params.propertyId,
        room: params.room,
        location: params.location,
        damageType: params.damageType,
        severity: params.severity,
        description: params.description,
        responsibleParty: params.responsibleParty,
        estimatedCostManual: params.estimatedCostManual,
        status: 'REPORTED',
      },
    });

    // Publish event
    await this.rabbitMQ.publishEvent({
      eventType: 'created',
      entityType: 'damage',
      entityId: damage.id,
      data: {
        propertyId: damage.propertyId,
        damageType: damage.damageType,
        severity: damage.severity,
      },
      timestamp: new Date(),
    });

    // Send notification
    await this.sendDamageNotification(damage, 'damage_detected');

    return damage;
  }

  async listDamages(params: ListDamagesParams): Promise<PaginatedResponse<Damage>> {
    const { page, limit, inspectionId, propertyId, reservationId, status, severity, aiDetected } = params;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (inspectionId) where.inspectionId = inspectionId;
    if (propertyId) where.propertyId = propertyId;
    if (reservationId) where.reservationId = reservationId;
    if (status) where.status = status;
    if (severity) where.severity = severity;
    if (aiDetected !== undefined) where.aiDetected = aiDetected;

    const [damages, total] = await Promise.all([
      this.prisma.damage.findMany({
        where,
        skip,
        take: limit,
        include: {
          inspection: {
            select: {
              id: true,
              inspectionType: true,
              scheduledAt: true,
            },
          },
          workOrders: {
            select: {
              id: true,
              status: true,
              priority: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.damage.count({ where }),
    ]);

    return {
      data: damages,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getDamage(id: string): Promise<Damage | null> {
    return this.prisma.damage.findUnique({
      where: { id },
      include: {
        inspection: true,
        workOrders: true,
      },
    });
  }

  async updateDamage(id: string, params: UpdateDamageParams): Promise<Damage> {
    const damage = await this.prisma.damage.update({
      where: { id },
      data: params as any,
    });

    // Publish event
    await this.rabbitMQ.publishEvent({
      eventType: 'updated',
      entityType: 'damage',
      entityId: damage.id,
      data: {
        status: damage.status,
        updates: Object.keys(params),
      },
      timestamp: new Date(),
    });

    return damage;
  }

  /**
   * AI-powered damage detection from image
   */
  async detectDamageFromImage(
    imageBuffer: Buffer,
    params: {
      inspectionId: string;
      propertyId: string;
      room: string;
      location: string;
    }
  ): Promise<Damage | null> {
    // Upload image to S3
    const uploadResult = await this.s3Util.uploadImage(imageBuffer, `damage-detection/${params.inspectionId}`, {
      resize: { width: 1920 },
      quality: 85,
      format: 'jpeg',
    });

    // Call Computer Vision Service for AI detection
    const aiResult = await this.cvService.detectDamage(uploadResult.url, params.propertyId, params.room);

    // Only create damage if AI detected something with sufficient confidence
    if (!aiResult.detected || aiResult.confidence < config.ai.confidenceThreshold) {
      return null;
    }

    // Get AI cost estimate
    const costEstimate = await this.cvService.estimateRepairCost(
      aiResult.damageType || 'OTHER',
      aiResult.severity || 'MODERATE',
      uploadResult.url
    );

    // Create damage record
    const damage = await this.prisma.damage.create({
      data: {
        inspectionId: params.inspectionId,
        propertyId: params.propertyId,
        room: params.room,
        location: params.location,
        damageType: this.mapAIDamageType(aiResult.damageType || 'OTHER'),
        severity: this.mapAISeverity(aiResult.severity || 'MODERATE'),
        description: `AI-detected ${aiResult.damageType} damage with ${(aiResult.confidence * 100).toFixed(1)}% confidence`,
        aiDetected: true,
        aiConfidence: aiResult.confidence,
        aiDamageType: aiResult.damageType,
        aiSeverity: aiResult.severity,
        aiBoundingBox: aiResult.boundingBox,
        aiMetadata: aiResult.metadata,
        estimatedCostAi: costEstimate.estimatedCost,
        photos: [uploadResult.url],
        status: 'UNDER_REVIEW',
      },
    });

    // Store pattern in Nexus for future learning
    await this.storeDamagePatternInNexus(damage, aiResult);

    // Publish event
    await this.rabbitMQ.publishEvent({
      eventType: 'ai_detected',
      entityType: 'damage',
      entityId: damage.id,
      data: {
        propertyId: damage.propertyId,
        aiConfidence: aiResult.confidence,
        damageType: damage.damageType,
      },
      timestamp: new Date(),
    });

    return damage;
  }

  /**
   * Compare before/after photos to detect damage
   */
  async compareBeforeAfter(
    beforeImageBuffer: Buffer,
    afterImageBuffer: Buffer,
    params: {
      inspectionId: string;
      propertyId: string;
      room: string;
      location: string;
    }
  ): Promise<Damage[]> {
    // Upload both images
    const [beforeUpload, afterUpload] = await Promise.all([
      this.s3Util.uploadImage(beforeImageBuffer, `damage-comparison/${params.inspectionId}`, {
        resize: { width: 1920 },
        quality: 85,
        format: 'jpeg',
      }),
      this.s3Util.uploadImage(afterImageBuffer, `damage-comparison/${params.inspectionId}`, {
        resize: { width: 1920 },
        quality: 85,
        format: 'jpeg',
      }),
    ]);

    // Compare images using CV service
    const comparison = await this.cvService.compareImages(
      beforeUpload.url,
      afterUpload.url,
      params.propertyId,
      params.room
    );

    const damages: Damage[] = [];

    // Create damage records for significant differences
    for (const diff of comparison.differences) {
      if (diff.confidence >= config.ai.confidenceThreshold) {
        const costEstimate = await this.cvService.estimateRepairCost(diff.type, diff.severity, afterUpload.url);

        const damage = await this.prisma.damage.create({
          data: {
            inspectionId: params.inspectionId,
            propertyId: params.propertyId,
            room: params.room,
            location: params.location,
            damageType: this.mapAIDamageType(diff.type),
            severity: this.mapAISeverity(diff.severity),
            description: `AI-detected damage via before/after comparison with ${(diff.confidence * 100).toFixed(1)}% confidence`,
            beforePhotoUrl: beforeUpload.url,
            afterPhotoUrl: afterUpload.url,
            aiDetected: true,
            aiConfidence: diff.confidence,
            aiDamageType: diff.type,
            aiSeverity: diff.severity,
            aiBoundingBox: diff.boundingBox,
            estimatedCostAi: costEstimate.estimatedCost,
            photos: [beforeUpload.url, afterUpload.url],
            status: 'UNDER_REVIEW',
          },
        });

        damages.push(damage);
      }
    }

    return damages;
  }

  /**
   * Add photo to existing damage
   */
  async addPhoto(id: string, imageBuffer: Buffer): Promise<Damage> {
    const damage = await this.getDamage(id);
    if (!damage) {
      throw new Error(`Damage ${id} not found`);
    }

    const uploadResult = await this.s3Util.uploadImage(imageBuffer, `damages/${id}`, {
      resize: { width: 1920 },
      quality: 85,
      format: 'jpeg',
    });

    const currentPhotos = (damage.photos as string[]) || [];
    currentPhotos.push(uploadResult.url);

    return this.updateDamage(id, {
      photos: currentPhotos,
    } as any);
  }

  /**
   * Handle damage dispute
   */
  async disputeDamage(
    id: string,
    params: {
      disputeReason: string;
      evidence?: {
        photos?: string[];
        documents?: string[];
        notes?: string;
      };
    }
  ): Promise<Damage> {
    const damage = await this.updateDamage(id, {
      status: 'DISPUTED',
      disputed: true,
      disputeReason: params.disputeReason,
      disputeEvidence: params.evidence,
    } as any);

    // Notify stakeholders
    await this.sendDamageNotification(damage, 'damage_disputed');

    return damage;
  }

  /**
   * Resolve damage dispute
   */
  async resolveDispute(
    id: string,
    params: {
      resolution: string;
      finalResponsibleParty?: ResponsibleParty;
      finalCost?: number;
    }
  ): Promise<Damage> {
    return this.updateDamage(id, {
      status: 'APPROVED',
      disputeResolution: params.resolution,
      disputeResolvedAt: new Date(),
      responsibleParty: params.finalResponsibleParty,
      actualCost: params.finalCost,
    } as any);
  }

  /**
   * Store damage pattern in Nexus for learning
   */
  private async storeDamagePatternInNexus(damage: Damage, aiResult: any): Promise<void> {
    try {
      await axios.post(`${config.services.nexus}/api/v1/patterns`, {
        type: 'damage_detection',
        pattern: {
          damageType: damage.damageType,
          severity: damage.severity,
          aiConfidence: aiResult.confidence,
          aiDamageType: aiResult.damageType,
          room: damage.room,
          location: damage.location,
        },
        tags: ['damage-detection', 'ai', damage.damageType.toLowerCase()],
        importance: aiResult.confidence,
      });
    } catch (error) {
      console.error('Failed to store pattern in Nexus:', error);
      // Non-critical, continue
    }
  }

  /**
   * Send notification about damage
   */
  private async sendDamageNotification(damage: Damage, eventType: string): Promise<void> {
    try {
      await axios.post(`${config.services.communication}/api/v1/notifications`, {
        type: eventType,
        recipients: ['property-manager', 'owner'],
        data: {
          damageId: damage.id,
          propertyId: damage.propertyId,
          damageType: damage.damageType,
          severity: damage.severity,
          estimatedCost: damage.estimatedCostAi || damage.estimatedCostManual,
        },
        channels: ['email', 'push'],
      });
    } catch (error) {
      console.error('Failed to send damage notification:', error);
      // Non-critical, continue
    }
  }

  /**
   * Map AI damage type to database enum
   */
  private mapAIDamageType(aiType: string): DamageType {
    const mapping: Record<string, DamageType> = {
      'stain': 'STAIN',
      'hole': 'HOLE',
      'crack': 'CRACK',
      'burn': 'BURN',
      'water_damage': 'WATER_DAMAGE',
      'water': 'WATER_DAMAGE',
      'broken': 'BROKEN_ITEM',
      'scratch': 'SCRATCH',
      'dent': 'DENT',
      'mold': 'MOLD',
      'pest': 'PEST',
    };

    return mapping[aiType.toLowerCase()] || 'OTHER';
  }

  /**
   * Map AI severity to database enum
   */
  private mapAISeverity(aiSeverity: string): Severity {
    const mapping: Record<string, Severity> = {
      'minor': 'MINOR',
      'moderate': 'MODERATE',
      'major': 'MAJOR',
      'critical': 'CRITICAL',
      'severe': 'CRITICAL',
    };

    return mapping[aiSeverity.toLowerCase()] || 'MODERATE';
  }

  async deleteDamage(id: string): Promise<void> {
    await this.prisma.damage.delete({
      where: { id },
    });

    await this.rabbitMQ.publishEvent({
      eventType: 'deleted',
      entityType: 'damage',
      entityId: id,
      data: {},
      timestamp: new Date(),
    });
  }
}
