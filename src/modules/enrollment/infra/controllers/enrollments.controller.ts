import { CreateEnrollmentDto } from "@enrollment/application/dto/create-enrollment.dto";
import { EnrollmentDto } from "@enrollment/application/dto/enrollment.dto";
import { EnrollmentService } from "@enrollment/application/services/enrollment.service";
import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import {
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from "@nestjs/swagger";
import { HateoasList } from "@shared/infra/hateoas";

@ApiTags("enrollments")
@Controller("enrollments")
export class EnrollmentsController {
  constructor(private readonly enrollmentService: EnrollmentService) {}

  @Get()
  @ApiOperation({ summary: "Listar matrículas de uma turma" })
  @ApiQuery({ name: "class_offering_id", required: true, type: String, description: "ID da turma" })
  @ApiQuery({ name: "_page", required: false, type: Number, description: "Página (padrão: 1)" })
  @ApiQuery({ name: "_size", required: false, type: Number, description: "Itens por página (padrão: 10)" })
  @ApiOkResponse({ type: EnrollmentDto, isArray: true })
  @HateoasList<EnrollmentDto>({
    basePath: "/v1/enrollments",
    itemLinks: (item) => ({
      self: { href: `/v1/enrollments/${item.id}`, method: "GET" },
      cancel: { href: `/v1/enrollments/${item.id}/cancel`, method: "PATCH" },
    }),
  })
  async findByClassOffering(
    @Query("class_offering_id") classOfferingId: string,
    @Query("_page", new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query("_size", new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.enrollmentService.listByClassOffering(classOfferingId, page, limit);
  }

  @Post()
  @ApiOperation({ summary: "Criar matrícula" })
  @ApiCreatedResponse({ description: "Matrícula criada com sucesso" })
  @ApiConflictResponse({ description: "Aluno já matriculado nesta turma" })
  async enroll(@Body() body: CreateEnrollmentDto) {
    return this.enrollmentService.enroll(body);
  }

  @Patch(":id/cancel")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Cancelar matrícula" })
  @ApiNoContentResponse({ description: "Matrícula cancelada com sucesso" })
  @ApiNotFoundResponse({ description: "Matrícula não encontrada" })
  async cancel(@Param("id") id: string) {
    return this.enrollmentService.cancel(id);
  }
}
