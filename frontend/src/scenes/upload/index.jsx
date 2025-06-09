/**
 * Upload.jsx
 *
 * This component provides a full-featured interface for uploading drug order lists (Excel or PDF),
 * automatically matching them with EXION's up-to-date drug database,
 * allowing in-browser editing, and exporting or saving the results.
 */

import '../../styles/deleteButton.css';
import Tooltip from '@mui/material/Tooltip';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataGrid } from '@mui/x-data-grid';
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
  Chip,
} from '@mui/material';
import { utils, writeFile } from 'xlsx';
import { styled } from '@mui/material/styles';
import CloseIcon from '@mui/icons-material/Close';
import SaveIcon from '@mui/icons-material/Save';
import DeleteIcon from '@mui/icons-material/Delete';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import font from '../../fonts/NotoSansKR-normal';

//! 회사 API 변경 후 사용: http://192.168.1.89:8000
// 외부 접속 허용 API
const API_KEY = 'http://192.168.1.89:8000';
const WS_URL = `${API_KEY.replace(/^http/, 'ws')}`;

// 폰트 설정
jsPDF.API.events.push([
  'addFonts',
  function () {
    this.addFileToVFS('NotoSansKR-Regular.ttf', font);
    this.addFont('NotoSansKR-Regular.ttf', 'NotoSansKR', 'normal');
  },
]);

const doc = new jsPDF();
doc.setFont('NotoSansKR');
doc.text('테스트 약품명: 아세트아미노펜 정 500mg', 20, 20);

const Upload = () => {
  const navigate = useNavigate();

  // 상태 정의
  const [file, setFile] = useState(null);
  const [rows, setRows] = useState([]); // 테이블 데이터
  const [originalRows, setOriginalRows] = useState([]); // 원본 데이터

  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all'); // 필터(전체/성공/실패)

  const [searchText, setSearchText] = useState('');
  const [editBuffer, setEditBuffer] = useState({}); // 수정된 row 로컬 저장
  const [editedRows, setEditedRows] = useState({}); // 수정된 row ID 추적
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [previewData, setPreviewData] = useState([]);

  const [openImage, setOpenImage] = useState(false);
  const [selectedImage, setSelectedImage] = useState('');

  const [open, setOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertSeverity, setAlertSeverity] = useState('success');

  const [approvalNote, setApprovalNote] = useState('');
  const [postApprovalMessage, setPostApprovalMessage] = useState('');
  const [showAllRowsInDialog, setShowAllRowsInDialog] = useState(true); // dialog 전체/수정 전환

  // 수정됨 표시 스타일
  const editedLabelStyle = {
    backgroundColor: '#fdecea',
    color: '#d32f2f',
    fontSize: '0.75rem',
    fontWeight: 'bold',
    borderRadius: 1,
    px: 1,
    ml: 1,
    display: 'inline-block',
  };

  // 테이블 컬럼 정의
  const columns = [
    { field: 'id', headerName: 'ID', flex: 0.2, align: 'left', headerAlign: 'left' },
    {
      field: '입력 약품명',
      headerName: 'Input Name',
      flex: 0.7,
      editable: true,
      align: 'left',
      headerAlign: 'left',
    },
    {
      field: '매핑 약품명',
      headerName: 'Mapped Name',
      flex: 0.7,
      editable: true,
      align: 'left',
      headerAlign: 'left',
    },
    {
      field: '표준코드',
      headerName: 'Standard Code',
      flex: 0.4,
      editable: true,
      align: 'left',
      headerAlign: 'left',
    },
    {
      field: '제조사',
      headerName: 'Manufacturer',
      flex: 0.4,
      editable: true,
      align: 'left',
      headerAlign: 'left',
    },
    {
      field: '약품 이미지',
      headerName: 'Image',
      flex: 0.3,
      align: 'center',
      headerAlign: 'left',
      renderCell: (params) =>
        params.value ? (
          <img
            src={params.value}
            alt="drug"
            width="40"
            onClick={() => handleImageClick(params.value)}
            style={{ cursor: 'pointer' }}
          />
        ) : (
          'N/A'
        ),
    },
    {
      field: '입력 수량',
      headerName: 'Quantity',
      flex: 0.3,
      editable: true,
      align: 'right',
      headerAlign: 'right',
    },
    {
      field: '유사도 점수',
      headerName: 'Score',
      flex: 0.3,
      align: 'right',
      headerAlign: 'right',
      renderCell: (params) => {
        const value = params.value;
        const rounded = typeof value === 'number' ? value.toFixed(0) : value; // round-up value
        return <span>{rounded}</span>;
      },
    },
    {
      field: '액션',
      headerName: 'Actions',
      flex: 0.4,
      align: 'right',
      headerAlign: 'center',
      renderCell: (params) => {
        return (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              width: '100%',
              position: 'relative',
            }}
          >
            {/* 삭제 버튼: 모든 행에 항상 표시 */}
            <Tooltip title="삭제">
              <IconButton size="small" onClick={() => handleRowDelete(params.row.id)}>
                <DeleteIcon fontSize="small" />
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
    },
  ];

  // 파일 업로드 박스
  const VisuallyHiddenInput = styled('input')({
    clip: 'rect(0 0 0 0)',
    clipPath: 'inset(50%)',
    height: 1,
    overflow: 'hidden',
    position: 'absolute',
    bottom: 0,
    left: 0,
    whiteSpace: 'nowrap',
    width: 1,
  });

  // update: 매핑방식 변경
  // 업로드 파일 매핑 처리
  const handleUpload = async () => {
    if (!file) return alert('파일을 선택해주세요.');

    const formData = new FormData();
    formData.append('file', file);

    try {
      setLoading(true);
      //const res = await fetch("http://localhost:8000/match-json", {
      const res = await fetch(`${API_KEY}/match-json`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      // 각 행에 고유id 부여 및 매핑 데이터 업데이트
      const formatted = data.map((item, idx) => ({ id: idx + 1, ...item }));
      setRows(formatted);
      setOriginalRows(formatted); // 초기 데이터 보관
    } catch (e) {
      console.error('매핑 실패', e);
    } finally {
      setLoading(false);
    }
  };

  // 행 로컬 저장
  const handleRowUpdate = (newRow, oldRow) => {
    if (JSON.stringify(newRow) !== JSON.stringify(oldRow)) {
      // 행 전체 내용을 문자열로 바꿔서 비교
      setEditedRows((prev) => ({ ...prev, [newRow.id]: true })); // 수정된 행 id를 true로 설정(기록 추적)
      setEditBuffer((prev) => ({ ...prev, [newRow.id]: newRow })); // 수정된 데이터 객체 자체 저장 (일괄 저장용)
      // 해당 row 새 데이터 업데이트
      setRows((prev) => prev.map((row) => (row.id === newRow.id ? { ...newRow } : row)));
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
    setRows((prev) => prev.map((r) => (r.id === updatedRow.id ? updatedRow : r)));

    // 백엔드 저장 요청
    try {
      //const res = await fetch('http://localhost:8000/save-matched-row', {
      const res = await fetch(`${API_KEY}/save-match-row`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedRow),
      });
      await res.json();
      showSnackbar(`저장 성공 : ${updatedRow['표준코드']}`, 'success');

      // 이중 처리 (백엔드 수정값 반영)
      setRows((prevRows) => prevRows.map((r) => (r.id === updatedRow.id ? updatedRow : r)));
      // 마지막 상태 클린업
      setEditedRows((prev) => {
        const updated = { ...prev };
        delete updated[updatedRow.id];
        return updated;
      });
    } catch (err) {
      showSnackbar('저장 실패', 'error');
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
    const approvedRows = rows; // 전체 데이터 저장 (default)

    try {
      //const res = await fetch('http://localhost:8000/save-approved', {
      const res = await fetch(`${API_KEY}/save-approved`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(approvedRows),
      });
      await res.json();

      //showSnackbar(`최종 승인 완료: ${result.updated}건`, "success");
      setPostApprovalMessage(`✅ 최종 승인이 완료되었습니다! <br/> 📄 목록 페이지로 이동합니다...`);
      // List 페이지 이동
      setTimeout(() => {
        navigate('/drugs');
      }, 2000);

      // 상태 초기화
      setEditedRows({});
      setEditBuffer({});
    } catch (err) {
      showSnackbar('최종 승인 실패', 'error');
    }
  };

  // update: 추후 서버에서 다운로드 처리하게 디벨롭
  const handleDownload = () => {
    const ws = utils.json_to_sheet(rows); // 테이블 데이터 -> 엑셀 워크시트 변환
    const wb = utils.book_new(); // 엑셀 워크북
    utils.book_append_sheet(wb, ws, 'Mapping Result');
    writeFile(wb, 'parse_pdf_text_to_rows.xlsx');
  };

  // 승인 Dialog 내 수정된 항목 강조 스타일
  const getBoxStyle = (item) => {
    const isEdited = Object.keys(editBuffer).includes(item.id?.toString());
    return {
      mb: 2,
      p: 2,
      border: isEdited ? '3px solid' : '2px solid',
      borderColor: isEdited ? '#f44336' : '#ccc',
      borderRadius: 2,
    };
  };

  // todo: Generate and download drug mapping results as a formatted PDF file
  // PDF 다운로드
  const handlePdfDownload = () => {
    const doc = new jsPDF({
      orientation: 'landscape', // 가로방향 설정
      unit: 'mm',
      format: 'a4',
    });
    doc.setFont('NotoSansKR');

    doc.setFontSize(16);
    doc.text('Drug Mapping Result', 14, 20);

    const headers = [
      ['ID', '입력 약품명', '매핑 약품명', '표준코드', '제조사', '수량', '유사도', '매핑'],
    ];
    const data = rows.map((row) => [
      row.id,
      row['입력 약품명'] || '',
      row['매핑 약품명'] || '',
      row['표준코드'] || '',
      row['제조사'] || '',
      row['입력 수량'] || '',
      row['유사도 점수'] || '',
      row['매핑 여부'] || '',
    ]);

    // pdf 테이블 설정
    autoTable(doc, {
      startY: 30,
      head: headers,
      body: data,
      styles: {
        font: 'NotoSansKR',
        fontSize: 9,
        cellPadding: 2,
        overflow: 'linebreak', // 긴 텍스트 줄바꿈
      },
      headStyles: {
        font: 'NotoSansKR',
        fontStyle: 'normal',
        fontSize: 10,
        fillColor: [22, 160, 133],
        textColor: [255, 255, 255],
      },
      columnStyles: {
        0: { cellWidth: 10 }, // ID
        1: { cellWidth: 65 }, // 입력 약품명
        2: { cellWidth: 65 }, // 매핑 약품명
        3: { cellWidth: 30 }, // 표준코드
        4: { cellWidth: 40 }, // 제조사
        5: { cellWidth: 20 }, // 수량
        6: { cellWidth: 20 }, // 유사도 점수
        7: { cellWidth: 15 }, // 매핑여부
      },
      tableWidth: 'wrap',
    });

    doc.save('mapping_result.pdf');
  };

  // 필드별 수정정 여부 확인
  const isFieldEdited = (item, field) => {
    const original = originalRows.find((row) => row.id === item.id);
    return original && original[field] !== item[field];
  };

  // Snackbar 알림
  const showSnackbar = (message, severity = 'success') => {
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
      (filter === 'all'
        ? true
        : filter === 'success'
          ? row['매핑 여부'] === 'O'
          : row['매핑 여부'] === 'X') &&
      // 검색어 필터링
      row['입력 약품명'].toLowerCase().includes(searchText.toLowerCase())
  );

  return (
    <Container maxWidth="xlg" sx={{ mt: 4 }}>
      {/* 최종 승인 메시지 (최상단 배치) */}
      {postApprovalMessage && (
        <Alert severity="success" sx={{ mb: 2, fontWeight: 'bold' }}>
          {postApprovalMessage}
        </Alert>
      )}
      <Typography variant="h2" fontWeight="bold" gutterBottom>
        Import Data
      </Typography>
      <Typography variant="h5" color="text.secondary" mb={3}>
        Connect your pharmacy’s order list with EXION’s up-to-date drug database.
      </Typography>

      {/* 파일 업로드 박스 */}
      {rows.length === 0 && (
        <Box
          sx={{
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            boxShadow: '0 8px 32px rgba(31, 38, 135, 0.15)',
            borderRadius: 4,
            p: 6,
            textAlign: 'center',
            maxWidth: 1000,
            mx: 'auto',
            mt: 7,
          }}
        >
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            Upload Your Drug List
          </Typography>
          <Typography variant="h6" mb={4}>
            ✔️ Select an Excel or PDF file to match with our latest drug data.
          </Typography>

          <Stack direction="row" spacing={2} justifyContent="center">
            <Button
              component="label"
              variant="contained"
              sx={{
                px: 2,
                py: 1.5,
                fontWeight: 'bold',
                fontSize: '1rem',
                borderRadius: 2,
                backgroundColor: 'rgb(109, 208, 193)',
                color: '#fff ',
                '&:hover': {
                  backgroundColor: 'rgb(49, 158, 140)',
                },
              }}
              endIcon={<CloudUploadIcon />}
            >
              Choose File
              <VisuallyHiddenInput
                type="file"
                accept=".xlsx,.xls,.pdf"
                onChange={(e) => setFile(e.target.files[0])}
              />
            </Button>

            {file && (
              <Button
                variant="contained"
                onClick={handleUpload}
                disabled={loading && !file}
                sx={{
                  backgroundColor: 'rgb(109, 208, 193)',
                  '&:hover': { backgroundColor: 'rgb(49, 158, 140)' },
                  fontWeight: 'bold',
                  px: 2,
                  py: 1.5,
                  fontSize: '0.8rem',
                  borderRadius: 2,
                }}
              >
                {loading ? (
                  <>
                    <CircularProgress size={18} sx={{ color: '#fff', mr: 1 }} />
                    Uploading...
                  </>
                ) : (
                  'Upload'
                )}
              </Button>
            )}
          </Stack>

          {file && (
            <Typography variant="body2" mt={3}>
              Selected file:{' '}
              <Box component="span" sx={{ fontWeight: 600, color: 'rgb(255, 31, 31)' }}>
                {file.name}
              </Box>
            </Typography>
          )}
        </Box>
      )}

      {/* 왼쪽 상단 */}
      {!loading && rows.length > 0 && (
        <Stack direction="row" alignItems="center" sx={{ mb: 2, gap: 1 }}>
          {/* 검색창 */}
          <TextField
            label="Search by Drug Name"
            variant="outlined"
            size="small"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            sx={{ width: 300 }}
          />
          {/* 필터링 버튼 */}
          <Button
            variant={filter === 'all' ? 'contained' : 'outlined'}
            onClick={() => setFilter('all')}
          >
            All
          </Button>
          <Button
            variant={filter === 'success' ? 'contained' : 'outlined'}
            onClick={() => setFilter('success')}
          >
            Matched
          </Button>
          <Button
            variant={filter === 'fail' ? 'contained' : 'outlined'}
            onClick={() => setFilter('fail')}
          >
            Unmatched
          </Button>

          {/* 우측 상단 */}
          <Box sx={{ width: '100%', display: 'flex', justifyContent: 'flex-end', mt: 2, gap: 1 }}>
            {/* New Import */}
            <Button
              variant="outlined"
              color="primary"
              onClick={() => {
                setRows([]);
                setFile(null);
                setOriginalRows([]);
              }}
              sx={{
                minWidth: 40,
                px: 1.5,
                height: 40,
              }}
            >
              <UploadFileIcon />
            </Button>
            {/* 최종승인 */}
            <Button
              variant="contained"
              color="secondary"
              onClick={() => {
                const hasEdits = Object.keys(editBuffer).length > 0;
                const preview = hasEdits ? Object.values(editBuffer) : rows;
                setPreviewData(preview);
                setConfirmOpen(true);
              }}
              sx={{
                fontWeight: 'bold',
                color: '#fff',
                fontSize: '0.9rem',
                backgroundColor: 'rgb(109, 208, 193)',
              }}
            >
              Confirm
            </Button>
          </Box>
        </Stack>
      )}

      {/* 데이터 테이블 */}
      {rows.length > 0 && (
        <Box sx={{ height: '70vh' }}>
          <DataGrid
            rows={filteredRows}
            columns={columns}
            processRowUpdate={handleRowUpdate} // 수정 시 상태 갱신
            onProcessRowUpdateError={(error) => console.error(error)}
            experimentalFeatures={{ newEditingApi: true }}
            pageSizeOptions={[25, 50, 100]}
            paginationModel={{ pageSize: 25, page: 0 }}
            disableRowSelectionOnClick
            getRowClassName={(params) => {
              if (editBuffer[params.id]) return 'edited-row';
              if (params.row['매핑 여부'] === 'X') return 'unmatched-row';
              return '';
            }}
            sx={{
              '& .MuiDataGrid-cell': {
                display: 'flex',
                alignItems: 'center',
              },
              '& .matched': { color: 'green' },
              '& .unmatched': { color: 'red' },
              '& .unmatched-row': {
                backgroundColor: '#fce8e8',
              },
              '& .edited-row': {
                backgroundColor: '#e8f5e9',
              },
            }}
          />
        </Box>
      )}

      {/* 이미지 확대 */}
      <Dialog open={openImage} onClose={() => setOpenImage(false)} maxWidth="md">
        <DialogTitle sx={{ fontSize: '1.4rem', fontWeight: 'bold' }}>
          Image
          <IconButton
            onClick={() => setOpenImage(false)}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {selectedImage && (
            <img
              src={selectedImage}
              alt="약품 확대"
              style={{ width: '100%', maxHeight: '70vh', objectFit: 'contain' }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* 최종 승인 Dialog */}
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Final Approval</DialogTitle>
        <DialogContent dividers>
          {/* 메시지 박스 추가 위치 */}
          {postApprovalMessage && (
            <Alert
              severity="success"
              sx={{
                mb: 3,
                px: 4,
                py: 3,
                fontSize: '1.25rem',
                fontWeight: 'bold',
                borderRadius: 2,
                textAlign: 'center',
                backgroundColor: '#d0f2e8',
                color: '#00796b',
                position: 'sticky',
                top: 0,
                zIndex: 2,
              }}
            >
              {postApprovalMessage}
            </Alert>
          )}
          {/* 요약 메세지 */}
          <Typography gutterBottom sx={{ fontSize: '1rem' }}>
            <strong>{rows.length}</strong> records in total, with{' '}
            <strong style={{ color: '#d32f2f' }}>{previewData.length}</strong> modified.
          </Typography>
          <Typography sx={{ fontSize: '1rem' }}>
            {previewData.length > 0 ? (
              <>
                Do you want to finalize all <strong>{rows.length}</strong> drug records, including{' '}
                <strong>{previewData.length}</strong> modified items?
              </>
            ) : (
              <>
                Do you want to finalize all <strong>{rows.length}</strong> drug records?
              </>
            )}
          </Typography>
          <Typography sx={{ mt: 1, fontSize: '0.875rem', color: 'gray', mb: 2 }}>
            ※ All data will be saved to the server upon final approval.
          </Typography>
          {/* 승인 메모 입력 */}
          <TextField
            fullWidth
            label="Apporval Note (optional)"
            variant="outlined"
            size="small"
            value={approvalNote}
            onChange={(e) => setApprovalNote(e.target.value)}
            sx={{ mb: 3 }}
          />
          {/* 리스트 토글 */}
          <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
            <Button
              variant={showAllRowsInDialog ? 'contained' : 'outlined'}
              onClick={() => setShowAllRowsInDialog(true)}
            >
              All
            </Button>
            <Button
              variant={!showAllRowsInDialog ? 'contained' : 'outlined'}
              onClick={() => setShowAllRowsInDialog(false)}
            >
              Modified
            </Button>
          </Stack>

          {/* 리스트 렌더링 시작 */}
          {(showAllRowsInDialog ? rows : previewData)
            .filter((row) =>
              filter === 'all'
                ? true
                : filter === 'success'
                  ? row['매핑 여부'] === 'O'
                  : row['매핑 여부'] === 'X'
            )
            .map((item) => (
              <Box key={item.id} sx={getBoxStyle(item)}>
                <Typography>ID: {item.id}</Typography>
                <Typography>
                  Input: {item['입력 약품명']}
                  {isFieldEdited(item, '입력 약품명') && (
                    <Box component="span" sx={editedLabelStyle}>
                      수정됨
                    </Box>
                  )}
                </Typography>
                <Typography>
                  Mapped: {item['매핑 약품명']}
                  {isFieldEdited(item, '매핑 약품명') && (
                    <Box component="span" sx={editedLabelStyle}>
                      수정됨
                    </Box>
                  )}
                </Typography>
                <Typography>
                  Qty: {item['입력 수량']}
                  {isFieldEdited(item, '입력 수량') && (
                    <Box component="span" sx={editedLabelStyle}>
                      수정됨
                    </Box>
                  )}
                </Typography>
                <Typography>
                  Code: {item['표준코드']}
                  {isFieldEdited(item, '표준코드') && (
                    <Box component="span" sx={editedLabelStyle}>
                      수정됨
                    </Box>
                  )}
                </Typography>
                <Typography>
                  Score: {item['유사도 점수']}%
                  {isFieldEdited(item, '유사도 점수') && (
                    <Box component="span" sx={editedLabelStyle}>
                      수정됨
                    </Box>
                  )}
                </Typography>
              </Box>
            ))}
        </DialogContent>
        <Stack direction="row" justifyContent="flex-end" sx={{ p: 2 }}>
          <Button onClick={() => setConfirmOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleApproval}>
            Save
          </Button>
        </Stack>
      </Dialog>
      {/* Snackbar 알림 */}
      <Snackbar
        open={open}
        autoHideDuration={3000}
        onClose={() => setOpen(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setOpen(false)}
          severity={alertSeverity}
          sx={{
            width: '100%',
            fontSize: '1rem',
            fontWeight: 'bold',
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
