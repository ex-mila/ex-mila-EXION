// src/scenes/global/CustomToolbar.jsx
import React, { useState } from "react";
import { GridToolbarContainer } from "@mui/x-data-grid";
import { Button, Menu, MenuItem, Checkbox, ListItemText } from "@mui/material";

//! custom toolbar rendering issue
const exportToCsv = (columns, rows) => {
  const headers = columns.map(col => col.headerName).join(",") + "\n";
  const data = rows.map(row =>
    columns.map(col => row[row.field] || "").join(",")
  ).join("\n");

  const blob = new Blob([headers + data], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "drug_list.csv";
  a.click();
};

const CustomToolbar = (props) => {
  const { columns, rows, visibleFields, setVisibleFields } = props;
  const [anchorEl, setAnchorEl] = useState(null);

  const toggleField = (field) => {
    setVisibleFields(prev =>
      prev.includes(field)
        ? prev.filter(f => f !== field)
        : [...prev, field]
    );
  };

  return (
    <GridToolbarContainer>
      <Button onClick={() => exportToCsv(columns, rows)}>Export CSV</Button>
      <Button onClick={() => window.print()}>Print</Button>
      <Button onClick={(e) => setAnchorEl(e.currentTarget)}>Columns</Button>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
      >
        {columns.map(col => (
          <MenuItem key={col.field} onClick={() => toggleField(col.field)}>
            <Checkbox checked={visibleFields.includes(col.field)} />
            <ListItemText primary={col.headerName} />
          </MenuItem>
        ))}
      </Menu>
    </GridToolbarContainer>
  );
};

export default CustomToolbar;
