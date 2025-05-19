//@ Drug List (Data Grid's Tool bar)
import { Box, Dialog, DialogContent, DialogTitle, IconButton } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import { tokens } from "../../theme";
import Header from "../../components/Header";
import { useTheme } from "@mui/material";
import { useState, useEffect , useMemo } from "react";
import axios from "axios";
import CloseIcon from "@mui/icons-material/Close";
import CustomToolbar from "../global/CustomToolbar"

// UPDATE 1: handle rendering speed
// UPDATE 2: filtering functionality (pro version) => (replacement) own custom toolbar with basic buttons
// Export CSV (json2csv), Print(window.print() or html2canvas), Show/hide Columns ... 


const DrugList = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  const [rows, setRows] = useState([]);
  const [visibleFields, setVisibleFields] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedDrugName, setSelectedDrugName] = useState(null);
  const [openImage, setOpenImage] = useState(false);

  const handleImageClick = (url, drugName) => {
    setSelectedImage(url);
    setSelectedDrugName(drugName);
    setOpenImage(true);
  };

  const handleClose = () => {
    setOpenImage(false);
    setSelectedImage(null);
    setSelectedDrugName(null);
  };

  const columns = useMemo(() => [
    { field: "id", headerName: "ID", flex: 0.3 },
    { field: "drug_name", headerName: "Drug Name", flex: 1 },
    { field: "standard_code", headerName: "Standard Code", flex: 1 },
    { field: "product_code", headerName: "Product Code", flex: 1 },
    { field: "manufacturer", headerName: "Manufacturer", flex: 1 },
    {
      field: "image_url",
      headerName: "Image",
      flex: 1,
      renderCell: (params) =>
        params.value ? (
          <img
            src={params.value}
            alt={params.row.drug_name}
            width="40"
            style={{ cursor: "pointer" }}
            onClick={() => handleImageClick(params.value, params.row.drug_name)}
          />
        ) : (
          "N/A"
        ),
    },
  ], []);

  const visibleColumns = useMemo(
    () => columns.filter(col => visibleFields.includes(col.field)),
    [visibleFields, columns]
  );

  useEffect(() => {
    axios.get("http://localhost:8000/api/drugs").then((res) => {
      const formatted = res.data.map((drug, index) => ({
        id: index + 1,
        drug_name: drug.drug_name,
        standard_code: drug.standard_code,
        product_code: drug.product_code,
        manufacturer: drug.manufacturer,
        image_url: drug.image_url,
      }));
      setRows(formatted);
      setVisibleFields(columns.map(col => col.field)); // initialize visible columns
    });
  }, [columns]);

  return (
    <Box m="20px">
      <Header title="Drug List" subtitle="약품 목록" />
      <Box
        m="40px 0 0 0"
        height="75vh"
        sx={{
          "& .MuiDataGrid-root": { border: "none" },
          "& .MuiDataGrid-cell": { borderBottom: "none" },
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
          "& .MuiDataGrid-toolbarContainer .MuiButton-text": {
            color: `${colors.grey[100]} !important`,
          },
        }}
      >
        <DataGrid
          rows={rows}
          columns={visibleColumns}
          components={{ Toolbar: CustomToolbar }}
          componentsProps={{
            toolbar: {
              columns,
              rows,
              visibleFields,
              setVisibleFields,
            },
          }}
        />
      </Box>

      {/* Modal */}
      <Dialog open={openImage} onClose={handleClose} maxWidth="md">
        <DialogTitle>
          Drug Image
          <IconButton
            aria-label="close"
            onClick={handleClose}
            sx={{ position: "absolute", right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {selectedImage && (
            <img
              src={selectedImage}
              alt={selectedDrugName ? `Drug ${selectedDrugName}` : "Drug"}
              style={{ width: "100%" }}
            />
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default DrugList;
