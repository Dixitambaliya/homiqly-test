import React, { useState } from "react";
import { Button } from "../../shared/components/Button";
import { FiPlus } from "react-icons/fi";
import AddServiceTypeModal from "../components/Modals/AddServiceTypeModal";

const Packages = () => {
    const [showAddModal, setShowAddModal] = useState(false);
    return (
    <div>
      {" "}
      <div>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">My Packages</h2>
          <Button
            onClick={() => setShowAddModal(true)}
            variant="primary"
            icon={<FiPlus className="mr-2" />}
          >
            Add Service Type
          </Button>
        </div>
      </div>
      <AddServiceTypeModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        // onSubmit={handleAddServiceType}
        // isSubmitting={submitting}
      />
    </div>
  );
};

export default Packages;
