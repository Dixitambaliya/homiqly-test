import { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import LoadingSpinner from "../../shared/components/LoadingSpinner";
import EmployeesTable from "../components/Tables/EmployeesTable";
import EmployeeDetailsModal from "../components/Modals/EmployeeDetailsModal"; // <-- modal has edit built-in
import { FiSearch } from "react-icons/fi";
import FormInput from "../../shared/components/Form/FormInput";

const Employees = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  // New: filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [companyFilter, setCompanyFilter] = useState("all");

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("adminToken");
      const response = await axios.get("/api/admin/getallemployees", {
        headers: {
          Authorization: token ? `Bearer ${token}` : undefined,
        },
      });
      setEmployees(response.data.employees || []);
    } catch (err) {
      console.error("Error fetching employees:", err);
      setError("Failed to load employees");
      toast.error("Failed to load employees");
    } finally {
      setLoading(false);
    }
  };

  const viewEmployeeDetails = (employee) => {
    setSelectedEmployee(employee);
    setShowDetailsModal(true);
  };

  const closeModal = () => {
    setShowDetailsModal(false);
    setSelectedEmployee(null);
  };

  // Called by EmployeeDetailsModal after a successful edit
  const handleUpdatedEmployee = (updatedEmployee) => {
    // normalize id key
    const updatedId = updatedEmployee.employee_id ?? updatedEmployee.id;
    setEmployees((prev) =>
      prev.map((e) => {
        const eid = e.employee_id ?? e.id;
        return eid === updatedId ? { ...e, ...updatedEmployee } : e;
      })
    );
    // also update selectedEmployee if modal still open
    if (selectedEmployee) {
      const selId = selectedEmployee.employee_id ?? selectedEmployee.id;
      if (selId === updatedId) {
        setSelectedEmployee((p) => ({ ...p, ...updatedEmployee }));
      }
    }
  };

  const handleDeleteEmployee = async (employee) => {
    if (!employee) return;
    const name = employee.employee_name ?? employee.email ?? "this employee";
    const ok = window.confirm(`Are you sure you want to delete ${name}?`);
    if (!ok) return;

    try {
      const token = localStorage.getItem("adminToken");
      const id = employee.employee_id ?? employee.id;
      // endpoint based on your screenshots: /api/admin/delete-employee/:id
      const resp = await axios.delete(`/api/admin/delete-employee/${id}`, {
        headers: {
          Authorization: token ? `Bearer ${token}` : undefined,
        },
      });

      // optimistic removal from state
      setEmployees((prev) =>
        prev.filter((e) => {
          const eid = e.employee_id ?? e.id;
          return eid !== id;
        })
      );

      // if deleting the employee currently open in modal, close modal
      const selId = selectedEmployee
        ? selectedEmployee.employee_id ?? selectedEmployee.id
        : null;
      if (selId === id) {
        closeModal();
      }

      toast.success(
        (resp && resp.data && resp.data.message) ||
          "Employee deleted successfully"
      );
    } catch (err) {
      console.error("Error deleting employee:", err);
      toast.error("Failed to delete employee");
    }
  };

  // Derived list of unique company names for dropdown
  const companyOptions = useMemo(() => {
    const setNames = new Set();
    employees.forEach((e) => {
      if (e.companyName) setNames.add(e.companyName);
    });
    return ["all", ...Array.from(setNames).sort()];
  }, [employees]);

  // Filter employees based on searchTerm (email or employee_name) and companyFilter
  const filteredEmployees = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return employees.filter((emp) => {
      // Company filter
      if (companyFilter !== "all" && emp.companyName !== companyFilter) {
        return false;
      }

      // If no search term, it's a match
      if (!term) return true;

      // Check name or email
      const name = (emp.employee_name || "").toLowerCase();
      const email = (emp.email || "").toLowerCase();
      return name.includes(term) || email.includes(term);
    });
  }, [employees, searchTerm, companyFilter]);

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
        <h2 className="text-2xl font-bold text-gray-800">
          Employee Management
        </h2>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
          <FormInput
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name or email..."
            icon={<FiSearch />}
            className=" w-full sm:w-80"
          />

          <select
            value={companyFilter}
            onChange={(e) => setCompanyFilter(e.target.value)}
            className="py-2 px-3 border rounded-lg text-sm bg-white focus:outline-none"
          >
            {companyOptions.map((c) => (
              <option key={c} value={c}>
                {c === "all" ? "All Companies" : c}
              </option>
            ))}
          </select>
        </div>
      </div>

      <EmployeesTable
        employees={filteredEmployees}
        isLoading={loading}
        onViewEmployee={viewEmployeeDetails}
        onDeleteEmployee={handleDeleteEmployee} // NEW: pass delete handler
      />

      <EmployeeDetailsModal
        employee={selectedEmployee}
        isOpen={showDetailsModal}
        onClose={closeModal}
        onUpdated={handleUpdatedEmployee} // NEW: modal will call this after successful edit
      />
    </div>
  );
};

export default Employees;
