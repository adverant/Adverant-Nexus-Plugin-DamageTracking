import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { config } from '../config/config';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';
import { S3UploadResult } from '../types';

export class S3Util {
  private s3Client: S3Client;

  constructor() {
    this.s3Client = new S3Client({
      region: config.s3.region,
      credentials: config.s3.accessKeyId && config.s3.secretAccessKey
        ? {
            accessKeyId: config.s3.accessKeyId,
            secretAccessKey: config.s3.secretAccessKey,
          }
        : undefined,
    });
  }

  async uploadImage(
    buffer: Buffer,
    folder: string,
    options?: {
      resize?: { width?: number; height?: number };
      quality?: number;
      format?: 'jpeg' | 'png' | 'webp';
    }
  ): Promise<S3UploadResult> {
    try {
      let processedBuffer = buffer;

      // Process image with sharp
      if (options?.resize || options?.quality || options?.format) {
        let image = sharp(buffer);

        if (options.resize) {
          image = image.resize(options.resize.width, options.resize.height, {
            fit: 'inside',
            withoutEnlargement: true,
          });
        }

        const format = options.format || 'jpeg';
        switch (format) {
          case 'jpeg':
            image = image.jpeg({ quality: options.quality || 85 });
            break;
          case 'png':
            image = image.png({ quality: options.quality || 85 });
            break;
          case 'webp':
            image = image.webp({ quality: options.quality || 85 });
            break;
        }

        processedBuffer = await image.toBuffer();
      }

      const key = `${folder}/${uuidv4()}.${options?.format || 'jpg'}`;

      const command = new PutObjectCommand({
        Bucket: config.s3.bucket,
        Key: key,
        Body: processedBuffer,
        ContentType: `image/${options?.format || 'jpeg'}`,
      });

      await this.s3Client.send(command);

      const url = `https://${config.s3.bucket}.s3.${config.s3.region}.amazonaws.com/${key}`;

      return {
        url,
        key,
        bucket: config.s3.bucket,
      };
    } catch (error) {
      throw new Error(`Failed to upload image to S3: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async uploadFile(buffer: Buffer, folder: string, filename: string, contentType: string): Promise<S3UploadResult> {
    try {
      const key = `${folder}/${uuidv4()}_${filename}`;

      const command = new PutObjectCommand({
        Bucket: config.s3.bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      });

      await this.s3Client.send(command);

      const url = `https://${config.s3.bucket}.s3.${config.s3.region}.amazonaws.com/${key}`;

      return {
        url,
        key,
        bucket: config.s3.bucket,
      };
    } catch (error) {
      throw new Error(`Failed to upload file to S3: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: config.s3.bucket,
        Key: key,
      });

      return await getSignedUrl(this.s3Client, command, { expiresIn });
    } catch (error) {
      throw new Error(`Failed to generate signed URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
