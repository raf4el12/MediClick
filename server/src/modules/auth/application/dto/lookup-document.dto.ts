import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class LookupDocumentDto {
  @ApiProperty({ example: 'DNI', description: 'Tipo de documento' })
  @IsString()
  @IsNotEmpty()
  typeDocument: string;

  @ApiProperty({ example: '12345678', description: 'Número de documento' })
  @IsString()
  @IsNotEmpty()
  numberDocument: string;
}

export class LookupDocumentResponseDto {
  @ApiProperty({ example: true })
  found: boolean;

  @ApiProperty({ example: 'JUAN CARLOS', required: false })
  name?: string;

  @ApiProperty({ example: 'PEREZ GARCIA', required: false })
  lastName?: string;

  @ApiProperty({ example: '1990-05-15', required: false })
  birthday?: string;

  @ApiProperty({ example: 'M', required: false })
  gender?: string;
}
