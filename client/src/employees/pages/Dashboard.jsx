import React from "react";
import ToggleButton from "../components/ToggleButton";

const Dashboard = () => {
  return (
    <div>
      Employees Dashboard
      <h1 className="text-2xl font-bold">Welcome to the Employees Dashboard</h1>
      <div className="mt-4">
        <ToggleButton />
      </div>
    </div>
  );
};

export default Dashboard;
