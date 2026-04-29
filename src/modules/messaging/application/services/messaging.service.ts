import { DrizzleService } from "@shared/infra/database/drizzle.service";
import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { RabbitMQService } from "@messaging/infra/rabbitmq/rabbitmq.service";
import type { PublishMessageDto } from "../dto/publish-message.dto";
import { ConsumedMessageDto } from "../dto/consumed-message.dto";
import { classOfferingsReferenceSchema, studentsReferenceSchema } from "@enrollment/infra/schemas";
import { eq } from "drizzle-orm";

@Injectable()
export class MessagingService {
  private readonly logger = new Logger(MessagingService.name);

  constructor(
    private readonly rabbitMQService: RabbitMQService,
    private readonly drizzleService: DrizzleService,
  ) {}

  // ─── Exchange & Queue setup ───────────────────────────────────────────────

  async assertExchange(name: string): Promise<void> {
    this.logger.log(`Asserting exchange: ${name}`);
    const channel = this.rabbitMQService.getChannel();
    await channel.assertExchange(name, "direct", { durable: true });
    this.logger.log(`Exchange OK: ${name}`);
  }

  async assertQueue(queueName: string, exchangeName: string, routingKey: string): Promise<void> {
    this.logger.log(`Asserting queue: ${queueName}`);
    const channel = this.rabbitMQService.getChannel();
    await channel.assertQueue(queueName, { durable: true });
    await channel.bindQueue(queueName, exchangeName, routingKey);
    this.logger.log(`Queue OK: ${queueName}`);
  }

  // ─── Publisher ────────────────────────────────────────────────────────────

  async publish(dto: PublishMessageDto, exchangeName: string, routingKey: string): Promise<void> {
    const channel = this.rabbitMQService.getChannel();
    channel.publish(exchangeName, routingKey, Buffer.from(dto.content), { persistent: true });
    this.logger.log(`Published to ${exchangeName} [${routingKey}]: ${dto.content}`);
  }

  async publishEnrollmentCreated(enrollmentId: string, studentId: string, classOfferingId: string): Promise<void> {
    const payload = JSON.stringify({ enrollmentId, studentId, classOfferingId });
    await this.publish({ content: payload }, "enrollment.created.exchange", "enrollment.created");
  }

  async publishEnrollmentCanceled(enrollmentId: string): Promise<void> {
    const payload = JSON.stringify({ enrollmentId });
    await this.publish({ content: payload }, "enrollment.canceled.exchange", "enrollment.canceled");
  }

  // ─── Consumer ─────────────────────────────────────────────────────────────

  async consume(queueName: string): Promise<ConsumedMessageDto> {
    const channel = this.rabbitMQService.getChannel();
    const msg = await channel.get(queueName, { noAck: false });

    if (!msg) {
      throw new NotFoundException("No messages in queue");
    }

    const content = msg.content.toString();
    channel.ack(msg);
    this.logger.log(`Consumed from ${queueName}: ${content}`);
    return ConsumedMessageDto.from(queueName, content);
  }

  // ─── Sync: students reference table ──────────────────────────────────────

  async syncStudentCreated(queueName: string): Promise<ConsumedMessageDto> {
    const msg = await this.consume(queueName);
    const { id } = JSON.parse(msg.content) as { id: string };
    await this.drizzleService.db
      .insert(studentsReferenceSchema)
      .values({ id })
      .onConflictDoNothing();
    this.logger.log(`Student synced (created): ${id}`);
    return msg;
  }

  async syncStudentUpdated(queueName: string): Promise<ConsumedMessageDto> {
    // No fields to update in the reference table — just ensure the record exists
    const msg = await this.consume(queueName);
    const { id } = JSON.parse(msg.content) as { id: string };
    await this.drizzleService.db
      .insert(studentsReferenceSchema)
      .values({ id })
      .onConflictDoNothing();
    this.logger.log(`Student synced (updated): ${id}`);
    return msg;
  }

  async syncStudentDeleted(queueName: string): Promise<ConsumedMessageDto> {
    const msg = await this.consume(queueName);
    const { id } = JSON.parse(msg.content) as { id: string };
    await this.drizzleService.db
      .delete(studentsReferenceSchema)
      .where(eq(studentsReferenceSchema.id, id));
    this.logger.log(`Student synced (deleted): ${id}`);
    return msg;
  }

  // ─── Sync: class_offerings reference table ────────────────────────────────

  async syncClassOfferingCreated(queueName: string): Promise<ConsumedMessageDto> {
    const msg = await this.consume(queueName);
    const { id } = JSON.parse(msg.content) as { id: string };
    await this.drizzleService.db
      .insert(classOfferingsReferenceSchema)
      .values({ id })
      .onConflictDoNothing();
    this.logger.log(`ClassOffering synced (created): ${id}`);
    return msg;
  }

  async syncClassOfferingUpdated(queueName: string): Promise<ConsumedMessageDto> {
    const msg = await this.consume(queueName);
    const { id } = JSON.parse(msg.content) as { id: string };
    await this.drizzleService.db
      .insert(classOfferingsReferenceSchema)
      .values({ id })
      .onConflictDoNothing();
    this.logger.log(`ClassOffering synced (updated): ${id}`);
    return msg;
  }

  async syncClassOfferingCanceled(queueName: string): Promise<ConsumedMessageDto> {
    const msg = await this.consume(queueName);
    const { id } = JSON.parse(msg.content) as { id: string };
    await this.drizzleService.db
      .delete(classOfferingsReferenceSchema)
      .where(eq(classOfferingsReferenceSchema.id, id));
    this.logger.log(`ClassOffering synced (canceled): ${id}`);
    return msg;
  }
}
