import { useEffect, useState } from "react";
import { FormInput } from "../../../shared/components/Form";
import { Button } from "../../../shared/components/Button";
import Modal from "../../../shared/components/Modal/Modal";
import { toast } from "react-toastify";
import api from "../../../lib/axiosConfig";

export const ServiceFilterModal = ({
  isOpen,
  onClose,
  mode,
  filterData,
  onSave,
}) => {
  const [serviceFilter, setServiceFilter] = useState("");

  useEffect(() => {
    if (mode === "edit" && filterData) {
      setServiceFilter(filterData.serviceFilter);
    } else {
      setServiceFilter("");
    }
  }, [filterData, mode]);

  const handleSave = async () => {
    if (!serviceFilter) {
      toast.error("Please fill all fields");
      return;
    }
    try {
      if (mode === "add") {
        await api.post("/api/service/addservicefilter", { serviceFilter });
        toast.success("Filter added");
        setServiceFilter("");
      } else {
        await api.put(
          `/api/service/updateservicefilter/${filterData.service_filter_id}`,
          {
            serviceFilter,
          }
        );
        toast.success("Filter updated");
      }
      onSave();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || "Error saving filter");
    }
  };

  return (
    <Modal
      size="sm"
      isOpen={isOpen}
      onClose={onClose}
      title={`${mode === "add" ? "Add" : "Edit"} Service Filter`}
    >
      <div className=" space-y-4">
        <FormInput
          label="Filter Name"
          value={serviceFilter}
          onChange={(e) => setServiceFilter(e.target.value)}
        />
      </div>
      <div className="flex justify-end p-4 space-x-2 border-t border-gray-200">
        <Button variant="lightError" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="primary" onClick={handleSave}>
          {mode === "add" ? "Add" : "Update"}
        </Button>
      </div>
    </Modal>
  );
};
