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
  AlertCircle,
  Pencil,
  Trash,
} from "lucide-react";
import LoadingSpinner from "../../shared/components/LoadingSpinner";
import StatusBadge from "../../shared/components/StatusBadge";
import { formatDate, formatTime } from "../../shared/utils/dateUtils";
import { Button } from "../../shared/components/Button";
import Modal from "../../shared/components/Modal/Modal";

/* ---------- Constants ---------- */
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HOURS = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, "0")}:00`);

/* ---------- Small Utils (condensed & reused) ---------- */
const startOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1);
const endOfMonth = (d) => new Date(d.getFullYear(), d.getMonth() + 1, 0);
const startOfWeek = (d) => { const s = new Date(d); s.setDate(d.getDate() - d.getDay()); s.setHours(0, 0, 0, 0); return s; };
const endOfWeek = (d) => { const e = startOfWeek(d); e.setDate(e.getDate() + 6); e.setHours(23, 59, 59, 999); return e; };
const isSameDay = (a, b) => a.toDateString() === b.toDateString();
const toDateKey = (d) => new Date(d).toDateString();

const inRange = (date, s, e) => {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const S = new Date(s), E = new Date(e);
  const sd = new Date(S.getFullYear(), S.getMonth(), S.getDate());
  const ed = new Date(E.getFullYear(), E.getMonth(), E.getDate());
  return d >= sd && d <= ed;
};

const colorForAvailability = (av) => {
  if (!av) return "hsl(160 70% 45%)";
  if (av.color) return av.color;
  const seed = String(av.vendor_availability_id || av.id || `${av.startDate}-${av.endDate}`);
  let h = 0; for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 360;
  return `hsl(${h} 70% 45%)`;
};
const rgbaFromHsl = (hsl, a = 0.12) => hsl.replace("hsl(", "hsla(").replace(")", `, ${a})`);

const statusColors = (s) => {
  switch (s) {
    case 0: // pending
      return { name: "Pending", bg: "rgba(250,204,21,.10)", border: "#f5d88a", text: "#92400e", dot: "#f59e0b" };
    case 1: // confirmed
      return { name: "Accepted", bg: "rgba(16,185,129,.10)", border: "#bbf7d0", text: "#065f46", dot: "#10b981" };
    case 2: // rejected
      return { name: "Rejected", bg: "rgba(254,202,202,.10)", border: "#fecaca", text: "#991b1b", dot: "#ef4444" };
    default: // completed
      return { name: "Done", bg: "rgba(59,130,246,.08)", border: "#bfdbfe", text: "#1e3a8a", dot: "#3b82f6" };
  }
};

const Calendar = () => {
  /* ---------- State ---------- */
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

  // delete modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteMode, setDeleteMode] = useState("all"); // "all" | "date"
  const [deleteStartDate, setDeleteStartDate] = useState("");
  const [deleteEndDate, setDeleteEndDate] = useState("");
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteBookedDates, setDeleteBookedDates] = useState([]);

  // create/edit form
  const emptyForm = { startDate: "", endDate: "", startTime: "09:00", endTime: "18:00" };
  const [availabilityForm, setAvailabilityForm] = useState(emptyForm);

  /* ---------- Effects ---------- */
  useEffect(() => { fetchBookings(); fetchAvailabilities(); }, []);

  /* ---------- API ---------- */
  const fetchBookings = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get("/api/booking/vendorassignedservices");
      setBookings(data.bookings || []);
    } catch {
      setError("Failed to load bookings");
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailabilities = async () => {
    try {
      setLoadingAvail(true);
      const { data } = await axios.get("/api/vendor/get-availability");
      setAvailabilities(data.availabilities || []);
    } catch {
      toast.error("Failed to load availabilities");
    } finally {
      setLoadingAvail(false);
    }
  };

  const createAvailability = async (payload) => {
    try {
      const { data } = await axios.post("/api/vendor/set-availability", payload);
      toast.success(data.message || "Availability set successfully");
      setShowCreateModal(false);
      setAvailabilityForm(emptyForm);
      await fetchAvailabilities();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to create availability");
    }
  };

  const updateAvailability = async (id, payload) => {
    try {
      const { data } = await axios.put(`/api/vendor/edit-availability/${id}`, payload);
      toast.success(data.message || "Availability updated successfully");
      setShowEditModal(false);
      setSelectedAvailToEdit(null);
      setAvailabilityForm(emptyForm);
      await fetchAvailabilities();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to update availability");
    }
  };

  const openDeleteModal = (av) => {
    setDeleteTarget(av);
    setDeleteMode("all");
    setDeleteBookedDates([]);
    setDeleteStartDate(av?.startDate || "");
    setDeleteEndDate(av?.endDate || av?.startDate || "");
    setShowDeleteModal(true);
  };

  const submitDeleteAvailability = async () => {
    if (!deleteTarget) return;
    const id = deleteTarget.vendor_availability_id || deleteTarget.id;
    const url = `/api/vendor/delete-availability/${id}`;

    const payload =
      deleteMode === "all"
        ? {}
        : { startDate: deleteStartDate, endDate: deleteEndDate };

    try {
      setDeleteBusy(true);
      setDeleteBookedDates([]);
      const res = await axios.delete(url, { data: payload });
      toast.success(res?.data?.message || "Availability deleted successfully");
      setShowDeleteModal(false);
      setDeleteTarget(null);
      await fetchAvailabilities();
    } catch (err) {
      setDeleteBookedDates(err?.response?.data?.bookedDates || []);
      toast.error(
        err?.response?.data?.message ||
        "Failed to delete availability. Please try again."
      );
    } finally {
      setDeleteBusy(false);
    }
  };


  /* ---------- Derived ---------- */
  const monthMatrix = useMemo(() => {
    const ms = startOfMonth(currentDate), me = endOfMonth(currentDate);
    const start = new Date(ms); start.setDate(start.getDate() - start.getDay());
    const end = new Date(me); end.setDate(end.getDate() + (6 - end.getDay()));
    const weeks = [], it = new Date(start);
    while (it <= end) {
      const w = []; for (let i = 0; i < 7; i++) { w.push(new Date(it)); it.setDate(it.getDate() + 1); }
      weeks.push(w);
    }
    return weeks;
  }, [currentDate]);

  const weekDays = useMemo(() => {
    const s = startOfWeek(currentDate);
    return Array.from({ length: 7 }, (_, i) => { const d = new Date(s); d.setDate(s.getDate() + i); return d; });
  }, [currentDate]);

  const bookingsByDay = useMemo(() => {
    const map = {};
    bookings.forEach((b) => {
      const d = new Date(b.bookingDate || b.date || b.dateBooked || b.booking_date);
      const k = toDateKey(d);
      (map[k] ||= []).push(b);
    });
    Object.keys(map).forEach((k) => map[k].sort((a, b) => (a.bookingTime || "").localeCompare(b.bookingTime || "")));
    return map;
  }, [bookings]);

  const availabilitiesForDate = (date) => availabilities.filter((av) => inRange(date, av.startDate, av.endDate));
  const hasAvailability = (date) => availabilities.some((av) => inRange(date, av.startDate, av.endDate));
  const selectedDateAvailabilities = useMemo(
    () => (selectedDate ? availabilitiesForDate(selectedDate) : []),
    [selectedDate, availabilities]
  );

  /* ---------- Interactions ---------- */
  const handleDateClick = (date) => {
    setSelectedDate(date);
    setSelectedBookings(bookingsByDay[toDateKey(date)] || []);
  };
  const handlePreviousPeriod = () => {
    const d = new Date(currentDate);
    if (viewMode === "month") d.setMonth(d.getMonth() - 1);
    else if (viewMode === "week") d.setDate(d.getDate() - 7);
    else d.setDate(d.getDate() - 1);
    setCurrentDate(d);
  };
  const handleNextPeriod = () => {
    const d = new Date(currentDate);
    if (viewMode === "month") d.setMonth(d.getMonth() + 1);
    else if (viewMode === "week") d.setDate(d.getDate() + 7);
    else d.setDate(d.getDate() + 1);
    setCurrentDate(d);
  };
  const handleToday = () => setCurrentDate(new Date());
  const openCreateModalForDate = (date) => {
    const iso = date ? formatDate(date) : "";
    setAvailabilityForm({ startDate: iso, endDate: iso, startTime: "09:00", endTime: "18:00" });
    setShowCreateModal(true);
  };
  const submitCreateAvailability = async () => {
    const { startDate, endDate, startTime, endTime } = availabilityForm;
    if (!startDate || !endDate || !startTime || !endTime) return toast.error("All fields are required");
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
    if (!startDate || !endDate || !startTime || !endTime) return toast.error("All fields are required");
    await updateAvailability(selectedAvailToEdit.vendor_availability_id, { startDate, endDate, startTime, endTime });
  };

  /* ---------- Header ---------- */
  const renderHeader = () => {
    const fmt = (o) => currentDate.toLocaleDateString("en-US", o);
    const title =
      viewMode === "month"
        ? fmt({ month: "long", year: "numeric" })
        : viewMode === "week"
          ? `${startOfWeek(currentDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${endOfWeek(
            currentDate
          ).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
          : fmt({ weekday: "long", month: "long", day: "numeric", year: "numeric" });

    return (
      <div className="flex flex-col items-center justify-between sm:flex-row pb-7">
        <div className="flex items-center gap-2">
          <button onClick={handlePreviousPeriod} className="p-2 text-gray-600 rounded-full hover:bg-gray-100">
            <ArrowLeft size={20} />
          </button>
          <span className="text-lg font-bold">{title}</span>
          <button onClick={handleNextPeriod} className="p-2 text-gray-600 rounded-full hover:bg-gray-100">
            <ArrowRight size={20} />
          </button>
          <button onClick={handleToday} className="px-3 py-1 ml-3 text-xs sm:text-sm text-green-700 rounded-full bg-green-50 hover:bg-green-100">
            Today
          </button>
        </div>
        <div className="flex gap-1 p-1 mt-4 bg-gray-100 rounded-full sm:mt-0">
          {["month", "week", "day"].map((m) => (
            <button
              key={m}
              onClick={() => setViewMode(m)}
              className={`px-4 py-1 rounded-full text-xs sm:text-sm ${viewMode === m ? "bg-green-600 text-white shadow" : "text-gray-700 hover:bg-green-100"
                }`}
            >
              {m[0].toUpperCase() + m.slice(1)}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 mt-4 sm:mt-0">
          <Button onClick={() => openCreateModalForDate(selectedDate || new Date())} icon={<Plus size={16} />}>
            New Availability
          </Button>
        </div>
      </div>
    );
  };

  /* ---------- Month View ---------- */
  const renderMonthMain = () => (
    <div className="overflow-hidden bg-white border shadow-md rounded-xl">
      <div className="grid grid-cols-7 border-b bg-gray-50">{DAYS.map((d) => (
        <div key={d} className="py-2 text-sm font-medium text-center text-gray-500">{d}</div>
      ))}</div>
      <div>
        {monthMatrix.map((week, wIdx) => (
          <div key={wIdx} className="grid grid-cols-7">
            {week.map((day) => {
              const key = toDateKey(day);
              const dayBookings = bookingsByDay[key] || [];
              const isCurrentMonth = day.getMonth() === currentDate.getMonth();
              const isToday = isSameDay(day, new Date());
              const dayAvs = availabilitiesForDate(day);
              const isAvailable = dayAvs.length > 0;
              const avColor = isAvailable ? colorForAvailability(dayAvs[0]) : null;

              return (
                <div
                  key={key}
                  onClick={() => handleDateClick(day)}
                  className={`border p-2 sm:min-h-[100px] min-h-[64px] cursor-pointer transition rounded-md relative ${isCurrentMonth ? "bg-white" : "bg-gray-50 text-gray-300"
                    } ${isToday ? "border-2 border-green-400 bg-white" : "border-gray-200"} hover:bg-green-100`}
                  style={{ background: isAvailable && !isToday ? rgbaFromHsl(avColor, 0.10) : undefined }}
                >
                  <div className="flex items-center justify-between">
                    <div className={`text-xs font-semibold ${isToday ? "text-green-600" : isCurrentMonth ? "text-gray-700" : "text-gray-300"}`}>
                      {day.getDate()}
                    </div>
                    <div className="flex items-center gap-1">
                      {dayAvs.slice(0, 2).map((av) => (
                        <span
                          key={av.vendor_availability_id || av.id}
                          title={`${av.startTime || ""} ${av.endTime || ""}`}
                          className="px-1.5 py-0.5 text-[10px] rounded-full text-white shadow-sm"
                          style={{ backgroundColor: colorForAvailability(av) }}
                        >
                          Av
                        </span>
                      ))}
                      {!!dayBookings.length && (
                        <span className="ml-1 text-[10px] bg-blue-500 text-white px-2 rounded-full">
                          {dayBookings.length}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-2 space-y-1 max-h-[60px] overflow-hidden">
                    {dayBookings.slice(0, 3).map((b) => {
                      const sc = statusColors(b.bookingStatus);
                      return (
                        <div
                          key={b.booking_id || b.bookingId}
                          className="flex items-center justify-between px-2 py-1 text-xs truncate border rounded"
                          style={{ background: sc.bg, color: sc.text, borderColor: sc.border }}
                        >
                          <div className="truncate flex gap-1.5 items-center">
                            <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: sc.dot }} />
                            <span className="truncate">
                              {b.bookingTime?.slice(0, 5) || ""} • {b.userName}
                            </span>
                          </div>
                          <div className="ml-2 text-[11px]" style={{ color: sc.text }}>{sc.name}</div>
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

  /* ---------- Week View ---------- */
  const renderWeekMain = () => (
    <div className="overflow-hidden bg-white border shadow-md rounded-xl">
      <div className="grid grid-cols-[60px_1fr]">
        <div />
        <div className="grid grid-cols-7 border-b bg-gray-50">
          {weekDays.map((d) => {
            const dayAvs = availabilitiesForDate(d);
            const isToday = isSameDay(d, new Date());
            const avColor = dayAvs.length ? colorForAvailability(dayAvs[0]) : null;
            return (
              <div
                key={d.toISOString()}
                className={`py-2 text-sm font-medium text-center ${isToday ? "border-green-300" : ""}`}
                style={{ background: dayAvs.length ? rgbaFromHsl(avColor, 0.08) : undefined }}
              >
                <div>{d.toLocaleDateString("en-US", { weekday: "short" })}</div>
                <div className={`text-xs ${isToday ? "font-bold text-green-700" : "text-gray-500"}`}>{d.getDate()}</div>
                {dayAvs.length > 0 && (
                  <div className="flex items-center justify-center gap-1 mt-1">
                    {dayAvs.slice(0, 2).map((av) => (
                      <span key={av.vendor_availability_id || av.id} className="w-[26px] h-2 rounded-full"
                        style={{ backgroundColor: colorForAvailability(av) }} />
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
              <div key={h} className="h-10 py-1 pr-2 text-xs text-right text-gray-400">{h}</div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-7 divide-x">
          {weekDays.map((d) => {
            const key = toDateKey(d);
            const dayBookings = bookingsByDay[key] || [];
            const dayAvs = availabilitiesForDate(d);
            const isToday = isSameDay(d, new Date());
            const avColor = dayAvs.length ? colorForAvailability(dayAvs[0]) : null;

            return (
              <div
                key={key}
                className={`min-h-full p-2 relative ${isToday ? "border-green-300" : ""}`}
                onClick={() => handleDateClick(d)}
                style={{ background: dayAvs.length ? rgbaFromHsl(avColor, 0.06) : undefined }}
              >
                {dayBookings.length ? (
                  dayBookings.map((b) => {
                    const hour = parseInt((b.bookingTime || "00:00").split(":")[0], 10) || 0;
                    const top = (hour / 24) * 100;
                    const sc = statusColors(b.bookingStatus);
                    return (
                      <div key={b.booking_id || b.bookingId} style={{ top: `${top}%` }} className="absolute left-2 right-2">
                        <div
                          className="p-2 text-xs border rounded shadow-sm w-full"
                          style={{ background: sc.bg, color: sc.text, borderColor: sc.border }}
                        >
                          <div className="font-semibold flex items-center gap-2">
                            <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: sc.dot }} />
                            <div className="truncate">
                              {b.bookingTime?.slice(0, 5) || ""} • {b.serviceName}
                            </div>
                          </div>
                          <div className="truncate text-gray-700 text-[12px]">{b.userName}</div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="flex items-center justify-center h-full text-xs text-gray-300">No bookings</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  /* ---------- Day View ---------- */
  const renderDayMain = () => {
    const key = toDateKey(currentDate);
    const dayBookings = bookingsByDay[key] || [];
    const dayAvs = availabilitiesForDate(currentDate);
    const isAvailable = !!dayAvs.length;
    const isToday = isSameDay(currentDate, new Date());

    return (
      <div className={`overflow-hidden border shadow-md rounded-xl ${isAvailable ? "border-green-200" : "bg-white"} ${isToday ? "border-green-300" : ""}`}>
        <div className="p-5 border-b bg-gray-50" style={{ background: isAvailable ? rgbaFromHsl(colorForAvailability(dayAvs[0]), 0.06) : undefined }}>
          <h3 className="text-lg font-semibold text-gray-800">
            {currentDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
          </h3>
          {isAvailable && <div className="mt-1 text-sm text-green-700">You have availability set for this day</div>}

          {dayAvs.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 mt-3">
              {dayAvs.map((a) => {
                const c = colorForAvailability(a);
                return (
                  <div key={a.vendor_availability_id}
                    className="flex items-center gap-2 px-3 py-1 text-sm rounded-full"
                    style={{ backgroundColor: rgbaFromHsl(c, 0.12), color: c, border: `1px solid ${rgbaFromHsl(c, 0.2)}` }}
                  >
                    <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c }} />
                    <div className="text-xs">
                      {a.startTime} - {a.endTime}{" "}
                      <span className="text-xs text-gray-500">
                        ({a.startDate}{a.startDate !== a.endDate ? ` → ${a.endDate}` : ""})
                      </span>
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
              {dayAvs.map((a) => {
                const c = colorForAvailability(a);
                return (
                  <div key={a.vendor_availability_id}
                    className="flex items-center justify-between p-3 rounded"
                    style={{ backgroundColor: rgbaFromHsl(c, 0.10), border: `1px solid ${rgbaFromHsl(c, 0.18)}` }}
                  >
                    <div>
                      <div className="text-sm font-medium" style={{ color: c }}>
                        {a.startTime} - {a.endTime}
                      </div>
                      <div className="text-xs text-gray-600">
                        {a.startDate}{a.startDate !== a.endDate && ` → ${a.endDate}`}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="mb-4 text-sm text-gray-500">No availability for this day</div>
          )}

          <div className="divide-y">
            {dayBookings.length ? (
              dayBookings.map((b) => {
                const sc = statusColors(b.bookingStatus);
                return (
                  <div key={b.booking_id || b.bookingId}
                    className="flex items-start justify-between p-4 mb-2 rounded-lg"
                    style={{ background: sc.bg, border: `1px solid ${sc.border}`, color: sc.text }}
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1 text-sm text-gray-600">
                        <Clock size={16} /> <span>{formatTime(b.bookingTime)}</span>
                      </div>
                      <h4 className="font-bold text-gray-700 truncate">{b.serviceName}</h4>
                      <div className="mt-1 text-sm text-gray-600">
                        <User size={16} className="inline" /> {b.userName}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div className="flex items-center gap-2">
                        <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: sc.dot }} />
                        <StatusBadge status={b.bookingStatus} />
                      </div>
                      {b.bookingStatus === 0 && (
                        <div className="flex gap-2 mt-1">
                          <button className="px-3 py-1.5 bg-green-50 border border-green-200 text-green-700 rounded-md text-xs hover:bg-green-100">
                            <CheckCircle className="mr-1" size={16} /> Accept
                          </button>
                          <button className="px-3 py-1.5 bg-red-50 border border-red-200 text-red-700 rounded-md text-xs hover:bg-red-100">
                            <XCircle className="mr-1" size={16} /> Reject
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center text-gray-400">No bookings scheduled for this day</div>
            )}
          </div>
        </div>
      </div>
    );
  };

  /* ---------- Aside (Selected Date) ---------- */
  const renderSelectedDateDetails = () => {
    if (!selectedDate)
      return (
        <div className="hidden p-8 bg-white border-l shadow-md lg:block rounded-xl">
          <div className="text-center text-gray-400">Select a day to view bookings & availability</div>
        </div>
      );

    const isAvailable = hasAvailability(selectedDate);

    return (
      <aside className="w-full lg:w-[340px] p-5 bg-white border-l rounded-xl shadow-md">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h3 className="text-lg font-semibold">
              {selectedDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {selectedBookings.length} booking{selectedBookings.length !== 1 ? "s" : ""} •{" "}
              {selectedDateAvailabilities.length} availability{selectedDateAvailabilities.length !== 1 ? "s" : ""}
            </p>
            {isAvailable && <p className="mt-1 text-xs text-green-700">This day has availability set</p>}
          </div>
          <button onClick={() => { setSelectedDate(null); setSelectedBookings([]); }} className="p-2 rounded-full hover:bg-gray-100">
            <XCircle className="text-gray-600" />
          </button>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold">Availabilities</h4>
            <button onClick={() => openCreateModalForDate(selectedDate)} className="px-2 py-1 text-xs text-green-700 rounded bg-green-50 hover:bg-green-100">
              Add
            </button>
          </div>

          <div className="space-y-3">
            {selectedDateAvailabilities.length ? (
              selectedDateAvailabilities
                .slice()
                .sort((a, b) => (a.startTime || "").localeCompare(b.startTime || ""))
                .map((a) => {
                  const c = colorForAvailability(a);
                  return (
                    <div key={a.vendor_availability_id} className="flex items-start justify-between p-3 rounded border"
                      style={{ backgroundColor: rgbaFromHsl(c, 0.10), borderColor: rgbaFromHsl(c, 0.25) }}>
                      <div className="min-w-0">
                        <div className="text-sm font-medium" style={{ color: c }}>
                          {a.startTime} - {a.endTime}
                        </div>
                        <div className="text-xs text-green-700 truncate">
                          {a.startDate} {a.startDate !== a.endDate && `→ ${a.endDate}`}
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 ml-3">
                        <button onClick={() => openEditModal(a)} className="p-1 text-xs border rounded hover:bg-green-200" title="Edit">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => openDeleteModal(a)} className="p-1 text-xs border rounded hover:bg-red-200" title="Delete">
                          <Trash size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })
            ) : (
              <div className="py-3 text-sm text-gray-500">No availability</div>
            )}
          </div>

          <div className="mt-6">
            <h4 className="mb-2 text-sm font-semibold">Bookings</h4>
            <div className="divide-y">
              {selectedBookings.length ? (
                selectedBookings
                  .slice()
                  .sort((a, b) => (a.bookingTime || "").localeCompare(b.bookingTime || ""))
                  .map((b) => {
                    const sc = statusColors(b.bookingStatus);
                    return (
                      <div key={b.booking_id || b.bookingId}
                        className="flex items-start justify-between px-2 py-3 border rounded"
                        style={{ background: sc.bg, borderColor: sc.border, color: sc.text }}
                      >
                        <div className="min-w-0 flex gap-2 items-center">
                          <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: sc.dot }} />
                          <div>
                            <div className="text-sm font-medium truncate">{b.serviceName}</div>
                            <div className="text-xs text-gray-600">
                              {b.bookingTime} • {b.userName}
                            </div>
                          </div>
                        </div>
                        <div className="ml-3"><StatusBadge status={b.bookingStatus} /></div>
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

  /* ---------- Guards ---------- */
  if (loading) return <div className="flex items-center justify-center h-64"><LoadingSpinner size="lg" /></div>;
  if (error) return <div className="p-4 rounded-md bg-red-50"><p className="text-red-500">{error}</p></div>;

  /* ---------- Render ---------- */
  return (
    <div className="px-4 mx-auto max-w-7xl">
      <div className="flex flex-col lg:flex-row gap-7">
        <div className="flex-1 min-w-0">
          {renderHeader()}
          <div className="mt-2">
            {viewMode === "month" && renderMonthMain()}
            {viewMode === "week" && renderWeekMain()}
            {viewMode === "day" && renderDayMain()}
          </div>
        </div>
        <div className="w-full lg:w-[340px] shrink-0">{renderSelectedDateDetails()}</div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <Modal onClose={() => setShowCreateModal(false)} isOpen={showCreateModal} title="New Availability" >
            <div className="space-y-3">
              {["startDate", "endDate"].map((k) => (
                <div key={k}>
                  <label className="block text-xs text-gray-600">{k === "startDate" ? "Start date" : "End date"}</label>
                  <input
                    value={availabilityForm[k]}
                    onChange={(e) => setAvailabilityForm((s) => ({ ...s, [k]: e.target.value }))}
                    className="w-full p-2 text-sm border rounded"
                    type="date"
                  />
                </div>
              ))}

              <div className="grid grid-cols-2 gap-3">
                {["startTime", "endTime"].map((k) => (
                  <div key={k}>
                    <label className="block text-xs text-gray-600">{k === "startTime" ? "Start time" : "End time"}</label>
                    <input
                      value={availabilityForm[k]}
                      onChange={(e) => setAvailabilityForm((s) => ({ ...s, [k]: e.target.value }))}
                      className="w-full p-2 text-sm border rounded"
                      type="time"
                    />
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2 mt-4">
                <button onClick={() => setShowCreateModal(false)} className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200">
                  Cancel
                </button>
                <button onClick={submitCreateAvailability} disabled={loadingAvail}
                  className={`px-4 py-2 text-sm text-white rounded-md ${loadingAvail ? "bg-green-400 cursor-not-allowed" : "bg-green-600 hover:bg-green-700"}`}>
                  {loadingAvail ? "Saving..." : "Create"}
                </button>
              </div>
            </div>
        </Modal>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <Modal onClose={() => setShowEditModal(false)} isOpen={showEditModal} title="Edit Availability" >
          <div className="space-y-3">
            {["startDate", "endDate"].map((k) => (
              <div key={k}>
                <label className="block text-xs text-gray-600">{k === "startDate" ? "Start date" : "End date"}</label>
                <input
                  value={availabilityForm[k]}
                  onChange={(e) => setAvailabilityForm((s) => ({ ...s, [k]: e.target.value }))}
                  className="w-full p-2 text-sm border rounded"
                  type="date"
                />
              </div>
            ))}

            <div className="grid grid-cols-2 gap-3">
              {["startTime", "endTime"].map((k) => (
                <div key={k}>
                  <label className="block text-xs text-gray-600">{k === "startTime" ? "Start time" : "End time"}</label>
                  <input
                    value={availabilityForm[k]}
                    onChange={(e) => setAvailabilityForm((s) => ({ ...s, [k]: e.target.value }))}
                    className="w-full p-2 text-sm border rounded"
                    type="time"
                  />
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setShowEditModal(false)} className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200">
                Cancel
              </button>
              <button onClick={submitEditAvailability} disabled={loadingAvail}
                className={`px-4 py-2 text-sm text-white rounded-md ${loadingAvail ? "bg-green-400 cursor-not-allowed" : "bg-green-600 hover:bg-green-700"}`}>
                {loadingAvail ? "Saving..." : "Update"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Modal */}
      {showDeleteModal && deleteTarget && (
        <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Delete availability" >
          <>
            <div className="space-y-3">
              <label className="flex items-center gap-3 p-3 border rounded cursor-pointer hover:bg-gray-50">
                <input type="radio" className="accent-red-600" checked={deleteMode === "all"} onChange={() => setDeleteMode("all")} />
                <>
                  <h3 className="font-medium text-gray-800">Delete entire availability</h3>
                </>
              </label>

              <label className="flex items-start gap-3 p-3 border rounded cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  className="mt-1 accent-red-600"
                  checked={deleteMode === "date"}
                  onChange={() => setDeleteMode("date")}
                />
                <div className="w-full">
                  <div className="font-medium text-gray-800">Delete a specific date range</div>
                  <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-gray-600">Start date (inside range)</label>
                      <input
                        type="date"
                        className="w-full p-2 text-sm border rounded"
                        value={deleteStartDate}
                        min={deleteTarget.startDate}
                        max={deleteTarget.endDate}
                        onChange={(e) => setDeleteStartDate(e.target.value)}
                        disabled={deleteMode !== "date"}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600">End date (inside range)</label>
                      <input
                        type="date"
                        className="w-full p-2 text-sm border rounded"
                        value={deleteEndDate}
                        min={deleteTarget.startDate}
                        max={deleteTarget.endDate}
                        onChange={(e) => setDeleteEndDate(e.target.value)}
                        disabled={deleteMode !== "date"}
                      />
                    </div>
                  </div>
                </div>
              </label>


              {deleteBookedDates.length > 0 && (
                <div className="flex items-start gap-2 p-3 text-sm border rounded bg-yellow-50 border-yellow-200">
                  <AlertCircle className="mt-0.5 text-yellow-600" size={18} />
                  <div className="text-yellow-800">
                    <div className="font-medium">Cannot delete on booked date(s):</div>
                    <div className="mt-1">{deleteBookedDates.join(", ")}</div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setShowDeleteModal(false)} className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200" disabled={deleteBusy}>
                Cancel
              </button>
              <button
                onClick={submitDeleteAvailability}
                disabled={
                  deleteBusy ||
                  (deleteMode === "date" && (!deleteStartDate || !deleteEndDate))
                }
                className={`px-4 py-2 text-sm text-white rounded-md ${deleteBusy ? "bg-red-300 cursor-not-allowed" : "bg-red-600 hover:bg-red-700"
                  }`}
              >
                {deleteBusy ? "Deleting..." : "Delete"}
              </button>
            </div>
          </>
        </Modal>
      )}
    </div>
  );
};

export default Calendar;
