import React from 'react';

export default function PublicShareLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#15191f] text-[#e8ecf2] font-sans antialiased">
      {children}
    </div>
  );
}
