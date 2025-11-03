import React, { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { formatDateForApi } from "../../../shared/utils/dateUtils";
import FormInput from "../../../shared/components/Form/FormInput";
import { Button, IconButton } from "../../../shared/components/Button";
import Modal from "../../../shared/components/Modal/Modal";
import PromosTable from "../../components/Tables/PromosTable";
import FormSelect from "../../../shared/components/Form/FormSelect";
import UniversalDeleteModal from "../../../shared/components/Modal/UniversalDeleteModal";

/**
 * AdminPromoManager (JSX)
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
    discount_type: "percentage",
    requiredBookings: 0,
    description: "",
    minSpend: 0,
    maxUse: 1,
    start_date: "",
    end_date: "",
    source_type: "admin",
  });

  const [autoEnabled, setAutoEnabled] = useState(false);
  const [autoLoading, setAutoLoading] = useState(false);

  // delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteAction, setDeleteAction] = useState(null);
  const [deletingPromo, setDeletingPromo] = useState(null);

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

  async function fetchAutoStatus() {
    try {
      setAutoLoading(true);
      const res = await axios.get("/api/getstatuscode");
      const val = res?.data?.enable;
      setAutoEnabled(Number(val) === 1);
    } catch (err) {
      console.error("fetchAutoStatus:", err);
      toast.error("Failed to fetch auto-generate status");
    } finally {
      setAutoLoading(false);
    }
  }

  async function toggleAutoEnable() {
    const newValue = !autoEnabled;
    setAutoEnabled(newValue);
    setAutoLoading(true);
    try {
      const payload = { enable: newValue ? 1 : 0 };
      const res = await axios.patch("/api/changautogeneratecode", payload);
      toast.success(
        res?.data?.message ||
          `Auto-generate welcome code ${newValue ? "enabled" : "disabled"}`
      );
    } catch (err) {
      console.error("toggleAutoEnable:", err);
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
      discount_type: "percentage",
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

  function handleChange(eOrName, maybeValue) {
    let name, value;

    if (eOrName && eOrName.target) {
      name = eOrName.target.name;
      value = eOrName.target.value;
    } else if (eOrName && typeof eOrName === "object" && "name" in eOrName) {
      name = eOrName.name;
      value = eOrName.value;
    } else if (typeof eOrName === "string") {
      name = eOrName;
      value = maybeValue;
    } else {
      return;
    }

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

  // NEW: open delete modal and bind action
  const handleDeleteClick = (p) => {
    if (!p) return;
    setDeletingPromo(p);
    setShowDeleteModal(true);

    setDeleteAction(() => async () => {
      const id = p.promo_id || p.id;
      if (!id) throw new Error("Promo id not found");

      const payload = {
        source_type: p?.source_type ?? form?.source_type ?? "admin",
      };

      try {
        setDeleting(true);
        const res = await axios.delete(`/api/deletecode/${id}`, {
          data: payload,
        });
        toast.success(res?.data?.message || "Promo code deleted successfully");
        await fetchPromos();
      } catch (err) {
        console.error("delete promo error:", err);
        const message = err?.response?.data?.message || "Failed to delete";
        toast.error(message);
        throw err; // rethrow so modal's onError can catch it if provided
      } finally {
        setDeleting(false);
        setShowDeleteModal(false);
        setDeleteAction(null);
        setDeletingPromo(null);
      }
    });
  };

  const filtered = promos.filter((p) => {
    if (!search) return true;
    const dv = (p.discountValue ?? p.discount_value ?? "").toString();
    return (
      (p.code || "").toLowerCase().includes(search.toLowerCase()) ||
      dv.toLowerCase().includes(search.toLowerCase())
    );
  });

  const deleteDesc = deletingPromo
    ? `Delete promo code "${deletingPromo.code}" (ID: ${
        deletingPromo.promo_id ?? deletingPromo.id
      })? This action cannot be undone.`
    : "Are you sure you want to delete this promo code?";

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="">
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

        <PromosTable
          promos={filtered}
          isLoading={loading}
          onEdit={openEditModal}
          onDelete={handleDeleteClick} // now opens delete modal
        />

        <Modal
          size="lg"
          isOpen={modalOpen}
          onClose={closeModal}
          title={isEditing ? "View / Edit Promo" : "Create Promo"}
        >
          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <FormSelect
                  name="source_type"
                  label="Source Type"
                  value={form.source_type}
                  onChange={handleChange}
                  options={[
                    { label: "Admin", value: "admin" },
                    { label: "System", value: "system" },
                  ]}
                />
              </div>

              <div>
                <FormSelect
                  name="discount_type"
                  label="Discount Type?"
                  value={form.discount_type}
                  onChange={handleChange}
                  options={[
                    { label: "Percentage", value: "percentage" },
                    { label: "Fixed", value: "fixed" },
                  ]}
                  placeholder="Select option"
                />
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

        {/* Universal delete modal */}
        <UniversalDeleteModal
          open={showDeleteModal}
          onClose={() => {
            if (!deleting) {
              setShowDeleteModal(false);
              setDeleteAction(null);
              setDeletingPromo(null);
            }
          }}
          onDelete={deleteAction}
          title="Delete Promo"
          desc={deleteDesc}
          confirmLabel="Delete"
          cancelLabel="Cancel"
          onError={(err) => {
            toast.error(err?.message || "Delete failed");
          }}
        />
      </div>
    </div>
  );
}
