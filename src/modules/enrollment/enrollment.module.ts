import { EnrollmentService } from "@enrollment/application/services/enrollment.service";
import { ENROLLMENT_REPOSITORY } from "@enrollment/domain/repositories/enrollment-repository.interface";
import { EnrollmentsController } from "@enrollment/infra/controllers/enrollments.controller";
import { DrizzleEnrollmentRepository } from "@enrollment/infra/repositories/drizzle-enrollment.repository";
import { Module } from "@nestjs/common";
import { SharedModule } from "@shared/shared.module";

@Module({
  imports: [SharedModule],
  controllers: [EnrollmentsController],
  providers: [
    EnrollmentService,
    DrizzleEnrollmentRepository,
    {
      provide: ENROLLMENT_REPOSITORY,
      useExisting: DrizzleEnrollmentRepository,
    },
  ],
})
export class EnrollmentModule {}
