import { ObjectType, Field, Int } from '@nestjs/graphql';

@ObjectType()
export class ProfileGql {
  @Field()
  name: string;
  @Field()
  lastName: string;
  @Field({ nullable: true })
  email?: string;
  @Field({ nullable: true })
  phone?: string;
  @Field({ nullable: true })
  birthday?: Date;
  @Field({ nullable: true })
  gender?: string;
  @Field({ nullable: true })
  address?: string;
  @Field({ nullable: true })
  typeDocument?: string;
  @Field({ nullable: true })
  numberDocument?: string;
}

@ObjectType()
export class MedicalHistoryGql {
  @Field()
  condition: string;
  @Field({ nullable: true })
  description?: string;
  @Field({ nullable: true })
  diagnosedDate?: Date;
  @Field({ nullable: true })
  status?: string;
  @Field({ nullable: true })
  notes?: string;
}

@ObjectType()
export class ClinicalNoteGql {
  @Field({ nullable: true })
  diagnosis?: string;
  @Field({ nullable: true })
  plan?: string;
}

@ObjectType()
export class AppointmentDoctorGql {
  @Field()
  name: string;
  @Field()
  lastName: string;
}

@ObjectType()
export class AppointmentScheduleGql {
  @Field(() => AppointmentDoctorGql, { nullable: true })
  doctor?: AppointmentDoctorGql;
}

@ObjectType()
export class AppointmentGql {
  @Field(() => Int)
  id: number;
  @Field()
  startTime: Date;
  @Field()
  status: string;
  @Field({ nullable: true })
  reason?: string;
  
  @Field(() => AppointmentScheduleGql, { nullable: true })
  schedule?: AppointmentScheduleGql;

  @Field(() => [ClinicalNoteGql], { nullable: true })
  clinicalNotes?: ClinicalNoteGql[];
}

@ObjectType()
export class PatientRecordGql {
  @Field(() => Int)
  id: number;
  @Field({ nullable: true })
  bloodType?: string;
  @Field({ nullable: true })
  allergies?: string;
  @Field({ nullable: true })
  chronicConditions?: string;
  @Field({ nullable: true })
  emergencyContact?: string;
  @Field()
  isActive: boolean;

  @Field(() => ProfileGql, { nullable: true })
  profile?: ProfileGql;

  @Field(() => [MedicalHistoryGql], { nullable: true })
  medicalHistory?: MedicalHistoryGql[];

  @Field(() => [AppointmentGql], { nullable: true })
  appointments?: AppointmentGql[];
}
