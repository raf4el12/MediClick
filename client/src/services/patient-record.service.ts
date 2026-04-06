import { graphqlQuery } from '@/libs/graphql';
import type { PatientRecord } from '@/views/patient/expediente/types';

const PATIENT_RECORD_FIELDS = `
  id
  bloodType
  allergies
  chronicConditions
  emergencyContact
  isActive
  profile {
    name
    lastName
    email
    phone
    birthday
    gender
    address
    typeDocument
    numberDocument
  }
  medicalHistory {
    condition
    description
    diagnosedDate
    status
    notes
  }
  appointments {
    id
    startTime
    status
    reason
    schedule {
      doctor {
        name
        lastName
      }
    }
    clinicalNotes {
      diagnosis
      plan
    }
  }
`;

export const patientRecordService = {
  getByPatientId: async (patientId: number): Promise<PatientRecord> => {
    const result = await graphqlQuery<{ patientRecord: PatientRecord }>(
      `query PatientRecord($id: Int!) {
        patientRecord(id: $id) {
          ${PATIENT_RECORD_FIELDS}
        }
      }`,
      { id: patientId },
    );
    return result.patientRecord;
  },

  getMyRecord: async (): Promise<PatientRecord> => {
    const result = await graphqlQuery<{ myPatientRecord: PatientRecord }>(
      `query MyPatientRecord {
        myPatientRecord {
          ${PATIENT_RECORD_FIELDS}
        }
      }`,
    );
    return result.myPatientRecord;
  },
};
