import { Outlet } from "react-router-dom";

const AuthLayout = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-dark to-primary flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-xl overflow-hidden">
          <div className="p-6">
            <div className="text-center">
              <img className="w-full h-10 object-contain" src="/homiqly-logo.png" alt="logo" />
              {/* <h1 className="text-3xl font-bold text-primary-dark">Homiqly</h1> */}
              {/* <p className="text-gray-600">Admin Panel</p> */}
            </div>
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
