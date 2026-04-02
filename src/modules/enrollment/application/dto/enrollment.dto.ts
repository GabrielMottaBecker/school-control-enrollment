import type { Enrollment } from "@enrollment/domain/models/enrollment.entity";
import { ApiProperty } from "@nestjs/swagger";

export class EnrollmentDto {
  @ApiProperty({ example: "e0000005-0000-0000-0000-000000000001" })
  id: string | undefined;

  @ApiProperty({ example: "c0000003-0000-0000-0000-000000000001" })
  studentId: string;

  @ApiProperty({ example: "d0000004-0000-0000-0000-000000000001" })
  classOfferingId: string;

  @ApiProperty({ example: "active", enum: ["active", "canceled"] })
  status: string;

  @ApiProperty({ example: "2025-02-08T00:00:00.000Z" })
  enrolledAt: Date;

  @ApiProperty({ example: null, nullable: true })
  canceledAt: Date | null | undefined;

  private constructor(
    id: string | undefined,
    studentId: string,
    classOfferingId: string,
    status: string,
    enrolledAt: Date,
    canceledAt: Date | null | undefined,
  ) {
    this.id = id;
    this.studentId = studentId;
    this.classOfferingId = classOfferingId;
    this.status = status;
    this.enrolledAt = enrolledAt;
    this.canceledAt = canceledAt;
  }

  public static from(enrollment: Enrollment | null): EnrollmentDto | null {
    if (!enrollment) return null;
    return new EnrollmentDto(
      enrollment.id,
      enrollment.studentId,
      enrollment.classOfferingId,
      enrollment.status,
      enrollment.enrolledAt,
      enrollment.canceledAt,
    );
  }
}
