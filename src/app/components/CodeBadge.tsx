// src/app/components/CodeBadge.tsx
import React from 'react';

interface CodeBadgeProps {
  companyCode?: string;
  activityCode: string; // es. "PRJ-001", "QST-002", "OFF-003"
}

export default function CodeBadge({ companyCode, activityCode }: CodeBadgeProps) {
  const baseCompany = companyCode || 'AZ-00024';
  const formattedString = activityCode.includes('/') ? activityCode : `${baseCompany}/${activityCode}`;

  return (
    <span className="px-2.5 py-1 bg-gray-900 border border-gray-800 text-amber-400 font-mono text-xs font-bold rounded-lg tracking-wider inline-flex items-center gap-1.5 shadow-sm">
      <span className="text-gray-500 font-normal">ID:</span> {formattedString}
    </span>
  );
}
