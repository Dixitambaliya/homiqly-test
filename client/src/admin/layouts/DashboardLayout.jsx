import React, { useState } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { useAdminAuth } from "../contexts/AdminAuthContext";
import { FiHelpCircle, FiMenu, FiStar, FiX } from "react-icons/fi";
import {
  FiHome,
  FiUsers,
  FiUserCheck,
  FiShoppingBag,
  FiCalendar,
  FiBox,
  FiTool,
  FiUserPlus,
  FiCreditCard,
  FiBarChart2,
  FiBell,
  FiChevronDown,
  FiChevronRight,
} from "react-icons/fi";
import { HeaderMenu } from "../../shared/components/Header";
import NotificationIcon from "../components/NotificationIcon";
import { IconButton } from "../../shared/components/Button";

const DashboardLayout = () => {
  const { currentUser, logout } = useAdminAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true); // show/hide on small screens
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false); // collapse on large screens
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openSubmenu, setOpenSubmenu] = useState(null);

  const handleLogout = () => {
    logout();
    navigate("/admin/login");
  };

  const menuItems = [
    {
      path: "/admin/dashboard",
      name: "Dashboard",
      icon: <FiHome className="w-5 h-5" />,
    },
    {
      path: "/admin/vendors",
      name: "Vendors",
      icon: <FiUserCheck className="w-5 h-5" />,
    },
    {
      path: "/admin/users",
      name: "Users",
      icon: <FiUsers className="w-5 h-5" />,
    },
    {
      path: "/admin/services",
      name: "Services",
      icon: <FiShoppingBag className="w-5 h-5" />,
    },
    {
      path: "/admin/packages",
      name: "Packages",
      icon: <FiShoppingBag className="w-5 h-5" />,
    },
    {
      path: "/admin/bookings",
      name: "Bookings",
      icon: <FiCalendar className="w-5 h-5" />,
    },
    {
      path: "/admin/employees",
      name: "Employees",
      icon: <FiUserPlus className="w-5 h-5" />,
    },
    {
      path: "/admin/payments",
      name: "Payments",
      icon: <FiCreditCard className="w-5 h-5" />,
    },
    {
      path: "/admin/analytics",
      name: "Analytics",
      icon: <FiBarChart2 className="w-5 h-5" />,
    },
    {
      path: "/admin/vendor-applications",
      name: "Vendor Applications",
      icon: <FiUsers className="w-5 h-5" />,
    },
    {
      path: "/admin/rating",
      name: "Rating",
      icon: <FiStar className="w-5 h-5" />,
      children: [
        {
          path: "/admin/rating/user",
          name: "User Ratings",
        },
        {
          path: "/admin/rating/vendor",
          name: "Vendor Ratings",
        },
        {
          path: "/admin/rating/package",
          name: "Package Ratings",
        },
      ],
    },
    {
      path: "/admin/notifications",
      name: "Notifications",
      icon: <FiBell className="w-5 h-5" />,
    },
    {
      path: "/admin/tickets",
      name: "Support Tickets",
      icon: <FiHelpCircle className="w-5 h-5" />,
    },
    {
      path: "/admin/settings",
      name: "Settings",
      icon: <FiTool className="w-5 h-5" />,
      children: [
        {
          path: "/admin/promocodes",
          name: "Promo Codes",
        },
        {
          path: "/admin/settings/platform-tax",
          name: "Platform Tax",
        },
        {
          path: "/admin/settings/general",
          name: "General Settings",
        },
        {
          path: "/admin/settings/platform-fees",
          name: "Platform Fees",
        },
        {
          path: "/admin/settings/city",
          name: "Add City",
        },
      ],
    },
  ];

  const getPageTitle = () => {
    const currentPath = location.pathname;
    const menuItem = menuItems.find((item) => item.path === currentPath);
    return menuItem ? menuItem.name : "Dashboard";
  };

  // computed inline style for main content to account for sidebar width
  const mainMarginLeft = sidebarOpen
    ? sidebarCollapsed
      ? "5rem" // w-20
      : "16rem" // w-64
    : "0";

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar for desktop */}
      <aside
        className={`bg-background text-text-primary fixed inset-y-0 left-0 z-30 transform transition-all duration-300 ease-in-out ${
          sidebarOpen ? "" : "-translate-x-full lg:translate-x-0"
        }`}
        style={{ width: sidebarCollapsed ? 70 : 256 }}
      >
        <div className="flex flex-col h-full">
          <div className="px-4 py-4 border-b border-white/10 flex items-center justify-between">
            <div className="flex flex-col items-center gap-3">
              <h2
                className={`text-2xl font-bold truncate ${
                  sidebarCollapsed ? "opacity-0 pointer-events-none" : ""
                }`}
              >
                Homiqly
              </h2>
              <p
                className={`text-sm  truncate ${
                  sidebarCollapsed ? "opacity-0 pointer-events-none" : ""
                }`}
              >
                Admin Panel
              </p>
            </div>

            {/* collapse/expand button for large screens */}
            <div className="flex items-center gap-2">
              {/* <button
                onClick={() => setSidebarCollapsed((s) => !s)}
                className="hidden lg:inline-flex items-center justify-center p-2 rounded-md text-gray-500 hover:bg-backgroundTertiary/20 focus:outline-none"
                title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                <FiMenu className="w-5 h-5" />
              </button> */}

              {/* show/hide on small screens */}
              {/* <button
                onClick={() => setSidebarOpen((s) => !s)}
                className="lg:hidden inline-flex items-center justify-center p-2 rounded-md text-gray-500 hover:bg-backgroundTertiary/20 focus:outline-none"
                title={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
              >
                {sidebarOpen ? (
                  <FiX className="w-5 h-5" />
                ) : (
                  <FiMenu className="w-5 h-5" />
                )}
              </button> */}
            </div>
          </div>

          <nav className="flex-1 px-2 py-4 overflow-y-auto">
            <ul className="space-y-1">
              {menuItems.map((item) => (
                <li key={item.path}>
                  {item.children ? (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          setOpenSubmenu(
                            openSubmenu === item.name ? null : item.name
                          )
                        }
                        className={`w-full flex items-center justify-between px-4 py-3 text-sm font-medium rounded-md transition-colors ${
                          location.pathname.startsWith(item.path)
                            ? "bg-primary-light/15 text-primary"
                            : "text-text-muted hover:bg-backgroundTertiary/50 hover:text-text-primary"
                        }`}
                      >
                        <span className="flex items-center">
                          <span className="mr-3 flex-shrink-0">
                            {item.icon}
                          </span>
                          <span
                            className={`${sidebarCollapsed ? "hidden" : ""}`}
                          >
                            {item.name}
                          </span>
                        </span>
                        {!sidebarCollapsed &&
                          (openSubmenu === item.name ? (
                            <FiChevronDown className="w-4 h-4" />
                          ) : (
                            <FiChevronRight className="w-4 h-4" />
                          ))}
                      </button>

                      {/* hide children when collapsed */}
                      {!sidebarCollapsed && (
                        <ul
                          className={`ml-8 border-l border-gray-300 transition-all duration-300 overflow-hidden ${
                            openSubmenu === item.name ? "max-h-60" : "max-h-0"
                          }`}
                        >
                          {item.children.map((child, idx) => (
                            <li key={child.path} className="relative pl-6 py-1">
                              <Link
                                to={child.path}
                                className={`relative block py-2 pl-5 text-sm rounded-md transition before:content-[''] before:absolute before:top-1/2 before:left-[-1.5rem] before:-translate-y-1/2 before:w-4 before:h-px before:bg-gray-300 ${
                                  location.pathname === child.path
                                    ? "text-primary bg-primary-light/10"
                                    : "text-text-muted hover:text-text-primary hover:bg-backgroundTertiary/30"
                                }`}
                              >
                                {child.name}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      )}
                    </>
                  ) : (
                    <Link
                      to={item.path}
                      className={`flex items-center px-4 py-3 text-sm font-medium rounded-md transition-colors ${
                        location.pathname === item.path
                          ? "bg-primary-light/15 text-primary"
                          : "text-text-muted hover:bg-backgroundTertiary/50 hover:text-text-primary"
                      }`}
                    >
                      <span className="mr-3 flex-shrink-0">{item.icon}</span>
                      <span className={`${sidebarCollapsed ? "hidden" : ""}`}>
                        {item.name}
                      </span>
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </aside>

      {/* Main content */}
      <div
        className="flex flex-col flex-1 overflow-hidden"
        style={{ marginLeft: mainMarginLeft }}
      >
        {/* Top header */}
        <header className="bg-white shadow-sm z-10">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center">
              <IconButton
                variant="ghost"
                className="rounded hidden md:block"
                onClick={() => setSidebarCollapsed((s) => !s)}
                title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                icon={<FiMenu className="w-5 h-5" />}
              ></IconButton>
              <IconButton
                onClick={() => setMobileMenuOpen((m) => !m)}
                className="lg:hidden text-gray-500 focus:outline-none ml-2"
                icon={
                  mobileMenuOpen ? (
                    <FiX className="w-6 h-6" />
                  ) : (
                    <FiMenu className="w-6 h-6" />
                  )
                }
              ></IconButton>
              <h1 className="ml-4 text-xl font-semibold text-gray-800">
                {getPageTitle()}
              </h1>
            </div>

            <div className="flex items-center space-x-4">
              <HeaderMenu
                userName={currentUser?.name || "Admin User"}
                userRole={currentUser?.role || "admin"}
                onLogout={handleLogout}
                profilePath="/admin/profile"
                settingsPath="/admin/settings"
              />
              <NotificationIcon />
            </div>
          </div>

          {/* Mobile menu */}
          {mobileMenuOpen && (
            <nav className="lg:hidden bg-white border-t border-gray-200">
              <ul className="px-2 py-3 space-y-1">
                {menuItems.map((item) => (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                        location.pathname === item.path
                          ? "bg-primary text-white"
                          : "text-gray-700 hover:bg-gray-100"
                      }`}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <span className="mr-3">{item.icon}</span>
                      {item.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          )}
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6 ">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
