import React from "react";
import ChartComponent from "./ChartComponent";
import TableComponent from "./TableComponent";

const Page = () => {
  // Mock data
  const chartData = {
    labels: ["Aspirin", "Paracetamol", "Ibuprofen", "Antibiotics"],
    values: [10, 20, 15, 5],
  };

  const medications = [
    { Medication: "Aspirin", Dosage: "100mg", Frequency: "2x/day" },
    { Medication: "Paracetamol", Dosage: "500mg", Frequency: "3x/day" },
    { Medication: "Ibuprofen", Dosage: "200mg", Frequency: "1x/day" },
  ];

  const reports = [
    { Report: "Blood Test", Date: "2025-09-20", Doctor: "Dr. Smith" },
    { Report: "X-Ray", Date: "2025-09-22", Doctor: "Dr. Jones" },
  ];

  return (
    <div style={{ padding: "30px", fontFamily: "Arial, sans-serif", backgroundColor: "#f7f8fc" }}>
      <h1 style={{ color: "#333", marginBottom: "30px" }}>Dashboard</h1>

      {/* Chart */}
      <ChartComponent data={chartData} />

      {/* Medications Table */}
      <TableComponent
        title="Medications"
        columns={["Medication", "Dosage", "Frequency"]}
        data={medications}
      />

      {/* Doctor Reports Table */}
      <TableComponent
        title="Doctor Reports"
        columns={["Report", "Date", "Doctor"]}
        data={reports}
      />
    </div>
  );
};

export default Page;
