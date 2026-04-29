import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as amqplib from "amqplib";

@Injectable()
export class RabbitMQService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RabbitMQService.name);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private connection: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private channel: any;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const url = this.configService.getOrThrow<string>("RABBITMQ_URL");
    this.logger.log(`Connecting to: [${url}]`);

    const MAX_RETRIES = 5;
    const DELAY_MS = 3000;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        this.connection = await amqplib.connect(url);
        this.channel = await this.connection.createChannel();
        this.logger.log("RabbitMQ connection established");
        return;
      } catch (err) {
        this.logger.warn(
          `RabbitMQ connection attempt ${attempt}/${MAX_RETRIES} failed. Retrying in ${DELAY_MS}ms...`,
        );
        if (attempt === MAX_RETRIES) throw err;
        await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
      }
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.channel?.close();
    await this.connection?.close();
  }

  getChannel() {
    return this.channel;
  }
}
