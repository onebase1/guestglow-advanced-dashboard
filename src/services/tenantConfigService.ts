/**
 * 🏢 TENANT CONFIGURATION SERVICE
 * 
 * Database-driven tenant configuration system that replaces environment variables
 * - Scalable: Works for unlimited tenants without code changes
 * - Secure: Uses tenant-scoped database queries with RLS
 * - Maintainable: Single source of truth in database
 * - Fallback: Graceful degradation to environment variables if database unavailable
 */

import { supabase } from '@/integrations/supabase/client'
import { getCurrentUserTenantId } from '@/utils/tenant'

export interface ManagerConfig {
  id?: string
  name: string
  email: string
  title: string
  phone: string
  department: string
  is_primary?: boolean
  is_active?: boolean
  whatsapp_number?: string
  notification_preferences?: {
    email: boolean
    whatsapp: boolean
    sms: boolean
  }
}

export interface ManagerConfigurations {
  foodBeverage: ManagerConfig
  housekeeping: ManagerConfig
  security: ManagerConfig
  frontDesk: ManagerConfig
  maintenance: ManagerConfig
  general: ManagerConfig
}

export interface TenantBrandingConfig {
  name: string
  logo_url?: string
  primary_color: string
  secondary_color: string
  contact_email: string
  contact_phone?: string
}

/**
 * 🎯 GET TENANT MANAGER CONFIGURATIONS FROM DATABASE
 * Replaces environment variable approach with database-driven configuration
 */
export const getTenantManagerConfigurations = async (tenantId?: string): Promise<ManagerConfigurations> => {
  try {
    // Get tenant ID if not provided
    const targetTenantId = tenantId || await getCurrentUserTenantId()
    
    if (!targetTenantId) {
      console.warn('No tenant ID available, falling back to environment variables')
      return getEnvironmentManagerConfigurations()
    }

    // Query database for manager configurations
    const { data: managers, error } = await supabase
      .from('manager_configurations')
      .select('*')
      .eq('tenant_id', targetTenantId)
      .eq('is_active', true)
      .order('is_primary', { ascending: false })

    if (error) {
      console.warn('Database query failed, falling back to environment variables:', error)
      return getEnvironmentManagerConfigurations()
    }

    if (!managers || managers.length === 0) {
      console.warn('No managers found in database, falling back to environment variables')
      return getEnvironmentManagerConfigurations()
    }

    // Map database managers to expected structure
    const managerMap: Partial<ManagerConfigurations> = {}
    
    managers.forEach(manager => {
      const config: ManagerConfig = {
        id: manager.id,
        name: manager.name,
        email: manager.email,
        title: manager.title,
        phone: manager.phone || '+233 XX XXX XXXX',
        department: manager.department,
        is_primary: manager.is_primary,
        is_active: manager.is_active,
        whatsapp_number: manager.whatsapp_number,
        notification_preferences: manager.notification_preferences
      }

      // Map departments to expected keys
      switch (manager.department.toLowerCase()) {
        case 'food & beverage':
        case 'food and beverage':
        case 'f&b':
          managerMap.foodBeverage = config
          break
        case 'housekeeping':
          managerMap.housekeeping = config
          break
        case 'security':
          managerMap.security = config
          break
        case 'front desk':
        case 'reception':
          managerMap.frontDesk = config
          break
        case 'maintenance':
          managerMap.maintenance = config
          break
        case 'management':
        case 'general':
        default:
          if (!managerMap.general || manager.is_primary) {
            managerMap.general = config
          }
          break
      }
    })

    // Fill missing departments with general manager or fallback
    const generalManager = managerMap.general || managers.find(m => m.is_primary) || managers[0]
    const fallbackConfig = generalManager ? {
      id: generalManager.id,
      name: generalManager.name,
      email: generalManager.email,
      title: generalManager.title,
      phone: generalManager.phone || '+233 XX XXX XXXX',
      department: generalManager.department
    } : getDefaultManagerConfig()

    return {
      foodBeverage: managerMap.foodBeverage || fallbackConfig,
      housekeeping: managerMap.housekeeping || fallbackConfig,
      security: managerMap.security || fallbackConfig,
      frontDesk: managerMap.frontDesk || fallbackConfig,
      maintenance: managerMap.maintenance || fallbackConfig,
      general: managerMap.general || fallbackConfig
    }

  } catch (error) {
    console.error('Error fetching tenant manager configurations:', error)
    return getEnvironmentManagerConfigurations()
  }
}

/**
 * 🎯 GET MANAGER BY FEEDBACK CATEGORY
 * Database-driven category routing with intelligent fallback
 */
export const getTenantManagerByCategory = async (category: string, tenantId?: string): Promise<ManagerConfig> => {
  try {
    const managers = await getTenantManagerConfigurations(tenantId)
    
    switch (category.toLowerCase()) {
      case 'food & beverage':
      case 'food':
      case 'restaurant':
      case 'dining':
        return managers.foodBeverage
        
      case 'housekeeping':
      case 'room':
      case 'cleaning':
        return managers.housekeeping
        
      case 'security':
      case 'safety':
        return managers.security
        
      case 'front desk':
      case 'reception':
      case 'check-in':
      case 'check-out':
        return managers.frontDesk
        
      case 'maintenance':
      case 'facilities':
      case 'repair':
        return managers.maintenance
        
      default:
        return managers.general
    }
  } catch (error) {
    console.error('Error getting manager by category:', error)
    // Fallback to environment variables
    const envManagers = getEnvironmentManagerConfigurations()
    return getManagerByCategory(category, envManagers)
  }
}

/**
 * 🎯 GET ALL TENANT MANAGERS AS ARRAY
 */
export const getAllTenantManagers = async (tenantId?: string): Promise<ManagerConfig[]> => {
  try {
    const managers = await getTenantManagerConfigurations(tenantId)
    return [
      managers.foodBeverage,
      managers.housekeeping,
      managers.security,
      managers.frontDesk,
      managers.maintenance,
      managers.general
    ]
  } catch (error) {
    console.error('Error getting all tenant managers:', error)
    const envManagers = getEnvironmentManagerConfigurations()
    return [
      envManagers.foodBeverage,
      envManagers.housekeeping,
      envManagers.security,
      envManagers.frontDesk,
      envManagers.maintenance,
      envManagers.general
    ]
  }
}

/**
 * 🔄 FALLBACK: Environment Variable Configuration
 * Maintains backward compatibility
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

const getManagerByCategory = (category: string, managers: ManagerConfigurations): ManagerConfig => {
  switch (category.toLowerCase()) {
    case 'food & beverage':
    case 'food':
    case 'restaurant':
    case 'dining':
      return managers.foodBeverage
    case 'housekeeping':
    case 'room':
    case 'cleaning':
      return managers.housekeeping
    case 'security':
    case 'safety':
      return managers.security
    case 'front desk':
    case 'reception':
    case 'check-in':
    case 'check-out':
      return managers.frontDesk
    case 'maintenance':
    case 'facilities':
    case 'repair':
      return managers.maintenance
    default:
      return managers.general
  }
}

const getDefaultManagerConfig = (): ManagerConfig => ({
  name: 'Hotel Manager',
  email: 'manager@hotel.com',
  title: 'Manager',
  phone: '+233 XX XXX XXXX',
  department: 'Management'
})
