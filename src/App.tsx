import { Routes, Route } from "react-router-dom";
import AppShell from "@/components/layout/AppShell";
import Dashboard from "@/pages/Dashboard";
import ModulePlaceholder from "@/pages/ModulePlaceholder";
import CafeSettings from "@/pages/CafeSettings";
import PointOfSale from "@/pages/PointOfSale";
import Kitchen from "@/pages/Kitchen";
import Reception from "@/pages/Reception";
import Rooms from "@/pages/Rooms";
import Housekeeping from "@/pages/Housekeeping";
import InventoryWorkspace from "@/pages/InventoryWorkspace";
import Products from "@/pages/Products";
import Users from "@/pages/Users";
import ServiceAppointments from "@/pages/ServiceAppointments";
import ServiceMemberships from "@/pages/ServiceMemberships";
import ServicePaymentMethods from "@/pages/ServicePaymentMethods";
import ServiceMembershipPlans from "@/pages/ServiceMembershipPlans";
import ServiceMembershipPayments from "@/pages/ServiceMembershipPayments";
import ServiceProviders from "@/pages/ServiceProviders";
import ServiceSchedules from "@/pages/ServiceSchedules";
import { navigation } from "@/config/navigation";

const implementedRoutes = new Set([
  "/",
  "/settings",
  "/pos",
  "/kitchen",
  "/reservations",
  "/rooms",
  "/housekeeping",
  "/store",
  "/products",
  "/users",
  "/service-center/appointments",
  "/service-center/memberships",
  "/service-center/payment-methods",
  "/service-center/membership-plans",
  "/service-center/membership-payments",
  "/service-center/providers",
  "/service-center/schedules",
]);

const moduleRoutes = navigation
  .flatMap((g) => g.items)
  .filter((item) => !implementedRoutes.has(item.href));

function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/settings" element={<CafeSettings />} />
        <Route path="/pos" element={<PointOfSale />} />
        <Route path="/kitchen" element={<Kitchen />} />
        <Route path="/reservations" element={<Reception />} />
        <Route path="/rooms" element={<Rooms />} />
        <Route path="/housekeeping" element={<Housekeeping />} />
        <Route path="/store" element={<InventoryWorkspace view="stores" />} />
        <Route path="/products" element={<Products />} />
        <Route path="/users" element={<Users />} />
        <Route
          path="/service-center/appointments"
          element={<ServiceAppointments />}
        />
        <Route
          path="/service-center/memberships"
          element={<ServiceMemberships />}
        />
        <Route
          path="/service-center/payment-methods"
          element={<ServicePaymentMethods />}
        />
        <Route
          path="/service-center/membership-plans"
          element={<ServiceMembershipPlans />}
        />
        <Route
          path="/service-center/membership-payments"
          element={<ServiceMembershipPayments />}
        />
        <Route
          path="/service-center/providers"
          element={<ServiceProviders />}
        />
        <Route
          path="/service-center/schedules"
          element={<ServiceSchedules />}
        />
        {moduleRoutes.map((item) => (
          <Route
            key={item.href}
            path={item.href}
            element={<ModulePlaceholder />}
          />
        ))}
      </Route>
    </Routes>
  );
}

export default App;
