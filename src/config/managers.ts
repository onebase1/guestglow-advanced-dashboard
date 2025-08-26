/**
 * 🔄 MANAGER CONFIGURATION - HYBRID APPROACH
 *
 * MIGRATION STRATEGY:
 * - NEW: Database-driven tenant-specific configurations (scalable)
 * - LEGACY: Environment variable fallback (backward compatibility)
 * - SAFE: Graceful degradation if database unavailable
 *
 * 🎯 FOR NEW TENANTS: Use database configuration (no environment variables needed)
 * 🔄 FOR EXISTING: Maintains environment variable support during transition
 */

import {
  getTenantManagerConfigurations,
  getTenantManagerByCategory,
  getAllTenantManagers,
  type ManagerConfig as TenantManagerConfig,
  type ManagerConfigurations as TenantManagerConfigurations
} from '@/services/tenantConfigService'

// Re-export types for backward compatibility
export type ManagerConfig = TenantManagerConfig
export type ManagerConfigurations = TenantManagerConfigurations

/**
 * 🎯 PRIMARY: Get manager configurations (Database-first with fallback)
 * This function now uses database configuration by default
 */
export const getManagerConfigurations = async (tenantId?: string): Promise<ManagerConfigurations> => {
  try {
    // Try database-driven configuration first
    return await getTenantManagerConfigurations(tenantId)
  } catch (error) {
    console.warn('Database configuration failed, using environment variables:', error)
    // Fallback to environment variables
    return getEnvironmentManagerConfigurations()
  }
}

/**
 * 🎯 SYNCHRONOUS VERSION: For backward compatibility
 * Uses environment variables only (legacy support)
 */
export const getManagerConfigurationsSync = (): ManagerConfigurations => {
  return getEnvironmentManagerConfigurations()
}

/**
 * 🔄 ENVIRONMENT VARIABLE FALLBACK
 * Maintains existing behavior for backward compatibility
 */
const getEnvironmentManagerConfigurations = (): ManagerConfigurations => {
  return {
    foodBeverage: {
      name: import.meta.env.VITE_FOOD_BEVERAGE_MANAGER_NAME || 'Food & Beverage Manager',
      email: import.meta.env.VITE_FOOD_BEVERAGE_MANAGER_EMAIL || 'manager@hotel.com',
      title: import.meta.env.VITE_FOOD_BEVERAGE_MANAGER_TITLE || 'Food & Beverage Manager',
      phone: import.meta.env.VITE_FOOD_BEVERAGE_MANAGER_PHONE || '+233 XX XXX XXXX',
      department: 'Food & Beverage'
    },
    housekeeping: {
      name: import.meta.env.VITE_HOUSEKEEPING_MANAGER_NAME || 'Housekeeping Manager',
      email: import.meta.env.VITE_HOUSEKEEPING_MANAGER_EMAIL || 'housekeeping@hotel.com',
      title: import.meta.env.VITE_HOUSEKEEPING_MANAGER_TITLE || 'Housekeeping Manager',
      phone: import.meta.env.VITE_HOUSEKEEPING_MANAGER_PHONE || '+233 XX XXX XXXX',
      department: 'Housekeeping'
    },
    security: {
      name: import.meta.env.VITE_SECURITY_MANAGER_NAME || 'Security Manager',
      email: import.meta.env.VITE_SECURITY_MANAGER_EMAIL || 'security@hotel.com',
      title: import.meta.env.VITE_SECURITY_MANAGER_TITLE || 'Security Manager',
      phone: import.meta.env.VITE_SECURITY_MANAGER_PHONE || '+233 XX XXX XXXX',
      department: 'Security'
    },
    frontDesk: {
      name: import.meta.env.VITE_FRONT_DESK_MANAGER_NAME || 'Front Desk Manager',
      email: import.meta.env.VITE_FRONT_DESK_MANAGER_EMAIL || 'frontdesk@hotel.com',
      title: import.meta.env.VITE_FRONT_DESK_MANAGER_TITLE || 'Front Desk Manager',
      phone: import.meta.env.VITE_FRONT_DESK_MANAGER_PHONE || '+233 XX XXX XXXX',
      department: 'Front Desk'
    },
    maintenance: {
      name: import.meta.env.VITE_MAINTENANCE_MANAGER_NAME || 'Maintenance Manager',
      email: import.meta.env.VITE_MAINTENANCE_MANAGER_EMAIL || 'maintenance@hotel.com',
      title: import.meta.env.VITE_MAINTENANCE_MANAGER_TITLE || 'Maintenance Manager',
      phone: import.meta.env.VITE_MAINTENANCE_MANAGER_PHONE || '+233 XX XXX XXXX',
      department: 'Maintenance'
    },
    general: {
      name: import.meta.env.VITE_GENERAL_MANAGER_NAME || 'General Manager',
      email: import.meta.env.VITE_GENERAL_MANAGER_EMAIL || 'manager@hotel.com',
      title: import.meta.env.VITE_GENERAL_MANAGER_TITLE || 'General Manager',
      phone: import.meta.env.VITE_GENERAL_MANAGER_PHONE || '+233 XX XXX XXXX',
      department: 'Management'
    }
  }
}

/**
 * 🎯 PRIMARY: Get manager by feedback category (Database-first)
 */
export const getManagerByCategory = async (category: string, tenantId?: string): Promise<ManagerConfig> => {
  try {
    // Use database-driven configuration
    return await getTenantManagerByCategory(category, tenantId)
  } catch (error) {
    console.warn('Database category lookup failed, using environment variables:', error)
    // Fallback to environment variables
    const managers = getEnvironmentManagerConfigurations()
    return getManagerByCategorySync(category, managers)
  }
}

/**
 * 🔄 SYNCHRONOUS VERSION: For backward compatibility
 */
export const getManagerByCategorySync = (category: string, managers?: ManagerConfigurations): ManagerConfig => {
  const managerConfigs = managers || getEnvironmentManagerConfigurations()

  switch (category.toLowerCase()) {
    case 'food & beverage':
    case 'food':
    case 'restaurant':
    case 'dining':
      return managerConfigs.foodBeverage

    case 'housekeeping':
    case 'room':
    case 'cleaning':
      return managerConfigs.housekeeping

    case 'security':
    case 'safety':
      return managerConfigs.security

    case 'front desk':
    case 'reception':
    case 'check-in':
    case 'check-out':
      return managerConfigs.frontDesk

    case 'maintenance':
    case 'facilities':
    case 'repair':
      return managerConfigs.maintenance

    default:
      return managerConfigs.general
  }
}

/**
 * 🎯 PRIMARY: Get all managers as array (Database-first)
 */
export const getAllManagers = async (tenantId?: string): Promise<ManagerConfig[]> => {
  try {
    // Use database-driven configuration
    return await getAllTenantManagers(tenantId)
  } catch (error) {
    console.warn('Database managers lookup failed, using environment variables:', error)
    // Fallback to environment variables
    return getAllManagersSync()
  }
}

/**
 * 🔄 SYNCHRONOUS VERSION: For backward compatibility
 */
export const getAllManagersSync = (): ManagerConfig[] => {
  const managers = getEnvironmentManagerConfigurations()
  return [
    managers.foodBeverage,
    managers.housekeeping,
    managers.security,
    managers.frontDesk,
    managers.maintenance,
    managers.general
  ]
}

/**
 * 🔍 CHECK PLACEHOLDER EMAILS (Environment variables only)
 * This function remains synchronous and checks environment variables
 */
export const hasPlaceholderEmails = (): boolean => {
  const managers = getEnvironmentManagerConfigurations()
  const placeholderEmails = [
    'basera@btinternet.com',
    'zara80@gmail.com',
    'g.basera80@gmail.com',
    'g.basera5@gmail.com',
    'gizzy@dreampathdigitalsolutions.co.uk'
  ]

  return Object.values(managers).some(manager =>
    placeholderEmails.includes(manager.email)
  )
}

/**
 * 🎯 DATABASE-DRIVEN PLACEHOLDER CHECK
 * Checks if tenant has proper manager configurations in database
 */
export const hasTenantManagerConfigurations = async (tenantId?: string): Promise<boolean> => {
  try {
    const managers = await getTenantManagerConfigurations(tenantId)
    // Check if we have real manager configurations (not just fallbacks)
    return managers.general.email !== 'manager@hotel.com' &&
           managers.general.name !== 'General Manager'
  } catch (error) {
    console.warn('Could not check tenant manager configurations:', error)
    return false
  }
}
