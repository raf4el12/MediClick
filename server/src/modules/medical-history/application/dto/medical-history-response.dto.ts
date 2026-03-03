import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MedicalHistoryPatientDto {
    @ApiProperty()
    id: number;

    @ApiProperty()
    name: string;

    @ApiProperty()
    lastName: string;
}

export class MedicalHistoryResponseDto {
    @ApiProperty()
    id: number;

    @ApiProperty()
    patientId: number;

    @ApiProperty()
    condition: string;

    @ApiPropertyOptional()
    description: string | null;

    @ApiPropertyOptional()
    diagnosedDate: Date | null;

    @ApiProperty()
    status: string;

    @ApiPropertyOptional()
    notes: string | null;

    @ApiProperty({ type: MedicalHistoryPatientDto })
    patient: MedicalHistoryPatientDto;

    @ApiProperty()
    createdAt: Date;

    @ApiPropertyOptional()
    updatedAt: Date | null;
}

export class PaginatedMedicalHistoryResponseDto {
    @ApiProperty({ type: [MedicalHistoryResponseDto] })
    data: MedicalHistoryResponseDto[];

    @ApiProperty()
    total: number;

    @ApiProperty()
    page: number;

    @ApiProperty()
    limit: number;

    @ApiProperty()
    totalPages: number;
}
