import type { Enrollment } from "@enrollment/domain/models/enrollment.entity";

export class EnrollmentDto {
  private constructor(
    public id: string | undefined,
    public studentId: string,
    public classOfferingId: string,
    public status: string,
    public enrolledAt: Date,
    public canceledAt: Date | null | undefined,
  ) {}

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
