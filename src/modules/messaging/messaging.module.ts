import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { MessagingService } from "./application/services/messaging.service";
import { MessagingController } from "./infra/controllers/messaging.controller";
import { RabbitMQService } from "./infra/rabbitmq/rabbitmq.service";
import { SharedModule } from "@shared/shared.module";

@Module({
  imports: [ConfigModule, SharedModule],
  controllers: [MessagingController],
  providers: [RabbitMQService, MessagingService],
  exports: [MessagingService],
})
export class MessagingModule {}
