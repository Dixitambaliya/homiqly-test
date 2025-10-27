import React, { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import WorkHistoryTable from "../components/Tables/WorkHistoryTable";
import LoadingSlider from "../../shared/components/LoadingSpinner";
import { RefreshCcw } from "lucide-react";
import { Button } from "../../shared/components/Button";

const WorkHistory = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const response = await axios.get("/api/employee/bookinghistory");
      console.log(response.data);
      setBookings(response.data.bookings || []);
    } catch (error) {
      console.error("Error fetching bookings:", error);
      toast.error("Failed to load bookings");
    } finally {
      setLoading(false);
    }
  };
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Work History</h2>
        <Button onClick={fetchBookings} icon={<RefreshCcw />}>
          Refresh
        </Button>
      </div>
      {loading ? (
        <div className="flex justify-center items-center h-96">
          <LoadingSlider />
        </div>
      ) : (
        <WorkHistoryTable bookings={bookings} loading={loading} />
      )}
    </div>
  );
};

export default WorkHistory;
