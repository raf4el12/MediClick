import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class NotificationResponseDto {
    @ApiProperty()
    id: number;

    @ApiProperty()
    userId: number;

    @ApiProperty()
    type: string;

    @ApiProperty()
    channel: string;

    @ApiProperty()
    title: string;

    @ApiProperty()
    message: string;

    @ApiProperty()
    isRead: boolean;

    @ApiPropertyOptional()
    metadata: any;

    @ApiPropertyOptional()
    sentAt: Date | null;

    @ApiProperty()
    createdAt: Date;
}

export class PaginatedNotificationsResponseDto {
    @ApiProperty({ type: [NotificationResponseDto] })
    data: NotificationResponseDto[];

    @ApiProperty()
    total: number;

    @ApiProperty()
    page: number;

    @ApiProperty()
    limit: number;

    @ApiProperty()
    totalPages: number;
}

export class UnreadCountResponseDto {
    @ApiProperty({ example: 5 })
    count: number;
}
