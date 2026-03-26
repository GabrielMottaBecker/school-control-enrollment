import { EnrollmentService } from "@enrollment/application/services/enrollment.service";
import { Body, Controller, Delete, Get, Param, Post } from "@nestjs/common";

@Controller("enrollments")
export class EnrollmentsController {
  constructor(private readonly enrollmentService: EnrollmentService) {}

  @Get("class-offering/:classOfferingId")
  async findByClassOffering(@Param("classOfferingId") classOfferingId: string) {
    return this.enrollmentService.listByClassOffering(classOfferingId);
  }

  @Post()
  async enroll(@Body() body: { studentId: string; classOfferingId: string }) {
    return this.enrollmentService.enroll(body);
  }

  @Delete(":id")
  async cancel(@Param("id") id: string) {
    return this.enrollmentService.cancel(id);
  }
}
