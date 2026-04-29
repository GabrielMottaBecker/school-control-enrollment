import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from "@nestjs/common";
import {
  ApiOkResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { MessagingService } from "@messaging/application/services/messaging.service";
import { PublishMessageDto } from "@messaging/application/dto/publish-message.dto";
import { ConsumedMessageDto } from "@messaging/application/dto/consumed-message.dto";

// ─── Publisher exchanges ───────────────────────────────────────────────────
const ENROLLMENT_CREATED_EXCHANGE = "enrollment.created.exchange";
const ENROLLMENT_CREATED_KEY      = "enrollment.created";
const ENROLLMENT_CANCELED_EXCHANGE = "enrollment.canceled.exchange";
const ENROLLMENT_CANCELED_KEY      = "enrollment.canceled";

// ─── Consumer queues (students) ────────────────────────────────────────────
const STUDENT_CREATED_QUEUE    = "enrollment.academic-students.created.queue";
const STUDENT_CREATED_EXCHANGE = "academic.students.created.exchange";
const STUDENT_CREATED_KEY      = "student.created";

const STUDENT_UPDATED_QUEUE    = "enrollment.academic-students.updated.queue";
const STUDENT_UPDATED_EXCHANGE = "academic.students.updated.exchange";
const STUDENT_UPDATED_KEY      = "student.updated";

const STUDENT_DELETED_QUEUE    = "enrollment.academic-students.deleted.queue";
const STUDENT_DELETED_EXCHANGE = "academic.students.deleted.exchange";
const STUDENT_DELETED_KEY      = "student.deleted";

// ─── Consumer queues (class-offering) ─────────────────────────────────────
const CLASS_CREATED_QUEUE    = "enrollment.class-offering.created.queue";
const CLASS_CREATED_EXCHANGE = "class-offering.created.exchange";
const CLASS_CREATED_KEY      = "class-offering.created";

const CLASS_UPDATED_QUEUE    = "enrollment.class-offering.updated.queue";
const CLASS_UPDATED_EXCHANGE = "class-offering.updated.exchange";
const CLASS_UPDATED_KEY      = "class-offering.updated";

const CLASS_CANCELED_QUEUE    = "enrollment.class-offering.canceled.queue";
const CLASS_CANCELED_EXCHANGE = "class-offering.canceled.exchange";
const CLASS_CANCELED_KEY      = "class-offering.canceled";

@ApiTags("messaging")
@Controller("messaging")
export class MessagingController {
  constructor(private readonly messagingService: MessagingService) {}

  // ─── Setup ────────────────────────────────────────────────────────────────

  @Post("setup")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Cria todas as exchanges e filas do módulo enrollment" })
  @ApiNoContentResponse({ description: "Exchanges e filas criadas com sucesso" })
  async setup(): Promise<void> {
    // Publisher exchanges
    await this.messagingService.assertExchange(ENROLLMENT_CREATED_EXCHANGE);
    await this.messagingService.assertExchange(ENROLLMENT_CANCELED_EXCHANGE);

    // Consumer: students
    await this.messagingService.assertExchange(STUDENT_CREATED_EXCHANGE);
    await this.messagingService.assertQueue(STUDENT_CREATED_QUEUE, STUDENT_CREATED_EXCHANGE, STUDENT_CREATED_KEY);

    await this.messagingService.assertExchange(STUDENT_UPDATED_EXCHANGE);
    await this.messagingService.assertQueue(STUDENT_UPDATED_QUEUE, STUDENT_UPDATED_EXCHANGE, STUDENT_UPDATED_KEY);

    await this.messagingService.assertExchange(STUDENT_DELETED_EXCHANGE);
    await this.messagingService.assertQueue(STUDENT_DELETED_QUEUE, STUDENT_DELETED_EXCHANGE, STUDENT_DELETED_KEY);

    // Consumer: class-offering
    await this.messagingService.assertExchange(CLASS_CREATED_EXCHANGE);
    await this.messagingService.assertQueue(CLASS_CREATED_QUEUE, CLASS_CREATED_EXCHANGE, CLASS_CREATED_KEY);

    await this.messagingService.assertExchange(CLASS_UPDATED_EXCHANGE);
    await this.messagingService.assertQueue(CLASS_UPDATED_QUEUE, CLASS_UPDATED_EXCHANGE, CLASS_UPDATED_KEY);

    await this.messagingService.assertExchange(CLASS_CANCELED_EXCHANGE);
    await this.messagingService.assertQueue(CLASS_CANCELED_QUEUE, CLASS_CANCELED_EXCHANGE, CLASS_CANCELED_KEY);
  }

  // ─── Publisher: enrollment.created ───────────────────────────────────────

  @Post("publish/enrollment-created")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Publicar evento enrollment.created" })
  @ApiNoContentResponse({ description: "Evento publicado" })
  async publishEnrollmentCreated(@Body() body: PublishMessageDto): Promise<void> {
    await this.messagingService.publish(body, ENROLLMENT_CREATED_EXCHANGE, ENROLLMENT_CREATED_KEY);
  }

  // ─── Publisher: enrollment.canceled ──────────────────────────────────────

  @Post("publish/enrollment-canceled")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Publicar evento enrollment.canceled" })
  @ApiNoContentResponse({ description: "Evento publicado" })
  async publishEnrollmentCanceled(@Body() body: PublishMessageDto): Promise<void> {
    await this.messagingService.publish(body, ENROLLMENT_CANCELED_EXCHANGE, ENROLLMENT_CANCELED_KEY);
  }

  // ─── Consumer: students ───────────────────────────────────────────────────

  @Get("consume/student-created")
  @ApiOperation({ summary: "Consumir student.created → sincroniza tabela students" })
  @ApiOkResponse({ type: ConsumedMessageDto })
  @ApiNotFoundResponse({ description: "Fila vazia" })
  async consumeStudentCreated(): Promise<ConsumedMessageDto> {
    return this.messagingService.syncStudentCreated(STUDENT_CREATED_QUEUE);
  }

  @Get("consume/student-updated")
  @ApiOperation({ summary: "Consumir student.updated → garante registro em students" })
  @ApiOkResponse({ type: ConsumedMessageDto })
  @ApiNotFoundResponse({ description: "Fila vazia" })
  async consumeStudentUpdated(): Promise<ConsumedMessageDto> {
    return this.messagingService.syncStudentUpdated(STUDENT_UPDATED_QUEUE);
  }

  @Get("consume/student-deleted")
  @ApiOperation({ summary: "Consumir student.deleted → remove da tabela students" })
  @ApiOkResponse({ type: ConsumedMessageDto })
  @ApiNotFoundResponse({ description: "Fila vazia" })
  async consumeStudentDeleted(): Promise<ConsumedMessageDto> {
    return this.messagingService.syncStudentDeleted(STUDENT_DELETED_QUEUE);
  }

  // ─── Consumer: class-offering ─────────────────────────────────────────────

  @Get("consume/class-offering-created")
  @ApiOperation({ summary: "Consumir class-offering.created → sincroniza tabela class_offerings" })
  @ApiOkResponse({ type: ConsumedMessageDto })
  @ApiNotFoundResponse({ description: "Fila vazia" })
  async consumeClassOfferingCreated(): Promise<ConsumedMessageDto> {
    return this.messagingService.syncClassOfferingCreated(CLASS_CREATED_QUEUE);
  }

  @Get("consume/class-offering-updated")
  @ApiOperation({ summary: "Consumir class-offering.updated → garante registro em class_offerings" })
  @ApiOkResponse({ type: ConsumedMessageDto })
  @ApiNotFoundResponse({ description: "Fila vazia" })
  async consumeClassOfferingUpdated(): Promise<ConsumedMessageDto> {
    return this.messagingService.syncClassOfferingUpdated(CLASS_UPDATED_QUEUE);
  }

  @Get("consume/class-offering-canceled")
  @ApiOperation({ summary: "Consumir class-offering.canceled → remove de class_offerings" })
  @ApiOkResponse({ type: ConsumedMessageDto })
  @ApiNotFoundResponse({ description: "Fila vazia" })
  async consumeClassOfferingCanceled(): Promise<ConsumedMessageDto> {
    return this.messagingService.syncClassOfferingCanceled(CLASS_CANCELED_QUEUE);
  }
}
