import { RABBIT_CLIENT } from "@enrollment/application/services/enrollment-event.publisher";
import { Module } from "@nestjs/common";
import { ClientsModule, Transport } from "@nestjs/microservices";
import { SimulateController } from "./simulate.controller";
import { SimulateService } from "./simulate.service";

@Module({
  imports: [
    ClientsModule.register([
      {
        name: RABBIT_CLIENT,
        transport: Transport.RMQ,
        options: {
          urls: [process.env.RABBITMQ_URL ?? "amqp://localhost:5672"],
          queue: "enrollment_events_queue",
          queueOptions: { durable: true },
        },
      },
    ]),
  ],
  controllers: [SimulateController],
  providers: [SimulateService],
})
export class SimulateModule {}
