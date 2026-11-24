import React from 'react';
import { KybQuestionnaireView } from '@/modules/kyb/KybQuestionnaireView';

export const dynamic = 'force-dynamic';

interface KybClientPageProps {
  params: Promise<{ token: string }>;
}

export default async function KybClientPage({ params }: KybClientPageProps) {
  const { token } = await params;
  const cleanToken = decodeURIComponent(String(token || '')).trim();

  return (
    <main className="min-h-screen bg-gray-950 p-6 md:p-10 text-gray-100">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="border-b border-gray-800 pb-4">
          <span className="rounded-lg border border-gray-800 bg-gray-900 px-3 py-1 font-mono text-xs font-bold uppercase text-[#FF5500]">
            KYB PORTAL
          </span>
          <h1 className="mt-2 text-2xl font-extrabold uppercase tracking-tight text-white">
            Compilazione Questionario KYB
          </h1>
          <p className="text-xs text-gray-400">
            Compila i campi richiesti e invia il questionario per completare la verifica societaria.
          </p>
        </div>

        <KybQuestionnaireView
          companyCode="KYB"
          clientToken={cleanToken}
          clientMode={true}
        />
      </div>
    </main>
  );
}
