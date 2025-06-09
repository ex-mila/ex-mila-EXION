import React, { useState } from 'react';
import {
  Box,
  Button,
  Typography,
  TextField,
  Stack,
  Container,
  CircularProgress,
  Card,
  CardContent,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import axios from 'axios';

const API_BASE = 'http://192.168.1.89:8000';

const BarcodeCard = () => {
  const [code, setCode] = useState('');
  const [imageUrl, setImageUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [drugInfo, setDrugInfo] = useState(null);

  const handleGenerate = async () => {
    if (!code) return;
    setLoading(true);
    try {
      // 먼저 약품 정보와 바코드 이미지 동시 요청
      const infoRes = await axios.get(`${API_BASE}/api/barcode/info?code=${code}`);
      setDrugInfo(infoRes.data);

      const imgRes = await axios.get(`${API_BASE}/api/barcode?code=${code}`, {
        responseType: 'blob',
      });
      const blob = new Blob([imgRes.data], { type: 'image/png' });
      const url = URL.createObjectURL(blob);
      setImageUrl(url);
    } catch (err) {
      alert('해당 바코드를 찾을 수 없습니다.');
      setDrugInfo(null);
      setImageUrl(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 6 }}>
      <Box
        sx={{
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          backgroundColor: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.2)',
          borderRadius: 4,
          boxShadow: '0 8px 32px rgba(31, 38, 135, 0.25)',
          p: 5,
        }}
      >
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          Barcode Generator
        </Typography>
        <Typography variant="subtitle1" color="text.secondary" mb={3}>
          약품의 표준코드 또는 제품코드를 입력하세요.
        </Typography>

        <Stack direction="row" spacing={2} mb={3}>
          <TextField
            fullWidth
            label="코드 입력"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            variant="outlined"
            size="small"
          />
          <Button
            variant="contained"
            onClick={handleGenerate}
            disabled={!code || loading}
            sx={{
              fontWeight: 'bold',
              backgroundColor: 'rgb(109, 208, 193)',
              '&:hover': { backgroundColor: 'rgb(49, 158, 140)' },
            }}
          >
            {loading ? <CircularProgress size={20} color="inherit" /> : 'Generate'}
          </Button>
        </Stack>

        {drugInfo && imageUrl && (
          <Card
            elevation={3}
            sx={{
              mt: 2,
              p: 2,
              backgroundColor: '#fff',
              borderRadius: 3,
              boxShadow: 2,
              textAlign: 'center',
            }}
          >
            <CardContent>
              <Typography variant="h6" fontWeight="bold">
                {drugInfo.drug_name}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {drugInfo.manufacturer} | {drugInfo.standard_code}
              </Typography>

              <img
                src={imageUrl}
                alt="Barcode"
                style={{
                  maxWidth: '100%',
                  margin: '12px 0',
                  borderRadius: '8px',
                  border: '1px solid #ccc',
                }}
              />

              <Typography variant="body2" gutterBottom>
                💊 수량: <strong>{drugInfo.quantity}</strong> {drugInfo.unit}
              </Typography>
              <Typography variant="body2" gutterBottom>
                📦 위치: {drugInfo.cabinet} - {drugInfo.row_label}-{drugInfo.position}
              </Typography>

              <a href={imageUrl} download={`barcode_${code}.png`}>
                <Button
                  variant="outlined"
                  startIcon={<DownloadIcon />}
                  sx={{ mt: 2, fontWeight: 'bold' }}
                >
                  다운로드
                </Button>
              </a>
            </CardContent>
          </Card>
        )}
      </Box>
    </Container>
  );
};

export default BarcodeCard;
