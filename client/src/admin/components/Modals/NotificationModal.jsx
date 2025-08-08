import { useEffect, useState } from "react";
import axios from "axios";
import { FiX, FiCheckCircle } from "react-icons/fi";
import { IconButton } from "../../../shared/components/Button";
import Loader from "../../../components/Loader";

const NotificationModal = ({ isOpen, onClose }) => {
  const [notifications, setNotifications] = useState([]);
  const [activeTab, setActiveTab] = useState("All");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) fetchNotifications();
  }, [isOpen]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await axios.get("/api/notifications/getnotification/admin");
      setNotifications(res.data.notifications || []);
    } catch (err) {
      console.error("Failed to fetch notifications", err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      await axios.patch(`/api/notifications/markasread/${notificationId}`);
      // Refresh the list after marking as read
      fetchNotifications();
    } catch (err) {
      console.error("Failed to mark notification as read", err);
    }
  };

  const filteredNotifications = notifications.filter((notif) => {
    if (activeTab === "Unread") return notif.is_read === 0;
    return true;
  });

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed top-0 right-0 h-full"
        style={{
          width: "calc(100% - 16rem)",
          left: "16rem",
          zIndex: 40,
        }}
        onClick={onClose}
      >
        <div className="w-full h-full bg-black/25" />
      </div>

      {/* Notification Drawer */}
      <div className="fixed top-0 right-0 h-full w-full max-w-md z-50 bg-white shadow-xl overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-lg font-semibold">Notifications</h2>
          <IconButton
            onClick={onClose}
            icon={<FiX />}
            variant="lightDanger"
            size="sm"
          />
        </div>

        {/* Tabs */}
        <div className="flex justify-around border-b p-3">
          {["All", "Unread"].map((tab) => (
            <button
              key={tab}
              className={`text-sm font-medium px-2 py-1 rounded ${
                activeTab === tab
                  ? "text-blue-600 border-b-2 border-blue-600"
                  : "text-gray-500"
              }`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Notifications List */}
        <div className="p-4 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <Loader />
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="text-center text-sm text-gray-500">
              No notifications
            </div>
          ) : (
            filteredNotifications.map((notif) => (
              <div
                key={notif.notification_id}
                className="flex items-start space-x-3 bg-gray-50 p-3 rounded-lg shadow-sm"
              >
                <div className="flex-shrink-0 mt-1">
                  <FiCheckCircle
                    className={`w-5 h-5 ${
                      notif.is_read ? "text-gray-400" : "text-blue-500"
                    }`}
                  />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-medium">{notif.title}</h3>
                  <p className="text-sm text-gray-600">{notif.body}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(notif.sent_at).toLocaleString()}
                  </p>

                  {!notif.is_read && (
                    <button
                      onClick={() => handleMarkAsRead(notif.notification_id)}
                      className="mt-2 text-xs text-blue-600 hover:underline"
                    >
                      Mark as Read
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
};

export default NotificationModal;
