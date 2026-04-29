import {
  enrollmentStatusEnum,
  enrollmentsSchema,
} from "@enrollment/infra/schemas/enrollment.schema";
import { studentsReferenceSchema } from "@enrollment/infra/schemas/student-reference.schema";
import { classOfferingsReferenceSchema } from "@enrollment/infra/schemas/class-offering-reference.schema";
import { Injectable, type OnModuleDestroy } from "@nestjs/common";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const schema = {
  enrollmentsSchema,
  enrollmentStatusEnum,
  studentsReferenceSchema,
  classOfferingsReferenceSchema,
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
