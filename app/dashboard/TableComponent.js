import React from "react";
import "./TableComponent.css"; // Import CSS for styling

const TableComponent = ({ title, columns, data }) => {
  return (
    <div className="table-container">
      <h2 className="dashboard-title">{title}</h2>
      <table>
        <thead>
          <tr>
            {columns.map((col, index) => (
              <th key={index}>{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr key={idx}>
              {columns.map((col, i) => (
                <td key={i}>{row[col]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TableComponent;
