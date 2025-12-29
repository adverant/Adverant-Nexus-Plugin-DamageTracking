import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { InspectionService } from '../services/inspection.service';
import { InspectionType, InspectionStatus, Condition } from '@prisma/client';

export class InspectionController {
  private inspectionService: InspectionService;

  constructor(private server: FastifyInstance) {
    this.inspectionService = new InspectionService(server.prisma);
  }

  async createInspection(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = request.user as any;
      const body = request.body as any;

      const inspection = await this.inspectionService.createInspection({
        propertyId: body.propertyId,
        unitId: body.unitId,
        reservationId: body.reservationId,
        inspectorId: body.inspectorId || user.userId,
        inspectionType: body.inspectionType as InspectionType,
        scheduledAt: new Date(body.scheduledAt),
        notes: body.notes,
      });

      return reply.code(201).send(inspection);
    } catch (error) {
      this.server.log.error(error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async listInspections(request: FastifyRequest, reply: FastifyReply) {
    try {
      const query = request.query as any;

      const result = await this.inspectionService.listInspections({
        page: parseInt(query.page || '1'),
        limit: parseInt(query.limit || '20'),
        propertyId: query.propertyId,
        inspectorId: query.inspectorId,
        status: query.status as InspectionStatus,
        inspectionType: query.inspectionType as InspectionType,
        startDate: query.startDate ? new Date(query.startDate) : undefined,
        endDate: query.endDate ? new Date(query.endDate) : undefined,
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

  async getInspection(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };

      const inspection = await this.inspectionService.getInspection(id);

      if (!inspection) {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'Inspection not found',
        });
      }

      return reply.send(inspection);
    } catch (error) {
      this.server.log.error(error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async updateInspection(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const body = request.body as any;

      const inspection = await this.inspectionService.updateInspection(id, {
        status: body.status as InspectionStatus,
        startedAt: body.startedAt ? new Date(body.startedAt) : undefined,
        completedAt: body.completedAt ? new Date(body.completedAt) : undefined,
        photos: body.photos,
        checklist: body.checklist,
        overallCondition: body.overallCondition as Condition,
        notes: body.notes,
        startLocation: body.startLocation,
        endLocation: body.endLocation,
      });

      return reply.send(inspection);
    } catch (error) {
      this.server.log.error(error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async startInspection(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const body = request.body as any;

      const inspection = await this.inspectionService.startInspection(id, body.location);

      return reply.send(inspection);
    } catch (error) {
      this.server.log.error(error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async completeInspection(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const body = request.body as any;

      const inspection = await this.inspectionService.completeInspection(id, {
        overallCondition: body.overallCondition as Condition,
        notes: body.notes,
        location: body.location,
      });

      return reply.send(inspection);
    } catch (error) {
      this.server.log.error(error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async uploadPhoto(request: FastifyRequest, reply: FastifyReply) {
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
      const fields = data.fields as any;

      const inspection = await this.inspectionService.addPhoto(id, buffer, {
        room: fields.room?.value || 'unknown',
        angle: fields.angle?.value,
        gps: fields.gps ? JSON.parse(fields.gps.value) : undefined,
        device: fields.device?.value,
      });

      return reply.send(inspection);
    } catch (error) {
      this.server.log.error(error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async generateReport(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };

      const reportUrl = await this.inspectionService.generateReport(id);

      return reply.send({
        reportUrl,
        generatedAt: new Date(),
      });
    } catch (error) {
      this.server.log.error(error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async deleteInspection(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };

      await this.inspectionService.deleteInspection(id);

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
