import { classOfferingsReferenceSchema } from "@enrollment/infra/schemas/class-offering-reference.schema";
import { studentsReferenceSchema } from "@enrollment/infra/schemas/student-reference.schema";
import { Controller, Logger } from "@nestjs/common";
import { EventPattern, Payload } from "@nestjs/microservices";
import { DrizzleService } from "@shared/infra/database/drizzle.service";

@Controller()
export class EnrollmentEventsController {
  private readonly logger = new Logger(EnrollmentEventsController.name);

  constructor(private readonly drizzleService: DrizzleService) {}

  @EventPattern("student.created")
  async handleStudentCreated(@Payload() data: { id: string }) {
    await this.drizzleService.db
      .insert(studentsReferenceSchema)
      .values({ id: data.id })
      .onConflictDoNothing();
    this.logger.log(`Student reference saved: ${data.id}`);
  }

  @EventPattern("class_offering.created")
  async handleClassOfferingCreated(@Payload() data: { id: string }) {
    await this.drizzleService.db
      .insert(classOfferingsReferenceSchema)
      .values({ id: data.id })
      .onConflictDoNothing();
    this.logger.log(`Class offering reference saved: ${data.id}`);
  }
}
