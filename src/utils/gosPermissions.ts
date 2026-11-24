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

export type CruscottoTabKey =
  | 'cruscotto_operativo'
  | 'trattative'
  | 'database_aziende'
  | 'rubrica_contatti'
  | 'offer_builder'
  | 'invoice_generator'
  | 'questionari'
  | 'utenti_permessi';

export type AziendaTabKey =
  | 'azienda_anagrafica'
  | 'azienda_contatti_referenti'
  | 'azienda_questionari_assessment'
  | 'azienda_business_plan_finanziario'
  | 'azienda_offer_builder'
  | 'azienda_trattative'
  | 'azienda_documenti_file';

export type AnyPermissionTabKey = CruscottoTabKey | AziendaTabKey;

export type TabPermissionAction = 'read' | 'edit' | 'delete';

export interface TabPermissionFlags {
  read: boolean;
  edit: boolean;
  delete: boolean;
}

export type TabPermissionsMap = Record<CruscottoTabKey, TabPermissionFlags>;
export type AziendaTabPermissionsMap = Record<AziendaTabKey, TabPermissionFlags>;

export interface SectionPermissionsState {
  aziende: boolean;
  questionari: boolean;
  offerte: boolean;
  utenti: boolean;
}

export interface OperationalFlagsState {
  canEditAziende: boolean;
  canDeleteAziende: boolean;
  canEditOfferte: boolean;
  canDeleteOfferte: boolean;
  canExportData: boolean;
  canDeleteProgetti: boolean;
  canDeleteDocumenti: boolean;
  canDeleteFile: boolean;
}

export const CRUSCOTTO_TAB_ITEMS: Array<{ key: CruscottoTabKey; label: string }> = [
  { key: 'cruscotto_operativo', label: 'Cruscotto Operativo' },
  { key: 'trattative', label: 'Trattative' },
  { key: 'database_aziende', label: 'Database Aziende' },
  { key: 'rubrica_contatti', label: 'Rubrica Contatti' },
  { key: 'offer_builder', label: 'Offer Builder' },
  { key: 'invoice_generator', label: 'Invoice Generator' },
  { key: 'questionari', label: 'Questionari' },
  { key: 'utenti_permessi', label: 'Utenti & Permessi' },
];

export const AZIENDA_TAB_ITEMS: Array<{ key: AziendaTabKey; label: string }> = [
  { key: 'azienda_anagrafica', label: 'Anagrafica' },
  { key: 'azienda_contatti_referenti', label: 'Contatti & Referenti' },
  { key: 'azienda_questionari_assessment', label: 'Questionari & Assessment' },
  { key: 'azienda_business_plan_finanziario', label: 'Business Plan & Finanziario' },
  { key: 'azienda_offer_builder', label: 'Offer Builder' },
  { key: 'azienda_trattative', label: 'Trattative' },
  { key: 'azienda_documenti_file', label: 'Documenti & File' },
];

export interface GosUserPermissions extends OperationalFlagsState {
  canCreateAziende: boolean;
  canManageUsers: boolean;
  tabPermissions: TabPermissionsMap;
  aziendaTabPermissions: AziendaTabPermissionsMap;
}

export interface ProfilePermissionInput {
  ruolo?: string | null;
  can_edit_aziende?: boolean | null;
  can_delete_aziende?: boolean | null;
  can_edit_offerte?: boolean | null;
  can_delete_offerte?: boolean | null;
  can_export_data?: boolean | null;
  can_delete_progetti?: boolean | null;
  can_delete_documenti?: boolean | null;
  can_delete_file?: boolean | null;
  tab_permissions?: Partial<Record<CruscottoTabKey, Partial<TabPermissionFlags>>> | null;
  azienda_tab_permissions?: Partial<Record<AziendaTabKey, Partial<TabPermissionFlags>>> | null;
  permessi?: Record<string, unknown> | null;
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

export function createEmptyTabPermissions(): TabPermissionsMap {
  return {
    cruscotto_operativo: { read: false, edit: false, delete: false },
    trattative: { read: false, edit: false, delete: false },
    database_aziende: { read: false, edit: false, delete: false },
    rubrica_contatti: { read: false, edit: false, delete: false },
    offer_builder: { read: false, edit: false, delete: false },
    invoice_generator: { read: false, edit: false, delete: false },
    questionari: { read: false, edit: false, delete: false },
    utenti_permessi: { read: false, edit: false, delete: false },
  };
}

export function createEmptyAziendaTabPermissions(): AziendaTabPermissionsMap {
  return {
    azienda_anagrafica: { read: false, edit: false, delete: false },
    azienda_contatti_referenti: { read: false, edit: false, delete: false },
    azienda_questionari_assessment: { read: false, edit: false, delete: false },
    azienda_business_plan_finanziario: { read: false, edit: false, delete: false },
    azienda_offer_builder: { read: false, edit: false, delete: false },
    azienda_trattative: { read: false, edit: false, delete: false },
    azienda_documenti_file: { read: false, edit: false, delete: false },
  };
}

/**
 * Applica la regola gerarchica interna a una singola riga di permessi:
 * - edit => read = true
 * - delete => edit = true e read = true
 * - !read => edit = false e delete = false
 * - !edit => delete = false
 */
export function enforceRowActionHierarchy(
  flags: TabPermissionFlags,
  changedAction?: TabPermissionAction
): TabPermissionFlags {
  let read = Boolean(flags.read);
  let edit = Boolean(flags.edit);
  let del = Boolean(flags.delete);

  if (changedAction === 'delete') {
    if (del) {
      edit = true;
      read = true;
    }
  } else if (changedAction === 'edit') {
    if (edit) {
      read = true;
    } else {
      del = false;
    }
  } else if (changedAction === 'read') {
    if (!read) {
      edit = false;
      del = false;
    }
  } else {
    if (del) {
      edit = true;
      read = true;
    } else if (edit) {
      read = true;
    }
  }

  return { read, edit, delete: del };
}

function getDefaultTabPermissionsForRole(
  role: GosRole,
  base: OperationalFlagsState
): TabPermissionsMap {
  const matrix = createEmptyTabPermissions();

  if (role === 'superadmin') {
    for (const tab of CRUSCOTTO_TAB_ITEMS) {
      matrix[tab.key] = { read: true, edit: true, delete: true };
    }
    return matrix;
  }

  if (role === 'Equity Partner' || role === 'Senior Advisor') {
    matrix.cruscotto_operativo = enforceRowActionHierarchy({
      read: true,
      edit: true,
      delete: base.canDeleteProgetti,
    });
    matrix.trattative = enforceRowActionHierarchy({
      read: true,
      edit: true,
      delete: base.canDeleteProgetti,
    });
    matrix.database_aziende = enforceRowActionHierarchy({
      read: true,
      edit: base.canEditAziende,
      delete: base.canDeleteAziende,
    });
    matrix.rubrica_contatti = enforceRowActionHierarchy({
      read: true,
      edit: base.canEditAziende,
      delete: base.canDeleteAziende,
    });
    matrix.offer_builder = enforceRowActionHierarchy({
      read: true,
      edit: base.canEditOfferte,
      delete: base.canDeleteOfferte,
    });
    matrix.invoice_generator = enforceRowActionHierarchy({
      read: true,
      edit: base.canEditOfferte,
      delete: base.canDeleteDocumenti,
    });
    matrix.questionari = enforceRowActionHierarchy({
      read: true,
      edit: true,
      delete: base.canDeleteDocumenti,
    });
    matrix.utenti_permessi = { read: false, edit: false, delete: false };
    return matrix;
  }

  if (role === 'Network Partner') {
    matrix.cruscotto_operativo = { read: true, edit: false, delete: false };
    matrix.trattative = enforceRowActionHierarchy({
      read: true,
      edit: true,
      delete: false,
    });
    matrix.database_aziende = enforceRowActionHierarchy({
      read: true,
      edit: base.canEditAziende,
      delete: base.canDeleteAziende,
    });
    matrix.rubrica_contatti = enforceRowActionHierarchy({
      read: true,
      edit: base.canEditAziende,
      delete: false,
    });
    matrix.offer_builder = enforceRowActionHierarchy({
      read: true,
      edit: base.canEditOfferte,
      delete: base.canDeleteOfferte,
    });
    matrix.invoice_generator = { read: true, edit: false, delete: false };
    matrix.questionari = enforceRowActionHierarchy({
      read: true,
      edit: true,
      delete: false,
    });
    matrix.utenti_permessi = { read: false, edit: false, delete: false };
    return matrix;
  }

  if (role === 'Junior Advisor') {
    matrix.cruscotto_operativo = { read: true, edit: false, delete: false };
    matrix.trattative = enforceRowActionHierarchy({
      read: true,
      edit: true,
      delete: false,
    });
    matrix.database_aziende = enforceRowActionHierarchy({
      read: true,
      edit: base.canEditAziende,
      delete: false,
    });
    matrix.rubrica_contatti = enforceRowActionHierarchy({
      read: true,
      edit: base.canEditAziende,
      delete: false,
    });
    matrix.offer_builder = { read: true, edit: false, delete: false };
    matrix.invoice_generator = { read: false, edit: false, delete: false };
    matrix.questionari = enforceRowActionHierarchy({
      read: true,
      edit: true,
      delete: false,
    });
    matrix.utenti_permessi = { read: false, edit: false, delete: false };
    return matrix;
  }

  matrix.cruscotto_operativo = { read: true, edit: false, delete: false };
  return matrix;
}

function getDefaultAziendaTabPermissionsForRole(
  role: GosRole,
  base: OperationalFlagsState
): AziendaTabPermissionsMap {
  const matrix = createEmptyAziendaTabPermissions();

  if (role === 'superadmin') {
    for (const tab of AZIENDA_TAB_ITEMS) {
      matrix[tab.key] = { read: true, edit: true, delete: true };
    }
    return matrix;
  }

  if (role === 'Equity Partner' || role === 'Senior Advisor') {
    matrix.azienda_anagrafica = enforceRowActionHierarchy({
      read: true,
      edit: base.canEditAziende,
      delete: base.canDeleteAziende,
    });
    matrix.azienda_contatti_referenti = enforceRowActionHierarchy({
      read: true,
      edit: base.canEditAziende,
      delete: base.canDeleteAziende,
    });
    matrix.azienda_questionari_assessment = enforceRowActionHierarchy({
      read: true,
      edit: true,
      delete: base.canDeleteDocumenti,
    });
    matrix.azienda_business_plan_finanziario = enforceRowActionHierarchy({
      read: true,
      edit: true,
      delete: base.canDeleteProgetti,
    });
    matrix.azienda_offer_builder = enforceRowActionHierarchy({
      read: true,
      edit: base.canEditOfferte,
      delete: base.canDeleteOfferte,
    });
    matrix.azienda_trattative = enforceRowActionHierarchy({
      read: true,
      edit: true,
      delete: base.canDeleteProgetti,
    });
    matrix.azienda_documenti_file = enforceRowActionHierarchy({
      read: true,
      edit: true,
      delete: base.canDeleteDocumenti || base.canDeleteFile,
    });
    return matrix;
  }

  if (role === 'Network Partner') {
    matrix.azienda_anagrafica = enforceRowActionHierarchy({
      read: true,
      edit: base.canEditAziende,
      delete: false,
    });
    matrix.azienda_contatti_referenti = enforceRowActionHierarchy({
      read: true,
      edit: base.canEditAziende,
      delete: false,
    });
    matrix.azienda_questionari_assessment = enforceRowActionHierarchy({
      read: true,
      edit: true,
      delete: false,
    });
    matrix.azienda_business_plan_finanziario = { read: true, edit: false, delete: false };
    matrix.azienda_offer_builder = enforceRowActionHierarchy({
      read: true,
      edit: base.canEditOfferte,
      delete: false,
    });
    matrix.azienda_trattative = enforceRowActionHierarchy({
      read: true,
      edit: true,
      delete: false,
    });
    matrix.azienda_documenti_file = enforceRowActionHierarchy({
      read: true,
      edit: false,
      delete: base.canDeleteFile,
    });
    return matrix;
  }

  if (role === 'Junior Advisor') {
    matrix.azienda_anagrafica = enforceRowActionHierarchy({
      read: true,
      edit: base.canEditAziende,
      delete: false,
    });
    matrix.azienda_contatti_referenti = enforceRowActionHierarchy({
      read: true,
      edit: base.canEditAziende,
      delete: false,
    });
    matrix.azienda_questionari_assessment = enforceRowActionHierarchy({
      read: true,
      edit: true,
      delete: false,
    });
    matrix.azienda_business_plan_finanziario = { read: true, edit: false, delete: false };
    matrix.azienda_offer_builder = { read: true, edit: false, delete: false };
    matrix.azienda_trattative = enforceRowActionHierarchy({
      read: true,
      edit: true,
      delete: false,
    });
    matrix.azienda_documenti_file = { read: true, edit: false, delete: false };
    return matrix;
  }

  matrix.azienda_anagrafica = { read: true, edit: false, delete: false };
  return matrix;
}

function mergeTabPermissions<TKey extends string>(
  defaults: Record<TKey, TabPermissionFlags>,
  items: ReadonlyArray<{ key: TKey }>,
  rawSource: Record<string, unknown> | null
): Record<TKey, TabPermissionFlags> {
  const merged = {} as Record<TKey, TabPermissionFlags>;
  for (const item of items) {
    merged[item.key] = { ...defaults[item.key] };
  }

  if (rawSource) {
    for (const item of items) {
      const entry = rawSource[item.key];
      if (entry && typeof entry === 'object') {
        const flags = entry as Record<string, unknown>;
        merged[item.key] = enforceRowActionHierarchy({
          read: typeof flags.read === 'boolean' ? flags.read : merged[item.key].read,
          edit: typeof flags.edit === 'boolean' ? flags.edit : merged[item.key].edit,
          delete: typeof flags.delete === 'boolean' ? flags.delete : merged[item.key].delete,
        });
      }
    }
  }

  return merged;
}

export interface CascadeSourceChange {
  source:
    | { kind: 'cruscotto_tab'; tabKey: CruscottoTabKey; action: TabPermissionAction; checked: boolean }
    | { kind: 'cruscotto_row'; tabKey: CruscottoTabKey; checked: boolean }
    | { kind: 'azienda_tab'; tabKey: AziendaTabKey; action: TabPermissionAction; checked: boolean }
    | { kind: 'azienda_row'; tabKey: AziendaTabKey; checked: boolean }
    | { kind: 'section'; sectionKey: keyof SectionPermissionsState; checked: boolean }
    | { kind: 'operational'; flagKey: keyof OperationalFlagsState; checked: boolean };
  tabPermissions: TabPermissionsMap;
  aziendaTabPermissions: AziendaTabPermissionsMap;
  sections: SectionPermissionsState;
  operational: OperationalFlagsState;
}

export interface CascadeResult {
  tabPermissions: TabPermissionsMap;
  aziendaTabPermissions: AziendaTabPermissionsMap;
  sections: SectionPermissionsState;
  operational: OperationalFlagsState;
}

/**
 * Propaga a scalare le modifiche tra tab del cruscotto, tab della scheda azienda,
 * permessi sezioni e permessi operativi.
 */
export function applyCascadePermissions(input: CascadeSourceChange): CascadeResult {
  const tabPermissions: TabPermissionsMap = createEmptyTabPermissions();
  for (const t of CRUSCOTTO_TAB_ITEMS) {
    tabPermissions[t.key] = { ...(input.tabPermissions[t.key] || { read: false, edit: false, delete: false }) };
  }

  const aziendaTabPermissions: AziendaTabPermissionsMap = createEmptyAziendaTabPermissions();
  for (const t of AZIENDA_TAB_ITEMS) {
    aziendaTabPermissions[t.key] = {
      ...(input.aziendaTabPermissions[t.key] || { read: false, edit: false, delete: false }),
    };
  }

  const sections: SectionPermissionsState = { ...input.sections };
  const operational: OperationalFlagsState = { ...input.operational };
  const { source } = input;

  if (source.kind === 'cruscotto_tab') {
    const current = tabPermissions[source.tabKey];
    const nextRow = enforceRowActionHierarchy(
      { ...current, [source.action]: source.checked },
      source.action
    );
    tabPermissions[source.tabKey] = nextRow;

    if (source.tabKey === 'database_aziende') {
      operational.canEditAziende = nextRow.edit;
      operational.canDeleteAziende = nextRow.delete;
      for (const azTab of AZIENDA_TAB_ITEMS) {
        aziendaTabPermissions[azTab.key] = enforceRowActionHierarchy({
          read: nextRow.read,
          edit: nextRow.edit ? aziendaTabPermissions[azTab.key].edit || nextRow.edit : false,
          delete: nextRow.delete ? aziendaTabPermissions[azTab.key].delete || nextRow.delete : false,
        });
      }
      if (source.action === 'edit' && !source.checked) {
        for (const azTab of AZIENDA_TAB_ITEMS) {
          aziendaTabPermissions[azTab.key] = enforceRowActionHierarchy(
            { ...aziendaTabPermissions[azTab.key], edit: false, delete: false },
            'edit'
          );
        }
      }
      if (source.action === 'delete' && !source.checked) {
        for (const azTab of AZIENDA_TAB_ITEMS) {
          aziendaTabPermissions[azTab.key] = {
            ...aziendaTabPermissions[azTab.key],
            delete: false,
          };
        }
      }
      if (source.action === 'read' && !source.checked) {
        for (const azTab of AZIENDA_TAB_ITEMS) {
          aziendaTabPermissions[azTab.key] = { read: false, edit: false, delete: false };
        }
      }
    }

    if (source.tabKey === 'rubrica_contatti') {
      operational.canEditAziende = operational.canEditAziende || nextRow.edit;
      aziendaTabPermissions.azienda_contatti_referenti = nextRow;
    }

    if (source.tabKey === 'offer_builder') {
      operational.canEditOfferte = nextRow.edit;
      operational.canDeleteOfferte = nextRow.delete;
      aziendaTabPermissions.azienda_offer_builder = nextRow;
    }

    if (source.tabKey === 'questionari') {
      operational.canDeleteDocumenti = nextRow.delete;
      aziendaTabPermissions.azienda_questionari_assessment = nextRow;
    }

    if (source.tabKey === 'trattative') {
      operational.canDeleteProgetti = nextRow.delete;
      aziendaTabPermissions.azienda_trattative = nextRow;
    }
  } else if (source.kind === 'cruscotto_row') {
    const nextRow: TabPermissionFlags = source.checked
      ? { read: true, edit: true, delete: true }
      : { read: false, edit: false, delete: false };
    tabPermissions[source.tabKey] = nextRow;

    if (source.tabKey === 'database_aziende') {
      operational.canEditAziende = nextRow.edit;
      operational.canDeleteAziende = nextRow.delete;
      for (const azTab of AZIENDA_TAB_ITEMS) {
        aziendaTabPermissions[azTab.key] = { ...nextRow };
      }
    } else if (source.tabKey === 'rubrica_contatti') {
      aziendaTabPermissions.azienda_contatti_referenti = { ...nextRow };
    } else if (source.tabKey === 'offer_builder') {
      operational.canEditOfferte = nextRow.edit;
      operational.canDeleteOfferte = nextRow.delete;
      aziendaTabPermissions.azienda_offer_builder = { ...nextRow };
    } else if (source.tabKey === 'questionari') {
      operational.canDeleteDocumenti = nextRow.delete;
      aziendaTabPermissions.azienda_questionari_assessment = { ...nextRow };
    } else if (source.tabKey === 'trattative') {
      operational.canDeleteProgetti = nextRow.delete;
      aziendaTabPermissions.azienda_trattative = { ...nextRow };
    }
  } else if (source.kind === 'azienda_tab') {
    const current = aziendaTabPermissions[source.tabKey];
    const nextRow = enforceRowActionHierarchy(
      { ...current, [source.action]: source.checked },
      source.action
    );
    aziendaTabPermissions[source.tabKey] = nextRow;

    if (source.tabKey === 'azienda_anagrafica') {
      operational.canEditAziende = nextRow.edit;
      operational.canDeleteAziende = nextRow.delete;
      tabPermissions.database_aziende = enforceRowActionHierarchy({
        read: tabPermissions.database_aziende.read || nextRow.read,
        edit: nextRow.edit,
        delete: nextRow.delete,
      });
    } else if (source.tabKey === 'azienda_contatti_referenti') {
      tabPermissions.rubrica_contatti = { ...nextRow };
    } else if (source.tabKey === 'azienda_offer_builder') {
      operational.canEditOfferte = nextRow.edit;
      operational.canDeleteOfferte = nextRow.delete;
      tabPermissions.offer_builder = { ...nextRow };
    } else if (source.tabKey === 'azienda_questionari_assessment') {
      operational.canDeleteDocumenti = nextRow.delete;
      tabPermissions.questionari = { ...nextRow };
    } else if (source.tabKey === 'azienda_trattative') {
      operational.canDeleteProgetti = nextRow.delete;
      tabPermissions.trattative = { ...nextRow };
    } else if (source.tabKey === 'azienda_documenti_file') {
      operational.canDeleteDocumenti = nextRow.delete;
      operational.canDeleteFile = nextRow.delete;
    }
  } else if (source.kind === 'azienda_row') {
    const nextRow: TabPermissionFlags = source.checked
      ? { read: true, edit: true, delete: true }
      : { read: false, edit: false, delete: false };
    aziendaTabPermissions[source.tabKey] = nextRow;

    if (source.tabKey === 'azienda_anagrafica') {
      operational.canEditAziende = nextRow.edit;
      operational.canDeleteAziende = nextRow.delete;
      tabPermissions.database_aziende = { ...nextRow };
    } else if (source.tabKey === 'azienda_contatti_referenti') {
      tabPermissions.rubrica_contatti = { ...nextRow };
    } else if (source.tabKey === 'azienda_offer_builder') {
      operational.canEditOfferte = nextRow.edit;
      operational.canDeleteOfferte = nextRow.delete;
      tabPermissions.offer_builder = { ...nextRow };
    } else if (source.tabKey === 'azienda_questionari_assessment') {
      operational.canDeleteDocumenti = nextRow.delete;
      tabPermissions.questionari = { ...nextRow };
    } else if (source.tabKey === 'azienda_trattative') {
      operational.canDeleteProgetti = nextRow.delete;
      tabPermissions.trattative = { ...nextRow };
    } else if (source.tabKey === 'azienda_documenti_file') {
      operational.canDeleteDocumenti = nextRow.delete;
      operational.canDeleteFile = nextRow.delete;
    }
  } else if (source.kind === 'section') {
    sections[source.sectionKey] = source.checked;
    if (source.sectionKey === 'aziende') {
      if (!source.checked) {
        tabPermissions.database_aziende = { read: false, edit: false, delete: false };
        operational.canEditAziende = false;
        operational.canDeleteAziende = false;
        for (const azTab of AZIENDA_TAB_ITEMS) {
          aziendaTabPermissions[azTab.key] = { read: false, edit: false, delete: false };
        }
      } else {
        tabPermissions.database_aziende = enforceRowActionHierarchy({
          ...tabPermissions.database_aziende,
          read: true,
        });
        aziendaTabPermissions.azienda_anagrafica = enforceRowActionHierarchy({
          ...aziendaTabPermissions.azienda_anagrafica,
          read: true,
        });
      }
    } else if (source.sectionKey === 'questionari') {
      tabPermissions.questionari = enforceRowActionHierarchy({
        ...tabPermissions.questionari,
        read: source.checked,
        edit: source.checked ? tabPermissions.questionari.edit : false,
        delete: source.checked ? tabPermissions.questionari.delete : false,
      });
    } else if (source.sectionKey === 'offerte') {
      tabPermissions.offer_builder = enforceRowActionHierarchy({
        ...tabPermissions.offer_builder,
        read: source.checked,
        edit: source.checked ? tabPermissions.offer_builder.edit : false,
        delete: source.checked ? tabPermissions.offer_builder.delete : false,
      });
    } else if (source.sectionKey === 'utenti') {
      tabPermissions.utenti_permessi = enforceRowActionHierarchy({
        ...tabPermissions.utenti_permessi,
        read: source.checked,
        edit: source.checked ? tabPermissions.utenti_permessi.edit : false,
        delete: source.checked ? tabPermissions.utenti_permessi.delete : false,
      });
    }
  } else if (source.kind === 'operational') {
    operational[source.flagKey] = source.checked;

    if (source.flagKey === 'canEditAziende') {
      tabPermissions.database_aziende = enforceRowActionHierarchy(
        {
          ...tabPermissions.database_aziende,
          read: source.checked ? true : tabPermissions.database_aziende.read,
          edit: source.checked,
        },
        'edit'
      );
      aziendaTabPermissions.azienda_anagrafica = enforceRowActionHierarchy(
        {
          ...aziendaTabPermissions.azienda_anagrafica,
          read: source.checked ? true : aziendaTabPermissions.azienda_anagrafica.read,
          edit: source.checked,
        },
        'edit'
      );
    } else if (source.flagKey === 'canDeleteAziende') {
      tabPermissions.database_aziende = enforceRowActionHierarchy(
        {
          ...tabPermissions.database_aziende,
          delete: source.checked,
        },
        'delete'
      );
      aziendaTabPermissions.azienda_anagrafica = enforceRowActionHierarchy(
        {
          ...aziendaTabPermissions.azienda_anagrafica,
          delete: source.checked,
        },
        'delete'
      );
    } else if (source.flagKey === 'canEditOfferte') {
      tabPermissions.offer_builder = enforceRowActionHierarchy(
        {
          ...tabPermissions.offer_builder,
          read: source.checked ? true : tabPermissions.offer_builder.read,
          edit: source.checked,
        },
        'edit'
      );
      aziendaTabPermissions.azienda_offer_builder = enforceRowActionHierarchy(
        {
          ...aziendaTabPermissions.azienda_offer_builder,
          read: source.checked ? true : aziendaTabPermissions.azienda_offer_builder.read,
          edit: source.checked,
        },
        'edit'
      );
    } else if (source.flagKey === 'canDeleteOfferte') {
      tabPermissions.offer_builder = enforceRowActionHierarchy(
        {
          ...tabPermissions.offer_builder,
          delete: source.checked,
        },
        'delete'
      );
      aziendaTabPermissions.azienda_offer_builder = enforceRowActionHierarchy(
        {
          ...aziendaTabPermissions.azienda_offer_builder,
          delete: source.checked,
        },
        'delete'
      );
    } else if (source.flagKey === 'canDeleteProgetti') {
      tabPermissions.trattative = enforceRowActionHierarchy(
        { ...tabPermissions.trattative, delete: source.checked },
        'delete'
      );
      aziendaTabPermissions.azienda_trattative = enforceRowActionHierarchy(
        { ...aziendaTabPermissions.azienda_trattative, delete: source.checked },
        'delete'
      );
    } else if (source.flagKey === 'canDeleteDocumenti') {
      tabPermissions.questionari = enforceRowActionHierarchy(
        { ...tabPermissions.questionari, delete: source.checked },
        'delete'
      );
      aziendaTabPermissions.azienda_questionari_assessment = enforceRowActionHierarchy(
        { ...aziendaTabPermissions.azienda_questionari_assessment, delete: source.checked },
        'delete'
      );
      aziendaTabPermissions.azienda_documenti_file = enforceRowActionHierarchy(
        { ...aziendaTabPermissions.azienda_documenti_file, delete: source.checked },
        'delete'
      );
    } else if (source.flagKey === 'canDeleteFile') {
      aziendaTabPermissions.azienda_documenti_file = enforceRowActionHierarchy(
        { ...aziendaTabPermissions.azienda_documenti_file, delete: source.checked },
        'delete'
      );
    }
  }

  // Sincronizza i permessi di sezione derivati dai tab
  sections.aziende =
    tabPermissions.database_aziende.read ||
    tabPermissions.database_aziende.edit ||
    tabPermissions.database_aziende.delete ||
    operational.canEditAziende ||
    operational.canDeleteAziende;
  sections.questionari =
    tabPermissions.questionari.read ||
    tabPermissions.questionari.edit ||
    tabPermissions.questionari.delete;
  sections.offerte =
    tabPermissions.offer_builder.read ||
    tabPermissions.offer_builder.edit ||
    tabPermissions.offer_builder.delete ||
    operational.canEditOfferte ||
    operational.canDeleteOfferte;
  sections.utenti =
    tabPermissions.utenti_permessi.read ||
    tabPermissions.utenti_permessi.edit ||
    tabPermissions.utenti_permessi.delete;

  return {
    tabPermissions,
    aziendaTabPermissions,
    sections,
    operational,
  };
}

export function resolveGosPermissions(
  profile?: ProfilePermissionInput | null
): GosUserPermissions {
  const role = normalizeGosRole(profile?.ruolo);

  let base: OperationalFlagsState & { canCreateAziende: boolean; canManageUsers: boolean };

  if (role === 'superadmin') {
    base = {
      canCreateAziende: true,
      canEditAziende: profile?.can_edit_aziende ?? true,
      canDeleteAziende: profile?.can_delete_aziende ?? true,
      canEditOfferte: profile?.can_edit_offerte ?? true,
      canDeleteOfferte: profile?.can_delete_offerte ?? true,
      canExportData: profile?.can_export_data ?? true,
      canManageUsers: true,
      canDeleteProgetti: profile?.can_delete_progetti ?? true,
      canDeleteDocumenti: profile?.can_delete_documenti ?? true,
      canDeleteFile: profile?.can_delete_file ?? true,
    };
  } else if (role === 'Equity Partner') {
    base = {
      canCreateAziende: true,
      canEditAziende: profile?.can_edit_aziende ?? true,
      canDeleteAziende: profile?.can_delete_aziende ?? true,
      canEditOfferte: profile?.can_edit_offerte ?? true,
      canDeleteOfferte: profile?.can_delete_offerte ?? true,
      canExportData: profile?.can_export_data ?? true,
      canManageUsers: false,
      canDeleteProgetti: profile?.can_delete_progetti ?? true,
      canDeleteDocumenti: profile?.can_delete_documenti ?? true,
      canDeleteFile: profile?.can_delete_file ?? true,
    };
  } else if (role === 'Senior Advisor') {
    base = {
      canCreateAziende: true,
      canEditAziende: profile?.can_edit_aziende ?? true,
      canDeleteAziende: Boolean(profile?.can_delete_aziende),
      canEditOfferte: profile?.can_edit_offerte ?? true,
      canDeleteOfferte: Boolean(profile?.can_delete_offerte),
      canExportData: profile?.can_export_data ?? true,
      canManageUsers: false,
      canDeleteProgetti: Boolean(profile?.can_delete_progetti),
      canDeleteDocumenti: Boolean(profile?.can_delete_documenti),
      canDeleteFile: Boolean(profile?.can_delete_file),
    };
  } else if (role === 'Network Partner') {
    base = {
      canCreateAziende: true,
      canEditAziende: Boolean(profile?.can_edit_aziende),
      canDeleteAziende: Boolean(profile?.can_delete_aziende),
      canEditOfferte: profile?.can_edit_offerte ?? true,
      canDeleteOfferte: Boolean(profile?.can_delete_offerte),
      canExportData: Boolean(profile?.can_export_data),
      canManageUsers: false,
      canDeleteProgetti: Boolean(profile?.can_delete_progetti),
      canDeleteDocumenti: Boolean(profile?.can_delete_documenti),
      canDeleteFile: Boolean(profile?.can_delete_file),
    };
  } else if (role === 'Junior Advisor') {
    base = {
      canCreateAziende: true,
      canEditAziende: Boolean(profile?.can_edit_aziende),
      canDeleteAziende: false,
      canEditOfferte: false,
      canDeleteOfferte: false,
      canExportData: false,
      canManageUsers: false,
      canDeleteProgetti: false,
      canDeleteDocumenti: false,
      canDeleteFile: false,
    };
  } else {
    base = {
      canCreateAziende: false,
      canEditAziende: Boolean(profile?.can_edit_aziende),
      canDeleteAziende: false,
      canEditOfferte: false,
      canDeleteOfferte: false,
      canExportData: false,
      canManageUsers: false,
      canDeleteProgetti: false,
      canDeleteDocumenti: false,
      canDeleteFile: false,
    };
  }

  const rawCruscottoSource =
    profile?.tab_permissions && typeof profile.tab_permissions === 'object'
      ? (profile.tab_permissions as Record<string, unknown>)
      : profile?.permessi &&
          typeof profile.permessi === 'object' &&
          (profile.permessi as Record<string, unknown>).tab_permissions &&
          typeof (profile.permessi as Record<string, unknown>).tab_permissions === 'object'
        ? ((profile.permessi as Record<string, unknown>).tab_permissions as Record<string, unknown>)
        : null;

  const rawAziendaSource =
    profile?.azienda_tab_permissions && typeof profile.azienda_tab_permissions === 'object'
      ? (profile.azienda_tab_permissions as Record<string, unknown>)
      : profile?.permessi &&
          typeof profile.permessi === 'object' &&
          (profile.permessi as Record<string, unknown>).azienda_tab_permissions &&
          typeof (profile.permessi as Record<string, unknown>).azienda_tab_permissions === 'object'
        ? ((profile.permessi as Record<string, unknown>).azienda_tab_permissions as Record<
            string,
            unknown
          >)
        : null;

  const tabPermissions = mergeTabPermissions(
    getDefaultTabPermissionsForRole(role, base),
    CRUSCOTTO_TAB_ITEMS,
    rawCruscottoSource
  );

  const aziendaTabPermissions = mergeTabPermissions(
    getDefaultAziendaTabPermissionsForRole(role, base),
    AZIENDA_TAB_ITEMS,
    rawAziendaSource
  );

  return {
    ...base,
    canEditAziende:
      base.canEditAziende ||
      tabPermissions.database_aziende.edit ||
      aziendaTabPermissions.azienda_anagrafica.edit,
    canDeleteAziende:
      base.canDeleteAziende ||
      tabPermissions.database_aziende.delete ||
      aziendaTabPermissions.azienda_anagrafica.delete,
    canEditOfferte:
      base.canEditOfferte ||
      tabPermissions.offer_builder.edit ||
      aziendaTabPermissions.azienda_offer_builder.edit,
    canDeleteOfferte:
      base.canDeleteOfferte ||
      tabPermissions.offer_builder.delete ||
      aziendaTabPermissions.azienda_offer_builder.delete,
    canManageUsers:
      base.canManageUsers ||
      tabPermissions.utenti_permessi.read ||
      tabPermissions.utenti_permessi.edit ||
      tabPermissions.utenti_permessi.delete,
    tabPermissions,
    aziendaTabPermissions,
  };
}

export function canAccessTab(
  profile: ProfilePermissionInput | null | undefined,
  tabKey: AnyPermissionTabKey,
  action: TabPermissionAction = 'read'
): boolean {
  const resolved = resolveGosPermissions(profile);
  if (tabKey in resolved.tabPermissions) {
    return Boolean(resolved.tabPermissions[tabKey as CruscottoTabKey]?.[action]);
  }
  return Boolean(resolved.aziendaTabPermissions[tabKey as AziendaTabKey]?.[action]);
}
