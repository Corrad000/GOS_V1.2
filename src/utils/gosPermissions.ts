export type GosRole =
  | 'superadmin'
  | 'Equity Partner'
  | 'Senior Advisor'
  | 'Network Partner'
  | 'Junior Advisor'
  | 'user Guest';

export const GOS_ROLES: GosRole[] = [
  'superadmin',
  'Equity Partner',
  'Senior Advisor',
  'Network Partner',
  'Junior Advisor',
  'user Guest',
];

export interface GosUserPermissions {
  canCreateAziende: boolean;
  canDeleteAziende: boolean;
  canCreateOfferte: boolean;
  canEditOfferte: boolean;
  canDeleteOfferte: boolean;
  canExportData: boolean;
  canManageUsers: boolean;
  canDeleteProgetti: boolean;
  canDeleteDocumenti: boolean;
  canDeleteFile: boolean;
}

export interface ProfilePermissionInput {
  ruolo?: string | null;
  can_delete_aziende?: boolean | null;
  can_edit_offerte?: boolean | null;
  can_delete_offerte?: boolean | null;
  can_export_data?: boolean | null;
  can_delete_progetti?: boolean | null;
  can_delete_documenti?: boolean | null;
  can_delete_file?: boolean | null;
}

export function normalizeGosRole(role?: string | null): GosRole {
  const clean = String(role || '')
    .replace(/[‘’'"]/g, '')
    .trim()
    .toLowerCase();

  if (clean === 'superadmin') return 'superadmin';
  if (clean === 'equity partner' || clean === 'admin') return 'Equity Partner';
  if (clean === 'senior advisor' || clean === 'advisor') return 'Senior Advisor';
  if (clean === 'network partner') return 'Network Partner';
  if (clean === 'junior advisor' || clean === 'junior') return 'Junior Advisor';
  return 'user Guest';
}

export function resolveGosPermissions(
  profile?: ProfilePermissionInput | null
): GosUserPermissions {
  const role = normalizeGosRole(profile?.ruolo);

  if (role === 'superadmin') {
    return {
      canCreateAziende: true,
      canDeleteAziende: profile?.can_delete_aziende ?? true,
      canCreateOfferte: true,
      canEditOfferte: profile?.can_edit_offerte ?? true,
      canDeleteOfferte: profile?.can_delete_offerte ?? true,
      canExportData: profile?.can_export_data ?? true,
      canManageUsers: true,
      canDeleteProgetti: profile?.can_delete_progetti ?? true,
      canDeleteDocumenti: profile?.can_delete_documenti ?? true,
      canDeleteFile: profile?.can_delete_file ?? true,
    };
  }

  if (role === 'Equity Partner') {
    return {
      canCreateAziende: true,
      canDeleteAziende: profile?.can_delete_aziende ?? true,
      canCreateOfferte: true,
      canEditOfferte: profile?.can_edit_offerte ?? true,
      canDeleteOfferte: profile?.can_delete_offerte ?? true,
      canExportData: profile?.can_export_data ?? true,
      canManageUsers: false,
      canDeleteProgetti: profile?.can_delete_progetti ?? true,
      canDeleteDocumenti: profile?.can_delete_documenti ?? true,
      canDeleteFile: profile?.can_delete_file ?? true,
    };
  }

  if (role === 'Senior Advisor') {
    return {
      canCreateAziende: true,
      canDeleteAziende: Boolean(profile?.can_delete_aziende),
      canCreateOfferte: true,
      canEditOfferte: profile?.can_edit_offerte ?? true,
      canDeleteOfferte: Boolean(profile?.can_delete_offerte),
      canExportData: profile?.can_export_data ?? true,
      canManageUsers: false,
      canDeleteProgetti: Boolean(profile?.can_delete_progetti),
      canDeleteDocumenti: Boolean(profile?.can_delete_documenti),
      canDeleteFile: Boolean(profile?.can_delete_file),
    };
  }

  if (role === 'Network Partner') {
    return {
      canCreateAziende: true,
      canDeleteAziende: Boolean(profile?.can_delete_aziende),
      canCreateOfferte: true,
      canEditOfferte: profile?.can_edit_offerte ?? true,
      canDeleteOfferte: Boolean(profile?.can_delete_offerte),
      canExportData: Boolean(profile?.can_export_data),
      canManageUsers: false,
      canDeleteProgetti: Boolean(profile?.can_delete_progetti),
      canDeleteDocumenti: Boolean(profile?.can_delete_documenti),
      canDeleteFile: Boolean(profile?.can_delete_file),
    };
  }

  if (role === 'Junior Advisor') {
    return {
      canCreateAziende: true,
      canDeleteAziende: false,
      canCreateOfferte: true,
      canEditOfferte: false,
      canDeleteOfferte: false,
      canExportData: false,
      canManageUsers: false,
      canDeleteProgetti: false,
      canDeleteDocumenti: false,
      canDeleteFile: false,
    };
  }

  return {
    canCreateAziende: false,
    canDeleteAziende: false,
    canCreateOfferte: false,
    canEditOfferte: false,
    canDeleteOfferte: false,
    canExportData: false,
    canManageUsers: false,
    canDeleteProgetti: false,
    canDeleteDocumenti: false,
    canDeleteFile: false,
  };
}
