import { useEffect, useState } from "react";
import CreateEmployeesModal from "../components/Modals/CreateEmployeesModal";
import EmployeesTable from "../components/Tables/EmployeesTable";
import { Button } from "../../shared/components/Button";
import api from "../../lib/axiosConfig";
import { useNavigate } from "react-router-dom"; // if you're using react-router
import LoadingSpinner from "../../shared/components/LoadingSpinner";

const Employees = () => {
  const [showModal, setShowModal] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);

  // const navigate = useNavigate(); // for redirect (if needed)

  const fetchProfile = async () => {
    try {
      setIsLoading(true);
      const res = await api.get("/api/vendor/getprofile");

      const profile = res.data.profile;
      // console.log("Profile fetched:", profile);

      if (profile.vendorType === "individual") {
        setAccessDenied(true);

        // Optionally redirect:
        // navigate("/not-authorized");
      }
    } catch (error) {
      console.error("Failed to fetch profile", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      setIsLoading(true);
      const res = await api.get("/api/employee/getemployee");
      setEmployees(res.data.employees || []);
    } catch (error) {
      console.error("Failed to fetch employees", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
    fetchEmployees();
  }, []);

  if (accessDenied) {
    return (
      <div className="flex items-center justify-center min-h-screen text-red-600 text-lg font-semibold">
        Access denied. This page is only available for company profiles.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />;
      </div>
    );
  }
  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-semibold">Employees</h1>
        <Button
          type="button"
          variant="secondary"
          onClick={() => setShowModal(true)}
        >
          + Create Employee
        </Button>
      </div>

      <EmployeesTable
        employees={employees}
        isLoading={isLoading}
        onDelete={fetchEmployees}
      />

      <CreateEmployeesModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onEmployeeCreated={fetchEmployees}
      />
    </div>
  );
};

export default Employees;
