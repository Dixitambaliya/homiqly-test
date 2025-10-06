import React, { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { formatDateForApi } from "../../../shared/utils/dateUtils";
import FormInput from "../../../shared/components/Form/FormInput";
import { Button, IconButton } from "../../../shared/components/Button";
import Modal from "../../../shared/components/Modal/Modal";
import { Edit2, Trash2 } from "lucide-react";

/**
 * AdminPromoManager (JSX)
 *
 * - Adds a source_type dropdown ("admin" | "system")
 * - Adds a discount_type dropdown ("percentage" | "fixed")
 * - If source_type === "system", hide and clear start_date, end_date, requiredBookings
 * - Includes both source_type and discount_type in submitted payload
 */
export default function AdminPromoManager() {
  const [promos, setPromos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentPromo, setCurrentPromo] = useState(null);
  const [search, setSearch] = useState("");

  const [form, setForm] = useState({
    code: "",
    discount_value: "",
    // NEW: discount_type - default to "percentage"
    discount_type: "percentage",
    requiredBookings: 0,
    description: "",
    minSpend: 0,
    maxUse: 1,
    start_date: "",
    end_date: "",
    // default to "admin" so fields visible on create
    source_type: "admin",
  });

  // AUTO-GENERATE CODE toggle state
  const [autoEnabled, setAutoEnabled] = useState(false);
  const [autoLoading, setAutoLoading] = useState(false);

  useEffect(() => {
    fetchPromos();
    fetchAutoStatus();
  }, []);

  async function fetchPromos() {
    try {
      setLoading(true);
      const res = await axios.get("/api/getallcodes");
      setPromos(res.data || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load promo codes");
    } finally {
      setLoading(false);
    }
  }

  // fetch current enable value
  async function fetchAutoStatus() {
    try {
      setAutoLoading(true);
      const res = await axios.get("/api/getstatuscode");
      // expecting { enable: 0 | 1 }
      const val = res?.data?.enable;
      setAutoEnabled(Number(val) === 1);
    } catch (err) {
      console.error("fetchAutoStatus:", err);
      toast.error("Failed to fetch auto-generate status");
    } finally {
      setAutoLoading(false);
    }
  }

  // toggle function
  async function toggleAutoEnable() {
    const newValue = !autoEnabled;
    // optimistic UI
    setAutoEnabled(newValue);
    setAutoLoading(true);
    try {
      // API expects { enable: 0 | 1 }
      const payload = { enable: newValue ? 1 : 0 };
      const res = await axios.patch("/api/changautogeneratecode", payload);
      toast.success(
        res?.data?.message ||
          `Auto-generate welcome code ${newValue ? "enabled" : "disabled"}`
      );
    } catch (err) {
      console.error("toggleAutoEnable:", err);
      // revert UI
      setAutoEnabled(!newValue);
      const message = err?.response?.data?.message || "Failed to update";
      toast.error(message);
    } finally {
      setAutoLoading(false);
    }
  }

  function openCreateModal() {
    setIsEditing(false);
    setCurrentPromo(null);
    setForm({
      code: "",
      discount_value: "",
      discount_type: "percentage", // default
      minSpend: 0,
      maxUse: 1,
      start_date: "",
      end_date: "",
      requiredBookings: 0,
      description: "",
      source_type: "admin",
    });
    setModalOpen(true);
  }

  function openEditModal(p) {
    setIsEditing(true);
    setCurrentPromo(p);

    const sourceVal = p?.source_type ?? "admin";
    const discountTypeVal = p?.discount_type ?? p?.discountType ?? "percentage";

    setForm({
      code: p.code || "",
      discount_value: (p.discountValue ?? p.discount_value ?? "").toString(),
      discount_type: discountTypeVal,
      minSpend: p.minSpend ?? 0,
      maxUse: p.maxUse ?? 1,
      start_date: p.start_date ? p.start_date.slice(0, 16) : "",
      end_date: p.end_date ? p.end_date.slice(0, 16) : "",
      requiredBookings: p.requiredBookings ?? 0,
      description: p.description || "",
      source_type: sourceVal,
    });

    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
  }

  function handleChange(e) {
    const { name, value } = e.target;

    // if switching to 'system' we clear the fields that should be hidden
    if (name === "source_type") {
      if (value === "system") {
        setForm((s) => ({
          ...s,
          [name]: value,
          start_date: "",
          end_date: "",
          requiredBookings: 0,
        }));
        return;
      }
      setForm((s) => ({ ...s, [name]: value }));
      return;
    }

    setForm((s) => ({ ...s, [name]: value }));
  }

  async function handleSubmit(e) {
    e?.preventDefault();
    if (!form.code) return toast.error("Code is required");
    // convert discount_value to number
    const discountValueNum =
      form.discount_value === ""
        ? 0
        : Number(String(form.discount_value).trim());

    if (Number.isNaN(discountValueNum)) {
      return toast.error("Discount value must be a number");
    }

    try {
      const payload = {
        code: form.code,
        // send number, not string
        discount_value: discountValueNum,
        discount_type: form.discount_type || "percentage",
        minSpend: Number(form.minSpend),
        maxUse: Number(form.maxUse),
        source_type: form.source_type || "admin",
        start_date:
          form.source_type === "admin" && form.start_date
            ? formatDateForApi(form.start_date)
            : "",
        end_date:
          form.source_type === "admin" && form.end_date
            ? formatDateForApi(form.end_date)
            : "",
        requiredBookings:
          form.source_type === "admin" ? Number(form.requiredBookings) || 0 : 0,
        description: form.description || "",
      };

      if (isEditing && currentPromo) {
        const id = currentPromo.promo_id || currentPromo.id;
        if (!id) return toast.error("No promo id to update");
        await axios.patch(`/api/updatecode/${id}`, payload);
        toast.success(`Promo code '${form.code}' updated successfully`);
      } else {
        await axios.post(`/api/createpromo`, payload);
        toast.success(`Promo code '${form.code}' created successfully`);
      }

      closeModal();
      fetchPromos();
    } catch (err) {
      console.error(err);
      const message = err?.response?.data?.message || "Something went wrong";
      toast.error(message);
    }
  }

  async function handleDelete(p) {
    if (
      !confirm(`Delete promo code '${p.code}'? This action cannot be undone.`)
    )
      return;
    try {
      const id = p.promo_id || p.id;
      if (!id) {
        toast.error("Promo id not found");
        return;
      }

      // Build payload with source_type — prefer promo's source_type, fallback to current form value, then 'admin'
      const payload = {
        source_type: p?.source_type ?? form?.source_type ?? "admin",
      };

      // axios.delete accepts request body via the `data` config property
      const res = await axios.delete(`/api/deletecode/${id}`, {
        data: payload,
      });

      // Optionally log response
      console.log("delete response:", res?.status, res?.data);

      toast.success(res?.data?.message || "Promo code deleted successfully");
      fetchPromos();
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete");
    }
  }

  const filtered = promos.filter((p) => {
    if (!search) return true;
    const dv = (p.discountValue ?? p.discount_value ?? "").toString();
    return (
      (p.code || "").toLowerCase().includes(search.toLowerCase()) ||
      dv.toLowerCase().includes(search.toLowerCase())
    );
  });

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold">Promotions Manager</h1>

          <div className="flex items-center gap-4">
            <FormInput
              className="w-64"
              placeholder="Search code or value..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Button onClick={openCreateModal} className="w-52">
              + Add Promo
            </Button>
          </div>
          {/* Auto-generate toggle */}
          <div className="flex items-center gap-2">
            <label className="text-sm">Auto-assign welcome code</label>
            <button
              onClick={toggleAutoEnable}
              disabled={autoLoading}
              className={`relative inline-flex items-center h-6 w-11 rounded-full transition-colors focus:outline-none ${
                autoEnabled ? "bg-emerald-500" : "bg-gray-300"
              }`}
              aria-pressed={autoEnabled}
              title={
                autoLoading
                  ? "Updating..."
                  : autoEnabled
                  ? "Auto-assign is enabled"
                  : "Auto-assign is disabled"
              }
              type="button"
            >
              <span
                className={`transform transition-transform inline-block h-5 w-5 rounded-full bg-white shadow ${
                  autoEnabled ? "translate-x-5" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-4">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y ">
              <thead>
                <tr className="text-left text-xs  bg-gray-50 uppercase">
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Discount</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Min Spend</th>
                  <th className="px-4 py-3">Max Uses</th>
                  <th className="px-4 py-3">Start</th>
                  <th className="px-4 py-3">End</th>
                  <th className="px-4 py-3">Required Bookings</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? (
                  <tr>
                    <td colSpan={10} className="p-8 text-center text-slate-500">
                      Loading...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-8 text-center text-slate-500">
                      No promo codes found
                    </td>
                  </tr>
                ) : (
                  filtered.map((p) => (
                    <tr
                      key={p.promo_id || p.id}
                      className="hover:bg-slate-50 text-sm"
                    >
                      <td className="px-4 py-3 ">{p.code}</td>
                      <td className="px-4 py-3">
                        {p.discountValue ?? p.discount_value ?? "-"}
                      </td>
                      <td className="px-4 py-3">
                        {p.discount_type ?? p.discountType ?? "-"}
                      </td>
                      <td className="px-4 py-3">{p.minSpend ?? "-"}</td>
                      <td className="px-4 py-3">{p.maxUse ?? "-"}</td>
                      <td className="px-4 py-3">
                        {p.start_date
                          ? new Date(p.start_date).toLocaleString()
                          : "-"}
                      </td>
                      <td className="px-4 py-3">
                        {p.end_date
                          ? new Date(p.end_date).toLocaleString()
                          : "-"}
                      </td>
                      <td className="px-4 py-3">{p.requiredBookings ?? 0}</td>
                      <td className="px-4 py-3">
                        {p.description ? p.description : "-"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <IconButton
                            icon={<Edit2 className="w-4 h-4" />}
                            variant="ghost"
                            onClick={() => openEditModal(p)}
                          />
                          <IconButton
                            icon={<Trash2 className="w-4 h-4" />}
                            variant="lightDanger"
                            onClick={() => handleDelete(p)}
                          >
                            Delete
                          </IconButton>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal - using your Modal component */}
        <Modal
          size="lg"
          isOpen={modalOpen}
          onClose={closeModal}
          title={isEditing ? "View / Edit Promo" : "Create Promo"}
        >
          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4">
            {/* Add source_type dropdown and discount_type dropdown here */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Source
                </label>
                <select
                  name="source_type"
                  value={form.source_type}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="admin">Admin</option>
                  <option value="system">System</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Discount Type
                </label>
                <select
                  name="discount_type"
                  value={form.discount_type}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="percentage">Percentage</option>
                  <option value="fixed">Fixed</option>
                </select>
              </div>

              <FormInput
                name="code"
                value={form.code}
                onChange={handleChange}
                placeholder="Code"
                label="Code"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormInput
                type="number"
                name="discount_value"
                value={form.discount_value}
                onChange={handleChange}
                placeholder="Discount (e.g. 'upto 30' or '10%')"
                label="Discount (e.g. 'upto 30' or '10%')"
              />
              <FormInput
                name="minSpend"
                type="number"
                value={form.minSpend}
                onChange={handleChange}
                placeholder="Min Spend"
                label="Min Spend"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormInput
                name="maxUse"
                type="number"
                value={form.maxUse}
                onChange={handleChange}
                placeholder="Max Uses"
                label="Max Uses"
              />
              {/* If source_type === 'admin' show start/end and requiredBookings */}
              {form.source_type === "admin" ? (
                <>
                  <FormInput
                    name="start_date"
                    type="datetime-local"
                    value={form.start_date}
                    onChange={handleChange}
                    placeholder="Start Date"
                    label="Start Date"
                  />
                  <FormInput
                    name="end_date"
                    type="datetime-local"
                    value={form.end_date}
                    onChange={handleChange}
                    placeholder="End Date"
                    label="End Date"
                  />
                </>
              ) : (
                <>
                  <div />
                  <div />
                </>
              )}
            </div>

            {/* Required Bookings and Description */}
            <div className="grid grid-cols-1 gap-4">
              {form.source_type === "admin" && (
                <FormInput
                  name="requiredBookings"
                  type="number"
                  value={form.requiredBookings}
                  onChange={handleChange}
                  placeholder="Required Bookings"
                  label="Required Bookings"
                />
              )}

              <FormInput
                name="description"
                type="text"
                value={form.description}
                onChange={handleChange}
                placeholder="Description"
                label="Description"
              />
            </div>

            <div className="flex items-center justify-end gap-3 mt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={closeModal}
                className="px-4 py-2 border rounded-md"
              >
                Cancel
              </Button>
              <Button type="submit">
                {isEditing ? "Save Changes" : "Create Promo"}
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </div>
  );
}
