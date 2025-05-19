import { Box, useTheme } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import axios from "axios";
import { useEffect, useState } from "react";
import { tokens } from "../../theme";
//import { mockDataInvoices } from "../../data/mockData";
import Header from "../../components/Header";

const Inventory = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const [rows, setRows] = useState([]);

  useEffect(() => {
    axios.get("http://localhost:8000/api/inventory")
      .then((res) => setRows(res.data))
      .catch((err) => console.error("재고 데이터를 불러오는 중 오류 발생:", err));
  }, []);

  const columns = [
    { field: "id", headerName: "ID", flex: 0.3 },
    { field: "drug_name", headerName: "약품명", flex: 1 },
    { field: "barcode", headerName: "바코드", flex: 1 },
    { field: "quantity", headerName: "수량", flex: 0.5 },
    { field: "unit", headerName: "단위", flex: 0.5 },
    { field: "cabinet", headerName: "선반", flex: 0.5 },
    { field: "row", headerName: "줄", flex: 0.5 },
    { field: "column", headerName: "칸", flex: 0.5 },
  ];

  return (
    <Box m="20px">
      <Header title="INVENTORY" subtitle="List of Inventory" />
      <Box
        m="40px 0 0 0"
        height="75vh"
        sx={{
          "& .MuiDataGrid-root": {
            border: "none",
          },
          "& .MuiDataGrid-cell": {
            borderBottom: "none",
          },
          "& .name-column--cell": {
            color: colors.greenAccent[300],
          },
          "& .MuiDataGrid-columnHeaders": {
            backgroundColor: colors.blueAccent[700],
            borderBottom: "none",
          },
          "& .MuiDataGrid-virtualScroller": {
            backgroundColor: colors.primary[400],
          },
          "& .MuiDataGrid-footerContainer": {
            borderTop: "none",
            backgroundColor: colors.blueAccent[700],
          },
          "& .MuiCheckbox-root": {
            color: `${colors.greenAccent[200]} !important`,
          },
        }}
      >
        <DataGrid checkboxSelection rows={rows} columns={columns} getRowId={(row) => row.id}/>
      </Box>
    </Box>
  );
};

export default Inventory;