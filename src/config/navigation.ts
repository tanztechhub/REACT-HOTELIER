import type { IconType } from 'react-icons'
import {
  LuLayoutDashboard,
  LuShoppingCart,
  LuChefHat,
  LuPackage,
  LuUsers,
  LuBedDouble,
  LuCalendarCheck,
  LuSparkles,
  LuWarehouse,
  LuWine,
  LuBriefcase,
  LuWallet,
  LuChartColumn,
  LuSettings,
  LuUserCog,
} from 'react-icons/lu'

export interface NavItem {
  label: string
  href: string
  icon: IconType
  moduleKey?: string
}

export interface NavGroup {
  label: string
  items: NavItem[]
}

export const navigation: NavGroup[] = [
  {
    label: 'Overview',
    items: [{ label: 'Dashboard', href: '/', icon: LuLayoutDashboard }],
  },
  {
    label: 'Operations',
    items: [
      { label: 'Point of Sale', href: '/pos', icon: LuShoppingCart, moduleKey: 'POS' },
      { label: 'Kitchen', href: '/kitchen', icon: LuChefHat, moduleKey: 'KITCHEN' },
      { label: 'Bar & Lounge', href: '/bar-lounge', icon: LuWine, moduleKey: 'BAR_LOUNGE' },
      { label: 'Rooms', href: '/rooms', icon: LuBedDouble, moduleKey: 'ROOMS' },
      { label: 'Reception', href: '/reservations', icon: LuCalendarCheck, moduleKey: 'RESERVATIONS' },
      { label: 'Housekeeping', href: '/housekeeping', icon: LuSparkles, moduleKey: 'HOUSEKEEPING' },
    ],
  },
  {
    label: 'Inventory',
    items: [
      { label: 'Products', href: '/products', icon: LuPackage, moduleKey: 'PRODUCTS' },
      { label: 'Store', href: '/store', icon: LuWarehouse, moduleKey: 'STORE' },
    ],
  },
  {
    label: 'Management',
    items: [
      { label: 'Customers', href: '/customers', icon: LuUsers, moduleKey: 'CUSTOMERS' },
      { label: 'HR', href: '/hr', icon: LuBriefcase, moduleKey: 'HR' },
      { label: 'Accounting', href: '/accounting', icon: LuWallet, moduleKey: 'ACCOUNTING' },
      { label: 'Reports', href: '/reports', icon: LuChartColumn, moduleKey: 'REPORTS' },
    ],
  },
  {
    label: 'System',
    items: [
      { label: 'Users', href: '/users', icon: LuUserCog },
      { label: 'Settings', href: '/settings', icon: LuSettings },
    ],
  },
]
