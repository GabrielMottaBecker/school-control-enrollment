import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

export class PublishMessageDto {
  @ApiProperty({ example: '{"enrollmentId":"uuid","studentId":"uuid","classOfferingId":"uuid"}' })
  @IsString()
  @IsNotEmpty()
  content: string;
}
