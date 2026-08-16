import type { IconType } from 'react-icons'
import {
  LuLayoutDashboard,
  LuLogIn,
  LuBedDouble,
  LuConciergeBell,
  LuUsers,
  LuCreditCard,
  LuFileText,
  LuSignature,
  LuReceipt,
  LuListChecks,
  LuSearch,
  LuShoppingCart,
  LuTable2,
  LuBike,
  LuTruck,
  LuClipboardList,
  LuUtensils,
  LuChefHat,
  LuCalendarCheck,
  LuIdCard,
  LuPackage,
  LuLayers,
  LuWallet,
  LuBriefcase,
  LuCalendarClock,
  LuTags,
  LuWarehouse,
  LuBox,
  LuBookOpen,
  LuPackageCheck,
  LuShoppingBag,
  LuShieldCheck,
  LuBanknote,
  LuArrowLeftRight,
  LuCircleCheck,
  LuChartColumn,
  LuChartBar,
  LuBuilding2,
  LuSettings,
  LuUserCog,
  LuBriefcaseBusiness,
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
    label: 'Reception',
    items: [
      { label: 'Check In', href: '/reservations', icon: LuLogIn, moduleKey: 'RECEPTION' },
      { label: 'Room Management', href: '/rooms', icon: LuBedDouble, moduleKey: 'ROOMS' },
      { label: 'Services', href: '/reception/services', icon: LuConciergeBell },
      { label: 'Customers', href: '/reception/customers', icon: LuUsers },
      { label: 'Payment Methods', href: '/reception/payment-methods', icon: LuCreditCard },
      { label: 'Invoices', href: '/reception/invoices', icon: LuFileText },
      { label: 'Quotations', href: '/reception/quotations', icon: LuSignature },
      { label: 'Daily Expenses', href: '/reception/daily-expenses', icon: LuReceipt },
    ],
  },
  {
    label: 'Housekeeping',
    items: [
      { label: 'Tasks', href: '/housekeeping', icon: LuListChecks, moduleKey: 'HOUSEKEEPING' },
      { label: 'Room Management', href: '/housekeeping/room-management', icon: LuBedDouble },
      { label: 'Customers', href: '/housekeeping/customers', icon: LuUsers },
      { label: 'Lost and Found', href: '/housekeeping/lost-and-found', icon: LuSearch },
    ],
  },
  {
    label: 'Sales',
    items: [
      { label: 'Point of Sale', href: '/pos', icon: LuShoppingCart, moduleKey: 'POS' },
      { label: 'Tables', href: '/sales/tables', icon: LuTable2 },
      { label: 'Customers', href: '/sales/customers', icon: LuUsers },
      { label: 'Riders', href: '/sales/riders', icon: LuBike },
      { label: 'Deliveries', href: '/sales/deliveries', icon: LuTruck },
      { label: 'Payment Methods', href: '/sales/payment-methods', icon: LuCreditCard },
    ],
  },
  {
    label: 'Kitchen',
    items: [
      { label: 'Active Orders', href: '/kitchen', icon: LuClipboardList, moduleKey: 'KITCHEN' },
      { label: 'Menu and Addons', href: '/kitchen/menu-addons', icon: LuUtensils },
      { label: 'Recipes', href: '/kitchen/recipes', icon: LuChefHat },
      { label: 'Daily Expenses', href: '/kitchen/daily-expenses', icon: LuReceipt },
    ],
  },
  {
    label: 'Service Center',
    items: [
      { label: 'Point of Sale', href: '/service-center/pos', icon: LuShoppingCart, moduleKey: 'SERVICE_CENTER' },
      { label: 'Services', href: '/service-center/services', icon: LuConciergeBell },
      { label: 'Appointments', href: '/service-center/appointments', icon: LuCalendarCheck },
      { label: 'Memberships', href: '/service-center/memberships', icon: LuIdCard },
      { label: 'Products', href: '/service-center/products', icon: LuPackage },
      { label: 'Payment Methods', href: '/service-center/payment-methods', icon: LuCreditCard },
      { label: 'Customers', href: '/service-center/customers', icon: LuUsers },
      { label: 'Membership Plans', href: '/service-center/membership-plans', icon: LuLayers },
      { label: 'Membership Payments', href: '/service-center/membership-payments', icon: LuWallet },
      { label: 'Providers', href: '/service-center/providers', icon: LuBriefcase },
      { label: 'Schedules', href: '/service-center/schedules', icon: LuCalendarClock },
    ],
  },
  {
    label: 'Inventory',
    items: [
      { label: 'Categories', href: '/inventory/categories', icon: LuTags, moduleKey: 'INVENTORY' },
      { label: 'Store', href: '/store', icon: LuWarehouse, moduleKey: 'STORE' },
      { label: 'Assets', href: '/inventory/assets', icon: LuBox },
      { label: 'Stock Ledger', href: '/inventory/stock-ledger', icon: LuBookOpen },
      { label: 'Goods Received', href: '/inventory/goods-received', icon: LuPackageCheck },
      { label: 'Suppliers', href: '/inventory/suppliers', icon: LuTruck },
      { label: 'Purchases', href: '/inventory/purchases', icon: LuShoppingBag },
      { label: 'Daily Expenses', href: '/inventory/daily-expenses', icon: LuReceipt },
    ],
  },
  {
    label: 'Team',
    items: [
      { label: 'Employees', href: '/team/employees', icon: LuUsers, moduleKey: 'HR' },
      { label: 'Roles and Permissions', href: '/team/roles-permissions', icon: LuShieldCheck },
    ],
  },
  {
    label: 'Finance',
    items: [
      { label: 'Expenses', href: '/finance/expenses', icon: LuWallet, moduleKey: 'ACCOUNTING' },
      { label: 'Salaries', href: '/finance/salaries', icon: LuBanknote },
      { label: 'Transactions', href: '/finance/transactions', icon: LuArrowLeftRight },
      { label: 'Approvals', href: '/finance/approvals', icon: LuCircleCheck },
    ],
  },
  {
    label: 'Reports',
    items: [
      { label: 'Sales Report', href: '/reports', icon: LuChartColumn, moduleKey: 'REPORTS' },
      { label: 'Inventory', href: '/reports/inventory', icon: LuChartBar },
      { label: 'Hotel', href: '/reports/hotel', icon: LuBuilding2 },
    ],
  },
  {
    label: 'System',
    items: [
      { label: 'Business Information', href: '/business-information', icon: LuBriefcaseBusiness },
      { label: 'Users', href: '/users', icon: LuUserCog },
      { label: 'Settings', href: '/settings', icon: LuSettings },
    ],
  },
]
