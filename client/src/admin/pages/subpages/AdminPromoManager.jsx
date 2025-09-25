import React, { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { formatDateForApi } from "../../../shared/utils/dateUtils";
import FormInput from "../../../shared/components/Form/FormInput";
import { Button, IconButton } from "../../../shared/components/Button";
import Modal from "../../../shared/components/Modal/Modal";
import { Edit2, Trash2 } from "lucide-react";

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
    minSpend: 0,
    maxUse: 1,
    start_date: "",
    end_date: "",
  });

  useEffect(() => {
    fetchPromos();
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

  function openCreateModal() {
    setIsEditing(false);
    setCurrentPromo(null);
    setForm({
      code: "",
      discount_value: "",
      minSpend: 0,
      maxUse: 1,
      start_date: "",
      end_date: "",
    });
    setModalOpen(true);
  }

  function openEditModal(p) {
    setIsEditing(true);
    setCurrentPromo(p);
    setForm({
      code: p.code || "",
      discount_value: (p.discountValue ?? p.discount_value ?? "").toString(),
      minSpend: p.minSpend ?? 0,
      maxUse: p.maxUse ?? 1,
      // convert ISO -> datetime-local compatible (YYYY-MM-DDTHH:mm)
      start_date: p.start_date ? p.start_date.slice(0, 16) : "",
      end_date: p.end_date ? p.end_date.slice(0, 16) : "",
    });
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((s) => ({ ...s, [name]: value }));
  }

  async function handleSubmit(e) {
    e?.preventDefault();
    if (!form.code) return toast.error("Code is required");

    try {
      const payload = {
        code: form.code,
        discount_value: form.discount_value,
        minSpend: Number(form.minSpend),
        maxUse: Number(form.maxUse),
        start_date: form.start_date ? formatDateForApi(form.start_date) : "",
        end_date: form.end_date ? formatDateForApi(form.end_date) : "",
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
      await axios.delete(`/api/deletecode/${id}`);
      toast.success("Promo code deleted successfully");
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
          <div className="flex items-center gap-3">
            <FormInput
              placeholder="Search code or value..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Button
              onClick={openCreateModal}
              className="
             w-full"
            >
              + Add Promo
            </Button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-4">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y ">
              <thead>
                <tr className="text-left text-xs  bg-gray-50 uppercase">
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Discount</th>
                  <th className="px-4 py-3">Min Spend</th>
                  <th className="px-4 py-3">Max Uses</th>
                  <th className="px-4 py-3">Start</th>
                  <th className="px-4 py-3">End</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500">
                      Loading...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500">
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
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <IconButton
                            icon={<Edit2 className="w-4 h-4" />}
                            variant="ghost"
                            onClick={() => openEditModal(p)}
                          ></IconButton>
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
            <div className="grid grid-cols-2 gap-4">
              <FormInput
                name="code"
                value={form.code}
                onChange={handleChange}
                placeholder="Code"
                label="Code"
              />

              <FormInput
                name="discount_value"
                value={form.discount_value}
                onChange={handleChange}
                placeholder="Discount (e.g. 'upto 30' or '10%')"
                label="Discount (e.g. 'upto 30' or '10%')"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormInput
                name="minSpend"
                type="number"
                value={form.minSpend}
                onChange={handleChange}
                placeholder="Min Spend"
                label="Min Spend"
              />
              <FormInput
                name="maxUse"
                type="number"
                value={form.maxUse}
                onChange={handleChange}
                placeholder="Max Uses"
                label="Max Uses"
              />
              <div />
            </div>

            <div className="grid grid-cols-2 gap-4">
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
