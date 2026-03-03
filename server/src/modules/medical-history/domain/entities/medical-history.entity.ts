export class MedicalHistoryEntity {
    id: number;
    patientId: number;
    condition: string;
    description: string | null;
    diagnosedDate: Date | null;
    status: string;
    notes: string | null;
    deleted: boolean;
    createdAt: Date;
    updatedAt: Date | null;
}
