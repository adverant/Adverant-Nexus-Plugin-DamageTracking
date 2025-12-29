import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { WorkOrderService } from '../services/work-order.service';
import { WorkOrderType, WorkCategory, Priority, WorkOrderStatus } from '@prisma/client';

export class WorkOrderController {
  private workOrderService: WorkOrderService;

  constructor(private server: FastifyInstance) {
    this.workOrderService = new WorkOrderService(server.prisma);
  }

  async createWorkOrder(request: FastifyRequest, reply: FastifyReply) {
    try {
      const body = request.body as any;

      const workOrder = await this.workOrderService.createWorkOrder({
        propertyId: body.propertyId,
        unitId: body.unitId,
        damageId: body.damageId,
        workOrderType: body.workOrderType as WorkOrderType,
        category: body.category as WorkCategory,
        title: body.title,
        description: body.description,
        priority: body.priority as Priority,
        vendorId: body.vendorId,
        scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined,
        estimatedCost: body.estimatedCost,
      });

      return reply.code(201).send(workOrder);
    } catch (error) {
      this.server.log.error(error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async listWorkOrders(request: FastifyRequest, reply: FastifyReply) {
    try {
      const query = request.query as any;

      const result = await this.workOrderService.listWorkOrders({
        page: parseInt(query.page || '1'),
        limit: parseInt(query.limit || '20'),
        propertyId: query.propertyId,
        vendorId: query.vendorId,
        status: query.status as WorkOrderStatus,
        priority: query.priority as Priority,
        category: query.category as WorkCategory,
      });

      return reply.send(result);
    } catch (error) {
      this.server.log.error(error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async getWorkOrder(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };

      const workOrder = await this.workOrderService.getWorkOrder(id);

      if (!workOrder) {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'Work order not found',
        });
      }

      return reply.send(workOrder);
    } catch (error) {
      this.server.log.error(error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async updateWorkOrder(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const body = request.body as any;

      const workOrder = await this.workOrderService.updateWorkOrder(id, {
        title: body.title,
        description: body.description,
        status: body.status as WorkOrderStatus,
        priority: body.priority as Priority,
        vendorId: body.vendorId,
        assignedTo: body.assignedTo,
        scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined,
        estimatedCost: body.estimatedCost,
        actualCost: body.actualCost,
        laborCost: body.laborCost,
        materialsCost: body.materialsCost,
        completionNotes: body.completionNotes,
        vendorNotes: body.vendorNotes,
        qualityRating: body.qualityRating,
        vendorRating: body.vendorRating,
      });

      return reply.send(workOrder);
    } catch (error) {
      this.server.log.error(error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async assignToVendor(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const body = request.body as any;

      const workOrder = await this.workOrderService.assignToVendor(id, body.vendorId);

      return reply.send(workOrder);
    } catch (error) {
      this.server.log.error(error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async scheduleWorkOrder(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const body = request.body as any;

      const workOrder = await this.workOrderService.scheduleWorkOrder(id, new Date(body.scheduledAt));

      return reply.send(workOrder);
    } catch (error) {
      this.server.log.error(error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async startWorkOrder(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };

      const workOrder = await this.workOrderService.startWorkOrder(id);

      return reply.send(workOrder);
    } catch (error) {
      this.server.log.error(error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async completeWorkOrder(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const body = request.body as any;

      const workOrder = await this.workOrderService.completeWorkOrder(id, {
        actualCost: body.actualCost,
        laborCost: body.laborCost,
        materialsCost: body.materialsCost,
        completionNotes: body.completionNotes,
        vendorNotes: body.vendorNotes,
      });

      return reply.send(workOrder);
    } catch (error) {
      this.server.log.error(error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async verifyWorkOrder(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const user = request.user as any;
      const body = request.body as any;

      const workOrder = await this.workOrderService.verifyWorkOrder(id, {
        verifiedBy: user.userId,
        qualityRating: body.qualityRating,
        vendorRating: body.vendorRating,
      });

      return reply.send(workOrder);
    } catch (error) {
      this.server.log.error(error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async uploadPhotoBefore(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const data = await request.file();

      if (!data) {
        return reply.code(400).send({
          error: 'Bad Request',
          message: 'No file uploaded',
        });
      }

      const buffer = await data.toBuffer();

      const workOrder = await this.workOrderService.addPhotoBefore(id, buffer);

      return reply.send(workOrder);
    } catch (error) {
      this.server.log.error(error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async uploadPhotoAfter(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const data = await request.file();

      if (!data) {
        return reply.code(400).send({
          error: 'Bad Request',
          message: 'No file uploaded',
        });
      }

      const buffer = await data.toBuffer();

      const workOrder = await this.workOrderService.addPhotoAfter(id, buffer);

      return reply.send(workOrder);
    } catch (error) {
      this.server.log.error(error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async cancelWorkOrder(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const body = request.body as any;

      const workOrder = await this.workOrderService.cancelWorkOrder(id, body.reason);

      return reply.send(workOrder);
    } catch (error) {
      this.server.log.error(error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async deleteWorkOrder(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };

      await this.workOrderService.deleteWorkOrder(id);

      return reply.code(204).send();
    } catch (error) {
      this.server.log.error(error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}
