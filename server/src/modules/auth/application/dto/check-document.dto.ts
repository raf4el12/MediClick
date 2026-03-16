import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CheckDocumentDto {
  @ApiProperty({ example: 'DNI' })
  @IsString()
  @IsNotEmpty({ message: 'El tipo de documento es obligatorio' })
  typeDocument: string;

  @ApiProperty({ example: '12345678' })
  @IsString()
  @IsNotEmpty({ message: 'El número de documento es obligatorio' })
  numberDocument: string;
}
