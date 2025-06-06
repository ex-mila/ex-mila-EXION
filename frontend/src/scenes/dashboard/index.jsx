import { useEffect, useState } from 'react';
import { Box, Typography, Avatar, Paper, useMediaQuery } from '@mui/material';
import { styled, useTheme } from '@mui/material/styles';
import { motion } from 'framer-motion';

//! 회사 API 변경 후 사용: http://192.168.1.89:8000
// 외부 접속 허용 API
const API_KEY = 'http://172.30.1.66:8000';
const WS_URL = `${API_KEY.replace(/^http/, 'ws')}`;

const GlassCard = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  borderRadius: '20px',
  backgroundColor: 'rgba(255, 255, 255, 0.1)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  border: '1px solid rgba(255, 255, 255, 0.2)',
  boxShadow: '0 12px 40px rgba(31, 38, 135, 0.1)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: 120,
  transition: 'transform 0.3s ease, box-shadow 0.3s ease',
  '&:hover': {
    transform: 'translateY(-6px) scale(1.02)',
    boxShadow: '0 16px 48px rgba(31, 38, 135, 0.2)',
  },
}));

const SideInfo = ({ title, subtitle }) => (
  <Box sx={{ textAlign: 'center' }}>
    <Typography variant="h6" fontWeight="bold" color="#0a2540">
      {title}
    </Typography>
    <Typography variant="body2" color="#6b7280">
      {subtitle}
    </Typography>
  </Box>
);

const Dashboard = () => {
  const theme = useTheme();
  const isTablet = useMediaQuery('(max-width:900px)');
  const [deviceConnected, setDeviceConnected] = useState(false);
  const [lastSynced, setLastSynced] = useState('08:32 AM');
  const [todayCount, setTodayCount] = useState(32);
  const [yesterdayCount, setYesterdayCount] = useState(28);

  useEffect(() => {
    const ws = new WebSocket(`${WS_URL}/ws`);
    ws.onopen = () => setDeviceConnected(true);
    ws.onclose = () => setDeviceConnected(false);
    return () => ws.close();
  }, []);

  const percentChange = yesterdayCount
    ? (((todayCount - yesterdayCount) / yesterdayCount) * 100).toFixed(1)
    : '0';

  return (
    <Box
      sx={{
        p: isTablet ? 3 : 6,
        background: 'linear-gradient(135deg, #eef2f3 0%, #ffffff 100%)',
        minHeight: '100vh',
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <Paper
          elevation={0}
          sx={{
            display: 'flex',
            flexDirection: isTablet ? 'column' : 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            p: 5,
            borderRadius: 5,
            background: 'rgba(255, 255, 255, 0.15)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            boxShadow: '0 12px 40px rgba(31, 38, 135, 0.1)',
          }}
        >
          {/* Left Info */}
          <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center', fontSize: '1rem' }}>
            <SideInfo
              title="Device"
              subtitle={
                <motion.span
                  animate={{ opacity: [0.6, 1, 0.6] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                  style={{ display: 'inline-block', fontSize: '1rem' }}
                >
                  {deviceConnected ? '🟢 Connected to EXR-MINI' : '🔴 Device Not connected'}
                </motion.span>
              }
            />
          </Box>

          {/* Center - Welcome */}
          <Box
            sx={{
              flex: 2,
              display: 'flex',
              flexDirection: 'column',
              gap: 3,
              alignItems: 'center',
              textAlign: 'center',
            }}
          >
            <Typography variant="h3" fontWeight="bold" color="#0a2540">
              Welcome back, Branden
            </Typography>
            <Typography variant="h6" color="#6b7280">
              Pharmacist | Multipharma, Belgium
            </Typography>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              <Avatar
                src="/assets/pharmacist1.png"
                sx={{
                  width: 250,
                  height: 250,
                  border: '2px solid rgba(255, 255, 255, 0.8)',
                  boxShadow: '0 6px 24px rgba(0,0,0,0.1)',
                  mt: 2,
                  mb: 2,
                }}
              />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.6 }}
            >
              <Typography variant="h5" color="rgb(60, 70, 79)">
                Stay productive with Exion’s smart pharmacy system 🍀
              </Typography>
            </motion.div>
          </Box>

          {/* Right Info */}
          <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center', fontSize: '1rem' }}>
            <SideInfo
              title="Monitoring"
              subtitle={
                <motion.span
                  animate={{ opacity: [0.6, 1, 0.6] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                  style={{ display: 'inline-block', fontSize: '1rem' }}
                >
                  {deviceConnected ? '🟢 Live' : '🔴 Offline'}
                </motion.span>
              }
            />
          </Box>
        </Paper>

        {/* Stat Cards */}
        <Box
          sx={{
            mt: 5,
            display: 'grid',
            gridTemplateColumns: isTablet ? '1fr 1fr' : '1fr 1fr 1fr 1fr',
            gap: 3,
          }}
        >
          <GlassCard>
            <Typography variant="h6" color="#24b47e" fontWeight="bold">
              ✔ Pills Counted Today: {todayCount}
            </Typography>
          </GlassCard>

          <GlassCard>
            <Typography variant="h6" color="#e00" fontWeight="bold">
              ❌ Errors Detected: 2
            </Typography>
          </GlassCard>

          <GlassCard>
            <Typography variant="h6" color="#0a2540" fontWeight="bold">
              🕒 Last Synced: {lastSynced}
            </Typography>
          </GlassCard>

          <GlassCard>
            <Typography variant="h6" color="#f5a623" fontWeight="bold">
              📊 {percentChange > 0 ? '▲' : '▼'} {Math.abs(percentChange)}% vs. Yesterday
            </Typography>
          </GlassCard>
        </Box>
      </motion.div>
    </Box>
  );
};

export default Dashboard;
