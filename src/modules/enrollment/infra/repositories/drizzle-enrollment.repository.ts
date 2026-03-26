import {
  Enrollment,
  EnrollmentStatus,
} from "@enrollment/domain/models/enrollment.entity";
import type { EnrollmentRepository } from "@enrollment/domain/repositories/enrollment-repository.interface";
import { enrollmentsSchema } from "@enrollment/infra/schemas/enrollment.schema";
import { Injectable } from "@nestjs/common";
import { DrizzleService } from "@shared/infra/database/drizzle.service";
import { and, eq } from "drizzle-orm";

@Injectable()
export class DrizzleEnrollmentRepository implements EnrollmentRepository {
  constructor(private readonly drizzleService: DrizzleService) {}

  async create(enrollment: Enrollment): Promise<void> {
    await this.drizzleService.db.insert(enrollmentsSchema).values({
      studentId: enrollment.studentId,
      classOfferingId: enrollment.classOfferingId,
      status: enrollment.status,
      enrolledAt: enrollment.enrolledAt,
      canceledAt: enrollment.canceledAt ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  async cancel(id: string): Promise<void> {
    await this.drizzleService.db
      .update(enrollmentsSchema)
      .set({
        status: "canceled",
        canceledAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(enrollmentsSchema.id, id));
  }

  async findById(id: string): Promise<Enrollment | null> {
    const result = await this.drizzleService.db
      .select()
      .from(enrollmentsSchema)
      .where(eq(enrollmentsSchema.id, id))
      .limit(1);

    if (!result[0]) return null;

    return Enrollment.restore({
      ...result[0],
      status: result[0].status as EnrollmentStatus,
    });
  }

  async findByClassOfferingId(classOfferingId: string): Promise<Enrollment[]> {
    const rows = await this.drizzleService.db
      .select()
      .from(enrollmentsSchema)
      .where(eq(enrollmentsSchema.classOfferingId, classOfferingId));

    return rows.map(
      (row) =>
        Enrollment.restore({
          ...row,
          status: row.status as EnrollmentStatus,
        })!,
    );
  }

  async findByStudentAndClassOffering(
    studentId: string,
    classOfferingId: string,
  ): Promise<Enrollment | null> {
    const result = await this.drizzleService.db
      .select()
      .from(enrollmentsSchema)
      .where(
        and(
          eq(enrollmentsSchema.studentId, studentId),
          eq(enrollmentsSchema.classOfferingId, classOfferingId),
          eq(enrollmentsSchema.status, "active"),
        ),
      )
      .limit(1);

    if (!result[0]) return null;

    return Enrollment.restore({
      ...result[0],
      status: result[0].status as EnrollmentStatus,
    });
  }
}
