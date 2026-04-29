import { classOfferingsReferenceSchema } from "@enrollment/infra/schemas/class-offering-reference.schema";
import { studentsReferenceSchema } from "@enrollment/infra/schemas/student-reference.schema";
import {
  enrollmentStatusEnum,
  enrollmentsSchema,
} from "@enrollment/infra/schemas/enrollment.schema";
import { Injectable, type OnModuleDestroy } from "@nestjs/common";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const schema = {
  studentsReferenceSchema,
  classOfferingsReferenceSchema,
  enrollmentsSchema,
  enrollmentStatusEnum,
};

@Injectable()
export class DrizzleService implements OnModuleDestroy {
  private readonly pool: Pool;
  public readonly db;

  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
    this.db = drizzle(this.pool, { schema });
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}