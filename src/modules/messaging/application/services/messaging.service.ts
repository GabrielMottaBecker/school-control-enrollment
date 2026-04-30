import { DrizzleService } from "@shared/infra/database/drizzle.service";
import { Injectable, Logger, NotFoundException, OnModuleInit } from "@nestjs/common";
import { RabbitMQService } from "@messaging/infra/rabbitmq/rabbitmq.service";
import type { PublishMessageDto } from "../dto/publish-message.dto";
import { ConsumedMessageDto } from "../dto/consumed-message.dto";
import type { ConsumeMessage } from "amqplib";
import { classOfferingsReferenceSchema, studentsReferenceSchema } from "@enrollment/infra/schemas";
import { eq } from "drizzle-orm";

// Filas consumidas automaticamente 
const STUDENT_CREATED_QUEUE   = "enrollment.academic-students.created.queue";
const STUDENT_UPDATED_QUEUE   = "enrollment.academic-students.updated.queue";
const STUDENT_DELETED_QUEUE   = "enrollment.academic-students.deleted.queue";
const CLASS_CREATED_QUEUE     = "enrollment.class-offering.created.queue";
const CLASS_UPDATED_QUEUE     = "enrollment.class-offering.updated.queue";
const CLASS_CANCELED_QUEUE    = "enrollment.class-offering.canceled.queue";

@Injectable()
export class MessagingService implements OnModuleInit {
  private readonly logger = new Logger(MessagingService.name);

  constructor(
    private readonly rabbitMQService: RabbitMQService,
    private readonly drizzleService: DrizzleService,
  ) {}

  // Auto-start consumers após módulo inicializar 

  async onModuleInit(): Promise<void> {
    // Aguarda o canal estar disponível (RabbitMQService inicializa primeiro)
    // Pequeno delay para garantir que o canal está pronto
    await new Promise((resolve) => setTimeout(resolve, 500));
    await this.startConsumers();
  }

  async startConsumers(): Promise<void> {
    const channel = this.rabbitMQService.getChannel();

    if (!channel) {
      this.logger.warn("Canal RabbitMQ não disponível — consumers não registrados");
      return;
    }

    this.logger.log("Registrando consumers automáticos...");

    // Students
    await channel.consume(STUDENT_CREATED_QUEUE, async (msg: ConsumeMessage | null) => {
      if (!msg) return;
      try {
        const { id } = JSON.parse(msg.content.toString()) as { id: string };
        await this.drizzleService.db
          .insert(studentsReferenceSchema)
          .values({ id })
          .onConflictDoNothing();
        channel.ack(msg);
        this.logger.log(`[AUTO] Student created synced: ${id}`);
      } catch (err) {
        channel.nack(msg, false, true); // requeue
        this.logger.error(`[AUTO] Erro ao processar student.created`, err);
      }
    });

    await channel.consume(STUDENT_UPDATED_QUEUE, async (msg: ConsumeMessage | null) => {
      if (!msg) return;
      try {
        const { id } = JSON.parse(msg.content.toString()) as { id: string };
        await this.drizzleService.db
          .insert(studentsReferenceSchema)
          .values({ id })
          .onConflictDoNothing();
        channel.ack(msg);
        this.logger.log(`[AUTO] Student updated synced: ${id}`);
      } catch (err) {
        channel.nack(msg, false, true);
        this.logger.error(`[AUTO] Erro ao processar student.updated`, err);
      }
    });

    await channel.consume(STUDENT_DELETED_QUEUE, async (msg: ConsumeMessage | null) => {
      if (!msg) return;
      try {
        const { id } = JSON.parse(msg.content.toString()) as { id: string };
        await this.drizzleService.db
          .delete(studentsReferenceSchema)
          .where(eq(studentsReferenceSchema.id, id));
        channel.ack(msg);
        this.logger.log(`[AUTO] Student deleted synced: ${id}`);
      } catch (err) {
        channel.nack(msg, false, true);
        this.logger.error(`[AUTO] Erro ao processar student.deleted`, err);
      }
    });

    // Class Offerings 
    await channel.consume(CLASS_CREATED_QUEUE, async (msg: ConsumeMessage | null) => {
      if (!msg) return;
      try {
        const { id } = JSON.parse(msg.content.toString()) as { id: string };
        await this.drizzleService.db
          .insert(classOfferingsReferenceSchema)
          .values({ id })
          .onConflictDoNothing();
        channel.ack(msg);
        this.logger.log(`[AUTO] ClassOffering created synced: ${id}`);
      } catch (err) {
        channel.nack(msg, false, true);
        this.logger.error(`[AUTO] Erro ao processar class-offering.created`, err);
      }
    });

    await channel.consume(CLASS_UPDATED_QUEUE, async (msg: ConsumeMessage | null) => {
      if (!msg) return;
      try {
        const { id } = JSON.parse(msg.content.toString()) as { id: string };
        await this.drizzleService.db
          .insert(classOfferingsReferenceSchema)
          .values({ id })
          .onConflictDoNothing();
        channel.ack(msg);
        this.logger.log(`[AUTO] ClassOffering updated synced: ${id}`);
      } catch (err) {
        channel.nack(msg, false, true);
        this.logger.error(`[AUTO] Erro ao processar class-offering.updated`, err);
      }
    });

    await channel.consume(CLASS_CANCELED_QUEUE, async (msg: ConsumeMessage | null) => {
      if (!msg) return;
      try {
        const { id } = JSON.parse(msg.content.toString()) as { id: string };
        await this.drizzleService.db
          .delete(classOfferingsReferenceSchema)
          .where(eq(classOfferingsReferenceSchema.id, id));
        channel.ack(msg);
        this.logger.log(`[AUTO] ClassOffering canceled synced: ${id}`);
      } catch (err) {
        channel.nack(msg, false, true);
        this.logger.error(`[AUTO] Erro ao processar class-offering.canceled`, err);
      }
    });

    this.logger.log("Consumers automáticos registrados com sucesso");
  }

  // Exchange & Queue setup 

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

  // Publisher 

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

  // Consumer pull (mantido para uso manual via GET) 

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

  // ─── Sync pull (mantido para compatibilidade com endpoints GET) ───────────

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