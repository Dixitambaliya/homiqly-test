import { useEffect, useState } from "react";
import axios from "axios";
import { IconButton } from "../../../shared/components/Button";
import Loader from "../../../components/Loader";
import { CheckCircle, X } from "lucide-react";

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
      const res = await axios.get("/api/notifications/getvendornotification");
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
        className="fixed top-0 right-0 z-50 h-full"
        style={{
          width: "calc(100%)",
          // left: "16rem",
        }}
        onClick={onClose}
      >
        <div className="w-full h-full bg-black/25" />
      </div>

      {/* Notification Drawer */}
      <div className="fixed top-0 right-0 z-50 w-full h-full max-w-md overflow-y-auto bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Notifications</h2>
          <IconButton
            onClick={onClose}
            icon={<X />}
            variant="lightDanger"
            size="sm"
          />
        </div>

        {/* Tabs */}
        <div className="flex justify-around p-3 border-b">
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
            <div className="text-sm text-center text-gray-500">
              No notifications
            </div>
          ) : (
            filteredNotifications.map((notif) => (
              <div
                key={notif.notification_id}
                className="flex items-start p-3 space-x-3 rounded-lg shadow-sm bg-gray-50"
              >
                <div className="flex-shrink-0 mt-1">
                  <CheckCircle
                    className={`w-5 h-5 ${
                      notif.is_read ? "text-gray-400" : "text-blue-500"
                    }`}
                  />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-medium">{notif.title}</h3>
                  <p className="text-sm text-gray-600">{notif.body}</p>
                  <p className="mt-1 text-xs text-gray-400">
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
