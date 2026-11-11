import { UserDashboardView } from '@/app/components/UserDashboardView';
import { CompanyItem } from '@/app/components/CompanyTable';

export default async function AdminDashboardPage() {
  const userRole: 'admin' | 'advisor' = 'admin';
  const userName = 'Corrado Pinna';

  const initialCompanies: CompanyItem[] = [
    {
      id: 'COMP-003',
      ragione_sociale: 'mariella',
      codice_azienda: 'COMP-003',
      partita_iva: '12345678901',
      advisor_nome: 'Corrado Pinna',
      fatturato: 250000,
      stato: 'ATTIVA',
      contratti_attivi: 3
    },
    {
      id: 'COMP-002',
      ragione_sociale: 'mariella',
      codice_azienda: 'COMP-002',
      partita_iva: '12345678902',
      advisor_nome: 'Corrado Pinna',
      fatturato: 250000,
      stato: 'ATTIVA',
      contratti_attivi: 3
    },
    {
      id: 'COMP-001',
      ragione_sociale: 'asd',
      codice_azienda: 'COMP-001',
      partita_iva: '12345678903',
      advisor_nome: 'Corrado Pinna',
      fatturato: 250000,
      stato: 'ATTIVA',
      contratti_attivi: 3
    },
    {
      id: 'COMP-004',
      ragione_sociale: 'superpower',
      codice_azienda: 'COMP-004',
      partita_iva: '12345678904',
      advisor_nome: 'Corrado Pinna',
      fatturato: 250000,
      stato: 'ACTIVE',
      contratti_attivi: 3
    },
    {
      id: 'COMP-005',
      ragione_sociale: 'dd',
      codice_azienda: 'COMP-005',
      partita_iva: '12345678905',
      advisor_nome: 'Corrado Pinna',
      fatturato: 250000,
      stato: 'ACTIVE',
      contratti_attivi: 3
    }
  ];

  return (
    <UserDashboardView
      userRole={userRole}
      userName={userName}
      companies={initialCompanies}
    />
  );
}
