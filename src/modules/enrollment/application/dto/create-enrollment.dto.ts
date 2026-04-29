import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsUUID } from "class-validator";

export class CreateEnrollmentDto {
  @ApiProperty({
    description: "ID do aluno",
    example: "c0000003-0000-0000-0000-000000000001",
  })
  @IsUUID("all")
  @IsNotEmpty()
  studentId!: string;

  @ApiProperty({
    description: "ID da turma",
    example: "d0000004-0000-0000-0000-000000000001",
  })
  @IsUUID("all")
  @IsNotEmpty()
  classOfferingId!: string;
}
