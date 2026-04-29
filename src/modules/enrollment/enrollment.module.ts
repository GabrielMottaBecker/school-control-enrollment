import { EnrollmentService } from "@enrollment/application/services/enrollment.service";
import {
  EnrollmentEventPublisher,
  RABBIT_CLIENT,
} from "@enrollment/application/services/enrollment-event.publisher";
import { ENROLLMENT_REPOSITORY } from "@enrollment/domain/repositories/enrollment-repository.interface";
import { EnrollmentEventsController } from "@enrollment/infra/controllers/enrollment-events.controller";
import { EnrollmentsController } from "@enrollment/infra/controllers/enrollments.controller";
import { DrizzleEnrollmentRepository } from "@enrollment/infra/repositories/drizzle-enrollment.repository";
import { Module } from "@nestjs/common";
import { ClientsModule, Transport } from "@nestjs/microservices";
import { SharedModule } from "@shared/shared.module";

@Module({
  imports: [
    SharedModule,
    ClientsModule.register([
      {
        name: RABBIT_CLIENT,
        transport: Transport.RMQ,
        options: {
          urls: [process.env.RABBITMQ_URL ?? "amqp://localhost:5672"],
          queue: "enrollment_queue",
          queueOptions: { durable: true },
        },
      },
    ]),
  ],
  controllers: [EnrollmentsController, EnrollmentEventsController],
  providers: [
    EnrollmentService,
    EnrollmentEventPublisher,
    DrizzleEnrollmentRepository,
    {
      provide: ENROLLMENT_REPOSITORY,
      useExisting: DrizzleEnrollmentRepository,
    },
  ],
})
export class EnrollmentModule {}
