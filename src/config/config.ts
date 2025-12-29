export const config = {
  // Server
  port: parseInt(process.env.PORT || '9030', 10),
  host: process.env.HOST || '0.0.0.0',
  isDevelopment: process.env.NODE_ENV !== 'production',
  logLevel: process.env.LOG_LEVEL || 'info',

  // Database
  databaseUrl: process.env.DATABASE_URL || 'postgresql://nexus:nexus@localhost:5432/nexus_damage_tracking',

  // JWT
  jwtSecret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',

  // CORS
  corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:5173'],

  // Redis
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',

  // RabbitMQ
  rabbitmqUrl: process.env.RABBITMQ_URL || 'amqp://nexus:nexus@localhost:5672',

  // Nexus GraphRAG
  nexusApiUrl: process.env.NEXUS_API_URL || 'http://localhost:9001',

  // Computer Vision Service
  cvApiUrl: process.env.CV_API_URL || 'http://localhost:9040',

  // Communication Service
  communicationApiUrl: process.env.COMMUNICATION_API_URL || 'http://localhost:9050',

  // File Storage - AWS S3
  s3: {
    bucket: process.env.S3_BUCKET || 'nexus-damage-tracking',
    region: process.env.AWS_REGION || 'us-east-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },

  // File Upload
  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10), // 10MB default
    allowedFileTypes: process.env.ALLOWED_FILE_TYPES?.split(',') || [
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/pdf',
    ],
  },

  // Damage Detection AI
  ai: {
    confidenceThreshold: parseFloat(process.env.AI_CONFIDENCE_THRESHOLD || '0.75'),
    minDamageSizePixels: parseInt(process.env.MIN_DAMAGE_SIZE_PIXELS || '100', 10),
  },

  // Service URLs
  services: {
    nexus: process.env.NEXUS_API_URL || 'http://localhost:9001',
    computerVision: process.env.CV_API_URL || 'http://localhost:9040',
    communication: process.env.COMMUNICATION_API_URL || 'http://localhost:9050',
    propertyManagement: process.env.PROPERTY_MGMT_API_URL || 'http://localhost:9020',
  },
};
