import type { Command } from './commands';

/** A confirmed patient request, as it travels from the patient screen to staff. */
export interface PatientAlert {
  id: string;
  patientCode: string;
  room: string;
  command: Command;
  createdAt: number;
  handledAt?: number | null;
}
