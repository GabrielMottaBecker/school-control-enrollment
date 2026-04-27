import { Body, Controller, HttpCode, HttpStatus, Post } from "@nestjs/common";
import { ApiCreatedResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { SimulateService } from "./simulate.service";
import { SimulateClassOfferingDto, SimulateStudentDto } from "./simulate.dto";

@ApiTags("simulate")
@Controller("simulate")
export class SimulateController {
  constructor(private readonly simulateService: SimulateService) {}

  @Post("student")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Simula criação de aluno via RabbitMQ" })
  @ApiCreatedResponse({ description: "Evento student.created publicado" })
  async simulateStudent(@Body() body: SimulateStudentDto) {
    this.simulateService.publishStudentCreated(body.id);
    return { message: "Evento student.created publicado", id: body.id };
  }

  @Post("class-offering")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Simula criação de turma via RabbitMQ" })
  @ApiCreatedResponse({ description: "Evento class_offering.created publicado" })
  async simulateClassOffering(@Body() body: SimulateClassOfferingDto) {
    this.simulateService.publishClassOfferingCreated(body.id);
    return { message: "Evento class_offering.created publicado", id: body.id };
  }
}
