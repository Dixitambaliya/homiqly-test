import { useState, useEffect } from "react";
import axios from "axios";
import { FiRefreshCw } from "react-icons/fi";
import BookingsTable from "../components/Tables/BookingsTable";
import { Button } from "../../shared/components/Button";
import { FormSelect } from "../../shared/components/Form";
import LoadingSpinner from "../../shared/components/LoadingSpinner";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";

const Bookings = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("all");
  const [employees, setEmployees] = useState([]);
  const [selectedEmployeeMap, setSelectedEmployeeMap] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    fetchBookings();
    fetchEmployees(); // Fetch employees on mount
  }, []);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const response = await axios.get("/api/booking/vendorassignedservices");
      setBookings(response.data.bookings || []);
    } catch (error) {
      console.error("Error fetching bookings:", error);
      setError("Failed to load bookings");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectEmployee = (bookingId, employeeId) => {
    setSelectedEmployeeMap((prev) => ({
      ...prev,
      [bookingId]: employeeId,
    }));
  };

  const handleAssignEmployee = async (bookingId) => {
    const employeeId = selectedEmployeeMap[bookingId];
    if (!employeeId) return;

    try {
      const token = localStorage.getItem("vendorToken");
      const response = await axios.post(
        "/api/employee/assign-booking",
        {
          booking_id: bookingId,
          employee_id: employeeId,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // Find the employee name from the list
      const assignedEmployee = employees.find(
        (emp) => emp.employee_id === employeeId
      );

      // Update booking in local state
      setBookings((prevBookings) =>
        prevBookings.map((booking) =>
          booking.booking_id === bookingId
            ? { ...booking, employeeName: assignedEmployee?.employee_name }
            : booking
        )
      );

      // Clear selected from dropdown
      setSelectedEmployeeMap((prev) => {
        const updated = { ...prev };
        delete updated[bookingId];
        return updated;
      });

      // Show success toast
      toast.success(response.data.message || "Employee assigned successfully");

      fetchBookings();
    } catch (error) {
      console.error("Failed to assign employee:", error);
      toast.error("Failed to assign employee");
    }
  };

  const fetchEmployees = async () => {
    try {
      const token = localStorage.getItem("vendorToken");
      const res = await axios.get("/api/employee/getemployee", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setEmployees(res.data.employees || []);
    } catch (error) {
      console.error("Failed to fetch employees", error);
    }
  };

  const handleUpdateStatus = async (bookingId, status) => {
    try {
      const response = await axios.put("/api/booking/approveorrejectbooking", {
        booking_id: bookingId,
        status,
      });
      if (response.status === 200) {
        setBookings((prev) =>
          prev.map((b) =>
            b.booking_id === bookingId || b.bookingId === bookingId
              ? { ...b, bookingStatus: status }
              : b
          )
        );
        toast.success(
          `Booking ${status === 1 ? "approved" : "rejected"} successfully`
        );
      }
    } catch (error) {
      console.error("Error updating booking status:", error);
      toast.error("Failed to update booking status");
    }
  };

  const viewBookingDetails = (booking) => {
    navigate(`/vendor/bookings/${booking.booking_id}`, { state: { booking } });
  };

  const handleFilterChange = (e) => {
    setFilter(e.target.value);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner />
      </div>
    );
  }
  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Booking Management</h2>
        <div className="flex space-x-2">
          <FormSelect
            name="filter"
            value={filter}
            onChange={handleFilterChange}
            options={[
              { value: "all", label: "All Bookings" },
              { value: "0", label: "Pending" },
              { value: "1", label: "Approved" },
              { value: "2", label: "Cancelled" },
            ]}
            className="mb-0 w-40"
          />
          <Button
            className="h-9"
            onClick={fetchBookings}
            variant="outline"
            icon={<FiRefreshCw className="mr-2" />}
          >
            Refresh
          </Button>
        </div>
      </div>

      <BookingsTable
        bookings={bookings.map((b) => ({
          ...b,
          selectedEmployeeId: selectedEmployeeMap[b.booking_id] || "",
        }))}
        employees={employees} // ✅ ADD THIS LINE
        isLoading={loading}
        onViewBooking={viewBookingDetails}
        filteredStatus={filter !== "all" ? parseInt(filter) : undefined}
        onSelectEmployee={handleSelectEmployee}
        onAssignEmployee={handleAssignEmployee}
        onApproveBooking={(id) => handleUpdateStatus(id, 1)}
        onRejectBooking={(id) => handleUpdateStatus(id, 2)}
      />
    </div>
  );
};

export default Bookings;
