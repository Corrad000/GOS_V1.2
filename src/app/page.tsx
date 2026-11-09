'use client';

import Link from 'next/link';

export default function GOSHomeHub() {
  return (
    <main className="min-h-screen bg-gray-950 text-gray-100 flex flex-col items-center justify-center p-6 md:p-12 font-sans">
      <div className="max-w-4xl w-full space-y-10">
        
        {/* Header ufficiale GOS-V1.2 */}
        <div className="flex justify-between items-center w-full">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-950 border border-blue-800 text-blue-300 text-xs font-mono">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
            GOS-V1.2 · Glaring Operating System
          </div>
          
          <Link
            href="/login"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl transition-all shadow-lg shadow-blue-600/20 flex items-center gap-2"
          >
            <span>🔐</span> Accedi al Login
          </Link>
        </div>

        <div className="text-center space-y-3">
          <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight">
            Piattaforma di Consulenza & Gestione Incarichi
          </h1>
          <p className="text-gray-400 text-base max-w-2xl mx-auto">
            Sistema operativo interno per la gestione strategica, la diagnostica e l'analisi economico-finanziaria dei progetti aziendali.
          </p>
        </div>

        {/* Griglia dei profili di accesso da documento GOS-V1.2 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
          
          {/* Advisor Workspace */}
          <Link
            href="/login?role=advisor"
            className="bg-gray-900 border border-gray-800 hover:border-blue-500/60 p-8 rounded-2xl transition-all group flex flex-col justify-between space-y-6 shadow-xl"
          >
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-blue-950 border border-blue-800 text-blue-400 flex items-center justify-center text-xl font-bold group-hover:bg-blue-600 group-hover:text-white transition-all">
                👨‍💼
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-mono uppercase tracking-wider text-blue-400">Area Operativa</span>
                <h2 className="text-xl font-bold text-white group-hover:text-blue-300 transition-colors">Advisor Workspace</h2>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">
                Gestione portafoglio aziende, incarichi, questionari master, assessment di progetto e Financial Engine.
              </p>
            </div>
            <div className="pt-4 border-t border-gray-800 flex items-center justify-between text-xs font-semibold text-blue-400 group-hover:translate-x-1 transition-transform">
              <span>Login Advisor</span>
              <span>→</span>
            </div>
          </Link>

          {/* Administrator */}
          <Link
            href="/login?role=admin"
            className="bg-gray-900 border border-gray-800 hover:border-purple-500/60 p-8 rounded-2xl transition-all group flex flex-col justify-between space-y-6 shadow-xl"
          >
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-purple-950 border border-purple-800 text-purple-400 flex items-center justify-center text-xl font-bold group-hover:bg-purple-600 group-hover:text-white transition-all">
                ⚙️
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-mono uppercase tracking-wider text-purple-400">Controllo Globale</span>
                <h2 className="text-xl font-bold text-white group-hover:text-purple-300 transition-colors">Administrator</h2>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">
                Supervisione globale della piattaforma, gestione utenti, permessi granulari, assegnazioni e audit log.
              </p>
            </div>
            <div className="pt-4 border-t border-gray-800 flex items-center justify-between text-xs font-semibold text-purple-400 group-hover:translate-x-1 transition-transform">
              <span>Login Admin</span>
              <span>→</span>
            </div>
          </Link>

          {/* Client Portal */}
          <Link
            href="/client/questionnaire"
            className="bg-gray-900 border border-gray-800 hover:border-emerald-500/60 p-8 rounded-2xl transition-all group flex flex-col justify-between space-y-6 shadow-xl"
          >
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-950 border border-emerald-800 text-emerald-400 flex items-center justify-center text-xl font-bold group-hover:bg-emerald-600 group-hover:text-white transition-all">
                📋
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400">Area Esterna</span>
                <h2 className="text-xl font-bold text-white group-hover:text-emerald-300 transition-colors">Client Portal</h2>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">
                Accesso riservato ai clienti tramite link sicuro per la compilazione dei moduli di assessment preliminare.
              </p>
            </div>
            <div className="pt-4 border-t border-gray-800 flex items-center justify-between text-xs font-semibold text-emerald-400 group-hover:translate-x-1 transition-transform">
              <span>Vai al Portale</span>
              <span>→</span>
            </div>
          </Link>

        </div>

        <div className="text-center pt-8 border-t border-gray-900 text-xs text-gray-600">
          Glaring LLP · Strumento operativo interno confidenziale (GOS-V1.2)
        </div>

      </div>
    </main>
  );
}
