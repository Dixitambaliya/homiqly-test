import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import {
  ArrowLeft,
  ArrowRight,
  Plus,
  CheckCircle,
  XCircle,
  Calendar as CalendarIcon,
  Clock,
  User,
  Edit2,
  Trash2,
} from "lucide-react";
import LoadingSpinner from "../../shared/components/LoadingSpinner";
import StatusBadge from "../../shared/components/StatusBadge";
import { formatDate, formatTime } from "../../shared/utils/dateUtils";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const Calendar = () => {
  const [bookings, setBookings] = useState([]);
  const [availabilities, setAvailabilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingAvail, setLoadingAvail] = useState(false);
  const [error, setError] = useState(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState("month");
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedBookings, setSelectedBookings] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedAvailToEdit, setSelectedAvailToEdit] = useState(null);

  // create / edit form state for availability
  const emptyForm = {
    startDate: "",
    endDate: "",
    startTime: "09:00",
    endTime: "18:00",
  };
  const [availabilityForm, setAvailabilityForm] = useState(emptyForm);

  useEffect(() => {
    fetchBookings();
    fetchAvailabilities();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const response = await axios.get("/api/booking/vendorassignedservices");
      setBookings(response.data.bookings || []);
      setLoading(false);
    } catch (err) {
      setError("Failed to load bookings");
      setLoading(false);
    }
  };

  const fetchAvailabilities = async () => {
    try {
      setLoadingAvail(true);
      const res = await axios.get("/api/vendor/get-availability");
      setAvailabilities(res.data.availabilities || []);
      setLoadingAvail(false);
    } catch (err) {
      setLoadingAvail(false);
      toast.error("Failed to load availabilities");
    }
  };

  const createAvailability = async (payload) => {
    try {
      const res = await axios.post("/api/vendor/set-availability", payload);
      toast.success(res.data.message || "Availability set successfully");
      setShowCreateModal(false);
      setAvailabilityForm(emptyForm);
      await fetchAvailabilities();
    } catch (err) {
      const msg =
        err?.response?.data?.message || "Failed to create availability";
      toast.error(msg);
    }
  };

  const updateAvailability = async (id, payload) => {
    try {
      const res = await axios.put(
        `/api/vendor/edit-availability/${id}`,
        payload
      );
      toast.success(res.data.message || "Availability updated successfully");
      setShowEditModal(false);
      setSelectedAvailToEdit(null);
      setAvailabilityForm(emptyForm);
      await fetchAvailabilities();
    } catch (err) {
      const msg =
        err?.response?.data?.message || "Failed to update availability";
      toast.error(msg);
    }
  };

  const removeAvailability = async (id) => {
    if (!window.confirm("Delete this availability?")) return;
    try {
      const res = await axios.delete(`/api/vendor/delete-availability/${id}`);
      toast.success(res.data.message || "Availability deleted successfully");
      await fetchAvailabilities();
    } catch (err) {
      const msg =
        err?.response?.data?.message || "Failed to delete availability";
      toast.error(msg);
    }
  };

  // Date helpers
  const startOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1);
  const endOfMonth = (d) => new Date(d.getFullYear(), d.getMonth() + 1, 0);
  const startOfWeek = (d) => {
    const s = new Date(d);
    s.setDate(d.getDate() - d.getDay());
    s.setHours(0, 0, 0, 0);
    return s;
  };
  const endOfWeek = (d) => {
    const e = startOfWeek(d);
    e.setDate(e.getDate() + 6);
    e.setHours(23, 59, 59, 999);
    return e;
  };
  const isSameDay = (a, b) => a.toDateString() === b.toDateString();

  // check if a date falls inside availability range (inclusive)
  const isDateInAvailability = (date, av) => {
    if (!av) return false;
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const s = new Date(av.startDate);
    const e = new Date(av.endDate);
    const start = new Date(s.getFullYear(), s.getMonth(), s.getDate());
    const end = new Date(e.getFullYear(), e.getMonth(), e.getDate());
    return d >= start && d <= end;
  };

  // --- Availability color helpers (keeps previous behavior) ---
  const getColorForAvailability = (av) => {
    if (!av) return "#10b981"; // fallback green
    if (av.color) return av.color;
    const seed =
      String(av.vendor_availability_id || av.id || av.startDate + av.endDate);
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = seed.charCodeAt(i) + ((hash << 5) - hash);
      hash = hash & hash;
    }
    const h = Math.abs(hash) % 360;
    const s = 60 + (Math.abs(hash) % 20);
    const l = 45 + (Math.abs(hash) % 10);
    return `hsl(${h} ${s}% ${l}%)`;
  };

  const hslToRgba = (hsl, alpha = 0.15) => {
    const match = /hsl\(\s*([0-9.]+)\s+([0-9.]+)%\s+([0-9.]+)%\s*\)/.exec(hsl);
    if (!match) return `rgba(0,0,0,${alpha})`;
    const h = Number(match[1]) / 360;
    const s = Number(match[2]) / 100;
    const l = Number(match[3]) / 100;

    function hue2rgb(p, q, t) {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    }

    let r, g, b;
    if (s === 0) {
      r = g = b = l;
    } else {
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }

    const R = Math.round(r * 255);
    const G = Math.round(g * 255);
    const B = Math.round(b * 255);
    return `rgba(${R}, ${G}, ${B}, ${alpha})`;
  };

  // --- Booking status colors (explicit values) ---
  // returns an object { bg, lightBg, border, text, dot } where values are css color strings
  const getBookingStatusColor = (status) => {
    // Use colors that align with typical tailwind-like palettes (but explicit)
    switch (status) {
      case 0: // Pending - Yellow
        return {
          name: "pending",
          bg: "#92400e", // dark text color for contrast (used on small text)
          text: "#92400e",
          border: "#f5d88a",
          lightBg: "rgba(250, 204, 21, 0.12)", // pale yellow
          pillBg: "#fef3c7", // pale background for card interior
          dot: "#f59e0b", // yellow-500
        };
      case 1: // Confirmed/Accepted - Green
        return {
          name: "confirmed",
          bg: "#065f46",
          text: "#065f46",
          border: "#bbf7d0",
          lightBg: "rgba(16, 185, 129, 0.10)", // pale green
          pillBg: "#dcfce7",
          dot: "#10b981", // green-500
        };
      case 2: // Rejected/Cancelled - Red
        return {
          name: "rejected",
          bg: "#991b1b",
          text: "#991b1b",
          border: "#fecaca",
          lightBg: "rgba(254, 202, 202, 0.10)", // pale red
          pillBg: "#ffe4e6",
          dot: "#ef4444", // red-500
        };
      default: // Completed / other - Blue
        return {
          name: "completed",
          bg: "#1e3a8a",
          text: "#1e3a8a",
          border: "#bfdbfe",
          lightBg: "rgba(59, 130, 246, 0.08)", // pale blue
          pillBg: "#e0f2fe",
          dot: "#3b82f6", // blue-500
        };
    }
  };

  // Check if date has any availability
  const hasAvailability = (date) => {
    return availabilities.some((av) => isDateInAvailability(date, av));
  };

  const availabilitiesForDate = (date) =>
    availabilities.filter((av) => isDateInAvailability(date, av));

  // Navigation
  const handlePreviousPeriod = () => {
    const newDate = new Date(currentDate);
    if (viewMode === "month") newDate.setMonth(newDate.getMonth() - 1);
    else if (viewMode === "week") newDate.setDate(newDate.getDate() - 7);
    else newDate.setDate(newDate.getDate() - 1);
    setCurrentDate(newDate);
  };
  const handleNextPeriod = () => {
    const newDate = new Date(currentDate);
    if (viewMode === "month") newDate.setMonth(newDate.getMonth() + 1);
    else if (viewMode === "week") newDate.setDate(newDate.getDate() + 7);
    else newDate.setDate(newDate.getDate() + 1);
    setCurrentDate(newDate);
  };
  const handleToday = () => setCurrentDate(new Date());

  // Derived data
  const monthMatrix = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const start = new Date(monthStart);
    start.setDate(start.getDate() - start.getDay());
    const end = new Date(monthEnd);
    end.setDate(end.getDate() + (6 - end.getDay()));
    const weeks = [];
    let iter = new Date(start);
    while (iter <= end) {
      const week = [];
      for (let i = 0; i < 7; i++) {
        week.push(new Date(iter));
        iter.setDate(iter.getDate() + 1);
      }
      weeks.push(week);
    }
    return weeks;
  }, [currentDate]);

  const weekDays = useMemo(() => {
    const s = startOfWeek(currentDate);
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(s);
      d.setDate(s.getDate() + i);
      days.push(d);
    }
    return days;
  }, [currentDate]);

  const bookingsByDay = useMemo(() => {
    const map = {};
    bookings.forEach((b) => {
      // Accept either bookingDate or date property
      const d = new Date(b.bookingDate || b.date || b.dateBooked || b.booking_date);
      const key = d.toDateString();
      if (!map[key]) map[key] = [];
      map[key].push(b);
    });
    Object.keys(map).forEach((k) => {
      map[k].sort((a, b) =>
        (a.bookingTime || "").localeCompare(b.bookingTime || "")
      );
    });
    return map;
  }, [bookings]);

  // interactions
  const handleDateClick = (date) => {
    setSelectedDate(date);
    const key = date.toDateString();
    setSelectedBookings(bookingsByDay[key] || []);
  };

  const openCreateModalForDate = (date) => {
    const iso = date ? formatDate(date) : "";
    setAvailabilityForm({
      startDate: iso || "",
      endDate: iso || "",
      startTime: "09:00",
      endTime: "18:00",
    });
    setShowCreateModal(true);
  };

  const submitCreateAvailability = async () => {
    const { startDate, endDate, startTime, endTime } = availabilityForm;
    if (!startDate || !endDate || !startTime || !endTime) {
      toast.error("All fields are required");
      return;
    }
    await createAvailability({ startDate, endDate, startTime, endTime });
  };

  const openEditModal = (av) => {
    setSelectedAvailToEdit(av);
    setAvailabilityForm({
      startDate: av.startDate,
      endDate: av.endDate,
      startTime: av.startTime || "09:00",
      endTime: av.endTime || "18:00",
    });
    setShowEditModal(true);
  };

  const submitEditAvailability = async () => {
    if (!selectedAvailToEdit) return;
    const { startDate, endDate, startTime, endTime } = availabilityForm;
    if (!startDate || !endDate || !startTime || !endTime) {
      toast.error("All fields are required");
      return;
    }
    await updateAvailability(selectedAvailToEdit.vendor_availability_id, {
      startDate,
      endDate,
      startTime,
      endTime,
    });
  };

  // selected date -> availabilities shown in side panel
  const selectedDateAvailabilities = useMemo(() => {
    if (!selectedDate) return [];
    return availabilities.filter((av) =>
      isDateInAvailability(selectedDate, av)
    );
  }, [selectedDate, availabilities]);

  // --- UI Renders ---
  const renderHeader = () => {
    let title = "";
    if (viewMode === "month") {
      title = currentDate.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      });
    } else if (viewMode === "week") {
      const s = startOfWeek(currentDate);
      const e = endOfWeek(currentDate);
      title = `${s.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })} - ${e.toLocaleDateString("en-US", {
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
      <div className="flex flex-col items-center justify-between sm:flex-row pb-7">
        <div className="flex items-center gap-2">
          <button
            onClick={handlePreviousPeriod}
            className="p-2 text-gray-600 rounded-full hover:bg-gray-100"
          >
            <ArrowLeft size={20} />
          </button>
          <span className="text-lg font-bold">{title}</span>
          <button
            onClick={handleNextPeriod}
            className="p-2 text-gray-600 rounded-full hover:bg-gray-100"
          >
            <ArrowRight size={20} />
          </button>
          <button
            onClick={handleToday}
            className="px-3 py-1 ml-3 text-xs text-green-700 transition rounded-full sm:text-sm bg-green-50 hover:bg-green-100"
          >
            Today
          </button>
        </div>
        <div className="flex gap-1 p-1 mt-4 bg-gray-100 rounded-full sm:mt-0">
          {["month", "week", "day"].map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-4 py-1 rounded-full text-xs sm:text-sm ${
                viewMode === mode
                  ? "bg-green-600 text-white shadow"
                  : "text-gray-700 hover:bg-green-100"
              }`}
            >
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 mt-4 sm:mt-0">
          <button
            onClick={() => openCreateModalForDate(selectedDate || new Date())}
            className="flex items-center gap-2 px-2 py-1 ml-3 text-white transition bg-green-600 rounded-full shadow hover:bg-green-700"
          >
            <Plus size={16} /> New Availability
          </button>
        </div>
      </div>
    );
  };

  const renderMonthMain = () => (
    <div className="overflow-hidden bg-white border shadow-md rounded-xl">
      <div className="grid grid-cols-7 border-b bg-gray-50">
        {DAYS.map((d) => (
          <div
            key={d}
            className="py-2 text-sm font-medium text-center text-gray-500"
          >
            {d}
          </div>
        ))}
      </div>
      <div>
        {monthMatrix.map((week, wIdx) => (
          <div key={wIdx} className="grid grid-cols-7 gap-0">
            {week.map((day) => {
              const key = day.toDateString();
              const dayBookings = bookingsByDay[key] || [];
              const isCurrentMonth = day.getMonth() === currentDate.getMonth();
              const isToday = isSameDay(day, new Date());
              const dayAvs = availabilitiesForDate(day);
              const isAvailable = dayAvs.length > 0;
              const bgColor =
                dayAvs.length > 0
                  ? hslToRgba(getColorForAvailability(dayAvs[0]), 0.10)
                  : null;

              return (
                <div
                  key={key}
                  onClick={() => handleDateClick(day)}
                  tabIndex={0}
                  style={{
                    background: isAvailable && !isToday ? bgColor : undefined,
                  }}
                  className={`border p-2 sm:min-h-[100px] min-h-[64px] cursor-pointer transition 
                    ${isCurrentMonth ? "bg-white" : "bg-gray-50 text-gray-300"} 
                    ${isToday ? "border-2 border-green-400 bg-white" : "border-gray-200"}
                    rounded-md hover:bg-green-100 relative`}
                >
                  <div className="flex items-center justify-between">
                    <div
                      className={`text-xs font-semibold ${
                        isToday
                          ? "text-green-600 font-bold"
                          : isCurrentMonth
                          ? "text-gray-700"
                          : "text-gray-300"
                      }`}
                    >
                      {day.getDate()}
                    </div>

                    <div className="flex items-center gap-1">
                      {/* availability pills */}
                      {dayAvs.slice(0, 2).map((av) => {
                        const color = getColorForAvailability(av);
                        return (
                          <span
                            key={av.vendor_availability_id || av.id}
                            title={`${av.startTime || ""} ${av.endTime || ""}`}
                            style={{
                              backgroundColor: color,
                              color: "#fff",
                              padding: "2px 6px",
                              borderRadius: 9999,
                              fontSize: 10,
                              lineHeight: 1,
                              boxShadow: "0 1px 0 rgba(0,0,0,0.06)",
                            }}
                          >
                            Av
                          </span>
                        );
                      })}

                      {/* booking count */}
                      {dayBookings.length > 0 && (
                        <span className="ml-1 text-[10px] bg-blue-500 text-white px-2 rounded-full">
                          {dayBookings.length}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="mt-2 space-y-1 max-h-[60px] overflow-hidden">
                    {/* Show bookings with their status colors */}
                    {dayBookings.slice(0, 3).map((b) => {
                      const statusColors = getBookingStatusColor(b.bookingStatus);
                      return (
                        <div
                          key={b.booking_id || b.bookingId}
                          className="flex items-center justify-between px-2 py-1 text-xs truncate border rounded"
                          style={{
                            background: statusColors.pillBg,
                            color: statusColors.text,
                            borderColor: statusColors.border,
                          }}
                        >
                          <div className="truncate" style={{ display: "flex", gap: 6, alignItems: "center" }}>
                            <span
                              style={{
                                width: 8,
                                height: 8,
                                borderRadius: 999,
                                backgroundColor: statusColors.dot,
                                display: "inline-block",
                                marginRight: 6,
                              }}
                            />
                            <span className="truncate">
                              {b.bookingTime ? b.bookingTime.substring(0, 5) : ""} • {b.userName}
                            </span>
                          </div>

                          {/* keep compact badge look */}
                          <div style={{ marginLeft: 8, fontSize: 11, color: statusColors.bg }}>
                            {statusColors.name === "pending" ? "Pending" : statusColors.name === "confirmed" ? "Accepted" : statusColors.name === "rejected" ? "Rejected" : "Done"}
                          </div>
                        </div>
                      );
                    })}
                    {dayBookings.length > 3 && (
                      <div className="text-xs text-right text-blue-500">
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
  );

  //--- Week and Day Views ---
  const HOURS = Array.from(
    { length: 24 },
    (_, i) => `${String(i).padStart(2, "0")}:00`
  );

  const renderWeekMain = () => (
    <div className="overflow-hidden bg-white border shadow-md rounded-xl">
      <div className="grid grid-cols-[60px_1fr]">
        <div />
        <div className="grid grid-cols-7 border-b bg-gray-50">
          {weekDays.map((d) => {
            const dayAvs = availabilitiesForDate(d);
            const isAvailable = dayAvs.length > 0;
            const isToday = isSameDay(d, new Date());
            const headerBg =
              isAvailable && dayAvs.length
                ? hslToRgba(getColorForAvailability(dayAvs[0]), 0.08)
                : undefined;

            return (
              <div
                key={d.toISOString()}
                className={`py-2 text-sm font-medium text-center ${isToday ? "border-green-300" : ""}`}
                style={{ background: headerBg }}
              >
                <div>{d.toLocaleDateString("en-US", { weekday: "short" })}</div>
                <div
                  className={`text-xs ${isToday ? "font-bold text-green-700" : "text-gray-500"}`}
                >
                  {d.getDate()}
                </div>
                {isAvailable && (
                  <div className="flex items-center justify-center gap-1 mt-1">
                    {dayAvs.slice(0, 2).map((av) => (
                      <span
                        key={av.vendor_availability_id || av.id}
                        style={{
                          width: 26,
                          height: 8,
                          borderRadius: 999,
                          backgroundColor: getColorForAvailability(av),
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      <div className="grid grid-cols-[60px_1fr] h-[520px] overflow-auto">
        <div className="border-r">
          <div className="flex flex-col">
            {HOURS.map((h) => (
              <div
                key={h}
                className="h-10 py-1 pr-2 text-xs text-right text-gray-400"
              >
                {h}
              </div>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-7 divide-x">
          {weekDays.map((d) => {
            const key = d.toDateString();
            const dayBookings = bookingsByDay[key] || [];
            const dayAvs = availabilitiesForDate(d);
            const isAvailable = dayAvs.length > 0;
            const isToday = isSameDay(d, new Date());
            const columnBg = isAvailable
              ? hslToRgba(getColorForAvailability(dayAvs[0]), 0.06)
              : "";

            return (
              <div
                key={key}
                className={`min-h-full p-2 relative ${isToday ? "border-green-300" : ""}`}
                onClick={() => handleDateClick(d)}
                style={{ background: columnBg }}
              >
                {/* show bookings with proper colors */}
                {dayBookings.length > 0 ? (
                  dayBookings.map((b) => {
                    const hour =
                      parseInt((b.bookingTime || "00:00").split(":")[0], 10) ||
                      0;
                    const top = (hour / 24) * 100;
                    const statusColors = getBookingStatusColor(b.bookingStatus);
                    return (
                      <div
                        key={b.booking_id || b.bookingId}
                        style={{ top: `${top}%` }}
                        className="absolute p-2 text-xs border rounded shadow-sm left-2 right-2"
                        Style={{
                          top: `${top}%`,
                          left: "8px",
                          right: "8px",
                          padding: "8px",
                          borderRadius: 8,
                          background: statusColors.pillBg,
                          color: statusColors.text,
                          border: `1px solid ${statusColors.border}`,
                        }}
                      >
                        <div className="font-semibold" style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <span
                            style={{
                              width: 10,
                              height: 10,
                              borderRadius: 999,
                              backgroundColor: statusColors.dot,
                              display: "inline-block",
                            }}
                          />
                          <div className="truncate">
                            {b.bookingTime ? b.bookingTime.substring(0, 5) : ""} • {b.serviceName}
                          </div>
                        </div>
                        <div className="truncate" style={{ fontSize: 12, color: "#374151" }}>
                          {b.userName}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="flex items-center justify-center h-full text-xs text-gray-300">
                    No bookings
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  const renderDayMain = () => {
    const key = currentDate.toDateString();
    const dayBookings = bookingsByDay[key] || [];
    const dayAvs = availabilities.filter((av) =>
      isDateInAvailability(currentDate, av)
    );
    const isAvailable = dayAvs.length > 0;
    const isToday = isSameDay(currentDate, new Date());

    return (
      <div
        className={`overflow-hidden border shadow-md rounded-xl ${
          isAvailable ? "border-green-200" : "bg-white"
        } ${isToday ? "border-green-300" : ""}`}
      >
        <div
          className="p-5 border-b bg-gray-50"
          style={
            isAvailable
              ? {
                  background:
                    dayAvs.length > 0
                      ? hslToRgba(getColorForAvailability(dayAvs[0]), 0.06)
                      : undefined,
                }
              : undefined
          }
        >
          <h3 className="text-lg font-semibold text-gray-800">
            {currentDate.toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </h3>
          {isAvailable && (
            <div className="mt-1 text-sm text-green-700">
              You have availability set for this day
            </div>
          )}

          {dayAvs.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 mt-3">
              {dayAvs.map((a) => {
                const color = getColorForAvailability(a);
                return (
                  <div
                    key={a.vendor_availability_id}
                    className="flex items-center gap-3 px-3 py-1 text-sm rounded-full"
                    style={{
                      backgroundColor: hslToRgba(color, 0.12),
                      color: color,
                      border: `1px solid ${hslToRgba(color, 0.2)}`,
                    }}
                  >
                    <span
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: 999,
                        backgroundColor: color,
                        display: "inline-block",
                      }}
                    />
                    <div className="text-xs">
                      {a.startTime} - {a.endTime}{" "}
                      <span className="text-xs text-gray-500">({a.startDate}{a.startDate !== a.endDate ? ` → ${a.endDate}` : ""})</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div className="p-4">
          {dayAvs.length > 0 ? (
            <div className="mb-4 space-y-2">
              {dayAvs.map((a) => (
                <div
                  key={a.vendor_availability_id}
                  className="flex items-center justify-between p-3 rounded"
                  style={{
                    backgroundColor: hslToRgba(getColorForAvailability(a), 0.10),
                    border: `1px solid ${hslToRgba(getColorForAvailability(a), 0.18)}`,
                  }}
                >
                  <div>
                    <div style={{ color: getColorForAvailability(a) }} className="text-sm font-medium">
                      {a.startTime} - {a.endTime}
                    </div>
                    <div className="text-xs text-gray-600">
                      {a.startDate} {a.startDate !== a.endDate && `→ ${a.endDate}`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mb-4 text-sm text-gray-500">No availability for this day</div>
          )}

          <div className="divide-y">
            {dayBookings.length > 0 ? (
              dayBookings.map((b) => {
                const statusColors = getBookingStatusColor(b.bookingStatus);
                return (
                  <div
                    key={b.booking_id || b.bookingId}
                    className="flex items-start justify-between p-4 mb-2 rounded-lg"
                    style={{
                      background: statusColors.pillBg,
                      border: `1px solid ${statusColors.border}`,
                      color: statusColors.text,
                    }}
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1 text-sm text-gray-500">
                        <Clock size={16} />{" "}
                        <span>{formatTime(b.bookingTime)}</span>
                      </div>
                      <h4 className="font-bold text-gray-700 truncate">
                        {b.serviceName}
                      </h4>
                      <div className="mt-1 text-sm text-gray-600">
                        <User size={16} className="inline" /> {b.userName}
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      {/* Keep StatusBadge, but add a small matching dot to ensure visual parity */}
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span
                            style={{
                              width: 10,
                              height: 10,
                              borderRadius: 999,
                              backgroundColor: statusColors.dot,
                              display: "inline-block",
                            }}
                          />
                          <StatusBadge status={b.bookingStatus} />
                        </div>
                      </div>

                      {b.bookingStatus === 0 && (
                        <div className="flex gap-2 mt-3">
                          <button
                            onClick={() =>
                              handleUpdateStatus(b.booking_id || b.bookingId, 1)
                            }
                            className="px-3 py-1.5 bg-green-50 border border-green-200 text-green-700 rounded-md text-xs hover:bg-green-100"
                          >
                            <CheckCircle className="mr-1" size={16} /> Accept
                          </button>
                          <button
                            onClick={() =>
                              handleUpdateStatus(b.booking_id || b.bookingId, 2)
                            }
                            className="px-3 py-1.5 bg-red-50 border border-red-200 text-red-700 rounded-md text-xs hover:bg-red-100"
                          >
                            <XCircle className="mr-1" size={16} /> Reject
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center text-gray-400">
                No bookings scheduled for this day
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderSelectedDateDetails = () => {
    if (!selectedDate)
      return (
        <div className="hidden p-8 bg-white border-l shadow-md lg:block rounded-xl">
          <div className="text-center text-gray-400">
            Select a day to view bookings & availability
          </div>
        </div>
      );

    const isAvailable = hasAvailability(selectedDate);

    return (
      <aside className="w-full lg:w-[340px] p-5 bg-white border-l rounded-xl shadow-md">
        <div className="flex items-start justify-between mb-2">
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
              {selectedBookings.length !== 1 ? "s" : ""} •{" "}
              {selectedDateAvailabilities.length} availability
              {selectedDateAvailabilities.length !== 1 ? "s" : ""}
            </p>
            {isAvailable && (
              <p className="mt-1 text-xs text-green-700">
                This day has availability set
              </p>
            )}
          </div>
          <button
            onClick={() => {
              setSelectedDate(null);
              setSelectedBookings([]);
            }}
            className="p-2 rounded-full hover:bg-gray-100"
          >
            <XCircle className="text-gray-600" />
          </button>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold">Availabilities</h4>
            <button
              onClick={() => openCreateModalForDate(selectedDate)}
              className="px-2 py-1 text-xs text-green-700 rounded bg-green-50 hover:bg-green-100"
            >
              Add
            </button>
          </div>

          <div className="space-y-3">
            {selectedDateAvailabilities.length > 0 ? (
              selectedDateAvailabilities
                .slice()
                .sort((a, b) =>
                  (a.startTime || "").localeCompare(b.startTime || "")
                )
                .map((a) => (
                  <div
                    key={a.vendor_availability_id}
                    className="flex items-start justify-between p-3 bg-green-100 border border-green-300 rounded"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-green-800">
                        {a.startTime} - {a.endTime}
                      </div>
                      <div className="text-xs text-green-600 truncate">
                        {a.startDate}{" "}
                        {a.startDate !== a.endDate && `→ ${a.endDate}`}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 ml-3">
                      <button
                        onClick={() => openEditModal(a)}
                        className="p-1 text-xs border rounded hover:bg-green-200"
                        title="Edit"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() =>
                          removeAvailability(a.vendor_availability_id)
                        }
                        className="p-1 text-xs border rounded hover:bg-red-200"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))
            ) : (
              <div className="py-3 text-sm text-gray-500">No availability</div>
            )}
          </div>

          <div className="mt-6">
            <h4 className="mb-2 text-sm font-semibold">Bookings</h4>
            <div className="divide-y">
              {selectedBookings.length > 0 ? (
                selectedBookings
                  .slice()
                  .sort((a, b) =>
                    (a.bookingTime || "").localeCompare(b.bookingTime || "")
                  )
                  .map((b) => {
                    const statusColors = getBookingStatusColor(b.bookingStatus);
                    return (
                      <div
                        key={b.booking_id || b.bookingId}
                        className="flex items-start justify-between px-2 py-3 border rounded"
                        style={{
                          background: statusColors.pillBg,
                          border: `1px solid ${statusColors.border}`,
                          color: statusColors.text,
                        }}
                      >
                        <div className="min-w-0" style={{ display: "flex", gap: 10, alignItems: "center" }}>
                          <span
                            style={{
                              width: 10,
                              height: 10,
                              borderRadius: 999,
                              backgroundColor: statusColors.dot,
                              display: "inline-block",
                            }}
                          />
                          <div>
                            <div className="text-sm font-medium truncate">
                              {b.serviceName}
                            </div>
                            <div className="text-xs text-gray-600">
                              {b.bookingTime} • {b.userName}
                            </div>
                          </div>
                        </div>
                        <div className="ml-3 text-right" style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
                          <StatusBadge status={b.bookingStatus} />
                        </div>
                      </div>
                    );
                  })
              ) : (
                <div className="py-6 text-sm text-gray-500">No bookings</div>
              )}
            </div>
          </div>
        </div>
      </aside>
    );
  };

  //--- Main Render
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
    <div className="px-4 mx-auto max-w-7xl py-7">
      <div className="flex flex-col lg:flex-row gap-7">
        <div className="flex-1 min-w-0">
          {renderHeader()}
          <div className="mt-2">
            {viewMode === "month" && renderMonthMain()}
            {viewMode === "week" && renderWeekMain()}
            {viewMode === "day" && renderDayMain()}
          </div>
        </div>
        <div className="w-full lg:w-[340px] shrink-0">
          {renderSelectedDateDetails()}
        </div>
      </div>

      {/* Create Availability Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md p-6 bg-white shadow-xl rounded-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">New Availability</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 rounded-full hover:bg-gray-100"
              >
                <XCircle />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-600">
                  Start date
                </label>
                <input
                  value={availabilityForm.startDate}
                  onChange={(e) =>
                    setAvailabilityForm((s) => ({
                      ...s,
                      startDate: e.target.value,
                    }))
                  }
                  className="w-full p-2 text-sm border rounded"
                  type="date"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600">End date</label>
                <input
                  value={availabilityForm.endDate}
                  onChange={(e) =>
                    setAvailabilityForm((s) => ({
                      ...s,
                      endDate: e.target.value,
                    }))
                  }
                  className="w-full p-2 text-sm border rounded"
                  type="date"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-600">
                    Start time
                  </label>
                  <input
                    value={availabilityForm.startTime}
                    onChange={(e) =>
                      setAvailabilityForm((s) => ({
                        ...s,
                        startTime: e.target.value,
                      }))
                    }
                    className="w-full p-2 text-sm border rounded"
                    type="time"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600">
                    End time
                  </label>
                  <input
                    value={availabilityForm.endTime}
                    onChange={(e) =>
                      setAvailabilityForm((s) => ({
                        ...s,
                        endTime: e.target.value,
                      }))
                    }
                    className="w-full p-2 text-sm border rounded"
                    type="time"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-4">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={submitCreateAvailability}
                  disabled={loadingAvail}
                  className={`px-4 py-2 text-sm text-white rounded-md ${
                    loadingAvail
                      ? "bg-green-400 cursor-not-allowed"
                      : "bg-green-600 hover:bg-green-700"
                  }`}
                >
                  {loadingAvail ? "Saving..." : "Create"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Availability Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md p-6 bg-white shadow-xl rounded-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Edit Availability</h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-2 rounded-full hover:bg-gray-100"
              >
                <XCircle />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-600">Start date</label>
                <input
                  value={availabilityForm.startDate}
                  onChange={(e) =>
                    setAvailabilityForm((s) => ({
                      ...s,
                      startDate: e.target.value,
                    }))
                  }
                  className="w-full p-2 text-sm border rounded"
                  type="date"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600">End date</label>
                <input
                  value={availabilityForm.endDate}
                  onChange={(e) =>
                    setAvailabilityForm((s) => ({
                      ...s,
                      endDate: e.target.value,
                    }))
                  }
                  className="w-full p-2 text-sm border rounded"
                  type="date"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-600">Start time</label>
                  <input
                    value={availabilityForm.startTime}
                    onChange={(e) =>
                      setAvailabilityForm((s) => ({
                        ...s,
                        startTime: e.target.value,
                      }))
                    }
                    className="w-full p-2 text-sm border rounded"
                    type="time"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600">End time</label>
                  <input
                    value={availabilityForm.endTime}
                    onChange={(e) =>
                      setAvailabilityForm((s) => ({
                        ...s,
                        endTime: e.target.value,
                      }))
                    }
                    className="w-full p-2 text-sm border rounded"
                    type="time"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-4">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={submitEditAvailability}
                  disabled={loadingAvail}
                  className={`px-4 py-2 text-sm text-white rounded-md ${
                    loadingAvail
                      ? "bg-green-400 cursor-not-allowed"
                      : "bg-green-600 hover:bg-green-700"
                  }`}
                >
                  {loadingAvail ? "Saving..." : "Update"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Calendar;
