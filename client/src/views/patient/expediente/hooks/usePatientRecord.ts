import { useQuery } from '@tanstack/react-query';
import { useAppSelector } from '@/redux-store/hooks';
import { selectUser } from '@/redux-store/slices/auth';
import { patientRecordService } from '@/services/patient-record.service';

interface UsePatientRecordOptions {
  patientId?: number;
}

export function usePatientRecord(options: UsePatientRecordOptions = {}) {
  const user = useAppSelector(selectUser);
  const isPatient = user?.role === 'PATIENT';
  const { patientId } = options;

  const {
    data: record,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: patientId
      ? ['patient-record', patientId]
      : ['patient-record', 'me'],
    queryFn: () =>
      patientId
        ? patientRecordService.getByPatientId(patientId)
        : patientRecordService.getMyRecord(),
    staleTime: 5 * 60 * 1000,
    enabled: patientId !== undefined || isPatient,
  });

  return {
    record: record ?? null,
    isLoading,
    error: error ? 'Error al cargar el expediente clínico' : null,
    refetch,
  };
}
