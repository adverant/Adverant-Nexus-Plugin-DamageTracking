import axios, { AxiosInstance } from 'axios';
import { config } from '../config/config';
import { CVDetectionRequest, CVDetectionResponse, AIDetectionResult } from '../types';

export class CVIntegrationService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: config.cvApiUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Detect damage in an image using Computer Vision Service
   */
  async detectDamage(imageUrl: string, propertyId: string, room: string): Promise<AIDetectionResult> {
    try {
      const request: CVDetectionRequest = {
        imageUrl,
        propertyId,
        room,
        options: {
          detectDamage: true,
        },
      };

      const response = await this.client.post<CVDetectionResponse>('/api/v1/detect/damage', request);

      if (!response.data.success || !response.data.detections || response.data.detections.length === 0) {
        return {
          detected: false,
          confidence: 0,
        };
      }

      // Get the detection with highest confidence
      const bestDetection = response.data.detections.reduce((prev, current) =>
        current.confidence > prev.confidence ? current : prev
      );

      return {
        detected: true,
        confidence: bestDetection.confidence,
        damageType: bestDetection.type,
        severity: bestDetection.severity,
        boundingBox: bestDetection.boundingBox,
        metadata: response.data.metadata,
      };
    } catch (error) {
      console.error('CV Service - Damage detection failed:', error);
      // Return graceful fallback
      return {
        detected: false,
        confidence: 0,
        metadata: {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }

  /**
   * Compare before/after images to detect changes
   */
  async compareImages(
    beforeImageUrl: string,
    afterImageUrl: string,
    propertyId: string,
    room: string
  ): Promise<{
    hasChanges: boolean;
    confidence: number;
    differences: Array<{
      type: string;
      severity: string;
      boundingBox: { x: number; y: number; width: number; height: number };
      confidence: number;
    }>;
  }> {
    try {
      const request: CVDetectionRequest = {
        imageUrl: afterImageUrl,
        propertyId,
        room,
        options: {
          compareImages: true,
          beforeImageUrl,
        },
      };

      const response = await this.client.post<CVDetectionResponse>('/api/v1/detect/compare', request);

      if (!response.data.success) {
        return {
          hasChanges: false,
          confidence: 0,
          differences: [],
        };
      }

      const differences = response.data.detections.map((detection) => ({
        type: detection.type,
        severity: detection.severity,
        boundingBox: detection.boundingBox,
        confidence: detection.confidence,
      }));

      const maxConfidence = differences.length > 0
        ? Math.max(...differences.map((d) => d.confidence))
        : 0;

      return {
        hasChanges: differences.length > 0,
        confidence: maxConfidence,
        differences,
      };
    } catch (error) {
      console.error('CV Service - Image comparison failed:', error);
      return {
        hasChanges: false,
        confidence: 0,
        differences: [],
      };
    }
  }

  /**
   * Batch process multiple images for damage detection
   */
  async batchDetectDamage(
    images: Array<{ url: string; room: string }>,
    propertyId: string
  ): Promise<Array<{ imageUrl: string; room: string; result: AIDetectionResult }>> {
    const results = await Promise.all(
      images.map(async (image) => {
        const result = await this.detectDamage(image.url, propertyId, image.room);
        return {
          imageUrl: image.url,
          room: image.room,
          result,
        };
      })
    );

    return results;
  }

  /**
   * Estimate repair cost using AI
   */
  async estimateRepairCost(
    damageType: string,
    severity: string,
    imageUrl?: string
  ): Promise<{ estimatedCost: number; confidence: number; breakdown?: Record<string, number> }> {
    try {
      const response = await this.client.post('/api/v1/estimate/cost', {
        damageType,
        severity,
        imageUrl,
      });

      return {
        estimatedCost: response.data.estimatedCost || 0,
        confidence: response.data.confidence || 0,
        breakdown: response.data.breakdown,
      };
    } catch (error) {
      console.error('CV Service - Cost estimation failed:', error);
      // Return conservative estimate based on severity
      const baseEstimates: Record<string, number> = {
        MINOR: 100,
        MODERATE: 500,
        MAJOR: 2000,
        CRITICAL: 5000,
      };

      return {
        estimatedCost: baseEstimates[severity] || 500,
        confidence: 0.3,
      };
    }
  }

  /**
   * Health check for Computer Vision Service
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get('/health', { timeout: 5000 });
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }
}
