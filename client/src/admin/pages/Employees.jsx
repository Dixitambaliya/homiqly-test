import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { FiEye, FiX } from "react-icons/fi";
import LoadingSpinner from "../../shared/components/LoadingSpinner";
import EmployeesTable from "../components/Tables/EmployeesTable";

const Employees = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("adminToken");
      const response = await axios.get("/api/admin/getallemployees", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setEmployees(response.data.employees || []);
    } catch (error) {
      console.error("Error fetching employees:", error);
      setError("Failed to load employees");
    } finally {
      setLoading(false);
    }
  };

  const viewEmployeeDetails = (employee) => {
    setSelectedEmployee(employee);
    setShowDetailsModal(true);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 p-4 rounded-md">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">
          Employee Management
        </h2>
      </div>

      <EmployeesTable
        employees={employees}
        isLoading={loading}
        onViewEmployee={viewEmployeeDetails}
      />

      {showDetailsModal && selectedEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-xl font-semibold text-gray-800">
                Employee Details
              </h2>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-6">
              {/* Row 1 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 rounded-lg p-4 border">
                  <p className="text-sm text-gray-500 mb-1">Employee ID</p>
                  <p className="text-gray-800 font-medium">
                    {selectedEmployee.employee_id}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 border">
                  <p className="text-sm text-gray-500 mb-1">Status</p>
                  <p
                    className={`font-medium ${
                      selectedEmployee.is_active
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {selectedEmployee.is_active ? "Active" : "Inactive"}
                  </p>
                </div>
              </div>

              {/* Row 2 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 rounded-lg p-4 border md:col-span-2">
                  <p className="text-sm text-gray-500 mb-1">Full Name</p>
                  <p className="text-gray-800 font-medium">
                    {selectedEmployee.employee_name}
                  </p>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 border md:col-span-2">
                  <p className="text-sm text-gray-500 mb-1">Email</p>
                  <p className="text-gray-800 font-medium">
                    {selectedEmployee.email}
                  </p>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 border md:col-span-2">
                  <p className="text-sm text-gray-500 mb-1">Phone</p>
                  <p className="text-gray-800 font-medium">
                    {selectedEmployee.phone || "N/A"}
                  </p>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 border md:col-span-2">
                  <p className="text-sm text-gray-500 mb-1">Created At</p>
                  <p className="text-gray-800 font-medium">
                    {new Date(selectedEmployee.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Employees;
