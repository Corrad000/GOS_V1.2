import { redirect } from 'next/navigation';

export default function CompaniesRedirectPage() {
  // Reindirizzamento immediato al cruscotto principale dell'advisor
  redirect('/advisor');
}
