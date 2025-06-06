import {
  Box,
  Typography,
  useTheme,
  Snackbar,
  Alert,
  Card,
  CardContent,
  Button,
  Fade,
  Slide,
  Tooltip,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import { Avatar } from "@mui/material";
import { tokens } from "../../theme";
import Header from "../../components/Header";
import { useEffect, useState } from "react";

const Invoices = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  const [drugInfo, setDrugInfo] = useState(null);
  const [showCard, setShowCard] = useState(false);
  const [rows, setRows] = useState([]);

  // 최초 재고 로드
  useEffect(() => {
    fetch("http://localhost:8000/api/inventory")
      .then((res) => res.json())
      .then((data) => setRows(data));
  }, []);

  // WebSocket 수신 처리
  useEffect(() => {
    const socket = new WebSocket("ws://localhost:8000/ws/drug-count");

    socket.onopen = () => {
      console.log("✅ WebSocket 연결됨");
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setDrugInfo(data);
      setShowCard(true);

      setRows((prevRows) =>
        prevRows.map((row) => {
          if (row.barcode === data.drug_standard_code) {
            return {
              ...row,
              quantity: Math.max(0, parseInt(row.quantity) - parseInt(data.count_quantity)),
            };
          }
          return row;
        })
      );

      // 7초 후 알림 카드 닫기
      setTimeout(() => setShowCard(false), 7000);
    };

    return () => socket.close();
  }, []);

  const columns = [
    { field: "id", headerName: "ID", flex: 0.5 },
    { field: "drug_name", headerName: "약품명", flex: 2 },
    { field: "barcode", headerName: "바코드", flex: 1.5 },
    { field: "quantity", headerName: "수량", flex: 1 },
    { field: "unit", headerName: "단위", flex: 0.5 },
    { field: "cabinet", headerName: "선반", flex: 0.5 },
    { field: "row", headerName: "줄", flex: 0.5 },
    { field: "column", headerName: "칸", flex: 0.5 },
  ];

  return (
    <Box m="20px">
      <Header title="INVENTORY" subtitle="실시간 약품 재고 반영" />

      {/* 오른쪽 하단 알림 카드 */}
      {drugInfo && showCard && (
        <Slide direction="up" in={showCard} mountOnEnter unmountOnExit>
          <Box
            sx={{
              position: "fixed",
              bottom: 48, // 하단 모서리 띄우기
              right: 24,
              width: 360,
              height: 360,
              bgcolor: "background.paper",
              boxShadow: "0px 8px 24px rgba(0,0,0,0.15)",
              borderRadius: 2,
              zIndex: 9999,
              p: 2,
              borderLeft: `5px solid ${colors.greenAccent[500]}`,
            }}
          >
            {/* 약사 Avatar */}
            <Tooltip title="이재영 약사">
              <Avatar
                alt="약사 이름"
                src="/assets/pharmacist1.png" // 실제 이미지 경로로 변경
                sx={{
                  position: "absolute",
                  top: -20,
                  right: -20,
                  width: 100,
                  height: 100,
                  border: "2px solid white",
                }}
            />
            </Tooltip>
            <Typography fontWeight="bold" gutterBottom>
              ✅ 약품 카운팅 완료
            </Typography>
            <Typography variant="body2">
              <strong>약품명:</strong> {drugInfo.drug_name}
            </Typography>
            <Typography variant="body2">
              <strong>변경 수량:</strong> -{drugInfo.count_quantity} 개
            </Typography>
            <Typography variant="body2">
              <strong>표준코드:</strong> {drugInfo.drug_standard_code}
            </Typography>
            <Button
              size="small"
              variant="outlined"
              sx={{ mt: 1 }}
              onClick={() => setShowCard(false)}
            >
              닫기
            </Button>
          </Box>
        </Slide>
      )}

      {/* 재고 테이블 */}
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
        }}
      >
        <DataGrid checkboxSelection rows={rows} columns={columns} />
      </Box>
    </Box>
  );
};

export default Invoices;
