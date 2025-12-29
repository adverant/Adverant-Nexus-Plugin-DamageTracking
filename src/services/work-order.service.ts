import { PrismaClient, WorkOrder, WorkOrderType, WorkCategory, Priority, WorkOrderStatus } from '@prisma/client';
import { S3Util } from '../utils/s3.util';
import { RabbitMQUtil } from '../utils/rabbitmq.util';
import { PaginatedResponse } from '../types';
import axios from 'axios';
import { config } from '../config/config';

interface CreateWorkOrderParams {
  propertyId: string;
  unitId?: string;
  damageId?: string;
  workOrderType: WorkOrderType;
  category: WorkCategory;
  title: string;
  description: string;
  priority?: Priority;
  vendorId?: string;
  scheduledAt?: Date;
  estimatedCost?: number;
}

interface UpdateWorkOrderParams {
  title?: string;
  description?: string;
  status?: WorkOrderStatus;
  priority?: Priority;
  vendorId?: string;
  assignedTo?: string;
  scheduledAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  estimatedCost?: number;
  actualCost?: number;
  laborCost?: number;
  materialsCost?: number;
  completionNotes?: string;
  vendorNotes?: string;
  qualityRating?: number;
  vendorRating?: number;
}

interface ListWorkOrdersParams {
  page: number;
  limit: number;
  propertyId?: string;
  vendorId?: string;
  status?: WorkOrderStatus;
  priority?: Priority;
  category?: WorkCategory;
}

export class WorkOrderService {
  private s3Util: S3Util;
  private rabbitMQ: RabbitMQUtil;

  constructor(private prisma: PrismaClient) {
    this.s3Util = new S3Util();
    this.rabbitMQ = new RabbitMQUtil();
  }

  async createWorkOrder(params: CreateWorkOrderParams): Promise<WorkOrder> {
    const workOrder = await this.prisma.workOrder.create({
      data: {
        propertyId: params.propertyId,
        unitId: params.unitId,
        damageId: params.damageId,
        workOrderType: params.workOrderType,
        category: params.category,
        title: params.title,
        description: params.description,
        priority: params.priority || 'NORMAL',
        vendorId: params.vendorId,
        scheduledAt: params.scheduledAt,
        estimatedCost: params.estimatedCost,
        status: params.vendorId ? 'ASSIGNED' : 'PENDING',
        assignedAt: params.vendorId ? new Date() : undefined,
      },
    });

    // Update damage status if linked
    if (params.damageId) {
      await this.prisma.damage.update({
        where: { id: params.damageId },
        data: { status: 'REPAIR_SCHEDULED' },
      });
    }

    // Publish event
    await this.rabbitMQ.publishEvent({
      eventType: 'created',
      entityType: 'work_order',
      entityId: workOrder.id,
      data: {
        propertyId: workOrder.propertyId,
        priority: workOrder.priority,
        category: workOrder.category,
      },
      timestamp: new Date(),
    });

    // Send notification to vendor if assigned
    if (params.vendorId) {
      await this.notifyVendor(workOrder.id, 'work_order_assigned');
    }

    return workOrder;
  }

  async listWorkOrders(params: ListWorkOrdersParams): Promise<PaginatedResponse<WorkOrder>> {
    const { page, limit, propertyId, vendorId, status, priority, category } = params;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (propertyId) where.propertyId = propertyId;
    if (vendorId) where.vendorId = vendorId;
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (category) where.category = category;

    const [workOrders, total] = await Promise.all([
      this.prisma.workOrder.findMany({
        where,
        skip,
        take: limit,
        include: {
          damage: {
            select: {
              id: true,
              damageType: true,
              severity: true,
            },
          },
          vendor: {
            select: {
              id: true,
              name: true,
              company: true,
              rating: true,
            },
          },
        },
        orderBy: [
          { priority: 'desc' },
          { scheduledAt: 'asc' },
        ],
      }),
      this.prisma.workOrder.count({ where }),
    ]);

    return {
      data: workOrders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getWorkOrder(id: string): Promise<WorkOrder | null> {
    return this.prisma.workOrder.findUnique({
      where: { id },
      include: {
        damage: true,
        vendor: true,
      },
    });
  }

  async updateWorkOrder(id: string, params: UpdateWorkOrderParams): Promise<WorkOrder> {
    const workOrder = await this.prisma.workOrder.update({
      where: { id },
      data: params as any,
    });

    // Publish event
    await this.rabbitMQ.publishEvent({
      eventType: 'updated',
      entityType: 'work_order',
      entityId: workOrder.id,
      data: {
        status: workOrder.status,
        updates: Object.keys(params),
      },
      timestamp: new Date(),
    });

    return workOrder;
  }

  async assignToVendor(id: string, vendorId: string): Promise<WorkOrder> {
    const workOrder = await this.updateWorkOrder(id, {
      vendorId,
      status: 'ASSIGNED',
      assignedAt: new Date(),
    } as any);

    // Notify vendor
    await this.notifyVendor(id, 'work_order_assigned');

    return workOrder;
  }

  async scheduleWorkOrder(id: string, scheduledAt: Date): Promise<WorkOrder> {
    return this.updateWorkOrder(id, {
      scheduledAt,
      status: 'SCHEDULED',
    });
  }

  async startWorkOrder(id: string): Promise<WorkOrder> {
    return this.updateWorkOrder(id, {
      status: 'IN_PROGRESS',
      startedAt: new Date(),
    } as any);
  }

  async completeWorkOrder(
    id: string,
    params: {
      actualCost?: number;
      laborCost?: number;
      materialsCost?: number;
      completionNotes?: string;
      vendorNotes?: string;
    }
  ): Promise<WorkOrder> {
    const workOrder = await this.updateWorkOrder(id, {
      status: 'COMPLETED',
      completedAt: new Date(),
      ...params,
    } as any);

    // Update linked damage
    if (workOrder.damageId) {
      await this.prisma.damage.update({
        where: { id: workOrder.damageId },
        data: {
          status: 'REPAIRED',
          actualCost: params.actualCost,
        },
      });
    }

    // Update vendor stats
    if (workOrder.vendorId) {
      await this.updateVendorStats(workOrder.vendorId, workOrder);
    }

    // Send notification
    await this.notifyCompletion(id);

    return workOrder;
  }

  async verifyWorkOrder(
    id: string,
    params: {
      verifiedBy: string;
      qualityRating: number;
      vendorRating: number;
    }
  ): Promise<WorkOrder> {
    const workOrder = await this.updateWorkOrder(id, {
      status: 'VERIFIED',
      verifiedAt: new Date(),
      verifiedBy: params.verifiedBy,
      qualityRating: params.qualityRating,
      vendorRating: params.vendorRating,
    } as any);

    // Update linked damage to verified
    if (workOrder.damageId) {
      await this.prisma.damage.update({
        where: { id: workOrder.damageId },
        data: { status: 'VERIFIED' },
      });
    }

    // Update vendor rating
    if (workOrder.vendorId) {
      await this.updateVendorRating(workOrder.vendorId, params.vendorRating);
    }

    return workOrder;
  }

  async addPhotoBefore(id: string, imageBuffer: Buffer): Promise<WorkOrder> {
    const uploadResult = await this.s3Util.uploadImage(imageBuffer, `work-orders/${id}/before`, {
      resize: { width: 1920 },
      quality: 85,
      format: 'jpeg',
    });

    const workOrder = await this.getWorkOrder(id);
    if (!workOrder) {
      throw new Error(`Work order ${id} not found`);
    }

    const currentPhotos = (workOrder.photosBefore as string[]) || [];
    currentPhotos.push(uploadResult.url);

    return this.updateWorkOrder(id, {
      photosBefore: currentPhotos,
    } as any);
  }

  async addPhotoAfter(id: string, imageBuffer: Buffer): Promise<WorkOrder> {
    const uploadResult = await this.s3Util.uploadImage(imageBuffer, `work-orders/${id}/after`, {
      resize: { width: 1920 },
      quality: 85,
      format: 'jpeg',
    });

    const workOrder = await this.getWorkOrder(id);
    if (!workOrder) {
      throw new Error(`Work order ${id} not found`);
    }

    const currentPhotos = (workOrder.photosAfter as string[]) || [];
    currentPhotos.push(uploadResult.url);

    return this.updateWorkOrder(id, {
      photosAfter: currentPhotos,
    } as any);
  }

  async cancelWorkOrder(id: string, reason?: string): Promise<WorkOrder> {
    const workOrder = await this.updateWorkOrder(id, {
      status: 'CANCELLED',
      completionNotes: reason,
    });

    // Update vendor stats
    if (workOrder.vendorId) {
      await this.prisma.vendor.update({
        where: { id: workOrder.vendorId },
        data: {
          cancelledJobs: { increment: 1 },
        },
      });
    }

    return workOrder;
  }

  private async updateVendorStats(vendorId: string, workOrder: WorkOrder): Promise<void> {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id: vendorId },
    });

    if (!vendor) return;

    const completionTime = workOrder.completedAt && workOrder.startedAt
      ? Math.ceil((workOrder.completedAt.getTime() - workOrder.startedAt.getTime()) / (1000 * 60 * 60 * 24))
      : undefined;

    const responseTime = workOrder.assignedAt && workOrder.startedAt
      ? Math.ceil((workOrder.startedAt.getTime() - workOrder.assignedAt.getTime()) / (1000 * 60 * 60))
      : undefined;

    const updates: any = {
      totalJobs: { increment: 1 },
      completedJobs: { increment: 1 },
    };

    if (completionTime) {
      const newAvgCompletion = vendor.avgCompletionTime
        ? (vendor.avgCompletionTime * vendor.completedJobs + completionTime) / (vendor.completedJobs + 1)
        : completionTime;
      updates.avgCompletionTime = Math.round(newAvgCompletion);
    }

    if (responseTime) {
      const newAvgResponse = vendor.avgResponseTime
        ? (vendor.avgResponseTime * vendor.completedJobs + responseTime) / (vendor.completedJobs + 1)
        : responseTime;
      updates.avgResponseTime = Math.round(newAvgResponse);
    }

    await this.prisma.vendor.update({
      where: { id: vendorId },
      data: updates,
    });
  }

  private async updateVendorRating(vendorId: string, newRating: number): Promise<void> {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id: vendorId },
    });

    if (!vendor) return;

    const currentRating = vendor.rating ? parseFloat(vendor.rating.toString()) : 0;
    const totalRatings = vendor.completedJobs || 1;

    const newAvgRating = (currentRating * (totalRatings - 1) + newRating) / totalRatings;

    await this.prisma.vendor.update({
      where: { id: vendorId },
      data: {
        rating: newAvgRating,
      },
    });
  }

  private async notifyVendor(workOrderId: string, eventType: string): Promise<void> {
    try {
      const workOrder = await this.getWorkOrder(workOrderId);
      if (!workOrder || !workOrder.vendorId) return;

      await axios.post(`${config.services.communication}/api/v1/notifications`, {
        type: eventType,
        recipients: [workOrder.vendorId],
        data: {
          workOrderId: workOrder.id,
          title: workOrder.title,
          priority: workOrder.priority,
          scheduledAt: workOrder.scheduledAt,
        },
        channels: ['email', 'sms'],
      });
    } catch (error) {
      console.error('Failed to notify vendor:', error);
    }
  }

  private async notifyCompletion(workOrderId: string): Promise<void> {
    try {
      const workOrder = await this.getWorkOrder(workOrderId);
      if (!workOrder) return;

      await axios.post(`${config.services.communication}/api/v1/notifications`, {
        type: 'work_order_completed',
        recipients: ['property-manager'],
        data: {
          workOrderId: workOrder.id,
          propertyId: workOrder.propertyId,
          title: workOrder.title,
          actualCost: workOrder.actualCost,
        },
        channels: ['email', 'push'],
      });
    } catch (error) {
      console.error('Failed to send completion notification:', error);
    }
  }

  async deleteWorkOrder(id: string): Promise<void> {
    await this.prisma.workOrder.delete({
      where: { id },
    });

    await this.rabbitMQ.publishEvent({
      eventType: 'deleted',
      entityType: 'work_order',
      entityId: id,
      data: {},
      timestamp: new Date(),
    });
  }
}
