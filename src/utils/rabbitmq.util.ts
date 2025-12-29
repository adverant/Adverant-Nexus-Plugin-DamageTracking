import amqp, { Connection, Channel } from 'amqplib';
import { config } from '../config/config';
import { EventPayload } from '../types';

export class RabbitMQUtil {
  private connection: Connection | null = null;
  private channel: Channel | null = null;
  private readonly exchangeName = 'nexus.events';

  async connect(): Promise<void> {
    try {
      this.connection = await amqp.connect(config.rabbitmqUrl);
      this.channel = await this.connection.createChannel();

      // Assert exchange
      await this.channel.assertExchange(this.exchangeName, 'topic', {
        durable: true,
      });

      console.log('✅ Connected to RabbitMQ');
    } catch (error) {
      console.error('❌ Failed to connect to RabbitMQ:', error);
      throw error;
    }
  }

  async publishEvent(event: EventPayload): Promise<void> {
    if (!this.channel) {
      throw new Error('RabbitMQ channel not initialized');
    }

    try {
      const routingKey = `damage-tracking.${event.entityType}.${event.eventType}`;
      const message = Buffer.from(JSON.stringify(event));

      this.channel.publish(this.exchangeName, routingKey, message, {
        persistent: true,
        contentType: 'application/json',
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error('Failed to publish event to RabbitMQ:', error);
      throw error;
    }
  }

  async close(): Promise<void> {
    try {
      await this.channel?.close();
      await this.connection?.close();
      console.log('✅ RabbitMQ connection closed');
    } catch (error) {
      console.error('Error closing RabbitMQ connection:', error);
    }
  }
}
