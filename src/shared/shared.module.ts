import { Module } from "@nestjs/common";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { DrizzleService } from "./infra/database/drizzle.service";
import { HateoasInterceptor } from "./infra/hateoas";

@Module({
  providers: [
    DrizzleService,
    {
      provide: APP_INTERCEPTOR,
      useClass: HateoasInterceptor,
    },
  ],
  exports: [DrizzleService],
})
export class SharedModule {}
