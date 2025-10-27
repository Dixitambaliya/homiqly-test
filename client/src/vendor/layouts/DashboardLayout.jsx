import { useState, useEffect } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { useVendorAuth } from "../contexts/VendorAuthContext";
import { HeaderMenu } from "../../shared/components/Header";
import NotificationIcon from "../components/NotificationIcon";
import api from "../../lib/axiosConfig"; // ✅ your axios instance
import { Calendar, CreditCard, HelpCircle, Home, Loader, Loader2, Menu, ShoppingBag, Star, User, X } from "lucide-react";

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
      icon: <Home className="w-5 h-5" />,
    },
    {
      path: "/vendor/calendar",
      name: "Calendar",
      icon: <Calendar className="w-5 h-5" />,
    },
    {
      path: "/vendor/profile",
      name: "Profile",
      icon: <User className="w-5 h-5" />,
    },
    {
      path: "/vendor/services",
      name: "Apply for Services",
      icon: <ShoppingBag className="w-5 h-5" />,
    },
    {
      path: "/vendor/bookings",
      name: "Bookings",
      icon: <ShoppingBag className="w-5 h-5" />,
    },
    // { path: "/vendor/supply-kits", name: "Supply Kits", icon: <FiBox className="w-5 h-5" /> },

    // ✅ Show Employees only if vendorType !== "individual"
    ...(vendorType !== "individual"
      ? [
          {
            path: "/vendor/employees",
            name: "Employees",
            icon: <User className="w-5 h-5" />,
          },
        ]
      : []),

    {
      path: "/vendor/payments",
      name: "Payments",
      icon: <CreditCard className="w-5 h-5" />,
    },
    {
      path: "/vendor/ratings",
      name: "Ratings",
      icon: <Star className="w-5 h-5" />,
    },
    {
      path: "/vendor/support",
      name: "Support",
      icon: <HelpCircle className="w-5 h-5" />,
    },
    {
      path: "/vendor/accountdetails",
      name: "Bank account details",
      icon: <CreditCard className="w-5 h-5" />,
    },
  ];

  const getPageTitle = () => {
    const currentPath = location.pathname;
    const menuItem = menuItems.find((item) => item.path === currentPath);
    return menuItem ? menuItem.name : "Dashboard";
  };

  // Toggle sidebar
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // Close mobile menu
  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
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
      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 z-20 bg-black bg-opacity-50 lg:hidden"
          onClick={closeMobileMenu}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`bg-background text-text-primary fixed inset-y-0 left-0 z-30 transform transition-all duration-300 ease-in-out lg:static lg:inset-0 ${
          sidebarOpen ? "w-64" : "w-20"
        } ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className={`px-6 py-8 border-b border-white/10 ${!sidebarOpen && 'px-4'}`}>
            <div className={`flex items-center ${!sidebarOpen ? 'justify-center' : 'justify-between'}`}>
              {sidebarOpen ? (
                <>
                  <h2 className="text-2xl font-bold">Homiqly</h2>
                </>
              ) : (
                ""
              )}
            </div>
            {sidebarOpen && (
              <p className="mt-2 text-sm opacity-80">Vendor Panel</p>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-2 py-4 overflow-y-auto">
            <ul className="space-y-1">
              {menuItems.map((item) => (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    onClick={closeMobileMenu}
                    className={`flex items-center px-6 py-3 text-sm font-medium border-1 rounded-md ${
                      location.pathname === item.path
                        ? "bg-primary-light/15 text-primary"
                        : "border-transparent text-text-muted hover:bg-backgroundTertiary/50 hover:text-text-primary"
                    } ${!sidebarOpen ? 'justify-center px-4' : ''}`}
                    title={!sidebarOpen ? item.name : ""}
                  >
                    <span className={`${sidebarOpen ? 'mr-3' : ''}`}>
                      {item.icon}
                    </span>
                    {sidebarOpen && item.name}
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
        <header className="z-10 bg-white shadow-sm">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center">
              {/* Desktop sidebar toggle */}
              <button
                onClick={toggleSidebar}
                className="hidden p-2 text-gray-500 rounded-md lg:block hover:text-gray-700 focus:outline-none hover:bg-gray-100"
              >
                <Menu className="w-6 h-6 " />
              </button>
              
              {/* Mobile menu toggle */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="text-gray-500 lg:hidden hover:text-gray-700 focus:outline-none"
              >
                {mobileMenuOpen ? (
                  <X className="w-6 h-6" />
                ) : (
                  <Menu className="w-6 h-6" />
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
        <main className="flex-1 p-6 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;