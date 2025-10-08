import React, { useEffect, useState } from "react";
import api from "../../../lib/axiosConfig"; // adjust path if needed
import { Trash2, Edit, Plus, Edit2Icon, Edit2, Cross } from "lucide-react";
import { Button, IconButton } from "../../../shared/components/Button";
import Modal from "../../../shared/components/Modal/Modal";
import { FormInput } from "../../../shared/components/Form";

export default function PlatformTax() {
  const [taxes, setTaxes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // form state
  const [isOpen, setIsOpen] = useState(false); // create/edit modal
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({ taxName: "", taxPercentage: "" });
  const [editingId, setEditingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    fetchTaxes();
  }, []);

  async function fetchTaxes() {
    try {
      setLoading(true);
      const res = await api.get("/api/tax/getservicetax");
      // API returns an array according to your screenshot
      setTaxes(res.data || []);
    } catch (err) {
      console.error(err);
      setError("Unable to fetch taxes");
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setForm({ taxName: "", taxPercentage: "" });
    setIsEditing(false);
    setEditingId(null);
    setIsOpen(true);
  }

  function openEdit(item) {
    setForm({
      taxName: item.taxName || "",
      taxPercentage: item.taxPercentage || "",
    });
    setIsEditing(true);
    setEditingId(item.service_taxes_id || item.id || null);
    setIsOpen(true);
  }

  function closeModal() {
    setIsOpen(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      setLoading(true);
      if (isEditing && editingId) {
        // update
        await api.put(`/api/tax/updateservicetax/${editingId}`, {
          taxName: form.taxName,
          taxPercentage: form.taxPercentage,
        });
      } else {
        // create
        await api.post(`/api/tax/createservicetax`, {
          taxName: form.taxName,
          taxPercentage: form.taxPercentage,
        });
      }
      await fetchTaxes();
      closeModal();
    } catch (err) {
      console.error(err);
      setError("Save failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm("Are you sure you want to delete this tax?")) return;
    try {
      setLoading(true);
      await api.delete(`/api/tax/deletetax/${id}`);
      await fetchTaxes();
    } catch (err) {
      console.error(err);
      setError("Delete failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold">Platform Taxes</h2>
        <Button onClick={openCreate}>
          <Plus size={16} /> Add tax
        </Button>
      </div>

      {error && <div className="mb-4 text-red-600">{error}</div>}

      <div className="bg-white rounded-lg shadow-sm border">
        <table className="min-w-full table-auto">
          <thead className="bg-gray-50">
            <tr className="text-sm uppercase ">
              <td className="text-left px-4 py-3">#</td>
              <td className="text-left px-4 py-3">Name</td>
              <td className="text-left px-4 py-3">Percentage</td>
              <td className="text-left px-4 py-3">Status</td>
              <td className="text-left px-4 py-3">Actions</td>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center">
                  Loading...
                </td>
              </tr>
            ) : taxes.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center">
                  No taxes yet
                </td>
              </tr>
            ) : (
              taxes.map((t, idx) => (
                <tr
                  key={t.service_taxes_id || t.id || idx}
                  className="border-t"
                >
                  <td className="px-4 py-3">{idx + 1}</td>
                  <td className="px-4 py-3">{t.taxName}</td>
                  <td className="px-4 py-3">{t.taxPercentage}</td>
                  <td className="px-4 py-3">
                    {t.status === "1" || t.status === 1 ? "Active" : "Inactive"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <IconButton
                        icon={<Edit2 className="w-4 h-4" />}
                        variant="ghost"
                        onClick={() => openEdit(t)}
                      ></IconButton>

                      <IconButton
                        icon={<Trash2 className="w-4 h-4" />}
                        variant="lightDanger"
                        onClick={() => handleDelete(t.service_taxes_id || t.id)}
                      ></IconButton>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal - simple implementation */}
      {isOpen && (
        <Modal isOpen={isOpen} onClose={closeModal} title={"Create Tax"}>
          <div className="">
            <form onSubmit={handleSubmit} className="space-y-4 p-3">
              <div>
                <FormInput
                  label="Tax name"
                  value={form.taxName}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, taxName: e.target.value }))
                  }
                  required
                />
              </div>

              <div>
                <FormInput
                  label={`Tax percentage`}
                  value={form.taxPercentage}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, taxPercentage: e.target.value }))
                  }
                  required
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  onClick={closeModal}
                  variant="ghost"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                >
                  {loading
                    ? "Saving..."
                    : isEditing
                    ? "Save changes"
                    : "Create"}
                </Button>
              </div>
            </form>
          </div>
        </Modal>
      )}
    </div>
  );
}
