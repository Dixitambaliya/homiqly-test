import { useState, useEffect } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { useVendorAuth } from "../contexts/VendorAuthContext";
import { FiHelpCircle, FiMenu, FiX } from "react-icons/fi";
import {
  FiHome,
  FiCalendar,
  FiShoppingBag,
  FiBox,
  FiCreditCard,
  FiStar,
  FiUser,
} from "react-icons/fi";
import { HeaderMenu } from "../../shared/components/Header";
import NotificationIcon from "../components/NotificationIcon";
import api from "../../lib/axiosConfig"; // ✅ your axios instance
import { Loader, Loader2 } from "lucide-react";

const DashboardLayout = () => {
  const { currentUser, logout } = useVendorAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [vendorType, setVendorType] = useState(null); // ✅ track vendor type
  const [loading, setLoading] = useState(true);

  const handleLogout = () => {
    logout();
    navigate("/vendor/login");
  };

  // ✅ Fetch vendor profile
  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/vendor/getprofile");
      const profile = res.data.profile;
      setVendorType(profile.vendorType); // save vendorType
    } catch (error) {
      console.error("Failed to fetch profile", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  // ✅ Sidebar menu items
  const menuItems = [
    {
      path: "/vendor/dashboard",
      name: "Dashboard",
      icon: <FiHome className="w-5 h-5" />,
    },
    {
      path: "/vendor/calendar",
      name: "Calendar",
      icon: <FiCalendar className="w-5 h-5" />,
    },
    {
      path: "/vendor/profile",
      name: "Profile",
      icon: <FiUser className="w-5 h-5" />,
    },
    {
      path: "/vendor/services",
      name: "Apply for Services",
      icon: <FiShoppingBag className="w-5 h-5" />,
    },
    {
      path: "/vendor/bookings",
      name: "Bookings",
      icon: <FiShoppingBag className="w-5 h-5" />,
    },
    // { path: "/vendor/supply-kits", name: "Supply Kits", icon: <FiBox className="w-5 h-5" /> },

    // ✅ Show Employees only if vendorType !== "individual"
    ...(vendorType !== "individual"
      ? [
          {
            path: "/vendor/employees",
            name: "Employees",
            icon: <FiUser className="w-5 h-5" />,
          },
        ]
      : []),

    {
      path: "/vendor/payments",
      name: "Payments",
      icon: <FiCreditCard className="w-5 h-5" />,
    },
    {
      path: "/vendor/ratings",
      name: "Ratings",
      icon: <FiStar className="w-5 h-5" />,
    },
    {
      path: "/vendor/support",
      name: "Support",
      icon: <FiHelpCircle className="w-5 h-5" />,
    },
    {
      path: "/vendor/accountdetails",
      name: "Bank account details",
      icon: <FiCreditCard className="w-5 h-5" />,
    },
  ];

  const getPageTitle = () => {
    const currentPath = location.pathname;
    const menuItem = menuItems.find((item) => item.path === currentPath);
    return menuItem ? menuItem.name : "Dashboard";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen gap-2">
        <Loader2 className="animate-spin" />
        Loading...
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside
        className={`bg-background text-text-primary fixed inset-y-0 left-0 z-30 w-64 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          <div className="px-6 py-8 border-b border-white/10">
            <h2 className="text-2xl font-bold">Homiqly</h2>
            <p className="text-sm opacity-80">Vendor Panel</p>
          </div>

          <nav className="flex-1 py-4 px-2 overflow-y-auto">
            <ul className="space-y-1">
              {menuItems.map((item) => (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={`flex items-center px-6 py-3 text-sm font-medium border-1 rounded-md ${
                      location.pathname === item.path
                        ? "bg-primary-light/15 text-primary"
                        : "border-transparent text-text-muted hover:bg-backgroundTertiary/50 hover:text-text-primary"
                    }`}
                  >
                    <span className="mr-3">{item.icon}</span>
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Header */}
        <header className="bg-white shadow-sm z-10">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="hidden lg:block text-gray-500 focus:outline-none"
              >
                <FiMenu className="w-6 h-6" />
              </button>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden text-gray-500 focus:outline-none"
              >
                {mobileMenuOpen ? (
                  <FiX className="w-6 h-6" />
                ) : (
                  <FiMenu className="w-6 h-6" />
                )}
              </button>
              <h1 className="ml-4 text-xl font-semibold text-gray-800">
                {getPageTitle()}
              </h1>
            </div>

            <div className="flex items-center space-x-4">
              <HeaderMenu
                userName={currentUser?.name || "Vendor User"}
                userRole={currentUser?.vendor_type || "vendor"}
                onLogout={handleLogout}
                profilePath="/vendor/profile"
                settingsPath="/vendor/settings"
              />
              <NotificationIcon />
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
