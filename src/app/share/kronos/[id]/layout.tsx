import React from 'react';

export default function PublicShareLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 font-sans selection:bg-cyan-500 selection:text-white">
      {/* Nessun menu, nessun Edit Profile, nessun Log-out: solo il contenuto pulito per il cliente */}
      {children}
    </div>
  );
}
