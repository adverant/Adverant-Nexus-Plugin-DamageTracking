import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { DamageService } from '../services/damage.service';
import { DamageType, Severity, DamageStatus, ResponsibleParty } from '@prisma/client';

export class DamageController {
  private damageService: DamageService;

  constructor(private server: FastifyInstance) {
    this.damageService = new DamageService(server.prisma);
  }

  async createDamage(request: FastifyRequest, reply: FastifyReply) {
    try {
      const body = request.body as any;

      const damage = await this.damageService.createDamage({
        inspectionId: body.inspectionId,
        reservationId: body.reservationId,
        propertyId: body.propertyId,
        room: body.room,
        location: body.location,
        damageType: body.damageType as DamageType,
        severity: body.severity as Severity,
        description: body.description,
        responsibleParty: body.responsibleParty as ResponsibleParty,
        estimatedCostManual: body.estimatedCostManual,
      });

      return reply.code(201).send(damage);
    } catch (error) {
      this.server.log.error(error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async listDamages(request: FastifyRequest, reply: FastifyReply) {
    try {
      const query = request.query as any;

      const result = await this.damageService.listDamages({
        page: parseInt(query.page || '1'),
        limit: parseInt(query.limit || '20'),
        inspectionId: query.inspectionId,
        propertyId: query.propertyId,
        reservationId: query.reservationId,
        status: query.status as DamageStatus,
        severity: query.severity as Severity,
        aiDetected: query.aiDetected === 'true' ? true : query.aiDetected === 'false' ? false : undefined,
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

  async getDamage(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };

      const damage = await this.damageService.getDamage(id);

      if (!damage) {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'Damage not found',
        });
      }

      return reply.send(damage);
    } catch (error) {
      this.server.log.error(error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async updateDamage(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const body = request.body as any;

      const damage = await this.damageService.updateDamage(id, {
        room: body.room,
        location: body.location,
        damageType: body.damageType as DamageType,
        severity: body.severity as Severity,
        description: body.description,
        status: body.status as DamageStatus,
        responsibleParty: body.responsibleParty as ResponsibleParty,
        estimatedCostManual: body.estimatedCostManual,
        actualCost: body.actualCost,
        beforePhotoUrl: body.beforePhotoUrl,
        afterPhotoUrl: body.afterPhotoUrl,
      });

      return reply.send(damage);
    } catch (error) {
      this.server.log.error(error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async detectDamageFromImage(request: FastifyRequest, reply: FastifyReply) {
    try {
      const data = await request.file();

      if (!data) {
        return reply.code(400).send({
          error: 'Bad Request',
          message: 'No file uploaded',
        });
      }

      const buffer = await data.toBuffer();
      const fields = data.fields as any;

      const damage = await this.damageService.detectDamageFromImage(buffer, {
        inspectionId: fields.inspectionId.value,
        propertyId: fields.propertyId.value,
        room: fields.room.value,
        location: fields.location.value,
      });

      if (!damage) {
        return reply.send({
          detected: false,
          message: 'No damage detected with sufficient confidence',
        });
      }

      return reply.code(201).send({
        detected: true,
        damage,
      });
    } catch (error) {
      this.server.log.error(error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async compareBeforeAfter(request: FastifyRequest, reply: FastifyReply) {
    try {
      const parts = request.parts();
      let beforeBuffer: Buffer | null = null;
      let afterBuffer: Buffer | null = null;
      const fields: any = {};

      for await (const part of parts) {
        if (part.type === 'file') {
          const buffer = await part.toBuffer();
          if (part.fieldname === 'beforeImage') {
            beforeBuffer = buffer;
          } else if (part.fieldname === 'afterImage') {
            afterBuffer = buffer;
          }
        } else {
          fields[part.fieldname] = part.value;
        }
      }

      if (!beforeBuffer || !afterBuffer) {
        return reply.code(400).send({
          error: 'Bad Request',
          message: 'Both beforeImage and afterImage are required',
        });
      }

      const damages = await this.damageService.compareBeforeAfter(beforeBuffer, afterBuffer, {
        inspectionId: fields.inspectionId,
        propertyId: fields.propertyId,
        room: fields.room,
        location: fields.location,
      });

      return reply.code(201).send({
        damagesDetected: damages.length,
        damages,
      });
    } catch (error) {
      this.server.log.error(error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async addPhoto(request: FastifyRequest, reply: FastifyReply) {
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

      const damage = await this.damageService.addPhoto(id, buffer);

      return reply.send(damage);
    } catch (error) {
      this.server.log.error(error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async disputeDamage(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const body = request.body as any;

      const damage = await this.damageService.disputeDamage(id, {
        disputeReason: body.disputeReason,
        evidence: body.evidence,
      });

      return reply.send(damage);
    } catch (error) {
      this.server.log.error(error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async resolveDispute(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const body = request.body as any;

      const damage = await this.damageService.resolveDispute(id, {
        resolution: body.resolution,
        finalResponsibleParty: body.finalResponsibleParty as ResponsibleParty,
        finalCost: body.finalCost,
      });

      return reply.send(damage);
    } catch (error) {
      this.server.log.error(error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async deleteDamage(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };

      await this.damageService.deleteDamage(id);

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
