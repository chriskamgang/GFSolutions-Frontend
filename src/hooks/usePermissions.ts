import { useAuth } from '../context/AuthContext';

/**
 * Mapping route -> permission(s) requise(s) pour y acceder.
 * Si une route n'est pas listee, elle est accessible a tous les roles connectes.
 */
const ROUTE_PERMISSIONS: Record<string, string[]> = {
  '/clients': ['CLIENTS:READ'],
  '/accounts': ['ACCOUNTS:READ'],
  '/transactions': ['TRANSACTIONS:READ'],
  '/savings': ['CONTRIBUTIONS:READ'],
  '/credits': ['CREDITS:READ'],
  '/credits/simulator': ['CREDITS:READ'],
  '/credits/approved': ['CREDITS:READ'],
  '/credits/pending': ['CREDITS:UPDATE'],
  '/credits/scoring': ['CREDITS:READ'],
  '/treasury': ['TRANSACTIONS:READ'],
  '/accounting': ['ACCOUNTING:READ'],
  '/reports': ['REPORTS:READ'],
  '/companies': ['COMPANIES:READ'],
  '/agencies': ['AGENCIES:READ'],
  '/users': ['USERS:READ'],
  '/roles': ['ROLES:READ'],
  '/audit': ['AUDIT:READ'],
  '/settings': ['SETTINGS:READ'],
};

export function usePermissions() {
  const { user, hasPermission } = useAuth();

  const role = user?.role || '';
  const permissions = user?.permissions || [];

  /** Verifie si l'utilisateur a au moins UNE des permissions */
  const canAny = (...perms: string[]) =>
    perms.some((p) => hasPermission(p));

  /** Verifie si l'utilisateur a TOUTES les permissions */
  const canAll = (...perms: string[]) =>
    perms.every((p) => hasPermission(p));

  /** Verifie si une route est accessible */
  const canAccessRoute = (path: string) => {
    const required = ROUTE_PERMISSIONS[path];
    if (!required) return true; // Dashboard toujours accessible
    return required.some((p) => hasPermission(p));
  };

  /** Verifie si l'utilisateur peut creer dans un module */
  const canCreate = (module: string) => hasPermission(`${module}:CREATE`);
  const canRead = (module: string) => hasPermission(`${module}:READ`);
  const canUpdate = (module: string) => hasPermission(`${module}:UPDATE`);
  const canDelete = (module: string) => hasPermission(`${module}:DELETE`);

  /** Raccourcis metier */
  const canDeposit = hasPermission('TRANSACTIONS:CREATE');
  const canWithdraw = hasPermission('TRANSACTIONS:CREATE');
  const canTransfer = hasPermission('TRANSACTIONS:CREATE');
  const canApproveCredit = hasPermission('CREDITS:UPDATE');
  const canManageAccounting = hasPermission('ACCOUNTING:CREATE');
  const canViewAccounting = hasPermission('ACCOUNTING:READ');

  /** Le role est lecture seule (Auditeur) */
  const isReadOnly = role === 'AUDITEUR';

  return {
    role,
    permissions,
    canAny,
    canAll,
    canAccessRoute,
    canCreate,
    canRead,
    canUpdate,
    canDelete,
    canDeposit,
    canWithdraw,
    canTransfer,
    canApproveCredit,
    canManageAccounting,
    canViewAccounting,
    isReadOnly,
    hasPermission,
  };
}
