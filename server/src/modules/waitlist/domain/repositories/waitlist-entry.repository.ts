import type {
  CreateWaitlistEntryData,
  UpdateWaitlistEntryData,
  WaitlistEntryWithRelations,
  WaitlistMatchCriteria,
} from '../interfaces/waitlist-data.interface.js';
import { WaitlistEntryStatus } from '../enums/waitlist-entry-status.enum.js';

export interface IWaitlistEntryRepository {
  create(data: CreateWaitlistEntryData): Promise<WaitlistEntryWithRelations>;
  findById(id: number): Promise<WaitlistEntryWithRelations | null>;
  update(
    id: number,
    data: UpdateWaitlistEntryData,
  ): Promise<WaitlistEntryWithRelations>;

  /** Entradas de un paciente, opcionalmente filtradas por estado */
  findByPatient(
    patientId: number,
    statuses?: WaitlistEntryStatus[],
  ): Promise<WaitlistEntryWithRelations[]>;

  /** Listado para el dashboard de la clínica (entradas activas) */
  findActiveByClinic(
    clinicId: number | null,
    filters?: { specialtyId?: number; doctorId?: number },
  ): Promise<WaitlistEntryWithRelations[]>;

  /**
   * Devuelve el primer candidato para un slot liberado, en orden
   * priority DESC, createdAt ASC. Excluye entradas que ya tienen una oferta
   * PENDING o que rechazaron/dejaron expirar este mismo slot.
   */
  findNextMatch(
    criteria: WaitlistMatchCriteria,
  ): Promise<WaitlistEntryWithRelations | null>;

  /** Verifica que el paciente no esté ya en cola activa para los mismos criterios */
  existsActiveDuplicate(
    patientId: number,
    specialtyId: number,
    doctorId: number | null,
  ): Promise<boolean>;

  /** Cron: marca como EXPIRED las entradas ACTIVE cuyo waitUntil ya pasó. Devuelve cuántas. */
  expireStale(now: Date): Promise<number>;

  /** Incrementa la prioridad de forma atómica (boost VIP). Devuelve la entrada actualizada. */
  incrementPriority(
    id: number,
    delta: number,
  ): Promise<WaitlistEntryWithRelations>;
}
