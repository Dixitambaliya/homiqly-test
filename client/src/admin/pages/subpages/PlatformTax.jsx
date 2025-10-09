// PlatformTax.jsx
import React, { useEffect, useState } from "react";
import api from "../../../lib/axiosConfig"; // adjust path if needed
import { Trash2, Edit2, Plus } from "lucide-react";
import { Button, IconButton } from "../../../shared/components/Button";
import Modal from "../../../shared/components/Modal/Modal";
import { FormInput } from "../../../shared/components/Form";
import DataTable from "../../../shared/components/Table/DataTable";

/**
 * TaxesTable
 *
 * Props:
 * - taxes: array
 * - isLoading: boolean
 * - onEdit: fn(item)
 * - onDelete: fn(id)
 */
function TaxesTable({ taxes = [], isLoading = false, onEdit, onDelete }) {
  const columns = [
    {
      title: "#",
      key: "index",
      render: (row) => {
        // compute 1-based index from array (works even if DataTable doesn't pass index)
        const idx = taxes.indexOf(row);
        return <div className="text-sm">{idx >= 0 ? idx + 1 : "-"}</div>;
      },
    },
    {
      title: "Name",
      key: "taxName",
      render: (row) => <div className="text-sm font-medium">{row.taxName}</div>,
    },
    {
      title: "Percentage",
      key: "taxPercentage",
      render: (row) => (
        <div className="text-sm">{row.taxPercentage ?? row.tax_percentage ?? "-"}</div>
      ),
    },
    {
      title: "Status",
      key: "status",
      render: (row) => (
        <div className="text-sm">
          {row.status === "1" || row.status === 1 ? "Active" : "Inactive"}
        </div>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      align: "right",
      render: (row) => (
        <div className="flex items-center justify-end space-x-2">
          <IconButton
            icon={<Edit2 className="w-4 h-4" />}
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onEdit && onEdit(row);
            }}
            tooltip="Edit"
          />
          <IconButton
            icon={<Trash2 className="w-4 h-4" />}
            variant="lightDanger"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              const id = row.service_taxes_id ?? row.id;
              onDelete && onDelete(id);
            }}
            tooltip="Delete"
          />
        </div>
      ),
    },
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      <DataTable
        columns={columns}
        data={taxes}
        isLoading={isLoading}
        emptyMessage="No taxes yet"
        // onRowClick could be passed here if you want click-to-edit:
        // onRowClick={(row) => onEdit && onEdit(row)}
      />
    </div>
  );
}

/**
 * PlatformTax (main)
 */
export default function PlatformTax() {
  const [taxes, setTaxes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // form state
  const [isOpen, setIsOpen] = useState(false); // create/edit modal
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({ taxName: "", taxPercentage: "" });
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    fetchTaxes();
  }, []);

  async function fetchTaxes() {
    try {
      setLoading(true);
      const res = await api.get("/api/tax/getservicetax");
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
      taxPercentage: item.taxPercentage ?? item.tax_percentage ?? "",
    });
    setIsEditing(true);
    setEditingId(item.service_taxes_id ?? item.id ?? null);
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
        await api.put(`/api/tax/updateservicetax/${editingId}`, {
          taxName: form.taxName,
          taxPercentage: form.taxPercentage,
        });
      } else {
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

      {/* Reusable table component */}
      <TaxesTable
        taxes={taxes}
        isLoading={loading}
        onEdit={openEdit}
        onDelete={handleDelete}
      />

      {/* Modal - simple implementation */}
      {isOpen && (
        <Modal isOpen={isOpen} onClose={closeModal} title={isEditing ? "Edit Tax" : "Create Tax"}>
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
                <Button type="button" onClick={closeModal} variant="ghost">
                  Cancel
                </Button>
                <Button type="submit">
                  {loading ? "Saving..." : isEditing ? "Save changes" : "Create"}
                </Button>
              </div>
            </form>
          </div>
        </Modal>
      )}
    </div>
  );
}
