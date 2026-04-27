import { Inject, Injectable } from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { RABBIT_CLIENT } from "@enrollment/application/services/enrollment-event.publisher";

@Injectable()
export class SimulateService {
  constructor(@Inject(RABBIT_CLIENT) private readonly client: ClientProxy) {}

  publishStudentCreated(id: string) {
    this.client.emit("student.created", { id });
  }

  publishClassOfferingCreated(id: string) {
    this.client.emit("class_offering.created", { id });
  }
}
