// Manager Configuration from Environment Variables
// This allows easy updates without code changes - just update .env file!

export interface ManagerConfig {
  name: string
  email: string
  title: string
  phone: string
  department: string
}

export interface ManagerConfigurations {
  foodBeverage: ManagerConfig
  housekeeping: ManagerConfig
  security: ManagerConfig
  frontDesk: ManagerConfig
  maintenance: ManagerConfig
  general: ManagerConfig
}

// Get manager configurations from environment variables
export const getManagerConfigurations = (): ManagerConfigurations => {
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

// Get manager by feedback category
export const getManagerByCategory = (category: string): ManagerConfig => {
  const managers = getManagerConfigurations()
  
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

// Get all managers as array for display
export const getAllManagers = (): ManagerConfig[] => {
  const managers = getManagerConfigurations()
  return [
    managers.foodBeverage,
    managers.housekeeping,
    managers.security,
    managers.frontDesk,
    managers.maintenance,
    managers.general
  ]
}

// Check if manager emails are still placeholders
export const hasPlaceholderEmails = (): boolean => {
  const managers = getManagerConfigurations()
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
