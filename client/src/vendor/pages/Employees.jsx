import { useState } from "react";
import CreateEmployeesModal from "../components/Modals/CreateEmployeesModal";
import { Button } from "../../shared/components/Button";

const Employees = () => {
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="p-4">
      <Button
        type="button"
        variant="secondary"
        onClick={() => setShowModal(true)}
      >
        + Create Employee
      </Button>

      <CreateEmployeesModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
      />
    </div>
  );
};

export default Employees;
