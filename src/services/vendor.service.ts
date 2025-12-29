import { PrismaClient, Vendor, VendorStatus, VendorReview, WorkCategory } from '@prisma/client';
import { RabbitMQUtil } from '../utils/rabbitmq.util';
import { PaginatedResponse, VendorPerformanceMetrics } from '../types';

interface CreateVendorParams {
  name: string;
  company?: string;
  email: string;
  phone: string;
  alternatePhone?: string;
  specialties: WorkCategory[];
  serviceAreas: Array<{ city: string; state: string; radiusMiles: number }>;
  address?: {
    street: string;
    city: string;
    state: string;
    zip: string;
    country?: string;
  };
  website?: string;
  businessHours?: Record<string, { open: string; close: string }>;
  emergencyAvailable?: boolean;
  pricingInfo?: {
    hourlyRate?: number;
    calloutFee?: number;
    minimumCharge?: number;
    markup?: number;
  };
  paymentTerms?: string;
  licenseNumber?: string;
  licenseState?: string;
  licenseExpiry?: Date;
  insuranceProvider?: string;
  insurancePolicy?: string;
  insuranceExpiry?: Date;
  bondedAmount?: number;
}

interface UpdateVendorParams {
  name?: string;
  company?: string;
  phone?: string;
  alternatePhone?: string;
  specialties?: WorkCategory[];
  serviceAreas?: Array<{ city: string; state: string; radiusMiles: number }>;
  website?: string;
  businessHours?: Record<string, { open: string; close: string }>;
  emergencyAvailable?: boolean;
  pricingInfo?: Record<string, any>;
  paymentTerms?: string;
  status?: VendorStatus;
  preferredVendor?: boolean;
  licenseVerified?: boolean;
  insuranceVerified?: boolean;
  w9OnFile?: boolean;
  contractSigned?: boolean;
  backgroundCheck?: boolean;
  notes?: string;
  internalNotes?: string;
}

interface ListVendorsParams {
  page: number;
  limit: number;
  status?: VendorStatus;
  specialty?: WorkCategory;
  preferredOnly?: boolean;
  minRating?: number;
  city?: string;
  state?: string;
}

export class VendorService {
  private rabbitMQ: RabbitMQUtil;

  constructor(private prisma: PrismaClient) {
    this.rabbitMQ = new RabbitMQUtil();
  }

  async createVendor(params: CreateVendorParams): Promise<Vendor> {
    const vendor = await this.prisma.vendor.create({
      data: {
        name: params.name,
        company: params.company,
        email: params.email,
        phone: params.phone,
        alternatePhone: params.alternatePhone,
        specialties: params.specialties,
        serviceAreas: params.serviceAreas,
        address: params.address,
        website: params.website,
        businessHours: params.businessHours,
        emergencyAvailable: params.emergencyAvailable || false,
        pricingInfo: params.pricingInfo,
        paymentTerms: params.paymentTerms,
        licenseNumber: params.licenseNumber,
        licenseState: params.licenseState,
        licenseExpiry: params.licenseExpiry,
        insuranceProvider: params.insuranceProvider,
        insurancePolicy: params.insurancePolicy,
        insuranceExpiry: params.insuranceExpiry,
        bondedAmount: params.bondedAmount,
        status: 'PENDING',
      },
    });

    // Publish event
    await this.rabbitMQ.publishEvent({
      eventType: 'created',
      entityType: 'vendor',
      entityId: vendor.id,
      data: {
        name: vendor.name,
        specialties: params.specialties,
      },
      timestamp: new Date(),
    });

    return vendor;
  }

  async listVendors(params: ListVendorsParams): Promise<PaginatedResponse<Vendor>> {
    const { page, limit, status, specialty, preferredOnly, minRating, city, state } = params;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) where.status = status;
    if (specialty) where.specialties = { has: specialty };
    if (preferredOnly) where.preferredVendor = true;
    if (minRating) {
      where.rating = { gte: minRating };
    }

    // Service area filtering
    if (city || state) {
      where.serviceAreas = {
        path: '$[*]',
        array_contains: city
          ? [{ city, state: state || '' }]
          : [{ state }],
      };
    }

    const [vendors, total] = await Promise.all([
      this.prisma.vendor.findMany({
        where,
        skip,
        take: limit,
        include: {
          workOrders: {
            select: {
              id: true,
              status: true,
            },
            take: 5,
            orderBy: {
              createdAt: 'desc',
            },
          },
          reviews: {
            select: {
              rating: true,
            },
            take: 5,
            orderBy: {
              createdAt: 'desc',
            },
          },
        },
        orderBy: [
          { preferredVendor: 'desc' },
          { rating: 'desc' },
        ],
      }),
      this.prisma.vendor.count({ where }),
    ]);

    return {
      data: vendors,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getVendor(id: string): Promise<Vendor | null> {
    return this.prisma.vendor.findUnique({
      where: { id },
      include: {
        workOrders: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 10,
        },
        reviews: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 10,
        },
      },
    });
  }

  async updateVendor(id: string, params: UpdateVendorParams): Promise<Vendor> {
    const vendor = await this.prisma.vendor.update({
      where: { id },
      data: params as any,
    });

    // Publish event
    await this.rabbitMQ.publishEvent({
      eventType: 'updated',
      entityType: 'vendor',
      entityId: vendor.id,
      data: {
        updates: Object.keys(params),
      },
      timestamp: new Date(),
    });

    return vendor;
  }

  async activateVendor(id: string): Promise<Vendor> {
    return this.updateVendor(id, { status: 'ACTIVE' });
  }

  async suspendVendor(id: string, reason?: string): Promise<Vendor> {
    return this.updateVendor(id, {
      status: 'SUSPENDED',
      internalNotes: reason,
    });
  }

  async getPerformanceMetrics(id: string): Promise<VendorPerformanceMetrics> {
    const vendor = await this.getVendor(id);
    if (!vendor) {
      throw new Error(`Vendor ${id} not found`);
    }

    return {
      totalJobs: vendor.totalJobs,
      completedJobs: vendor.completedJobs,
      cancelledJobs: vendor.cancelledJobs,
      avgCompletionTime: vendor.avgCompletionTime || undefined,
      avgResponseTime: vendor.avgResponseTime || undefined,
      onTimeRate: vendor.onTimeRate ? parseFloat(vendor.onTimeRate.toString()) : undefined,
      qualityScore: vendor.qualityScore ? parseFloat(vendor.qualityScore.toString()) : undefined,
      rating: vendor.rating ? parseFloat(vendor.rating.toString()) : undefined,
    };
  }

  async addReview(
    vendorId: string,
    params: {
      workOrderId?: string;
      propertyId: string;
      reviewerId: string;
      rating: number;
      qualityRating?: number;
      timelinessRating?: number;
      communicationRating?: number;
      professionalismRating?: number;
      valueRating?: number;
      review?: string;
      pros?: string;
      cons?: string;
      wouldRecommend?: boolean;
      wouldHireAgain?: boolean;
      photos?: string[];
    }
  ): Promise<VendorReview> {
    // Validate rating
    if (params.rating < 1 || params.rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }

    const review = await this.prisma.vendorReview.create({
      data: {
        vendorId,
        workOrderId: params.workOrderId,
        propertyId: params.propertyId,
        reviewerId: params.reviewerId,
        rating: params.rating,
        qualityRating: params.qualityRating,
        timelinessRating: params.timelinessRating,
        communicationRating: params.communicationRating,
        professionalismRating: params.professionalismRating,
        valueRating: params.valueRating,
        review: params.review,
        pros: params.pros,
        cons: params.cons,
        wouldRecommend: params.wouldRecommend ?? true,
        wouldHireAgain: params.wouldHireAgain ?? true,
        photos: params.photos || [],
      },
    });

    // Update vendor rating
    await this.recalculateVendorRating(vendorId);

    return review;
  }

  async getReviews(
    vendorId: string,
    params: {
      page: number;
      limit: number;
      minRating?: number;
    }
  ): Promise<PaginatedResponse<VendorReview>> {
    const { page, limit, minRating } = params;
    const skip = (page - 1) * limit;

    const where: any = { vendorId };
    if (minRating) {
      where.rating = { gte: minRating };
    }

    const [reviews, total] = await Promise.all([
      this.prisma.vendorReview.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.vendorReview.count({ where }),
    ]);

    return {
      data: reviews,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  private async recalculateVendorRating(vendorId: string): Promise<void> {
    const reviews = await this.prisma.vendorReview.findMany({
      where: { vendorId },
      select: {
        rating: true,
        qualityRating: true,
      },
    });

    if (reviews.length === 0) return;

    const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

    const qualityReviews = reviews.filter((r) => r.qualityRating !== null);
    const avgQuality = qualityReviews.length > 0
      ? qualityReviews.reduce((sum, r) => sum + (r.qualityRating || 0), 0) / qualityReviews.length
      : undefined;

    await this.prisma.vendor.update({
      where: { id: vendorId },
      data: {
        rating: avgRating,
        qualityScore: avgQuality,
      },
    });
  }

  async searchVendorsBySpecialty(
    specialty: WorkCategory,
    params: {
      city?: string;
      state?: string;
      emergencyOnly?: boolean;
      preferredOnly?: boolean;
      minRating?: number;
    }
  ): Promise<Vendor[]> {
    const where: any = {
      status: 'ACTIVE',
      specialties: { has: specialty },
    };

    if (params.emergencyOnly) {
      where.emergencyAvailable = true;
    }

    if (params.preferredOnly) {
      where.preferredVendor = true;
    }

    if (params.minRating) {
      where.rating = { gte: params.minRating };
    }

    const vendors = await this.prisma.vendor.findMany({
      where,
      orderBy: [
        { preferredVendor: 'desc' },
        { rating: 'desc' },
        { avgResponseTime: 'asc' },
      ],
    });

    // Filter by service area if city/state provided
    if (params.city || params.state) {
      return vendors.filter((vendor) => {
        const serviceAreas = vendor.serviceAreas as Array<{
          city: string;
          state: string;
          radiusMiles: number;
        }>;

        return serviceAreas.some((area) => {
          if (params.state && area.state !== params.state) return false;
          if (params.city && area.city !== params.city) return false;
          return true;
        });
      });
    }

    return vendors;
  }

  async verifyInsurance(id: string, verified: boolean, expiryDate?: Date): Promise<Vendor> {
    return this.updateVendor(id, {
      insuranceVerified: verified,
    });
  }

  async verifyLicense(id: string, verified: boolean): Promise<Vendor> {
    return this.updateVendor(id, {
      licenseVerified: verified,
    });
  }

  async deleteVendor(id: string): Promise<void> {
    // Check if vendor has active work orders
    const activeWorkOrders = await this.prisma.workOrder.count({
      where: {
        vendorId: id,
        status: {
          in: ['PENDING', 'ASSIGNED', 'SCHEDULED', 'IN_PROGRESS'],
        },
      },
    });

    if (activeWorkOrders > 0) {
      throw new Error('Cannot delete vendor with active work orders');
    }

    await this.prisma.vendor.delete({
      where: { id },
    });

    await this.rabbitMQ.publishEvent({
      eventType: 'deleted',
      entityType: 'vendor',
      entityId: id,
      data: {},
      timestamp: new Date(),
    });
  }
}
