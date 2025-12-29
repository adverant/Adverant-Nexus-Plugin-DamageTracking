import { PrismaClient, Inspection, InspectionType, InspectionStatus, Condition } from '@prisma/client';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { S3Util } from '../utils/s3.util';
import { RabbitMQUtil } from '../utils/rabbitmq.util';
import { InspectionReport, PaginatedResponse, PhotoMetadata, RoomChecklist } from '../types';

interface CreateInspectionParams {
  propertyId: string;
  unitId?: string;
  reservationId?: string;
  inspectorId: string;
  inspectionType: InspectionType;
  scheduledAt: Date;
  notes?: string;
}

interface UpdateInspectionParams {
  status?: InspectionStatus;
  startedAt?: Date;
  completedAt?: Date;
  photos?: PhotoMetadata[];
  checklist?: Record<string, RoomChecklist>;
  overallCondition?: Condition;
  notes?: string;
  startLocation?: { latitude: number; longitude: number; accuracy: number };
  endLocation?: { latitude: number; longitude: number; accuracy: number };
}

interface ListInspectionsParams {
  page: number;
  limit: number;
  propertyId?: string;
  inspectorId?: string;
  status?: InspectionStatus;
  inspectionType?: InspectionType;
  startDate?: Date;
  endDate?: Date;
}

export class InspectionService {
  private s3Util: S3Util;
  private rabbitMQ: RabbitMQUtil;

  constructor(private prisma: PrismaClient) {
    this.s3Util = new S3Util();
    this.rabbitMQ = new RabbitMQUtil();
  }

  async createInspection(params: CreateInspectionParams): Promise<Inspection> {
    const inspection = await this.prisma.inspection.create({
      data: {
        propertyId: params.propertyId,
        unitId: params.unitId,
        reservationId: params.reservationId,
        inspectorId: params.inspectorId,
        inspectionType: params.inspectionType,
        scheduledAt: params.scheduledAt,
        notes: params.notes,
        status: 'SCHEDULED',
      },
    });

    // Publish event
    await this.rabbitMQ.publishEvent({
      eventType: 'created',
      entityType: 'inspection',
      entityId: inspection.id,
      data: {
        propertyId: inspection.propertyId,
        inspectionType: inspection.inspectionType,
        scheduledAt: inspection.scheduledAt,
      },
      timestamp: new Date(),
    });

    return inspection;
  }

  async listInspections(params: ListInspectionsParams): Promise<PaginatedResponse<Inspection>> {
    const { page, limit, propertyId, inspectorId, status, inspectionType, startDate, endDate } = params;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (propertyId) where.propertyId = propertyId;
    if (inspectorId) where.inspectorId = inspectorId;
    if (status) where.status = status;
    if (inspectionType) where.inspectionType = inspectionType;
    if (startDate || endDate) {
      where.scheduledAt = {};
      if (startDate) where.scheduledAt.gte = startDate;
      if (endDate) where.scheduledAt.lte = endDate;
    }

    const [inspections, total] = await Promise.all([
      this.prisma.inspection.findMany({
        where,
        skip,
        take: limit,
        include: {
          damages: {
            select: {
              id: true,
              damageType: true,
              severity: true,
              status: true,
            },
          },
        },
        orderBy: {
          scheduledAt: 'desc',
        },
      }),
      this.prisma.inspection.count({ where }),
    ]);

    return {
      data: inspections,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getInspection(id: string): Promise<Inspection | null> {
    return this.prisma.inspection.findUnique({
      where: { id },
      include: {
        damages: true,
      },
    });
  }

  async updateInspection(id: string, params: UpdateInspectionParams): Promise<Inspection> {
    const data: any = {};

    if (params.status !== undefined) data.status = params.status;
    if (params.startedAt !== undefined) data.startedAt = params.startedAt;
    if (params.completedAt !== undefined) data.completedAt = params.completedAt;
    if (params.photos !== undefined) data.photos = params.photos;
    if (params.checklist !== undefined) data.checklist = params.checklist;
    if (params.overallCondition !== undefined) data.overallCondition = params.overallCondition;
    if (params.notes !== undefined) data.notes = params.notes;
    if (params.startLocation !== undefined) data.startLocation = params.startLocation;
    if (params.endLocation !== undefined) data.endLocation = params.endLocation;

    const inspection = await this.prisma.inspection.update({
      where: { id },
      data,
    });

    // Publish event
    await this.rabbitMQ.publishEvent({
      eventType: 'updated',
      entityType: 'inspection',
      entityId: inspection.id,
      data: {
        status: inspection.status,
        updates: Object.keys(data),
      },
      timestamp: new Date(),
    });

    return inspection;
  }

  async startInspection(id: string, location?: { latitude: number; longitude: number; accuracy: number }): Promise<Inspection> {
    return this.updateInspection(id, {
      status: 'IN_PROGRESS',
      startedAt: new Date(),
      startLocation: location,
    });
  }

  async completeInspection(
    id: string,
    params: {
      overallCondition: Condition;
      notes?: string;
      location?: { latitude: number; longitude: number; accuracy: number };
    }
  ): Promise<Inspection> {
    return this.updateInspection(id, {
      status: 'COMPLETED',
      completedAt: new Date(),
      overallCondition: params.overallCondition,
      notes: params.notes,
      endLocation: params.location,
    });
  }

  async addPhoto(
    id: string,
    photoBuffer: Buffer,
    metadata: {
      room: string;
      angle?: string;
      gps?: { latitude: number; longitude: number; accuracy: number };
      device?: string;
    }
  ): Promise<Inspection> {
    // Upload to S3
    const uploadResult = await this.s3Util.uploadImage(photoBuffer, `inspections/${id}`, {
      resize: { width: 1920 },
      quality: 85,
      format: 'jpeg',
    });

    // Get current photos
    const inspection = await this.getInspection(id);
    if (!inspection) {
      throw new Error(`Inspection ${id} not found`);
    }

    const currentPhotos = (inspection.photos as PhotoMetadata[]) || [];

    const newPhoto: PhotoMetadata = {
      url: uploadResult.url,
      timestamp: new Date(),
      gps: metadata.gps,
      metadata: {
        room: metadata.room,
        angle: metadata.angle,
        device: metadata.device,
      },
    };

    currentPhotos.push(newPhoto);

    return this.updateInspection(id, {
      photos: currentPhotos,
    });
  }

  async generateReport(id: string): Promise<string> {
    const inspection = await this.prisma.inspection.findUnique({
      where: { id },
      include: {
        damages: true,
      },
    });

    if (!inspection) {
      throw new Error(`Inspection ${id} not found`);
    }

    // Create PDF document
    const pdfDoc = await PDFDocument.create();
    const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    const timesRomanBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);

    const page = pdfDoc.addPage([612, 792]); // Letter size
    const { width, height } = page.getSize();

    let yPosition = height - 50;

    // Title
    page.drawText('Property Inspection Report', {
      x: 50,
      y: yPosition,
      size: 24,
      font: timesRomanBold,
      color: rgb(0, 0, 0),
    });

    yPosition -= 40;

    // Inspection details
    const details = [
      `Inspection ID: ${inspection.id}`,
      `Property ID: ${inspection.propertyId}`,
      `Type: ${inspection.inspectionType}`,
      `Status: ${inspection.status}`,
      `Scheduled: ${inspection.scheduledAt.toLocaleDateString()}`,
      `Completed: ${inspection.completedAt?.toLocaleDateString() || 'N/A'}`,
      `Overall Condition: ${inspection.overallCondition || 'N/A'}`,
    ];

    for (const detail of details) {
      page.drawText(detail, {
        x: 50,
        y: yPosition,
        size: 12,
        font: timesRomanFont,
        color: rgb(0, 0, 0),
      });
      yPosition -= 20;
    }

    yPosition -= 20;

    // Damages section
    if (inspection.damages.length > 0) {
      page.drawText('Damages Found:', {
        x: 50,
        y: yPosition,
        size: 16,
        font: timesRomanBold,
        color: rgb(0, 0, 0),
      });
      yPosition -= 30;

      for (const damage of inspection.damages) {
        const damageText = `• ${damage.damageType} - ${damage.severity} (${damage.room})`;
        page.drawText(damageText, {
          x: 70,
          y: yPosition,
          size: 11,
          font: timesRomanFont,
          color: rgb(0, 0, 0),
        });
        yPosition -= 20;

        if (yPosition < 100) {
          // Add new page if needed
          const newPage = pdfDoc.addPage([612, 792]);
          yPosition = height - 50;
        }
      }
    }

    // Notes
    if (inspection.notes) {
      yPosition -= 20;
      page.drawText('Notes:', {
        x: 50,
        y: yPosition,
        size: 14,
        font: timesRomanBold,
        color: rgb(0, 0, 0),
      });
      yPosition -= 25;

      const notesLines = this.wrapText(inspection.notes, 80);
      for (const line of notesLines) {
        page.drawText(line, {
          x: 50,
          y: yPosition,
          size: 11,
          font: timesRomanFont,
          color: rgb(0, 0, 0),
        });
        yPosition -= 15;
      }
    }

    // Save PDF
    const pdfBytes = await pdfDoc.save();

    // Upload to S3
    const uploadResult = await this.s3Util.uploadFile(
      Buffer.from(pdfBytes),
      `inspection-reports`,
      `inspection-${id}-report.pdf`,
      'application/pdf'
    );

    // Update inspection with report URL
    await this.prisma.inspection.update({
      where: { id },
      data: {
        reportUrl: uploadResult.url,
        reportGeneratedAt: new Date(),
      },
    });

    return uploadResult.url;
  }

  private wrapText(text: string, maxLength: number): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      if ((currentLine + word).length > maxLength) {
        lines.push(currentLine.trim());
        currentLine = word + ' ';
      } else {
        currentLine += word + ' ';
      }
    }

    if (currentLine.trim()) {
      lines.push(currentLine.trim());
    }

    return lines;
  }

  async deleteInspection(id: string): Promise<void> {
    await this.prisma.inspection.delete({
      where: { id },
    });

    // Publish event
    await this.rabbitMQ.publishEvent({
      eventType: 'deleted',
      entityType: 'inspection',
      entityId: id,
      data: {},
      timestamp: new Date(),
    });
  }
}
