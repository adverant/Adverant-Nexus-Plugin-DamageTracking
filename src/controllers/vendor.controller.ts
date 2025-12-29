import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { VendorService } from '../services/vendor.service';
import { VendorStatus, WorkCategory } from '@prisma/client';

export class VendorController {
  private vendorService: VendorService;

  constructor(private server: FastifyInstance) {
    this.vendorService = new VendorService(server.prisma);
  }

  async createVendor(request: FastifyRequest, reply: FastifyReply) {
    try {
      const body = request.body as any;

      const vendor = await this.vendorService.createVendor({
        name: body.name,
        company: body.company,
        email: body.email,
        phone: body.phone,
        alternatePhone: body.alternatePhone,
        specialties: body.specialties as WorkCategory[],
        serviceAreas: body.serviceAreas,
        address: body.address,
        website: body.website,
        businessHours: body.businessHours,
        emergencyAvailable: body.emergencyAvailable,
        pricingInfo: body.pricingInfo,
        paymentTerms: body.paymentTerms,
        licenseNumber: body.licenseNumber,
        licenseState: body.licenseState,
        licenseExpiry: body.licenseExpiry ? new Date(body.licenseExpiry) : undefined,
        insuranceProvider: body.insuranceProvider,
        insurancePolicy: body.insurancePolicy,
        insuranceExpiry: body.insuranceExpiry ? new Date(body.insuranceExpiry) : undefined,
        bondedAmount: body.bondedAmount,
      });

      return reply.code(201).send(vendor);
    } catch (error) {
      this.server.log.error(error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async listVendors(request: FastifyRequest, reply: FastifyReply) {
    try {
      const query = request.query as any;

      const result = await this.vendorService.listVendors({
        page: parseInt(query.page || '1'),
        limit: parseInt(query.limit || '20'),
        status: query.status as VendorStatus,
        specialty: query.specialty as WorkCategory,
        preferredOnly: query.preferredOnly === 'true',
        minRating: query.minRating ? parseFloat(query.minRating) : undefined,
        city: query.city,
        state: query.state,
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

  async getVendor(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };

      const vendor = await this.vendorService.getVendor(id);

      if (!vendor) {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'Vendor not found',
        });
      }

      return reply.send(vendor);
    } catch (error) {
      this.server.log.error(error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async updateVendor(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const body = request.body as any;

      const vendor = await this.vendorService.updateVendor(id, {
        name: body.name,
        company: body.company,
        phone: body.phone,
        alternatePhone: body.alternatePhone,
        specialties: body.specialties as WorkCategory[],
        serviceAreas: body.serviceAreas,
        website: body.website,
        businessHours: body.businessHours,
        emergencyAvailable: body.emergencyAvailable,
        pricingInfo: body.pricingInfo,
        paymentTerms: body.paymentTerms,
        status: body.status as VendorStatus,
        preferredVendor: body.preferredVendor,
        licenseVerified: body.licenseVerified,
        insuranceVerified: body.insuranceVerified,
        w9OnFile: body.w9OnFile,
        contractSigned: body.contractSigned,
        backgroundCheck: body.backgroundCheck,
        notes: body.notes,
        internalNotes: body.internalNotes,
      });

      return reply.send(vendor);
    } catch (error) {
      this.server.log.error(error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async activateVendor(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };

      const vendor = await this.vendorService.activateVendor(id);

      return reply.send(vendor);
    } catch (error) {
      this.server.log.error(error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async suspendVendor(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const body = request.body as any;

      const vendor = await this.vendorService.suspendVendor(id, body.reason);

      return reply.send(vendor);
    } catch (error) {
      this.server.log.error(error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async getPerformanceMetrics(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };

      const metrics = await this.vendorService.getPerformanceMetrics(id);

      return reply.send(metrics);
    } catch (error) {
      this.server.log.error(error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async addReview(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const user = request.user as any;
      const body = request.body as any;

      const review = await this.vendorService.addReview(id, {
        workOrderId: body.workOrderId,
        propertyId: body.propertyId,
        reviewerId: user.userId,
        rating: body.rating,
        qualityRating: body.qualityRating,
        timelinessRating: body.timelinessRating,
        communicationRating: body.communicationRating,
        professionalismRating: body.professionalismRating,
        valueRating: body.valueRating,
        review: body.review,
        pros: body.pros,
        cons: body.cons,
        wouldRecommend: body.wouldRecommend,
        wouldHireAgain: body.wouldHireAgain,
        photos: body.photos,
      });

      return reply.code(201).send(review);
    } catch (error) {
      this.server.log.error(error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async getReviews(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const query = request.query as any;

      const result = await this.vendorService.getReviews(id, {
        page: parseInt(query.page || '1'),
        limit: parseInt(query.limit || '20'),
        minRating: query.minRating ? parseInt(query.minRating) : undefined,
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

  async searchBySpecialty(request: FastifyRequest, reply: FastifyReply) {
    try {
      const query = request.query as any;

      const vendors = await this.vendorService.searchVendorsBySpecialty(query.specialty as WorkCategory, {
        city: query.city,
        state: query.state,
        emergencyOnly: query.emergencyOnly === 'true',
        preferredOnly: query.preferredOnly === 'true',
        minRating: query.minRating ? parseFloat(query.minRating) : undefined,
      });

      return reply.send(vendors);
    } catch (error) {
      this.server.log.error(error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async deleteVendor(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };

      await this.vendorService.deleteVendor(id);

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
