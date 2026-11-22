export type DealPriority =
  | 'scaduta'
  | 'oggi'
  | 'programmata'
  | 'senza-azione'
  | 'ferma';

export type CompanyStatus = 'IN_LAVORAZIONE' | 'FOLLOW_UP';

export type CompanyScope = 'mie' | 'tutte';

export type DealFilter = 'tutte' | DealPriority;

export type ArchiveTargetModalita = 'LAVORAZIONE' | 'FOLLOW-UP';

export interface Deal {
  id: string;
  companyId: string;
  title: string;
  companyName: string;
  value: number;
  nextAction: string;
  priority: DealPriority;
  dueLabel: string;
  dueDate: string | null;
  stagnant: boolean;
  daysSinceUpdate: number | null;
}

export interface Company {
  id: string;
  code: string;
  name: string;
  status: CompanyStatus;
  value: number;
  note: string;
}

export interface ArchivedCompany {
  id: string;
  code: string;
  name: string;
  modalita: string;
  contractsCount: number;
}

export interface Kpi {
  label: string;
  value: string;
  sub: string;
}
