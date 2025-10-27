import { useState, useEffect } from "react";
import axios from "axios";
import LoadingSpinner from "../../shared/components/LoadingSpinner";
import StatusBadge from "../../shared/components/StatusBadge";
import { formatDate, formatTime } from "../../shared/utils/dateUtils";
import { toast } from "react-toastify";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Clock,
  User,
  XCircle,
  Calendar as CalendarIcon,
} from "lucide-react";

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
        setBookings((prev) =>
          prev.map((booking) =>
            booking.booking_id === bookingId || booking.bookingId === bookingId
              ? { ...booking, bookingStatus: status }
              : booking
          )
        );

        // Update selected bookings if any
        if (selectedBookings.length > 0) {
          setSelectedBookings((prev) =>
            prev.map((booking) =>
              booking.booking_id === bookingId ||
              booking.bookingId === bookingId
                ? { ...booking, bookingStatus: status }
                : booking
            )
          );
        }

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
      <div className="flex flex-col gap-3 mb-6 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="inline-flex items-center gap-2 px-3 py-2 bg-white border rounded-lg shadow-sm">
            <button
              onClick={handlePreviousPeriod}
              className="p-2 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-light"
              aria-label="Previous period"
            >
              <ArrowLeft className="text-gray-600" />
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
              <ArrowRight className="text-gray-600" />
            </button>
          </div>

          <div className="items-center hidden gap-2 text-sm text-gray-600 md:flex">
            <CalendarIcon />
            <span>{viewMode.toUpperCase()}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex overflow-hidden bg-gray-100 rounded-md">
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
            className="px-3 py-1 text-sm text-white rounded-md bg-primary-light hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary-light"
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

    // start on Sunday
    const startDate = new Date(monthStart);
    startDate.setDate(startDate.getDate() - startDate.getDay());

    // end on Saturday
    const endDate = new Date(monthEnd);
    if (endDate.getDay() !== 6) {
      endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));
    }

    const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const weeks = [];
    let iter = new Date(startDate);

    // Build weeks array (each week is array of 7 dates)
    while (iter <= endDate) {
      const week = [];
      for (let i = 0; i < 7; i++) {
        week.push(new Date(iter));
        iter.setDate(iter.getDate() + 1);
      }
      weeks.push(week);
    }

    return (
      <div className="overflow-hidden bg-white rounded-lg shadow">
        <div className="grid grid-cols-7 border-b bg-gray-50">
          {daysOfWeek.map((dayName) => (
            <div
              key={dayName}
              className="p-2 text-sm font-medium text-center text-gray-700"
            >
              {dayName}
            </div>
          ))}
        </div>

        {/* Bounded scrolling area to avoid pushing the entire page down */}
        <div className="max-h-[65vh] overflow-auto">
          <div className="space-y-0">
            {weeks.map((week, wIdx) => (
              <div key={`week-${wIdx}`} className="grid grid-cols-7 gap-0">
                {week.map((day) => {
                  const isCurrentMonth =
                    day.getMonth() === currentDate.getMonth();
                  const isToday =
                    day.toDateString() === new Date().toDateString();

                  const dayBookings = bookings.filter((booking) => {
                    const bookingDate = new Date(booking.bookingDate);
                    return bookingDate.toDateString() === day.toDateString();
                  });

                  return (
                    <div
                      key={day.toISOString()}
                      className={`border p-2 min-h-[110px] cursor-pointer transition-colors duration-150 ${
                        isCurrentMonth ? "bg-white" : "bg-gray-50 text-gray-400"
                      } ${
                        isToday
                          ? "border-primary-light border-2"
                          : "border-gray-200"
                      }`}
                      onClick={() => handleDateClick(new Date(day))}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleDateClick(new Date(day));
                      }}
                      aria-label={`Open bookings for ${day.toDateString()}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span
                          className={`text-sm font-medium ${
                            isToday ? "text-primary-light" : ""
                          }`}
                        >
                          {day.getDate()}
                        </span>
                        {dayBookings.length > 0 && (
                          <span className="text-xs bg-primary-light text-white rounded-full px-2 py-0.5">
                            {dayBookings.length}
                          </span>
                        )}
                      </div>

                      {/* limit height of booking list inside each day cell */}
                      <div className="space-y-1 overflow-y-auto max-h-[70px] pr-1">
                        {dayBookings.slice(0, 3).map((booking) => (
                          <div
                            key={booking.booking_id || booking.bookingId}
                            className={`text-xs p-1 rounded truncate ${
                              booking.bookingStatus === 0
                      ? "bg-amber-100 text-amber-700 border border-amber-200/50"
                      : booking.bookingStatus === 1
                      ? "bg-blue-100 text-blue-700 border border-blue-200/50"
                      : booking.bookingStatus === 2
                      ? "bg-red-100 text-red-700 border border-red-200/50"
                      : booking.bookingStatus === 3
                      ? "bg-purple-100 text-purple-700 border border-purple-200/50"
                      : booking.bookingStatus === 4
                      ? "bg-green-100 text-green-700 border border-green-200/50"
                      : "bg-gray-100 text-gray-700 border border-gray-200/50"
                            }`}
                          >
                            <span className="mr-1 font-medium">
                              {booking.bookingTime
                                ? booking.bookingTime.substring(0, 5)
                                : ""}
                            </span>
                            <span className="truncate">
                              {booking.userName || "Customer"}
                            </span>
                          </div>
                        ))}
                        {dayBookings.length > 3 && (
                          <div className="text-xs text-center text-gray-500">
                            +{dayBookings.length - 3} more
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
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
      <div className="overflow-hidden bg-white rounded-lg shadow">
        <div className="p-4 border-b bg-gray-50">
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
              <div
                key={booking.booking_id || booking.bookingId}
                className="p-4 hover:bg-gray-50"
              >
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1 text-sm text-gray-500">
                      <Clock className="mr-1" />
                      <span>{formatTime(booking.bookingTime)}</span>
                    </div>
                    <h4 className="font-medium text-gray-800 truncate">
                      {booking.serviceName}
                    </h4>
                    <div className="flex items-center gap-2 mt-1 text-sm text-gray-600">
                      <User className="mr-1" />
                      <span>{booking.userName}</span>
                    </div>
                  </div>

                  <div className="flex-shrink-0">
                    <StatusBadge status={booking.bookingStatus} />
                  </div>
                </div>

                {booking.bookingStatus === 0 && (
                  <div className="flex mt-3 space-x-2">
                    <button
                      onClick={() =>
                        handleUpdateStatus(
                          booking.booking_id || booking.bookingId,
                          1
                        )
                      }
                      className="flex items-center px-3 py-1.5 bg-green-50 border border-green-200 text-green-700 rounded-md text-sm hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-green-200"
                    >
                      <CheckCircle className="mr-2" />
                      Accept
                    </button>

                    <button
                      onClick={() =>
                        handleUpdateStatus(
                          booking.booking_id || booking.bookingId,
                          2
                        )
                      }
                      className="flex items-center px-3 py-1.5 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-200"
                    >
                      <XCircle className="mr-2" />
                      Reject
                    </button>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-gray-500">
              No bookings scheduled for this day
            </div>
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
      <div className="overflow-hidden bg-white rounded-lg shadow">
        <div className="grid grid-cols-7 border-b bg-gray-50">
          {days.map((day) => {
            const isToday = day.toDateString() === new Date().toDateString();
            return (
              <div
                key={day.toISOString()}
                className={`p-2 text-center ${
                  isToday ? "bg-primary-50 text-primary-700" : ""
                }`}
              >
                <div className="text-sm font-medium">
                  {day.toLocaleDateString("en-US", { weekday: "short" })}
                </div>
                <div className={`text-lg ${isToday ? "font-bold" : ""}`}>
                  {day.getDate()}
                </div>
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
            dayBookings.sort((a, b) =>
              a.bookingTime.localeCompare(b.bookingTime)
            );

            const isToday = day.toDateString() === new Date().toDateString();

            return (
              <div
                key={day.toISOString()}
                className={`p-2 overflow-y-auto ${
                  isToday ? "bg-primary-50" : ""
                }`}
              >
                {dayBookings.length > 0 ? (
                  dayBookings.map((booking) => (
                    <div
                      key={booking.booking_id || booking.bookingId}
                      className={`p-2 mb-2 rounded text-xs ${
                        booking.bookingStatus === 0
                      ? "bg-amber-100 text-amber-700 border border-amber-200/50"
                      : booking.bookingStatus === 1
                      ? "bg-blue-100 text-blue-700 border border-blue-200/50"
                      : booking.bookingStatus === 2
                      ? "bg-red-100 text-red-700 border border-red-200/50"
                      : booking.bookingStatus === 3
                      ? "bg-purple-100 text-purple-700 border border-purple-200/50"
                      : booking.bookingStatus === 4
                      ? "bg-green-100 text-green-700 border border-green-200/50"
                      : "bg-gray-100 text-gray-700 border border-gray-200/50"
                      }`}
                    >
                      <div className="font-medium">
                        {formatTime(booking.bookingTime)}
                      </div>
                      <div className="truncate">{booking.serviceName}</div>
                      <div className="truncate">{booking.userName}</div>
                    </div>
                  ))
                ) : (
                  <div className="flex items-center justify-center h-full text-xs text-gray-400">
                    No bookings
                  </div>
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
    if (!selectedDate)
      return (
        <div className="hidden p-6 border-l lg:block">
          <div className="text-center text-gray-400">
            Select a day to view bookings
          </div>
        </div>
      );

    return (
      <aside className="w-full p-4 bg-white border-l shadow-sm lg:w-96">
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
            <p className="mt-1 text-sm text-gray-500">
              {selectedBookings.length} booking
              {selectedBookings.length !== 1 ? "s" : ""}
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
              <XCircle className="text-gray-600" />
            </button>
          </div>
        </div>

        <div className="mt-4 divide-y">
          {selectedBookings.length > 0 ? (
            selectedBookings
              .slice()
              .sort((a, b) => a.bookingTime.localeCompare(b.bookingTime))
              .map((booking) => (
                <div
                  key={booking.booking_id || booking.bookingId}
                  className="py-3"
                >
                  <div className="flex gap-3">
                    <div className="flex items-center justify-center w-10 h-10 text-sm font-semibold text-gray-700 bg-gray-100 rounded-full">
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
                          <div className="flex items-center gap-2 text-sm text-gray-500 ">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-gray-100 text-xs font-medium">
                              <Clock className="w-3 h-3 mr-1" />
                              <span className="whitespace-nowrap">
                                {formatTime(booking.bookingTime)}
                              </span>
                            </span>

                            <span className="ml-2 text-sm font-medium truncate">
                              {booking.serviceName}
                            </span>
                          </div>

                          <h4 className="mt-1 text-sm font-semibold text-gray-800 truncate">
                            {booking.userName}
                          </h4>

                          {booking.notes && (
                            <p className="mt-2 text-sm text-gray-600 line-clamp-3">
                              <span className="font-medium">Notes:</span>{" "}
                              {booking.notes}
                            </p>
                          )}
                        </div>

                        <div className="flex-shrink-0 text-right">
                          <StatusBadge status={booking.bookingStatus} />
                        </div>
                      </div>

                      {booking.bookingStatus === 0 && (
                        <div className="flex gap-2 mt-3">
                          <button
                            onClick={() =>
                              handleUpdateStatus(
                                booking.booking_id || booking.bookingId,
                                1
                              )
                            }
                            className="inline-flex items-center px-3 py-1.5 bg-green-50 border border-green-200 text-green-700 rounded-md text-sm hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-green-200"
                            aria-label={`Accept booking for ${booking.userName}`}
                          >
                            <CheckCircle className="mr-2" />
                            Accept
                          </button>

                          <button
                            onClick={() =>
                              handleUpdateStatus(
                                booking.booking_id || booking.bookingId,
                                2
                              )
                            }
                            className="inline-flex items-center px-3 py-1.5 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-200"
                            aria-label={`Reject booking for ${booking.userName}`}
                          >
                            <XCircle className="mr-2" />
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
          ) : (
            <div className="py-8 text-center text-gray-500">
              No bookings scheduled for this day
            </div>
          )}
        </div>
      </aside>
    );
  };

  /* ---------------------- Main render ---------------------- */
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 rounded-md bg-red-50">
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
