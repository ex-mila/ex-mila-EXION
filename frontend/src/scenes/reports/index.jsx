import React, { useEffect, useState, useRef } from 'react';
import {
  Box,
  Typography,
  TextField,
  Stack,
  Alert,
  CircularProgress,
  Chip,
  Button,
  Slide,
  Avatar,
  Tooltip,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import DownloadIcon from '@mui/icons-material/Download';
import ReplayIcon from '@mui/icons-material/Replay';
import CircleIcon from '@mui/icons-material/Circle';
import * as XLSX from 'xlsx';
import { tokens } from '../../theme';
import '../../index.css';

//! 회사 API 변경 후 사용: http://192.168.1.89:8000
// 외부 접속 허용 API
const API_KEY = 'http://172.30.1.13:8000';
const WS_URL = `${API_KEY.replace(/^http/, 'ws')}`;

const extractDateTime = (timestamp) => {
  const date = `${timestamp.slice(0, 4)}-${timestamp.slice(4, 6)}-${timestamp.slice(6, 8)}`;
  const time = `${timestamp.slice(9, 11)}:${timestamp.slice(11, 13)}:${timestamp.slice(13)}`;
  return [date, time];
};

const formatTime = (timeStr) => {
  const [hh, mm] = timeStr.split(':');
  const hour = parseInt(hh);
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const hour12 = (((hour + 11) % 12) + 1).toString().padStart(2, '0');
  return `${hour12}:${mm} ${suffix}`;
};

const Reports = () => {
  const [logs, setLogs] = useState([]);
  const [search, setSearch] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [drugInfo, setDrugInfo] = useState(null);
  const [showCard, setShowCard] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [selectionModel, setSelectionModel] = useState([]);

  const wsRef = useRef(null);
  const colors = tokens('light');

  const fetchLogs = () => {
    fetch(`${API_KEY}/api/reports`)
      .then((res) => {
        if (!res.ok) throw new Error('응답 오류');
        return res.json();
      })
      .then((data) => {
        const formatted = data.map((item) => {
          const [date, timeRaw] = extractDateTime(item.timestamp);
          return {
            ...item,
            date,
            time: formatTime(timeRaw),
            isNew: false,
            id: item.id,
          };
        });
        setLogs(formatted);
        setFetchError(false);
      })
      .catch((err) => {
        console.error('서버 응답 실패:', err.message);
        setFetchError(true);
      })
      .finally(() => {
        setLoading(false);
        setIsConnecting(false);
      });
  };

  const connectWebSocket = () => {
    if (wsRef.current && wsRef.current.readyState <= 1) return;

    const ws = new WebSocket(`${WS_URL}/ws`);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      setIsConnecting(false);
      fetchLogs();
    };

    ws.onclose = () => {
      setIsConnected(false);
      setIsConnecting(false);
      setFetchError(true);
    };

    ws.onmessage = (event) => {
      const raw = JSON.parse(event.data);
      setDrugInfo(raw);
      setShowCard(true);

      const [date, timeRaw] = extractDateTime(raw.timestamp);
      const formattedTime = formatTime(timeRaw);
      const newRowId = raw.id;

      setLogs((prev) => {
        const cleaned = prev.map((log) => ({ ...log, isNew: false }));
        const newLog = {
          ...raw,
          date,
          time: formattedTime,
          isNew: true,
          id: newRowId,
        };
        return [newLog, ...cleaned.filter((log) => log.id !== newRowId)].slice(0, 50);
      });

      setTimeout(() => {
        setLogs((prev) =>
          prev.map((log) => (log.id === newRowId ? { ...log, isNew: false } : log))
        );
        setShowCard(false);
      }, 9000);
    };
  };

  useEffect(() => {
    fetchLogs();
    connectWebSocket();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!wsRef.current || wsRef.current.readyState > 1) {
        connectWebSocket();
      }
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const filteredLogs = logs.filter((log) =>
    log.drug_name?.toLowerCase().includes(search.toLowerCase())
  );

  const handleExcelDownload = () => {
    const worksheet = XLSX.utils.json_to_sheet(logs);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Reports');
    XLSX.writeFile(workbook, 'counting_logs.xlsx');
  };

  const columns = [
    { field: 'id', headerName: 'ID', flex: 0.3 },
    { field: 'date', headerName: 'Date', flex: 0.5 },
    { field: 'time', headerName: 'Time', flex: 0.5 },
    { field: 'drug_name', headerName: 'Drug Name', flex: 1.2 },
    { field: 'drug_standard_code', headerName: 'Code', flex: 0.8 },
    { field: 'count_quantity', headerName: 'Quantity', flex: 0.4 },
  ];

  return (
    <Box m="20px">
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        mb={4}
        spacing={2}
        flexWrap="wrap"
      >
        <Box>
          <Typography variant="h2" fontWeight="bold" gutterBottom>
            Transaction Log
          </Typography>
          <Typography variant="h5" color="text.secondary" mb={1}>
            Live updates from the pill counter as each task completes.
          </Typography>
        </Box>

        <Stack direction="row" spacing={2} alignItems="center">
          <Chip
            label={isConnected ? 'LIVE' : 'DISCONNECTED'}
            color={isConnected ? 'error' : 'default'}
            size="small"
            icon={<CircleIcon fontSize="small" />}
          />
          <Button
            onClick={() => window.location.reload()}
            variant="outlined"
            size="small"
            startIcon={<ReplayIcon />}
          >
            Refresh
          </Button>
        </Stack>
      </Stack>

      {/* 실시간 카운팅 완료 알림 카드 (오른쪽 하단) */}
      {drugInfo && showCard && (
        <Slide direction="up" in={showCard} mountOnEnter unmountOnExit>
          <Box
            sx={{
              position: 'fixed',
              bottom: 48,
              right: 24,
              width: 360,
              height: 420,
              bgcolor: 'background.paper',
              boxShadow: 3,
              borderRadius: 2,
              zIndex: 9999,
              p: 2,
              borderLeft: `5px solid ${colors.greenAccent[500]}`,
            }}
          >
            {/* Avatar */}
            <Tooltip title="Branden S.">
              <Avatar
                alt="pharmacist"
                src="/assets/pharmacist1.png"
                sx={{
                  position: 'absolute',
                  top: -20,
                  right: -20,
                  width: 100,
                  height: 100,
                  border: '2px solid white',
                  boxShadow: 2,
                }}
              />
            </Tooltip>

            {/* Title */}
            <Box
              sx={{
                textAlign: 'center',
                backgroundColor: '#00b8a9',
                py: 1,
                px: 2,
                borderRadius: 1,
                fontWeight: 'bold',
                color: 'white',
                fontSize: '1rem',
                mb: 2,
              }}
            >
              Pill Counting Completed!
            </Box>

            {/* Info Table */}
            {drugInfo && (
              <Box component="table" sx={{ width: '100%', fontSize: '0.8rem' }}>
                <tbody>
                  {[
                    ['Drug', drugInfo.drug_name],
                    ['Code', drugInfo.drug_standard_code],
                    ['Quantity', `${drugInfo.count_quantity} pcs`],
                    ['Timeline', `${drugInfo.timestamp}`],
                    [
                      'Snapshot',
                      <img
                        src={`${API_KEY}/images/${drugInfo.timestamp}.png`}
                        alt="drug"
                        style={{ maxWidth: '100%', borderRadius: 8 }}
                        onError={(e) => (e.target.style.display = 'none')}
                      />,
                    ],
                  ].map(([label, value]) => (
                    <tr key={label}>
                      <td
                        style={{
                          //backgroundColor: '#f1f8e9',
                          fontWeight: 600,
                          padding: '8px 12px',
                          width: '20%',
                          textAlign: 'center',
                          borderBottom: '1px solid #eee',
                        }}
                      >
                        {label}
                      </td>
                      <td
                        style={{
                          padding: '8px 12px',
                          borderBottom: '1px solid #eee',
                        }}
                      >
                        {value || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Box>
            )}

            {/* Close Button */}
            <Box display="flex" justifyContent="center" mt={1}>
              <Button
                variant="outlined"
                size="small"
                onClick={() => setShowCard(false)}
                sx={{
                  color: '#009f94',
                  borderColor: '#009f94',
                  borderRadius: '8px',
                  fontWeight: 500,
                  textTransform: 'none',
                  px: 2.5,
                  minWidth: 80,
                  '&:hover': {
                    backgroundColor: '#e0f8f6',
                    borderColor: '#00b8a9',
                  },
                }}
              >
                Close
              </Button>
            </Box>
          </Box>
        </Slide>
      )}

      {/*  데이터 클릭 시 이미지 로그*/}
      {selectedRow && (
        <Box
          sx={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 950,
            height: 450,
            bgcolor: 'background.paper',
            boxShadow: 6,
            borderRadius: 2,
            zIndex: 2000,
            display: 'flex',
            overflow: 'hidden',
          }}
        >
          {/* 좌측 이미지 */}
          <Box
            sx={{
              width: '50%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: '#f7f7f7',
              p: 3,
            }}
          >
            <img
              src={`${API_KEY}/images/${selectedRow.timestamp}.png`}
              alt="drug"
              style={{
                width: '100%',
                height: 'auto',
                objectFit: 'contain',
                borderRadius: 8,
              }}
              onError={(e) => (e.target.style.display = 'none')}
            />
          </Box>
          {/* 우측 표 형식 정보 */}
          <Box
            sx={{
              width: '50%',
              p: 4,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <Box>
              <Typography variant="h4" fontWeight="bold" sx={{ mb: 4 }}>
                Image Log
              </Typography>

              <Box
                component="table"
                sx={{ width: '100%', borderCollapse: 'collapse', fontSize: '1rem' }}
              >
                <tbody>
                  {[
                    ['Drug', selectedRow.drug_name],
                    ['Std Code', selectedRow.drug_standard_code],
                    ['Quantity', `${selectedRow.count_quantity} pcs`],
                    ['Timeline', `${selectedRow.date}-${selectedRow.time}`],
                    ['User', 'Branden S.'],
                  ].map(([label, value]) => (
                    <tr key={label}>
                      <td
                        style={{
                          backgroundColor: ' #e0f2f1',
                          fontWeight: 'bold',
                          padding: '12px 16px',
                          width: '30%',
                          borderBottom: '1px solid #ddd',
                          whiteSpace: 'nowrap',
                          textAlign: 'center',
                        }}
                      >
                        {label}
                      </td>
                      <td
                        style={{
                          padding: '12px 16px',
                          borderBottom: '1px solid #ddd',
                        }}
                      >
                        {value}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Box>
            </Box>
            <Button
              variant="outlined"
              fullWidth
              sx={{ mt: 3 }}
              onClick={() => {
                setSelectedRow(null);
                setSelectionModel([]);
              }}
            >
              Close
            </Button>
          </Box>
        </Box>
      )}
      {/* 서버 연결 끊겼을 때 알림 메세지 */}
      {fetchError && !loading && (
        <Alert
          severity="error"
          icon={false}
          sx={{
            mb: 3,
            border: '1px solid #f44336',
            backgroundColor: '#ffebee',
            color: '#c62828',
            px: 3,
            py: 2,
            borderLeft: '6px solid #f44336',
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            alignItems: 'center',
          }}
        >
          <Box
            component="span"
            sx={{ fontSize: '1.2rem', lineHeight: 1.4, display: 'inline-block' }}
          >
            ⚠️ Unable to connect to the server. <br />
            <Box component="span" sx={{ pl: '1.6em', display: 'inline-block' }}>
              Please ensure <strong>EXR-MINI</strong> is powered on and reachable.
            </Box>
          </Box>
        </Alert>
      )}
      {/* Data Loading */}
      {loading ? (
        <Box textAlign="center" mt={4}>
          <CircularProgress />
          <Typography mt={2}> Loading Data...</Typography>
        </Box>
      ) : isConnected ? (
        <>
          <Stack direction="row" spacing={2} alignItems="center" mb={2}>
            <TextField
              label="Search by Drug Name"
              variant="outlined"
              size="small"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Button
              variant="contained"
              startIcon={<DownloadIcon />}
              sx={{
                backgroundColor: '#e0f2f1',
                color: 'black',
                boxShadow: 2,
                '&:hover': { backgroundColor: '#00b8a9' },
              }}
              onClick={handleExcelDownload}
            >
              Download
            </Button>
          </Stack>

          <Box
            height="70vh"
            sx={{
              '& .MuiDataGrid-root': { border: 'none' },
              '& .MuiDataGrid-cell': { borderBottom: 'none' },
              '& .MuiDataGrid-columnHeaders': {
                backgroundColor: '#e3f2fd',
                fontWeight: 'bold',
              },
              '& .MuiDataGrid-virtualScroller': {
                backgroundColor: '#fafafa',
              },
              '& .MuiDataGrid-footerContainer': {
                borderTop: 'none',
                backgroundColor: '#4ccfc1',
              },
              '& .MuiDataGrid-row:hover': {
                backgroundColor: 'rgba(224, 242, 241, 0.7)',
              },
              '& .MuiDataGrid-cell:last-of-type': {
                textAlign: 'right',
              },
            }}
          >
            <DataGrid
              rows={filteredLogs}
              columns={columns}
              getRowClassName={(params) => (params.row.isNew ? 'new-row' : '')}
              checkboxSelection
              disableRowSelectionOnClick
              pageSizeOptions={[25, 50, 100]}
              paginationModel={{ pageSize: 25, page: 0 }}
              selectionModel={selectionModel}
              onSelectionModelChange={(newSelection) => setSelectionModel(newSelection)}
              initialState={{
                sorting: {
                  sortModel: [{ field: 'id', sort: 'desc' }],
                },
              }}
              onRowClick={(params) => setSelectedRow(params.row)}
              sx={{
                '& .MuiDataGrid-root': {
                  border: 'none',
                },
                '& .MuiDataGrid-columnHeaders': {
                  backgroundColor: '#e0f2f1',
                  fontWeight: 'bold',
                  fontSize: '0.95rem',
                  color: '#004d40',
                },
                '& .MuiDataGrid-cell': {
                  borderBottom: '1px solid #eee',
                  fontSize: '0.9rem',
                },
                '& .MuiDataGrid-row:hover': {
                  backgroundColor: 'rgba(224, 242, 241, 0.4)',
                },
                '& .MuiDataGrid-row:nth-of-type(odd)': {
                  backgroundColor: '#fafafa',
                },
                '& .MuiDataGrid-footerContainer': {
                  backgroundColor: '#00b8a9',
                  color: 'white',
                  fontWeight: 'bold',
                  fontSize: '0.85rem',
                },
                '& .MuiCheckbox-root': {
                  color: '#d3d3d3',
                },
              }}
            />
          </Box>
        </>
      ) : null}
    </Box>
  );
};

export default Reports;
