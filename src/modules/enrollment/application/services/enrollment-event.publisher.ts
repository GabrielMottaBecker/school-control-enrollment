import { Inject, Injectable } from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";

export const RABBIT_CLIENT = "RABBIT_CLIENT";

@Injectable()
export class EnrollmentEventPublisher {
  constructor(@Inject(RABBIT_CLIENT) private readonly client: ClientProxy) {}

  enrollmentCreated(studentId: string, classOfferingId: string) {
    this.client.emit("enrollment.created", { studentId, classOfferingId });
  }

  enrollmentCancelled(enrollmentId: string) {
    this.client.emit("enrollment.cancelled", { enrollmentId });
  }
}
