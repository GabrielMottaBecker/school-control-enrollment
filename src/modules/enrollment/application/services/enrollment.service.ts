import { CreateEnrollmentDto } from "@enrollment/application/dto/create-enrollment.dto";
import { EnrollmentDto } from "@enrollment/application/dto/enrollment.dto";
import {
  Enrollment,
  EnrollmentStatus,
} from "@enrollment/domain/models/enrollment.entity";
import {
  ENROLLMENT_REPOSITORY,
  type EnrollmentRepository,
} from "@enrollment/domain/repositories/enrollment-repository.interface";
import type { PaginatedResult } from "@shared/infra/hateoas";
import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

@Injectable()
export class EnrollmentService {
  constructor(
    @Inject(ENROLLMENT_REPOSITORY)
    private readonly enrollmentRepository: EnrollmentRepository,
  ) {}

  async enroll(dto: CreateEnrollmentDto): Promise<void> {
    const existing =
      await this.enrollmentRepository.findByStudentAndClassOffering(
        dto.studentId,
        dto.classOfferingId,
      );

    if (existing) {
      throw new ConflictException(
        "Student is already enrolled in this class offering",
      );
    }

    const enrollment = Enrollment.restore({
      studentId: dto.studentId,
      classOfferingId: dto.classOfferingId,
      status: EnrollmentStatus.ACTIVE,
      enrolledAt: new Date(),
    });

    await this.enrollmentRepository.create(enrollment!);
  }

  async cancel(id: string): Promise<void> {
    const enrollment = await this.enrollmentRepository.findById(id);

    if (!enrollment) {
      throw new NotFoundException("Enrollment not found");
    }

    await this.enrollmentRepository.cancel(id);
  }

  async listByClassOffering(
    classOfferingId: string,
    page: number,
    limit: number,
  ): Promise<PaginatedResult<EnrollmentDto>> {
    const all = await this.enrollmentRepository.findByClassOfferingId(classOfferingId);
    const total = all.length;
    const start = (page - 1) * limit;
    const data = all.slice(start, start + limit).map((row) => EnrollmentDto.from(row)!);
    return { data, total, page, limit };
  }
}
