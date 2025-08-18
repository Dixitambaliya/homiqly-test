import React, { useEffect, useState } from "react";
import NotificationModal from "./Modals/NotificationModal";
import { FiBell } from "react-icons/fi";
import axios from "axios";
import LoadingSlider from "../../shared/components/LoadingSpinner";

const NotificationIcon = () => {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);

  const fetchNotifications = async () => {
    try {
      const res = await axios.get("/api/notifications/getnotification/admin");
      setNotifications(res.data || []);
      // console.log("Fetched notifications:", res.data.notifications);
    } catch (err) {
      console.error("Failed to fetch notifications", err);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  return (
    <>
      <button onClick={() => setOpen(true)} className="relative">
        <FiBell className="w-6 h-6 text-gray-700" />
        {/* Optionally show badge */}
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
          {notifications.count || 0}
        </span>
      </button>
      <NotificationModal isOpen={open} onClose={() => setOpen(false)} />
    </>
  );
};

export default NotificationIcon;
