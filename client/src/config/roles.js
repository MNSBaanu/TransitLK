export const ROLES = {
  SUPERADMINISTRATOR: 'superadministrator',
  ADMINISTRATOR: 'administrator',
  TRANSPORT_SCHEDULER: 'transport_scheduler',
  FLEET_MANAGER: 'fleet_manager',
  DEPOT_MANAGER: 'depot_manager',
  DRIVER: 'driver',
}

export const ROLE_LABELS = {
  [ROLES.SUPERADMINISTRATOR]: 'Superadministrator',
  [ROLES.ADMINISTRATOR]: 'Administrator',
  [ROLES.TRANSPORT_SCHEDULER]: 'Transport Scheduler',
  [ROLES.FLEET_MANAGER]: 'Fleet Manager',
  [ROLES.DEPOT_MANAGER]: 'Depot Manager',
  [ROLES.DRIVER]: 'Driver',
}

/** Staff roles managed on the Users page (drivers use Fleet & Drivers) */
export const STAFF_ROLES = [
  ROLES.TRANSPORT_SCHEDULER,
  ROLES.FLEET_MANAGER,
  ROLES.DEPOT_MANAGER,
]

/** Modules each role can reach in the depot workspace */
export const ROLE_ACCESS_MODULES = {
  [ROLES.SUPERADMINISTRATOR]: [
    'Depot Management',
    'Administrator Management',
    'Global Reports',
  ],
  [ROLES.ADMINISTRATOR]: [
    'Dashboard',
    'Routes',
    'Schedules',
    'Fleet & Drivers',
    'Users',
    'Maintenance',
    'Analytics',
  ],
  [ROLES.TRANSPORT_SCHEDULER]: ['Routes', 'Schedules', 'Analytics'],
  [ROLES.FLEET_MANAGER]: ['Fleet & Drivers', 'Maintenance'],
  [ROLES.DEPOT_MANAGER]: ['Dashboard', 'Schedules', 'Analytics'],
}

export function accessModulesForRole(role) {
  return ROLE_ACCESS_MODULES[role] || []
}

/** Default landing path after login per role */
export const ROLE_HOME_PATH = {
  [ROLES.SUPERADMINISTRATOR]: '/admins',
  [ROLES.ADMINISTRATOR]: '/dashboard',
  [ROLES.TRANSPORT_SCHEDULER]: '/routes',
  [ROLES.FLEET_MANAGER]: '/buses',
  [ROLES.DEPOT_MANAGER]: '/dashboard',
  [ROLES.DRIVER]: '/my-trips',
}

/** Paths each role may access (URL guard) */
export const ROLE_ALLOWED_PATHS = {
  [ROLES.SUPERADMINISTRATOR]: ['/admins', '/depots', '/reports'],
  [ROLES.ADMINISTRATOR]: [
    '/dashboard',
    '/routes',
    '/schedules',
    '/buses',
    '/drivers',
    '/users',
    '/maintenance',
    '/reports',
  ],
  [ROLES.TRANSPORT_SCHEDULER]: ['/routes', '/schedules', '/reports'],
  [ROLES.FLEET_MANAGER]: ['/buses', '/drivers', '/maintenance'],
  [ROLES.DEPOT_MANAGER]: ['/dashboard', '/schedules', '/reports'],
  [ROLES.DRIVER]: ['/my-trips'],
}

export const NAV_ITEMS = [
  { path: '/dashboard', label: 'Dashboard', roles: [ROLES.ADMINISTRATOR, ROLES.DEPOT_MANAGER] },
  { path: '/admins', label: 'Admins', roles: [ROLES.SUPERADMINISTRATOR] },
  { path: '/depots', label: 'Depots', roles: [ROLES.SUPERADMINISTRATOR] },
  { path: '/routes', label: 'Routes', roles: [ROLES.ADMINISTRATOR, ROLES.TRANSPORT_SCHEDULER] },
  { path: '/schedules', label: 'Schedules', roles: [ROLES.ADMINISTRATOR, ROLES.TRANSPORT_SCHEDULER, ROLES.DEPOT_MANAGER] },
  { path: '/buses', label: 'Fleet & Drivers', roles: [ROLES.ADMINISTRATOR, ROLES.FLEET_MANAGER] },
  { path: '/users', label: 'Users', roles: [ROLES.ADMINISTRATOR] },
  { path: '/maintenance', label: 'Maintenance', roles: [ROLES.ADMINISTRATOR, ROLES.FLEET_MANAGER] },
  { path: '/reports', label: 'Analytics', roles: [ROLES.SUPERADMINISTRATOR, ROLES.ADMINISTRATOR, ROLES.TRANSPORT_SCHEDULER, ROLES.DEPOT_MANAGER] },
  { path: '/my-trips', label: 'My trips', roles: [ROLES.DRIVER] },
]

export function isPathAllowed(role, pathname) {
  const allowed = ROLE_ALLOWED_PATHS[role] || []
  return allowed.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  )
}

export function homePathForRole(role) {
  return ROLE_HOME_PATH[role] || '/login'
}
