import "../../styles/deleteButton.css" // 삭제 버튼용 스타일
import Tooltip from "@mui/material/Tooltip";
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
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
  Snackbar,
  Alert,
  Chip
} from "@mui/material";
import { utils, writeFile } from "xlsx";
import CloseIcon from "@mui/icons-material/Close";
import SaveIcon from "@mui/icons-material/Save";
import DeleteIcon from "@mui/icons-material/Delete";

const Upload = () => {

  const navigate = useNavigate();
  
  // 상태 정의
  const [file, setFile] = useState(null); // 업로드 파일
  const [rows, setRows] = useState([]); // 테이블 데이터
  const [originalRows, setOriginalRows] = useState([]); // 원본 데이터

  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("all"); // 필터(전체/성공/실패)

  const [searchText, setSearchText] = useState(""); // 약품명 검색 필드
  const [editBuffer, setEditBuffer] = useState({}); // 수정된 row 로컬 저장
  const [editedRows, setEditedRows] = useState({}); // 수정된 row ID 추적
  const [confirmOpen, setConfirmOpen] = useState(false); // 최종 승인 dialog
  const [previewData, setPreviewData] = useState([]); // dialog 표시 데이터


  const [openImage, setOpenImage] = useState(false); // 이미지 모달
  const [selectedImage, setSelectedImage] = useState(""); // 선택된 image url

  const [open, setOpen] = useState(false); // 스낵바 상태
  const [alertMessage, setAlertMessage] = useState(""); // 스낵바 메세지
  const [alertSeverity, setAlertSeverity] = useState("success"); // 스낵바 종류

  const [approvalNote, setApprovalNote] = useState(""); // 승인 메모
  const [postApprovalMessage, setPostApprovalMessage] = useState(""); // 승인 메세지
  const [showAllRowsInDialog, setShowAllRowsInDialog] = useState(true); // dialog 전체/수정 전환

  // 수정됨 표시 스타일
  const editedLabelStyle = {
    backgroundColor: "#fdecea", 
    color: "#d32f2f",           
    fontSize: "0.75rem",
    fontWeight: "bold",
    borderRadius: 1,
    px: 1,
    ml: 1,
    display: "inline-block",
  };


  // 테이블 컬럼 정의의
  const columns = [
    { field: "id", headerName: "ID", flex: 0.3 },
    { field: "입력 약품명", headerName: "Input Name", flex: 1, editable: true },
    { field: "입력 수량", headerName: "Quantity", flex: 0.3, editable: true }, // FIX: left alignment
    { field: "매핑 약품명", headerName: "Mapped Name", flex: 1, editable: true },
    { field: "표준코드", headerName: "Standard Code", flex: 0.5, editable: true },
    { field: "제조사", headerName: "Manufacturer", flex: 0.5, editable: true },
    { field: "약품 이미지", headerName: "Image", flex: 0.5,
      renderCell: (params) =>
        params.value ? (
          <img
            src={params.value}
            alt="drug"
            width="40"
            onClick={() => handleImageClick(params.value)}
            style={{ cursor: "pointer" }}
          />) : ( "N/A"),
    },
    { field: "유사도 점수", 
      headerName: "Score", 
      flex: 0.3,
      renderCell: (params) => {
        const value = params.value;
        const rounded = typeof value === "number" ? value.toFixed(0) : value; // round-up value
        return <span>{rounded}</span>;
      }
    },
    { field: "액션", 
      headerName: "Actions", 
      flex: 0.4,
      renderCell: (params) => {
        return (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              width: "100%",
              position: "relative",
            }}
          >
            {/* 삭제 버튼: 모든 행에 항상 표시 */}
            <Tooltip title="삭제">
              <IconButton
                size="small"
                onClick={() => handleRowDelete(params.row.id)}
              >
                <DeleteIcon fontSize="small"/>
              </IconButton>
            </Tooltip>
            {/* 저장 버튼: 수정된 항목만 표시 */}
            {editedRows[params.id] && (
              <Tooltip title="저장">
                <IconButton
                  size="small"
                  onClick={() => handleRowSave(editBuffer[params.id] || params.row)}
                >
                  <SaveIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        );
      },
    }
  ];

  // 파일 업로드 및 매핑 요청 처리
  // update: 텍스트 매핑 말고 다른 방법 찾아보기!
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
      // 각 행에 고유id 부여 및 매핑 데이터 업데이트
      const formatted = data.map((item, idx) => ({ id: idx + 1, ...item }));
      setRows(formatted);
      setOriginalRows(formatted); // 초기 데이터 보관
    } catch (e) {
      console.error("매핑 실패", e);
    } finally {
      setLoading(false); // 로딩 스피너 종료
    }
  };

  // 행 로컬 저장
  const handleRowUpdate = (newRow, oldRow) => {
    if (JSON.stringify(newRow) !== JSON.stringify(oldRow)) { // 행 전체 내용을 문자열로 바꿔서 비교
      setEditedRows((prev) => ({ ...prev, [newRow.id]: true })); // 수정된 행 id를 true로 설정(기록 추적)
      setEditBuffer((prev) => ({ ...prev, [newRow.id]: newRow })); // 수정된 데이터 객체 자체 저장 (일괄 저장용)
      // 해당 row 새 데이터 업데이트
      setRows((prev) =>
        prev.map((row) => (row.id === newRow.id ? { ...newRow } : row))
      );
    }
    return newRow;
  };

  // 행 서버 저장
  //update: 수정 이력 기록
  const handleRowSave = async (row) => {
    const updatedRow = {
      ...row,
      //"매핑 여부": "O", // 저장시 매핑 O로 자동처리
    };
    // 백업 저장용
    setEditBuffer((prev) => ({ ...prev, [row.id]: updatedRow }));
    // 수정 완료 처리
    setEditedRows((prev) => { 
      const updated = { ...prev };
      delete updated[row.id];
      return updated;
    });
    // 테이블 업데이트
    setRows((prev) =>
    prev.map((r) => (r.id === updatedRow.id ? updatedRow : r))
    );

    // 백엔드 저장 요청
    try {
      const res = await fetch("http://localhost:8000/save-matched-row", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedRow),
      });
      await res.json();
      showSnackbar(`저장 성공 : ${updatedRow["표준코드"]}`, "success");

      // 이중 처리 (백엔드 수정값 반영)
      setRows((prevRows) =>
        prevRows.map((r) => (r.id === updatedRow.id ? updatedRow : r))
      );
      // 마지막 상태 클린업
      setEditedRows((prev) => {
        const updated = { ...prev };
        delete updated[updatedRow.id];
        return updated;
      });
    } catch (err) {
      showSnackbar("저장 실패", "error");
    }
  };

  // 행 삭제
  const handleRowDelete = (id) => {
    setRows((prevRows) => prevRows.filter((row) => row.id !== id));
    setEditedRows((prev) => {
      const newEdited = { ...prev };
      delete newEdited[id];
      return newEdited;
    });
  };

  // 최종 승인
  // update: 사용자가 선택한 데이터만 저장
  const handleApproval = async () => {
    const approvedRows = rows;  // 전체 데이터 저장 (default) 
    
    try {
      const res = await fetch("http://localhost:8000/save-approved", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(approvedRows),
      });
      await res.json();

      //showSnackbar(`최종 승인 완료: ${result.updated}건`, "success");
      setPostApprovalMessage(`✅ 최종 승인이 완료되었습니다! <br/> 📄 목록 페이지로 이동합니다다...`);
      // List 페이지 이동
      setTimeout(() => {
        navigate("/drugs");
      }, 2000); 
      
      // 상태 초기화
      setEditedRows({});
      setEditBuffer({});
    } catch (err) {
      showSnackbar("최종 승인 실패", "error");
    }
  };

  // 다운로드 처리
  const handleDownload = () => {
    const ws = utils.json_to_sheet(rows); // 테이블 데이터 -> 엑셀 워크시트 변환환
    const wb = utils.book_new(); // 엑셀 워크북
    utils.book_append_sheet(wb, ws, "Mapping Result");
    writeFile(wb, "mapping_result.xlsx");
  };

  // 승인 Dialog 내 수정된 항목 강조 스타일
  const getBoxStyle = (item) => {
    const isEdited = Object.keys(editBuffer).includes(item.id?.toString());
    return {
      mb: 2,
      p: 2,
      border: isEdited ? "3px solid" : "2px solid",
      borderColor: isEdited ? "#f44336" : "#ccc",
      borderRadius: 2,
    };
  };

  // 필드별 수정정 여부 확인
  const isFieldEdited = (item, field) => {
    const original = originalRows.find((row) => row.id === item.id);
    return original && original[field] !== item[field];
  };

  // Snackbar 알림
  const showSnackbar = (message, severity = "success") => {
    setAlertMessage(message);
    setAlertSeverity(severity);
    setOpen(true);
  };

  // 이미지 모달 확대
  const handleImageClick = (url) => {
    setSelectedImage(url);
    setOpenImage(true);
  };

  // 목록 필터링 (검색어, 전체, 성공, 실패)
  const filteredRows = rows.filter(
    (row) =>
      // 매핑 여부 필터링
      (filter === "all"
        ? true
        : filter === "success"
        ? row["매핑 여부"] === "O"
        : row["매핑 여부"] === "X") &&
      // 검색어 필터링
      row["입력 약품명"].toLowerCase().includes(searchText.toLowerCase())
  );

  // 렌더링 파트
  return (
    <Container maxWidth="xlg" sx={{ mt: 4 }}>
    {/* 최종 승인 메시지 최상단 위치*/}
    {postApprovalMessage && (
      <Alert severity="success" sx={{ mb: 2, fontWeight: "bold" }}>
        {postApprovalMessage}
      </Alert>
    )}
    
      <Typography variant="h5" gutterBottom>
        Upload your pharmacy’s drug list (Excel/PDF) and match with system database.
      </Typography>

      {/* 파일 업로드 및 매핑 / 다운로드 */}
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
        <Stack direction="row" alignItems="center" sx={{ mb: 2 }}>
          <TextField
            label="약품명 검색"
            variant="outlined"
            size="small"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            sx={{ width: 200 }}
          />
          {/* 필터링 버튼 */}
          <Button variant={filter === "all" ? "contained" : "outlined"} onClick={() => setFilter("all")}>
            전체
          </Button>
          <Button variant={filter === "success" ? "contained" : "outlined"} onClick={() => setFilter("success")}>
            성공
          </Button>
          <Button variant={filter === "fail" ? "contained" : "outlined"} onClick={() => setFilter("fail")}>
            실패
          </Button>
          {/* 최종승인 버튼 */}
          <Box sx={{ width: "100%", display: "flex", justifyContent: "flex-end", mt: 2 }}>
            <Button
              variant="contained"
              color="secondary"
              onClick={() => {
                const hasEdits = Object.keys(editBuffer).length > 0;
                const preview = hasEdits ? Object.values(editBuffer) : rows;
                setPreviewData(preview);
                setConfirmOpen(true);
              }}
            >
              최종승인
            </Button>
          </Box>
        </Stack>
      )}

      {/* 데이터 테이블 */}
      {rows.length > 0 && (
        <Box sx={{ height: "70vh" }}>
          <DataGrid
            rows={filteredRows}
            columns={columns}
            processRowUpdate={handleRowUpdate} // 수정 시 상태 갱신
            onProcessRowUpdateError={(error) => console.error(error)}
            experimentalFeatures={{ newEditingApi: true }}
            disableRowSelectionOnClick
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

      {/* 이미지 미리보기 Dialog */}
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

      {/* 최종 승인 Dialog */}
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>최종 승인</DialogTitle>
        <DialogContent dividers>
        {/* 메시지 박스 추가 위치 */}
        {postApprovalMessage && (
          <Alert 
            severity="success" 
            sx={{ 
              mb: 3,
              px: 4,
              py: 3,
              fontSize: "1.25rem",
              fontWeight: "bold",
              borderRadius: 2,
              textAlign: "center",
              backgroundColor: "#d0f2e8",
              color: "#00796b",
              position: "sticky",
              top: 0,
              zIndex: 2
              }}
            >
            {postApprovalMessage}
          </Alert>
        )}
          {/* 요약 메세지 */}
          <Typography gutterBottom>
            전체 <strong>{rows.length}</strong>건 중{" "}
            <strong style={{ color: "#d32f2f" }}>{previewData.length}</strong>건이 수정되었습니다.
          </Typography>
          <Typography>
            {previewData.length > 0 ? (
              <>
                수정된 <strong>{previewData.length}</strong>건을 포함한 전체 약품 데이터 <strong>{rows.length}</strong>건을 최종 승인하시겠습니까?
              </>
            ) : (
              <>
                전체 <strong>{rows.length}</strong>건의 약품 데이터를 최종 승인하시겠습니까?
              </>
            )}
          </Typography>
          <Typography sx={{ mt: 1, fontSize: "0.875rem", color: "gray", mb: 2 }}>
            ※ 최종 승인 시 모든 데이터가 서버에 저장됩니다.
          </Typography>
          {/* 승인 메모 입력 */}
          <TextField
            fullWidth
            label="승인 메모 (선택)"
            variant="outlined"
            size="small"
            value={approvalNote}
            onChange={(e) => setApprovalNote(e.target.value)}
            sx={{ mb: 3 }}
          />
          {/* 리스트 토글 */}
          <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
            <Button
              variant={showAllRowsInDialog ? "contained" : "outlined"}
              onClick={() => setShowAllRowsInDialog(true)}
            >
              전체내역
            </Button>
            <Button
              variant={!showAllRowsInDialog ? "contained" : "outlined"}
              onClick={() => setShowAllRowsInDialog(false)}
            >
              수정내역
            </Button>
          </Stack>

          {/* 리스트 렌더링 시작 */}
          {(showAllRowsInDialog ? rows : previewData)
            .filter((row) =>
              filter === "all"
                ? true
                : filter === "success"
                ? row["매핑 여부"] === "O"
                : row["매핑 여부"] === "X"
            )
            .map((item) => (
              <Box key={item.id} sx={getBoxStyle(item)}>
                <Typography>ID: {item.id}</Typography>
                <Typography>
                  입력 약품명: {item["입력 약품명"]}
                  {isFieldEdited(item, "입력 약품명") && (
                    <Box component="span" sx={editedLabelStyle}>수정됨</Box>
                  )}
                </Typography>
                <Typography>
                  입력 수량: {item["입력 수량"]}
                  {isFieldEdited(item, "입력 수량") && (
                    <Box component="span" sx={editedLabelStyle}>수정됨</Box>
                  )}
                </Typography>
                <Typography>
                  매핑 약품명: {item["매핑 약품명"]}
                  {isFieldEdited(item, "매핑 약품명") && (
                    <Box component="span" sx={editedLabelStyle}>수정됨</Box>
                  )}
                </Typography>
                <Typography>
                  표준코드: {item["표준코드"]}
                  {isFieldEdited(item, "표준코드") && (
                    <Box component="span" sx={editedLabelStyle}>수정됨</Box>
                  )}
                </Typography>
                <Typography>
                  유사도: {item["유사도 점수"]}%
                  {isFieldEdited(item, "유사도 점수") && (
                    <Box component="span" sx={editedLabelStyle}>수정됨</Box>
                  )}
                </Typography>
              </Box>
            ))}
        </DialogContent>
        <Stack direction="row" justifyContent="flex-end" sx={{ p: 2 }}>
          <Button onClick={() => setConfirmOpen(false)}>취소</Button>
          <Button
            variant="contained"
            onClick={handleApproval}
          >
            승인 확정
          </Button>
        </Stack>
      </Dialog>
      {/* Snackbar 알림 */}
      <Snackbar
        open={open}
        autoHideDuration={3000}
        onClose={() => setOpen(false)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          onClose={() => setOpen(false)}
          severity={alertSeverity}
          sx={{ 
            width: "100%",
            fontSize: "1rem", 
            fontWeight: "bold",      
            borderRadius: 2,         
            boxShadow: 3,            
            px: 3,                   
            py: 2,                   
          }}
        >
          {alertMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default Upload;
