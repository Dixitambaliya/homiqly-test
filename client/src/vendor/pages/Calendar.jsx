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
      // assuming response shape { vendor_id, availabilities: [...] }
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
      // if side panel showing this availability, clear selection
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
    // normalize date-only comparisons
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const s = new Date(av.startDate);
    const e = new Date(av.endDate);
    const start = new Date(s.getFullYear(), s.getMonth(), s.getDate());
    const end = new Date(e.getFullYear(), e.getMonth(), e.getDate());
    return d >= start && d <= end;
  };

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
      const d = new Date(b.bookingDate);
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
    // basic validation
    const { startDate, endDate, startTime, endTime } = availabilityForm;
    if (!startDate || !endDate || !startTime || !endTime) {
      toast.error("All fields are required");
      return;
    }
    // payload shape matching your API screenshot
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
      <div className="flex flex-col sm:flex-row justify-between items-center pb-7">
        <div className="flex gap-2 items-center">
          <button
            onClick={handlePreviousPeriod}
            className="text-gray-600 hover:bg-gray-100 p-2 rounded-full"
          >
            <ArrowLeft size={20} />
          </button>
          <span className="text-lg font-bold">{title}</span>
          <button
            onClick={handleNextPeriod}
            className="text-gray-600 hover:bg-gray-100 p-2 rounded-full"
          >
            <ArrowRight size={20} />
          </button>
          <button
            onClick={handleToday}
            className="ml-3 px-3 py-1 text-xs sm:text-sm bg-blue-50 text-blue-700 rounded-full hover:bg-blue-100 transition"
          >
            Today
          </button>
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-full p-1 mt-4 sm:mt-0">
          {["month", "week", "day"].map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-4 py-1 rounded-full text-xs sm:text-sm ${
                viewMode === mode
                  ? "bg-blue-600 text-white shadow"
                  : "text-gray-700"
              }`}
            >
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 mt-4 sm:mt-0">
          <button
            onClick={() => openCreateModalForDate(selectedDate || new Date())}
            className="ml-3 px-2 py-1 flex items-center gap-2 bg-blue-600 text-white rounded-full shadow hover:bg-blue-700 transition"
          >
            <Plus size={16} /> New Availability
          </button>
        </div>
      </div>
    );
  };

  const renderMonthMain = () => (
    <div className="rounded-xl bg-white shadow-md overflow-hidden border">
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
              // find any availabilities for this day
              const dayAvs = availabilities.filter((av) =>
                isDateInAvailability(day, av)
              );
              const avCount = dayAvs.length;
              return (
                <div
                  key={key}
                  onClick={() => handleDateClick(day)}
                  tabIndex={0}
                  className={`border p-2 sm:min-h-[100px] min-h-[64px] cursor-pointer transition 
                    ${isCurrentMonth ? "bg-white" : "bg-gray-50 text-gray-300"} 
                    ${
                      isToday
                        ? "border-blue-600 border-2 bg-blue-50"
                        : "border-gray-200"
                    }
                    rounded-md hover:bg-blue-100`}
                >
                  <div className="flex justify-between items-center">
                    <div
                      className={`text-xs font-semibold ${
                        isToday ? "text-blue-600" : ""
                      }`}
                    >
                      {day.getDate()}
                    </div>

                    {avCount > 0 && (
                      <span className="ml-1 text-[10px] bg-green-100 text-green-700 px-2 rounded-full">
                        Av: {avCount}
                      </span>
                    )}

                    {dayBookings.length > 0 && (
                      <span className="ml-1 text-[10px] bg-blue-100 text-blue-600 px-2 rounded-full">
                        {dayBookings.length}
                      </span>
                    )}
                  </div>
                  <div className="mt-2 space-y-1 max-h-[60px] overflow-hidden">
                    {/* show some availabilities first */}
                    {dayAvs.slice(0, 2).map((a) => (
                      <div
                        key={
                          a.vendor_availability_id || `${key}-${a.startTime}`
                        }
                        className="text-xs py-1 px-2 rounded truncate bg-green-50 text-green-800"
                      >
                        {a.startTime ? a.startTime.substring(0, 5) : ""} -{" "}
                        {a.endTime ? a.endTime.substring(0, 5) : ""} •{" "}
                        {a.startDate === a.endDate
                          ? formatDate(new Date(a.startDate))
                          : `${formatDate(
                              new Date(a.startDate)
                            )} → ${formatDate(new Date(a.endDate))}`}
                      </div>
                    ))}
                    {dayAvs.length > 2 && (
                      <div className="text-xs text-right text-green-500">
                        +{dayAvs.length - 2} more
                      </div>
                    )}
                    {/* then bookings */}
                    {dayBookings.slice(0, 2).map((b) => (
                      <div
                        key={b.booking_id || b.bookingId}
                        className={`text-xs py-1 px-2 rounded truncate
                          ${
                            b.bookingStatus === 0
                              ? "bg-yellow-100 text-yellow-800"
                              : b.bookingStatus === 1
                              ? "bg-blue-100 text-blue-800"
                              : b.bookingStatus === 2
                              ? "bg-red-100 text-red-800"
                              : "bg-gray-100 text-gray-600"
                          } 
                        `}
                      >
                        {b.bookingTime ? b.bookingTime.substring(0, 5) : ""} •{" "}
                        {b.userName}
                      </div>
                    ))}
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
    <div className="rounded-xl bg-white shadow-md overflow-hidden border">
      <div className="grid grid-cols-[60px_1fr]">
        <div />
        <div className="grid grid-cols-7 border-b bg-gray-50">
          {weekDays.map((d) => (
            <div
              key={d.toISOString()}
              className="py-2 text-center text-sm font-medium text-gray-500"
            >
              <div>{d.toLocaleDateString("en-US", { weekday: "short" })}</div>
              <div
                className={`text-xs ${
                  isSameDay(d, new Date()) ? "font-bold text-blue-700" : ""
                }`}
              >
                {d.getDate()}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-[60px_1fr] h-[520px] overflow-auto">
        <div className="border-r">
          <div className="flex flex-col">
            {HOURS.map((h) => (
              <div
                key={h}
                className="h-10 text-xs py-1 text-right pr-2 text-gray-400"
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
            const dayAvs = availabilities.filter((av) =>
              isDateInAvailability(d, av)
            );
            return (
              <div
                key={key}
                className={`min-h-full p-2 relative ${
                  isSameDay(d, new Date()) ? "bg-blue-50" : ""
                }`}
                onClick={() => handleDateClick(d)}
              >
                {/* show availabilities as thin blocks at top */}
                {dayAvs.length > 0 && (
                  <div className="mb-2 space-y-1">
                    {dayAvs.map((a) => (
                      <div
                        key={
                          a.vendor_availability_id || `${key}-${a.startTime}`
                        }
                        className="text-[11px] px-2 py-1 rounded bg-green-50 text-green-800 shadow-sm truncate"
                      >
                        {a.startTime?.substring(0, 5)} -{" "}
                        {a.endTime?.substring(0, 5)} •{" "}
                        {a.startDate === a.endDate
                          ? formatDate(new Date(a.startDate))
                          : `${formatDate(
                              new Date(a.startDate)
                            )} → ${formatDate(new Date(a.endDate))}`}
                      </div>
                    ))}
                  </div>
                )}
                {dayBookings.length > 0 ? (
                  dayBookings.map((b) => {
                    const hour =
                      parseInt((b.bookingTime || "00:00").split(":")[0], 10) ||
                      0;
                    const top = (hour / 24) * 100;
                    return (
                      <div
                        key={b.booking_id || b.bookingId}
                        style={{ top: `${top}%` }}
                        className={`absolute left-2 right-2 p-2 rounded text-xs shadow-sm
                          ${
                            b.bookingStatus === 0
                              ? "bg-yellow-100 text-yellow-800"
                              : b.bookingStatus === 1
                              ? "bg-blue-100 text-blue-800"
                              : b.bookingStatus === 2
                              ? "bg-red-100 text-red-800"
                              : "bg-gray-100 text-gray-600"
                          }
                        `}
                      >
                        <div className="font-semibold">
                          {b.bookingTime ? b.bookingTime.substring(0, 5) : ""} •{" "}
                          {b.serviceName}
                        </div>
                        <div className="truncate">{b.userName}</div>
                      </div>
                    );
                  })
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-gray-300">
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
    return (
      <div className="rounded-xl bg-white shadow-md border overflow-hidden">
        <div className="p-5 border-b bg-gray-50">
          <h3 className="text-lg font-semibold text-gray-800">
            {currentDate.toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </h3>
        </div>
        <div className="p-4">
          {dayAvs.length > 0 ? (
            <div className="mb-4 space-y-2">
              {dayAvs.map((a) => (
                <div
                  key={a.vendor_availability_id}
                  className="flex items-center justify-between bg-green-50 p-3 rounded"
                >
                  <div>
                    <div className="text-sm font-medium">
                      {a.startTime} - {a.endTime}
                    </div>
                    <div className="text-xs text-gray-600">
                      {a.startDate}{" "}
                      {a.startDate !== a.endDate && `→ ${a.endDate}`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mb-4 text-sm text-gray-500">
              No availability for this day
            </div>
          )}

          <div className="divide-y">
            {dayBookings.length > 0 ? (
              dayBookings.map((b) => (
                <div
                  key={b.booking_id || b.bookingId}
                  className="p-4 flex items-start justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1 text-sm text-gray-500">
                      <Clock size={16} />{" "}
                      <span>{formatTime(b.bookingTime)}</span>
                    </div>
                    <h4 className="font-bold text-gray-700 truncate">
                      {b.serviceName}
                    </h4>
                    <div className="text-sm text-gray-600 mt-1">
                      <User size={16} className="inline" /> {b.userName}
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <StatusBadge status={b.bookingStatus} />
                    {b.bookingStatus === 0 && (
                      <div className="mt-3 flex gap-2">
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
              ))
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
        <div className="hidden lg:block p-8 border-l bg-white rounded-xl shadow-md">
          <div className="text-center text-gray-400">
            Select a day to view bookings & availability
          </div>
        </div>
      );

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
          <div className="mb-3 flex items-center justify-between">
            <h4 className="text-sm font-semibold">Availabilities</h4>
            <button
              onClick={() => openCreateModalForDate(selectedDate)}
              className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded"
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
                    className="p-3 rounded border bg-green-50 flex items-start justify-between"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium">
                        {a.startTime} - {a.endTime}
                      </div>
                      <div className="text-xs text-gray-600 truncate">
                        {a.startDate}{" "}
                        {a.startDate !== a.endDate && `→ ${a.endDate}`}
                      </div>
                    </div>
                    <div className="ml-3 flex flex-col gap-2">
                      <button
                        onClick={() => openEditModal(a)}
                        className="p-1 rounded border text-xs"
                        title="Edit"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() =>
                          removeAvailability(a.vendor_availability_id)
                        }
                        className="p-1 rounded border text-xs"
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
            <h4 className="text-sm font-semibold mb-2">Bookings</h4>
            <div className="divide-y">
              {selectedBookings.length > 0 ? (
                selectedBookings
                  .slice()
                  .sort((a, b) =>
                    (a.bookingTime || "").localeCompare(b.bookingTime || "")
                  )
                  .map((b) => (
                    <div
                      key={b.booking_id || b.bookingId}
                      className="py-3 flex items-start justify-between"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">
                          {b.serviceName}
                        </div>
                        <div className="text-xs text-gray-600">
                          {b.bookingTime} • {b.userName}
                        </div>
                      </div>
                      <div className="ml-3 text-right">
                        <StatusBadge status={b.bookingStatus} />
                      </div>
                    </div>
                  ))
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
    <div className="max-w-7xl mx-auto px-4 py-7">
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
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
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
                  className="w-full border rounded p-2 text-sm"
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
                  className="w-full border rounded p-2 text-sm"
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
                    className="w-full border rounded p-2 text-sm"
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
                    className="w-full border rounded p-2 text-sm"
                    type="time"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-1 text-sm rounded border"
                >
                  Cancel
                </button>
                <button
                  onClick={submitCreateAvailability}
                  className="px-3 py-1 text-sm rounded bg-blue-600 text-white"
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Availability Modal */}
      {showEditModal && selectedAvailToEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
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
                  className="w-full border rounded p-2 text-sm"
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
                  className="w-full border rounded p-2 text-sm"
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
                    className="w-full border rounded p-2 text-sm"
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
                    className="w-full border rounded p-2 text-sm"
                    type="time"
                  />
                </div>
              </div>

              <div className="flex justify-between items-center">
                <div>
                  <button
                    onClick={() =>
                      removeAvailability(
                        selectedAvailToEdit.vendor_availability_id
                      )
                    }
                    className="px-3 py-1 text-sm rounded border text-red-600"
                  >
                    Delete
                  </button>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowEditModal(false)}
                    className="px-3 py-1 text-sm rounded border"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={submitEditAvailability}
                    className="px-3 py-1 text-sm rounded bg-blue-600 text-white"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Calendar;
