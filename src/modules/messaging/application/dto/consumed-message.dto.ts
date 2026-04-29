import { ApiProperty } from "@nestjs/swagger";

export class ConsumedMessageDto {
  @ApiProperty({ example: '{"enrollmentId":"uuid"}' })
  content: string;

  @ApiProperty({ example: "enrollment.academic-students.created.queue" })
  queue: string;

  static from(queue: string, content: string): ConsumedMessageDto {
    const dto = new ConsumedMessageDto();
    dto.content = content;
    dto.queue = queue;
    return dto;
  }
}
