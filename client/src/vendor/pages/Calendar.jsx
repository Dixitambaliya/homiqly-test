import { useState, useEffect } from "react";
import axios from "axios";
import {
  FiCalendar,
  FiClock,
  FiUser,
  FiMapPin,
  FiCheckCircle,
  FiXCircle,
  FiChevronLeft,
  FiChevronRight,
} from "react-icons/fi";
import LoadingSpinner from "../../shared/components/LoadingSpinner";
import StatusBadge from "../../shared/components/StatusBadge";
import { formatDate, formatTime } from "../../shared/utils/dateUtils";
import { toast } from "react-toastify";

/**
 * Calendar (refreshed UI)
 * - Keeps your existing data shape & handlers
 * - Left: calendar grid / views
 * - Right: selected-day details slide-over panel
 *
 * Notes:
 * - I preserved your handlers and state names so integration is minimal.
 * - Small utility changes (count badges, chips, truncated texts).
 */

const Calendar = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState("month"); // month, week, day
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedBookings, setSelectedBookings] = useState([]);

  useEffect(() => {
    fetchBookings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const response = await axios.get("/api/booking/vendorassignedservices");
      setBookings(response.data.bookings || []);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching bookings:", error);
      setError("Failed to load bookings");
      setLoading(false);
    }
  };

  const handlePreviousPeriod = () => {
    const newDate = new Date(currentDate);
    if (viewMode === "month") {
      newDate.setMonth(newDate.getMonth() - 1);
    } else if (viewMode === "week") {
      newDate.setDate(newDate.getDate() - 7);
    } else {
      newDate.setDate(newDate.getDate() - 1);
    }
    setCurrentDate(newDate);
  };

  const handleNextPeriod = () => {
    const newDate = new Date(currentDate);
    if (viewMode === "month") {
      newDate.setMonth(newDate.getMonth() + 1);
    } else if (viewMode === "week") {
      newDate.setDate(newDate.getDate() + 7);
    } else {
      newDate.setDate(newDate.getDate() + 1);
    }
    setCurrentDate(newDate);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handleDateClick = (date) => {
    setSelectedDate(date);
    const dayBookings = bookings.filter((booking) => {
      const bookingDate = new Date(booking.bookingDate);
      return (
        bookingDate.getDate() === date.getDate() &&
        bookingDate.getMonth() === date.getMonth() &&
        bookingDate.getFullYear() === date.getFullYear()
      );
    });
    setSelectedBookings(dayBookings);
  };

  const handleUpdateStatus = async (bookingId, status) => {
    try {
      const response = await axios.put("/api/booking/approveorrejectbooking", {
        booking_id: bookingId,
        status,
      });

      if (response.status === 200) {
        // Update local state
        setBookings(
          bookings.map((booking) =>
            booking.booking_id === bookingId || booking.bookingId === bookingId
              ? { ...booking, bookingStatus: status }
              : booking
          )
        );

        // Update selected bookings if any
        if (selectedBookings.length > 0) {
          setSelectedBookings(
            selectedBookings.map((booking) =>
              booking.booking_id === bookingId ||
              booking.bookingId === bookingId
                ? { ...booking, bookingStatus: status }
                : booking
            )
          );
        }

        // Show success message
        toast.success(
          `Booking ${status === 1 ? "approved" : "rejected"} successfully`
        );
      }
    } catch (error) {
      console.error("Error updating booking status:", error);
      toast.error("Failed to update booking status");
    }
  };

  /* ---------------------- Header ---------------------- */
  const renderCalendarHeader = () => {
    let title = "";
    if (viewMode === "month") {
      title = currentDate.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      });
    } else if (viewMode === "week") {
      const startOfWeek = new Date(currentDate);
      startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      title = `${startOfWeek.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })} - ${endOfWeek.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })}`;
    } else {
      title = currentDate.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    }

    return (
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-3">
        <div className="flex items-center gap-3">
          <div className="inline-flex items-center gap-2 bg-white border rounded-lg px-3 py-2 shadow-sm">
            <button
              onClick={handlePreviousPeriod}
              className="p-2 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-light"
              aria-label="Previous period"
            >
              <FiChevronLeft className="text-gray-600" />
            </button>

            <div className="text-left">
              <div className="text-sm text-gray-500">Viewing</div>
              <div className="text-lg font-semibold text-gray-800">{title}</div>
            </div>

            <button
              onClick={handleNextPeriod}
              className="p-2 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-light"
              aria-label="Next period"
            >
              <FiChevronRight className="text-gray-600" />
            </button>
          </div>

          <div className="hidden md:flex items-center gap-2 text-sm text-gray-600">
            <FiCalendar />
            <span>{viewMode.toUpperCase()}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-gray-100 rounded-md overflow-hidden">
            <button
              onClick={() => setViewMode("month")}
              className={`px-3 py-1 text-sm ${
                viewMode === "month"
                  ? "bg-primary-light text-white"
                  : "text-gray-600 hover:bg-gray-200"
              }`}
              aria-pressed={viewMode === "month"}
            >
              Month
            </button>
            <button
              onClick={() => setViewMode("week")}
              className={`px-3 py-1 text-sm ${
                viewMode === "week"
                  ? "bg-primary-light text-white"
                  : "text-gray-600 hover:bg-gray-200"
              }`}
              aria-pressed={viewMode === "week"}
            >
              Week
            </button>
            <button
              onClick={() => setViewMode("day")}
              className={`px-3 py-1 text-sm ${
                viewMode === "day"
                  ? "bg-primary-light text-white"
                  : "text-gray-600 hover:bg-gray-200"
              }`}
              aria-pressed={viewMode === "day"}
            >
              Day
            </button>
          </div>

          <button
            onClick={handleToday}
            className="px-3 py-1 text-sm bg-primary-light text-white rounded-md hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary-light"
          >
            Today
          </button>
        </div>
      </div>
    );
  };

  /* ---------------------- Month View ---------------------- */
  const renderMonthView = () => {
    const monthStart = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      1
    );
    const monthEnd = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() + 1,
      0
    );
    const startDate = new Date(monthStart);
    startDate.setDate(startDate.getDate() - startDate.getDay());

    const endDate = new Date(monthEnd);
    if (endDate.getDay() !== 6) {
      endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));
    }

    const rows = [];
    let days = [];
    let day = new Date(startDate);

    const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        const cloneDay = new Date(day);
        const isCurrentMonth = day.getMonth() === currentDate.getMonth();
        const isToday = day.toDateString() === new Date().toDateString();

        // Get bookings for this day
        const dayBookings = bookings.filter((booking) => {
          const bookingDate = new Date(booking.bookingDate);
          return bookingDate.toDateString() === day.toDateString();
        });

        days.push(
          <div
            key={day.toISOString()}
            className={`border p-2 min-h-[110px] cursor-pointer transition-colors duration-150 ${
              isCurrentMonth ? "bg-white" : "bg-gray-50 text-gray-400"
            } ${isToday ? "border-primary-light border-2" : "border-gray-200"}`}
            onClick={() => handleDateClick(new Date(cloneDay))}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleDateClick(new Date(cloneDay));
            }}
            aria-label={`Open bookings for ${cloneDay.toDateString()}`}
          >
            <div className="flex justify-between items-center mb-2">
              <span className={`text-sm font-medium ${isToday ? "text-primary-light" : ""}`}>
                {day.getDate()}
              </span>
              {dayBookings.length > 0 && (
                <span className="text-xs bg-primary-light text-white rounded-full px-2 py-0.5">
                  {dayBookings.length}
                </span>
              )}
            </div>

            <div className="space-y-1 overflow-y-auto max-h-[70px] pr-1">
              {dayBookings.slice(0, 3).map((booking) => (
                <div
                  key={booking.booking_id || booking.bookingId}
                  className={`text-xs p-1 rounded truncate ${
                    booking.bookingStatus === 0
                      ? "bg-yellow-100 text-yellow-800"
                      : booking.bookingStatus === 1
                      ? "bg-green-100 text-green-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  <span className="font-medium mr-1">{booking.bookingTime.substring(0, 5)}</span>
                  <span className="truncate">{booking.userName || "Customer"}</span>
                </div>
              ))}
              {dayBookings.length > 3 && (
                <div className="text-xs text-center text-gray-500">+{dayBookings.length - 3} more</div>
              )}
            </div>
          </div>
        );

        day = new Date(day);
        day.setDate(day.getDate() + 1);
      }

      rows.push(
        <div key={day.toISOString()} className="grid grid-cols-7 gap-0">
          {days}
        </div>
      );
      days = [];
    }

    return (
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="grid grid-cols-7 bg-gray-50 border-b">
          {daysOfWeek.map((dayName) => (
            <div key={dayName} className="p-2 text-center text-sm font-medium text-gray-700">
              {dayName}
            </div>
          ))}
        </div>
        <div>{rows}</div>
      </div>
    );
  };

  /* ---------------------- Day View ---------------------- */
  const renderDayView = () => {
    const dayBookings = bookings.filter((booking) => {
      const bookingDate = new Date(booking.bookingDate);
      return (
        bookingDate.getDate() === currentDate.getDate() &&
        bookingDate.getMonth() === currentDate.getMonth() &&
        bookingDate.getFullYear() === currentDate.getFullYear()
      );
    });

    // Sort by time
    dayBookings.sort((a, b) => a.bookingTime.localeCompare(b.bookingTime));

    return (
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-4 bg-gray-50 border-b">
          <h3 className="text-lg font-medium text-gray-800">
            {currentDate.toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </h3>
        </div>

        <div className="divide-y">
          {dayBookings.length > 0 ? (
            dayBookings.map((booking) => (
              <div key={booking.booking_id || booking.bookingId} className="p-4 hover:bg-gray-50">
                <div className="flex justify-between items-start">
                  <div className="min-w-0">
                    <div className="flex items-center text-gray-500 text-sm mb-1 gap-2">
                      <FiClock className="mr-1" />
                      <span>{formatTime(booking.bookingTime)}</span>
                    </div>
                    <h4 className="font-medium text-gray-800 truncate">{booking.serviceName}</h4>
                    <div className="flex items-center text-sm text-gray-600 mt-1 gap-2">
                      <FiUser className="mr-1" />
                      <span>{booking.userName}</span>
                    </div>
                  </div>

                  <div className="flex-shrink-0">
                    <StatusBadge status={booking.bookingStatus} />
                  </div>
                </div>

                {booking.bookingStatus === 0 && (
                  <div className="mt-3 flex space-x-2">
                    <button
                      onClick={() =>
                        handleUpdateStatus(booking.booking_id || booking.bookingId, 1)
                      }
                      className="flex items-center px-3 py-1.5 bg-green-50 border border-green-200 text-green-700 rounded-md text-sm hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-green-200"
                    >
                      <FiCheckCircle className="mr-2" />
                      Accept
                    </button>

                    <button
                      onClick={() =>
                        handleUpdateStatus(booking.booking_id || booking.bookingId, 2)
                      }
                      className="flex items-center px-3 py-1.5 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-200"
                    >
                      <FiXCircle className="mr-2" />
                      Reject
                    </button>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-gray-500">No bookings scheduled for this day</div>
          )}
        </div>
      </div>
    );
  };

  /* ---------------------- Week View ---------------------- */
  const renderWeekView = () => {
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());

    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      days.push(day);
    }

    return (
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="grid grid-cols-7 bg-gray-50 border-b">
          {days.map((day) => {
            const isToday = day.toDateString() === new Date().toDateString();
            return (
              <div
                key={day.toISOString()}
                className={`p-2 text-center ${isToday ? "bg-primary-50 text-primary-700" : ""}`}
              >
                <div className="text-sm font-medium">{day.toLocaleDateString("en-US", { weekday: "short" })}</div>
                <div className={`text-lg ${isToday ? "font-bold" : ""}`}>{day.getDate()}</div>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-7 divide-x h-[500px] overflow-y-auto">
          {days.map((day) => {
            const dayBookings = bookings.filter((booking) => {
              const bookingDate = new Date(booking.bookingDate);
              return bookingDate.toDateString() === day.toDateString();
            });

            // Sort by time
            dayBookings.sort((a, b) => a.bookingTime.localeCompare(b.bookingTime));

            const isToday = day.toDateString() === new Date().toDateString();

            return (
              <div key={day.toISOString()} className={`p-2 overflow-y-auto ${isToday ? "bg-primary-50" : ""}`}>
                {dayBookings.length > 0 ? (
                  dayBookings.map((booking) => (
                    <div
                      key={booking.booking_id || booking.bookingId}
                      className={`p-2 mb-2 rounded text-xs ${
                        booking.bookingStatus === 0
                          ? "bg-yellow-100 text-yellow-800"
                          : booking.bookingStatus === 1
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      <div className="font-medium">{formatTime(booking.bookingTime)}</div>
                      <div className="truncate">{booking.serviceName}</div>
                      <div className="truncate">{booking.userName}</div>
                    </div>
                  ))
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-400 text-xs">No bookings</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  /* ---------------------- Selected Date Details Panel (right column) ---------------------- */
  const renderSelectedDateDetails = () => {
    if (!selectedDate) return (
      <div className="p-6 border-l hidden lg:block">
        <div className="text-center text-gray-400">Select a day to view bookings</div>
      </div>
    );

    return (
      <aside className="w-full lg:w-96 p-4 border-l bg-white shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold">
              {selectedDate.toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              {selectedBookings.length} booking{selectedBookings.length !== 1 ? "s" : ""}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setSelectedDate(null);
                setSelectedBookings([]);
              }}
              className="p-2 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-light"
              aria-label="Close"
            >
              <FiXCircle className="text-gray-600" />
            </button>
          </div>
        </div>

        <div className="mt-4 divide-y">
          {selectedBookings.length > 0 ? (
            selectedBookings
              .slice() // copy
              .sort((a, b) => a.bookingTime.localeCompare(b.bookingTime))
              .map((booking) => (
                <div key={booking.booking_id || booking.bookingId} className="py-3">
                  <div className="flex gap-3">
                    <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center text-sm font-semibold text-gray-700">
                      {booking.userName
                        ? booking.userName
                            .split(" ")
                            .map((n) => n[0])
                            .slice(0, 2)
                            .join("")
                            .toUpperCase()
                        : "U"}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-gray-100 text-xs font-medium">
                              <FiClock className="mr-1" />
                              <span className="whitespace-nowrap">{formatTime(booking.bookingTime)}</span>
                            </span>

                            <span className="ml-2 text-sm font-medium truncate">{booking.serviceName}</span>
                          </div>

                          <h4 className="mt-1 text-sm font-semibold text-gray-800 truncate">{booking.userName}</h4>

                          {booking.notes && (
                            <p className="mt-2 text-sm text-gray-600 line-clamp-3">
                              <span className="font-medium">Notes:</span> {booking.notes}
                            </p>
                          )}
                        </div>

                        <div className="flex-shrink-0 text-right">
                          <StatusBadge status={booking.bookingStatus} />
                        </div>
                      </div>

                      {booking.bookingStatus === 0 && (
                        <div className="mt-3 flex gap-2">
                          <button
                            onClick={() =>
                              handleUpdateStatus(booking.booking_id || booking.bookingId, 1)
                            }
                            className="inline-flex items-center px-3 py-1.5 bg-green-50 border border-green-200 text-green-700 rounded-md text-sm hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-green-200"
                            aria-label={`Accept booking for ${booking.userName}`}
                          >
                            <FiCheckCircle className="mr-2" />
                            Accept
                          </button>

                          <button
                            onClick={() =>
                              handleUpdateStatus(booking.booking_id || booking.bookingId, 2)
                            }
                            className="inline-flex items-center px-3 py-1.5 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-200"
                            aria-label={`Reject booking for ${booking.userName}`}
                          >
                            <FiXCircle className="mr-2" />
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
          ) : (
            <div className="py-8 text-center text-gray-500">No bookings scheduled for this day</div>
          )}
        </div>
      </aside>
    );
  };

  /* ---------------------- Main render ---------------------- */
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" />
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
    <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
      <div>
        {renderCalendarHeader()}

        <div>
          {viewMode === "month" && renderMonthView()}
          {viewMode === "week" && renderWeekView()}
          {viewMode === "day" && renderDayView()}
        </div>
      </div>

      {renderSelectedDateDetails()}
    </div>
  );
};

export default Calendar;


// import { useState, useEffect } from "react";
// import axios from "axios";
// import {
//   FiCalendar,
//   FiClock,
//   FiUser,
//   FiMapPin,
//   FiCheckCircle,
//   FiXCircle,
// } from "react-icons/fi";
// import LoadingSpinner from "../../shared/components/LoadingSpinner";
// import StatusBadge from "../../shared/components/StatusBadge";
// import { formatDate, formatTime } from "../../shared/utils/dateUtils";

// const Calendar = () => {
//   const [bookings, setBookings] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);
//   const [currentDate, setCurrentDate] = useState(new Date());
//   const [viewMode, setViewMode] = useState("month"); // month, week, day
//   const [selectedDate, setSelectedDate] = useState(null);
//   const [selectedBookings, setSelectedBookings] = useState([]);

//   useEffect(() => {
//     fetchBookings();
//   }, []);

//   const fetchBookings = async () => {
//     try {
//       setLoading(true);
//       const response = await axios.get("/api/booking/vendorassignedservices");
//       setBookings(response.data.bookings || []);
//       setLoading(false);
//     } catch (error) {
//       console.error("Error fetching bookings:", error);
//       setError("Failed to load bookings");
//       setLoading(false);
//     }
//   };

//   const handlePreviousPeriod = () => {
//     const newDate = new Date(currentDate);
//     if (viewMode === "month") {
//       newDate.setMonth(newDate.getMonth() - 1);
//     } else if (viewMode === "week") {
//       newDate.setDate(newDate.getDate() - 7);
//     } else {
//       newDate.setDate(newDate.getDate() - 1);
//     }
//     setCurrentDate(newDate);
//   };

//   const handleNextPeriod = () => {
//     const newDate = new Date(currentDate);
//     if (viewMode === "month") {
//       newDate.setMonth(newDate.getMonth() + 1);
//     } else if (viewMode === "week") {
//       newDate.setDate(newDate.getDate() + 7);
//     } else {
//       newDate.setDate(newDate.getDate() + 1);
//     }
//     setCurrentDate(newDate);
//   };

//   const handleToday = () => {
//     setCurrentDate(new Date());
//   };

//   const handleDateClick = (date) => {
//     setSelectedDate(date);
//     const dayBookings = bookings.filter((booking) => {
//       const bookingDate = new Date(booking.bookingDate);
//       return (
//         bookingDate.getDate() === date.getDate() &&
//         bookingDate.getMonth() === date.getMonth() &&
//         bookingDate.getFullYear() === date.getFullYear()
//       );
//     });
//     setSelectedBookings(dayBookings);
//   };

//   const handleUpdateStatus = async (bookingId, status) => {
//     try {
//       const response = await axios.put("/api/booking/approveorrejectbooking", {
//         booking_id: bookingId,
//         status,
//       });

//       if (response.status === 200) {
//         // Update local state
//         setBookings(
//           bookings.map((booking) =>
//             booking.booking_id === bookingId || booking.bookingId === bookingId
//               ? { ...booking, bookingStatus: status }
//               : booking
//           )
//         );

//         // Update selected bookings if any
//         if (selectedBookings.length > 0) {
//           setSelectedBookings(
//             selectedBookings.map((booking) =>
//               booking.booking_id === bookingId ||
//               booking.bookingId === bookingId
//                 ? { ...booking, bookingStatus: status }
//                 : booking
//             )
//           );
//         }

//         // Show success message
//         toast.success(
//           `Booking ${status === 1 ? "approved" : "rejected"} successfully`
//         );
//       }
//     } catch (error) {
//       console.error("Error updating booking status:", error);
//       toast.error("Failed to update booking status");
//     }
//   };

//   const renderCalendarHeader = () => {
//     let title = "";
//     if (viewMode === "month") {
//       title = currentDate.toLocaleDateString("en-US", {
//         month: "long",
//         year: "numeric",
//       });
//     } else if (viewMode === "week") {
//       const startOfWeek = new Date(currentDate);
//       startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
//       const endOfWeek = new Date(startOfWeek);
//       endOfWeek.setDate(startOfWeek.getDate() + 6);
//       title = `${startOfWeek.toLocaleDateString("en-US", {
//         month: "short",
//         day: "numeric",
//       })} - ${endOfWeek.toLocaleDateString("en-US", {
//         month: "short",
//         day: "numeric",
//         year: "numeric",
//       })}`;
//     } else {
//       title = currentDate.toLocaleDateString("en-US", {
//         weekday: "long",
//         month: "long",
//         day: "numeric",
//         year: "numeric",
//       });
//     }

//     return (
//       <div className="flex justify-between items-center mb-6 max-w-7xl">
//         <div className="flex items-center space-x-4">
//           <button
//             onClick={handlePreviousPeriod}
//             className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600"
//           >
//             <svg
//               xmlns="http://www.w3.org/2000/svg"
//               className="h-5 w-5"
//               viewBox="0 0 20 20"
//               fill="currentColor"
//             >
//               <path
//                 fillRule="evenodd"
//                 d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
//                 clipRule="evenodd"
//               />
//             </svg>
//           </button>
//           <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
//           <button
//             onClick={handleNextPeriod}
//             className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600"
//           >
//             <svg
//               xmlns="http://www.w3.org/2000/svg"
//               className="h-5 w-5"
//               viewBox="0 0 20 20"
//               fill="currentColor"
//             >
//               <path
//                 fillRule="evenodd"
//                 d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
//                 clipRule="evenodd"
//               />
//             </svg>
//           </button>
//         </div>

//         <div className="flex items-center space-x-4">
//           <div className="flex bg-gray-100 rounded-md overflow-hidden">
//             <button
//               onClick={() => setViewMode("month")}
//               className={`px-3 py-1 text-sm ${
//                 viewMode === "month"
//                   ? "bg-primary-light text-white"
//                   : "text-gray-600 hover:bg-gray-200"
//               }`}
//             >
//               Month
//             </button>
//             <button
//               onClick={() => setViewMode("week")}
//               className={`px-3 py-1 text-sm ${
//                 viewMode === "week"
//                   ? "bg-primary-light text-white"
//                   : "text-gray-600 hover:bg-gray-200"
//               }`}
//             >
//               Week
//             </button>
//             <button
//               onClick={() => setViewMode("day")}
//               className={`px-3 py-1 text-sm ${
//                 viewMode === "day"
//                   ? "bg-primary-light text-white"
//                   : "text-gray-600 hover:bg-gray-200"
//               }`}
//             >
//               Day
//             </button>
//           </div>

//           <button
//             onClick={handleToday}
//             className="px-3 py-1 text-sm bg-primary-light text-white rounded-md hover:bg-primary-dark"
//           >
//             Today
//           </button>
//         </div>
//       </div>
//     );
//   };

//   const renderMonthView = () => {
//     const monthStart = new Date(
//       currentDate.getFullYear(),
//       currentDate.getMonth(),
//       1
//     );
//     const monthEnd = new Date(
//       currentDate.getFullYear(),
//       currentDate.getMonth() + 1,
//       0
//     );
//     const startDate = new Date(monthStart);
//     startDate.setDate(startDate.getDate() - startDate.getDay());

//     const endDate = new Date(monthEnd);
//     if (endDate.getDay() !== 6) {
//       endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));
//     }

//     const dateFormat = { day: "numeric" };
//     const rows = [];
//     let days = [];
//     let day = startDate;

//     // Days of week header
//     const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

//     // Generate calendar grid
//     while (day <= endDate) {
//       for (let i = 0; i < 7; i++) {
//         const cloneDay = new Date(day);
//         const isCurrentMonth = day.getMonth() === currentDate.getMonth();
//         const isToday = day.toDateString() === new Date().toDateString();

//         // Get bookings for this day
//         const dayBookings = bookings.filter((booking) => {
//           const bookingDate = new Date(booking.bookingDate);
//           return bookingDate.toDateString() === day.toDateString();
//         });

//         days.push(
//           <div
//             key={day.toISOString()}
//             className={`border p-2 min-h-[100px] ${
//               isCurrentMonth ? "bg-white" : "bg-gray-50 text-gray-400"
//             } ${isToday ? "border-primary-light border-2" : "border-gray-200"}`}
//             onClick={() => handleDateClick(new Date(cloneDay))}
//           >
//             <div className="flex justify-between items-center mb-1">
//               <span
//                 className={`text-sm font-medium ${
//                   isToday ? "text-primary-light" : ""
//                 }`}
//               >
//                 {day.toLocaleDateString("en-US", dateFormat)}
//               </span>
//               {dayBookings.length > 0 && (
//                 <span className="text-xs bg-primary-light text-white rounded-full px-2 py-0.5">
//                   {dayBookings.length}
//                 </span>
//               )}
//             </div>
//             <div className="space-y-1 overflow-y-auto max-h-[70px]">
//               {dayBookings.slice(0, 3).map((booking) => (
//                 <div
//                   key={booking.booking_id || booking.bookingId}
//                   className={`text-xs p-1 rounded truncate ${
//                     booking.bookingStatus === 0
//                       ? "bg-yellow-100 text-yellow-800"
//                       : booking.bookingStatus === 1
//                       ? "bg-green-100 text-green-800"
//                       : "bg-red-100 text-red-800"
//                   }`}
//                 >
//                   {booking.bookingTime.substring(0, 5)} -{" "}
//                   {booking.userName || "Customer"}
//                 </div>
//               ))}
//               {dayBookings.length > 3 && (
//                 <div className="text-xs text-center text-gray-500">
//                   +{dayBookings.length - 3} more
//                 </div>
//               )}
//             </div>
//           </div>
//         );
//         day = new Date(day);
//         day.setDate(day.getDate() + 1);
//       }
//       rows.push(
//         <div key={day.toISOString()} className="grid grid-cols-7">
//           {days}
//         </div>
//       );
//       days = [];
//     }

//     return (
//       <div className="bg-white rounded-lg shadow overflow-hidden">
//         <div className="grid grid-cols-7 bg-gray-50 border-b">
//           {daysOfWeek.map((dayName) => (
//             <div
//               key={dayName}
//               className="p-2 text-center text-sm font-medium text-gray-700"
//             >
//               {dayName}
//             </div>
//           ))}
//         </div>
//         <div>{rows}</div>
//       </div>
//     );
//   };

//   const renderDayView = () => {
//     const dayBookings = bookings.filter((booking) => {
//       const bookingDate = new Date(booking.bookingDate);
//       return (
//         bookingDate.getDate() === currentDate.getDate() &&
//         bookingDate.getMonth() === currentDate.getMonth() &&
//         bookingDate.getFullYear() === currentDate.getFullYear()
//       );
//     });

//     // Sort by time
//     dayBookings.sort((a, b) => {
//       return a.bookingTime.localeCompare(b.bookingTime);
//     });

//     return (
//       <div className="bg-white rounded-lg shadow overflow-hidden">
//         <div className="p-4 bg-gray-50 border-b">
//           <h3 className="text-lg font-medium text-gray-800">
//             {currentDate.toLocaleDateString("en-US", {
//               weekday: "long",
//               month: "long",
//               day: "numeric",
//               year: "numeric",
//             })}
//           </h3>
//         </div>

//         <div className="divide-y">
//           {dayBookings.length > 0 ? (
//             dayBookings.map((booking) => (
//               <div
//                 key={booking.booking_id || booking.bookingId}
//                 className="p-4 hover:bg-gray-50"
//               >
//                 <div className="flex justify-between items-start">
//                   <div>
//                     <div className="flex items-center text-gray-500 text-sm mb-1">
//                       <FiClock className="mr-1" />
//                       <span>{formatTime(booking.bookingTime)}</span>
//                     </div>
//                     <h4 className="font-medium">{booking.serviceName}</h4>
//                     <div className="flex items-center text-sm text-gray-600 mt-1">
//                       <FiUser className="mr-1" />
//                       <span>{booking.userName}</span>
//                     </div>
//                   </div>
//                   <StatusBadge status={booking.bookingStatus} />
//                 </div>

//                 {booking.bookingStatus === 0 && (
//                   <div className="mt-3 flex space-x-2">
//                     <button
//                       onClick={() =>
//                         handleUpdateStatus(
//                           booking.booking_id || booking.bookingId,
//                           1
//                         )
//                       }
//                       className="flex items-center px-2 py-1 bg-green-100 text-green-700 rounded-md text-sm hover:bg-green-200"
//                     >
//                       <FiCheckCircle className="mr-1" />
//                       Accept
//                     </button>
//                     <button
//                       onClick={() =>
//                         handleUpdateStatus(
//                           booking.booking_id || booking.bookingId,
//                           2
//                         )
//                       }
//                       className="flex items-center px-2 py-1 bg-red-100 text-red-700 rounded-md text-sm hover:bg-red-200"
//                     >
//                       <FiXCircle className="mr-1" />
//                       Reject
//                     </button>
//                   </div>
//                 )}
//               </div>
//             ))
//           ) : (
//             <div className="p-8 text-center text-gray-500">
//               No bookings scheduled for this day
//             </div>
//           )}
//         </div>
//       </div>
//     );
//   };

//   const renderWeekView = () => {
//     const startOfWeek = new Date(currentDate);
//     startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());

//     const days = [];
//     for (let i = 0; i < 7; i++) {
//       const day = new Date(startOfWeek);
//       day.setDate(startOfWeek.getDate() + i);
//       days.push(day);
//     }

//     return (
//       <div className="bg-white rounded-lg shadow overflow-hidden">
//         <div className="grid grid-cols-7 bg-gray-50 border-b">
//           {days.map((day) => {
//             const isToday = day.toDateString() === new Date().toDateString();
//             return (
//               <div
//                 key={day.toISOString()}
//                 className={`p-2 text-center ${
//                   isToday ? "bg-primary-50 text-primary-700" : ""
//                 }`}
//               >
//                 <div className="text-sm font-medium">
//                   {day.toLocaleDateString("en-US", { weekday: "short" })}
//                 </div>
//                 <div className={`text-lg ${isToday ? "font-bold" : ""}`}>
//                   {day.getDate()}
//                 </div>
//               </div>
//             );
//           })}
//         </div>

//         <div className="grid grid-cols-7 divide-x h-[500px] overflow-y-auto">
//           {days.map((day) => {
//             const dayBookings = bookings.filter((booking) => {
//               const bookingDate = new Date(booking.bookingDate);
//               return bookingDate.toDateString() === day.toDateString();
//             });

//             // Sort by time
//             dayBookings.sort((a, b) => {
//               return a.bookingTime.localeCompare(b.bookingTime);
//             });

//             const isToday = day.toDateString() === new Date().toDateString();

//             return (
//               <div
//                 key={day.toISOString()}
//                 className={`p-2 overflow-y-auto ${
//                   isToday ? "bg-primary-50" : ""
//                 }`}
//               >
//                 {dayBookings.length > 0 ? (
//                   dayBookings.map((booking) => (
//                     <div
//                       key={booking.booking_id || booking.bookingId}
//                       className={`p-2 mb-2 rounded text-xs ${
//                         booking.bookingStatus === 0
//                           ? "bg-yellow-100 text-yellow-800"
//                           : booking.bookingStatus === 1
//                           ? "bg-green-100 text-green-800"
//                           : "bg-red-100 text-red-800"
//                       }`}
//                     >
//                       <div className="font-medium">
//                         {formatTime(booking.bookingTime)}
//                       </div>
//                       <div className="truncate">{booking.serviceName}</div>
//                       <div className="truncate">{booking.userName}</div>
//                     </div>
//                   ))
//                 ) : (
//                   <div className="h-full flex items-center justify-center text-gray-400 text-xs">
//                     No bookings
//                   </div>
//                 )}
//               </div>
//             );
//           })}
//         </div>
//       </div>
//     );
//   };

//  const renderSelectedDateDetails = () => {
//   if (!selectedDate) return null;

//   return (
//     <div className="mt-6 bg-white rounded-lg shadow-sm overflow-hidden ring-1 ring-gray-100">
//       {/* Header */}
//       <div className="p-4 bg-gradient-to-r from-primary to-primary-dark text-white flex items-center justify-between gap-4">
//         <div>
//           <h3 className="text-lg font-semibold leading-tight">
//             Bookings for{" "}
//             <span className="font-medium">
//               {selectedDate.toLocaleDateString("en-US", {
//                 weekday: "long",
//                 month: "long",
//                 day: "numeric",
//                 year: "numeric",
//               })}
//             </span>
//           </h3>
//           <p className="text-sm opacity-90 mt-0.5">
//             {selectedBookings.length} booking
//             {selectedBookings.length !== 1 ? "s" : ""} • organized by time
//           </p>
//         </div>

//         <div className="flex items-center gap-2">
//           <span
//             aria-hidden
//             className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-white/20 text-sm font-medium"
//           >
//             {selectedBookings.length}
//           </span>
//           <button
//             onClick={() => setSelectedDate(null)}
//             className="p-2 rounded-full hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/50"
//             aria-label="Close bookings panel"
//             title="Close"
//           >
//             <svg
//               xmlns="http://www.w3.org/2000/svg"
//               className="h-5 w-5"
//               viewBox="0 0 20 20"
//               fill="currentColor"
//               aria-hidden="true"
//             >
//               <path
//                 fillRule="evenodd"
//                 d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
//                 clipRule="evenodd"
//               />
//             </svg>
//           </button>
//         </div>
//       </div>

//       {/* Bookings list */}
//       <div className="divide-y">
//         {selectedBookings.length > 0 ? (
//           selectedBookings.map((booking) => (
//             <div
//               key={booking.booking_id || booking.bookingId}
//               className="p-4 hover:bg-gray-50 flex gap-4 items-start"
//             >
//               {/* Left: avatar/time */}
//               <div className="flex-shrink-0">
//                 <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center text-sm font-semibold text-gray-700">
//                   {/* initials fallback */}
//                   {booking.userName
//                     ? booking.userName
//                         .split(" ")
//                         .map((n) => n[0])
//                         .slice(0, 2)
//                         .join("")
//                         .toUpperCase()
//                     : "U"}
//                 </div>
//               </div>

//               {/* Middle: details */}
//               <div className="flex-1 min-w-0">
//                 <div className="flex items-start justify-between gap-3">
//                   <div className="min-w-0">
//                     <div className="flex items-center text-sm text-gray-500 gap-2">
//                       <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-gray-100 text-xs font-medium">
//                         <FiClock className="mr-1" />
//                         <span className="whitespace-nowrap">
//                           {formatTime(booking.bookingTime)}
//                         </span>
//                       </span>

//                       <span className="ml-2 text-sm font-medium truncate">
//                         {booking.serviceName}
//                       </span>
//                     </div>

//                     <h4 className="mt-1 text-sm font-semibold text-gray-800 truncate">
//                       {booking.userName}
//                     </h4>

//                     {booking.notes && (
//                       <p className="mt-2 text-sm text-gray-600 line-clamp-3">
//                         <span className="font-medium">Notes:</span>{" "}
//                         {booking.notes}
//                       </p>
//                     )}
//                   </div>

//                   {/* Right: status badge */}
//                   <div className="flex-shrink-0 text-right">
//                     <StatusBadge status={booking.bookingStatus} />
//                   </div>
//                 </div>

//                 {/* Actions row */}
//                 {booking.bookingStatus === 0 && (
//                   <div className="mt-3 flex flex-wrap gap-2">
//                     <button
//                       onClick={() =>
//                         handleUpdateStatus(
//                           booking.booking_id || booking.bookingId,
//                           1
//                         )
//                       }
//                       className="inline-flex items-center px-3 py-1.5 bg-green-50 border border-green-200 text-green-700 rounded-md text-sm hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-green-200"
//                       aria-label={`Accept booking for ${booking.userName}`}
//                     >
//                       <FiCheckCircle className="mr-2" />
//                       Accept
//                     </button>

//                     <button
//                       onClick={() =>
//                         handleUpdateStatus(
//                           booking.booking_id || booking.bookingId,
//                           2
//                         )
//                       }
//                       className="inline-flex items-center px-3 py-1.5 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-200"
//                       aria-label={`Reject booking for ${booking.userName}`}
//                     >
//                       <FiXCircle className="mr-2" />
//                       Reject
//                     </button>
//                   </div>
//                 )}
//               </div>
//             </div>
//           ))
//         ) : (
//           <div className="p-8 text-center text-gray-500">
//             No bookings scheduled for this day
//           </div>
//         )}
//       </div>
//     </div>
//   );
// };


//   if (loading) {
//     return (
//       <div className="flex justify-center items-center h-64">
//         <LoadingSpinner size="lg" />
//       </div>
//     );
//   }

//   if (error) {
//     return (
//       <div className="bg-red-50 p-4 rounded-md">
//         <p className="text-red-500">{error}</p>
//       </div>
//     );
//   }

//   return (
//     <div className="max-w-7xl mx-auto">
//       {renderCalendarHeader()}

//       {viewMode === "month" && renderMonthView()}
//       {viewMode === "week" && renderWeekView()}
//       {viewMode === "day" && renderDayView()}

//       {selectedDate && renderSelectedDateDetails()}
//     </div>
//   );
// };

// export default Calendar;
