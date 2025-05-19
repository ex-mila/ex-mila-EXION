import React, { useState } from "react";
import { DataGrid } from "@mui/x-data-grid";
import {
  Typography,
  Button,
  Stack,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  TextField,
  Box,
  Container,
} from "@mui/material";
import { utils, writeFile } from "xlsx";
import CloseIcon from "@mui/icons-material/Close";
import DeleteIcon from "@mui/icons-material/Delete";

const Upload = () => {
  const [file, setFile] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("all");
  const [openImage, setOpenImage] = useState(false);
  const [selectedImage, setSelectedImage] = useState("");
  const [searchText, setSearchText] = useState("");
  // 수정된 필드 감지
  const [editBuffer, setEditBuffer] = useState({});
  const [editedRows, setEditedRows] = useState({});
  
  // 확인 팝업
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [previewData, setPreviewData] = useState([]);

  const [hoveredRowId, setHoveredRowId] = useState(null);

  const columns = [
    { field: "id", headerName: "ID", flex: 0.3 },
    { field: "입력 약품명", headerName: "Input Name", flex: 1, editable: true },
    { field: "입력 수량", headerName: "Quantity", flex: 0.7, editable: true },
    { field: "매핑 약품명", headerName: "Mapped Name", flex: 1, editable: true },
    { field: "표준코드", headerName: "Standard Code", flex: 1, editable: true },
    { field: "제조사", headerName: "Manufacturer", flex: 1, editable: true },
    {
      field: "약품 이미지",
      headerName: "Image",
      flex: 1,
      renderCell: (params) =>
        params.value ? (
          <img
            src={params.value}
            alt="drug"
            width="40"
            onClick={() => handleImageClick(params.value)}
            style={{ cursor: "pointer" }}
          />
        ) : (
          "N/A"
        ),
    },
    { field: "유사도 점수", headerName: "Score", flex: 0.6 },
    {
  field: "actions",
  headerName: "Actions",
  flex: 0.6,
  align: "center",
  headerAlign: "center",
  renderCell: (params) => {
    const rowIdStr = String(params.id);
    const isHovered = hoveredRowId === rowIdStr;

    return (
      <Box
        onMouseEnter={() => setHoveredRowId(rowIdStr)}
        onMouseLeave={() => setHoveredRowId(null)}
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          width: "100%", // 이거 없으면 마우스 인식 잘 안 됨
        }}
      >
        {/* 수정된 항목이면 저장 버튼 */}
        {editedRows[params.id] && (
          <Button
            size="small"
            variant="outlined"
            onClick={() =>
              handleRowSave(editBuffer[params.id] || params.row)
            }
          >
            저장
          </Button>
        )}

        {/* Hover 중이고 매핑 실패(X)인 경우만 삭제 버튼 표시 */}
        {isHovered && params.row["매핑 여부"] === "X" && (
          <IconButton
            size="small"
            color="error"
            onClick={() => handleRowDelete(params.row.id)}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        )}
      </Box>
    );
  },
}

  ];

  const handleUpload = async () => {
    if (!file) return alert("파일을 선택해주세요.");
    const formData = new FormData();
    formData.append("file", file);
    try {
      setLoading(true);
      const res = await fetch("http://localhost:8000/match-json", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      const formatted = data.map((item, idx) => ({ id: idx + 1, ...item }));
      setRows(formatted);
    } catch (e) {
      console.error("매핑 실패", e);
    } finally {
      setLoading(false);
    }
  };

  const handleProcessRowUpdate = (newRow, oldRow) => {
    if (JSON.stringify(newRow) !== JSON.stringify(oldRow)) {
      setEditedRows((prev) => ({ ...prev, [newRow.id]: true }));
      setEditBuffer((prev) => ({ ...prev, [newRow.id]: newRow }));
      setRows((prev) =>
        prev.map((row) => (row.id === newRow.id ? { ...newRow } : row))
      );
    }
    return newRow;
  };


  const handleDownload = () => {
    const ws = utils.json_to_sheet(rows);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "Mapping Result");
    writeFile(wb, "mapping_result.xlsx");
  };

  // TODO: 수정 이력 기록
  // 수정내용 로컬 상태만 업데이트
  const handleRowSave = async (row) => {
    const updatedRow = {
      ...row,
      //"매핑 여부": "O", // 저장과 함께 매핑 성공 처리
    };

    setEditBuffer((prev) => ({ ...prev, [row.id]: updatedRow }));
    setEditedRows((prev) => {
      const updated = { ...prev };
      delete updated[row.id];
      return updated;
    });

    setRows((prev) =>
    prev.map((r) => (r.id === updatedRow.id ? updatedRow : r))
    );

    try {
      const res = await fetch("http://localhost:8000/save-matched-row", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedRow),
      });
      const result = await res.json();
      alert("저장 성공: " + result.message);

      // 상태 반영
      setRows((prevRows) =>
        prevRows.map((r) => (r.id === updatedRow.id ? updatedRow : r))
      );
      setEditedRows((prev) => {
        const updated = { ...prev };
        delete updated[updatedRow.id];
        return updated;
      });
    } catch (err) {
      alert("저장 실패");
    }
  };

  const handleImageClick = (url) => {
    setSelectedImage(url);
    setOpenImage(true);
  };

  // 행 삭제 함수
  const handleRowDelete = (id) => {
    setRows((prevRows) => prevRows.filter((row) => row.id !== id));
    setEditedRows((prev) => {
      const newEdited = { ...prev };
      delete newEdited[id];
      return newEdited;
    });
  };
  
  const filteredRows = rows.filter(
    (row) =>
      (filter === "all"
        ? true
        : filter === "success"
        ? row["매핑 여부"] === "O"
        : row["매핑 여부"] === "X") &&
      row["입력 약품명"].toLowerCase().includes(searchText.toLowerCase())
  );

  // 수정 중 저장 버튼
  const handleEditCellChange = React.useCallback((params) => {
    const { id, field, value } = params;
    setEditedRows((prev) => ({ ...prev, [id]: true }));
    setEditBuffer((prev) => {
      const oldRow = rows.find((row) => row.id === id);
      return {
        ...prev,
        [id]: {
          ...oldRow,
          [field]: value,
        },
      };
    });
  }, [rows]);

// 최종 wjwkd
const handleApproval = async () => {
  const edited = Object.keys(editBuffer).map((id) => editBuffer[id]);
  try {
    const res = await fetch("http://localhost:8000/save-all-matched", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(edited),
    });
    const result = await res.json();
    alert("일괄 저장 성공: " + result.updated + "건");

    // 상태 초기화
    setEditedRows({});
    setEditBuffer({});
  } catch (err) {
    alert("저장 실패");
  }
};

  return (
    <Container maxWidth="xlg" sx={{ mt: 4 }}>
      <Typography variant="h5" gutterBottom>
        Upload your pharmacy’s drug list (Excel/PDF) and match with system database.
      </Typography>

      <Box
        sx={{
          border: "1px dashed #ccc",
          borderRadius: "8px",
          p: 2,
          mb: 2,
          display: "flex",
          alignItems: "center",
          gap: 2,
          backgroundColor: "#fafafa",
        }}
      >
        <input
          type="file"
          onChange={(e) => setFile(e.target.files[0])}
          style={{ flex: 1 }}
        />
        <Button onClick={handleUpload} disabled={loading} variant="contained">
          업로드 및 매핑
        </Button>
        <Button onClick={handleDownload} disabled={loading} variant="outlined">
          다운로드
        </Button>
      </Box>

      {loading && (
        <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
          <CircularProgress size={24} />
          <Typography>매핑 중입니다...</Typography>
        </Stack>
      )}

      {/* 로딩 완료 후 */}
      {!loading && rows.length > 0 && (
        <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
          <TextField
            label="약품명 검색"
            variant="outlined"
            size="small"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            sx={{ width: 200 }}
          />
          <Button variant={filter === "all" ? "contained" : "outlined"} onClick={() => setFilter("all")}>
            전체
          </Button>
          <Button variant={filter === "success" ? "contained" : "outlined"} onClick={() => setFilter("success")}>
            성공
          </Button>
          <Button variant={filter === "fail" ? "contained" : "outlined"} onClick={() => setFilter("fail")}>
            실패
          </Button>
          {/* 최종 Confirm 버튼 */}
          {Object.keys(editBuffer).length > 0 && (
            <Stack direction="row" justifyContent="flex-end" sx={{ mt: 2 }}>
              <Button
                variant="contained"
                color="primary"
                onClick={() => {
                  const changed = Object.keys(editBuffer).map((id) => editBuffer[id]);
                  setPreviewData(changed); // Dialog에 보여줄 데이
                  setConfirmOpen(true); // Dialog 열기
                }}
              >
                변경사항 
              </Button>
            </Stack>
          )}
        </Stack>
      )}

      {rows.length > 0 && (
        <Box sx={{ height: "70vh" }}>
          <DataGrid
            rows={filteredRows}
            columns={columns}
            processRowUpdate={handleProcessRowUpdate}
            onProcessRowUpdateError={(error) => console.error(error)}
            experimentalFeatures={{ newEditingApi: true }}
            disableRowSelectionOnClick
            //onCellMouseOver={(params) => setHoveredRowId(params.id?.toString())}
            //onMouseLeave={() => setHoveredRowId(null)}
            getRowClassName={(params) => {
              if (editBuffer[params.id]) return 'edited-row';
              if (params.row["매핑 여부"] === "X") return 'unmatched-row';
              return '';
            }}
            sx={{
              "& .MuiDataGrid-cell": {
                display: "flex",
                alignItems: "center",
              },
              "& .matched": { color: "green" },
              "& .unmatched": { color: "red" },
              "& .unmatched-row": {
                backgroundColor: "#fce8e8",
              },
              "& .edited-row": {
                backgroundColor: "#e8f5e9",
              },
            }}
          />
        </Box>
      )}

      <Dialog open={openImage} onClose={() => setOpenImage(false)} maxWidth="md">
        <DialogTitle>
          약품 이미지
          <IconButton
            onClick={() => setOpenImage(false)}
            sx={{ position: "absolute", right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {selectedImage && (
            <img
              src={selectedImage}
              alt="약품 확대"
              style={{ width: "100%", maxHeight: "70vh", objectFit: "contain" }}
            />
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>최종 확인</DialogTitle>
        <DialogContent dividers>
          <Typography gutterBottom>
            총 {previewData.length}건의 수정된 항목이 있습니다.
          </Typography>
          {previewData.map((item) => (
            <Box key={item.id} sx={{ mb: 2, p: 2, border: '1px solid #ccc', borderRadius: 2 }}>
              <Typography variant="subtitle2">ID: {item.id}</Typography>
              <Typography variant="body2">입력 약품명: {item["입력 약품명"]}</Typography>
              <Typography variant="body2">매핑 약품명: {item["매핑 약품명"]}</Typography>
              <Typography variant="body2">표준코드: {item["표준코드"]}</Typography>
              <Typography variant="body2">매핑 여부: {item["매핑 여부"]}</Typography>
            </Box>
          ))}
        </DialogContent>
        <Stack direction="row" justifyContent="flex-end" sx={{ p: 2 }}>
          <Button onClick={() => setConfirmOpen(false)}>취소</Button>
          <Button
            variant="contained"
            onClick={async () => {
              try {
                const res = await fetch("http://localhost:8000/save-all-matched", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(previewData),
                });
                const result = await res.json();
                alert("일괄 저장 성공: " + result.updated + "건");
                setEditedRows({});
                setEditBuffer({});
                setConfirmOpen(false);
              } catch (e) {
                alert("저장 실패");
              }
            }}
          >
            저장
          </Button>
        </Stack>
      </Dialog>
    </Container>
  );
};

export default Upload;
