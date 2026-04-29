import { EnrollmentModule } from "@enrollment/enrollment.module";
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { SharedModule } from "@shared/shared.module";
import { SimulateModule } from "./modules/simulate/simulate.module";

@Module({
  imports: [
    ConfigModule.forRoot(),
    SharedModule,
    EnrollmentModule,
    SimulateModule,
  ],
})
export class AppModule {}
