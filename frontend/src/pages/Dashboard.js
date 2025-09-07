import React, { useEffect, useState } from "react";
import axios from "axios";
import { Grid, CircularProgress, Typography, Card, CardContent, Chip, Box, Button, Alert, FormControl, InputLabel, Select, MenuItem, Divider, Paper, Stack } from "@mui/material";
import { CheckCircle, Error, Warning, Info, Dashboard as DashboardIcon, Assessment, Notifications, Computer, Memory, Storage, AccessTime } from "@mui/icons-material";
import { Link } from "react-router-dom";
import StatCard from "../components/StatCard";
import TimeSeriesChart from "../components/TimeSeriesChart";

function Dashboard() {
  const [health, setHealth] = useState(null);
  const [metrics, setMetrics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState('');
  const [agent, setAgent] = useState(null);
  const [hist, setHist] = useState(null);
  const [overview, setOverview] = useState(null);

  useEffect(() => {
    let mounted = true;
    const fetchData = async () => {
      try {
        const [h, m, o] = await Promise.all([
          axios.get("/api/health"),
          axios.get("/api/metrics"),
          axios.get("/api/overview")
        ]);
        if (mounted) {
          setHealth(h.data);
          setMetrics(m.data);
          setOverview(o.data);
          setLoading(false);

          if (!selectedAgent && m.data.length > 0) {
            setSelectedAgent(m.data[0].agent_id);
          }
        }
      } catch (e) {
        console.error("Error fetching data:", e);

      }
    };
    fetchData();
    const interval = setInterval(fetchData, 5000); 
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!selectedAgent) return;
    // set current agent from metrics list
    const found = metrics.find(m => m.agent_id === selectedAgent);
    if (found) setAgent(found);
  }, [selectedAgent, metrics]);

  useEffect(() => {
    if (!selectedAgent) return;
    let active = true;
    const fetchHist = async () => {
      try {
        const res = await axios.get(`/api/history/${selectedAgent}`);
        if (active) setHist(res.data);
      } catch (e) {
        console.error("History fetch failed", e);
      }
    };
    fetchHist();
    const interval = setInterval(fetchHist, 5000);
    return () => { active = false; clearInterval(interval); };
  }, [selectedAgent]);

  if (loading) return <CircularProgress />;

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'healthy':
      case 'ok':
        return 'success';
      case 'warning':
        return 'warning';
      case 'error':
      case 'critical':
        return 'error';
      default:
        return 'info';
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'healthy':
      case 'ok':
        return <CheckCircle />;
      case 'warning':
        return <Warning />;
      case 'error':
      case 'critical':
        return <Error />;
      default:
        return <Info />;
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ mb: 3 }}>
        System Overview
      </Typography>

      {/* Device Selector */}
      <Paper elevation={1} sx={{ p: 3, mb: 4, borderRadius: 2 }}>
        <Box display="flex" alignItems="center" gap={2}>
          <FormControl sx={{ minWidth: 280 }}>
            <InputLabel>Select Device</InputLabel>
            <Select
              value={selectedAgent}
              label="Select Device"
              onChange={e => setSelectedAgent(e.target.value)}
              sx={{ borderRadius: 2 }}
            >
              {metrics.map(m => (
                <MenuItem key={m.agent_id} value={m.agent_id}>
                  <Box display="flex" flexDirection="column" alignItems="flex-start">
                    <Typography variant="body2" fontWeight={600}>
                      {m.device || 'Device'} - {m.agent_id.slice(0, 8)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {m.platform} {m.platform_release}
                    </Typography>
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {agent && (
            <Chip 
              label={`${agent.device || 'Device'} Online`} 
              color="success" 
              variant="outlined"
            />
          )}
        </Box>
      </Paper>

      {/* System Health Summary */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {health && (
          <>
            <Grid item xs={12} md={4}>
              <Card sx={{ height: '100%', backgroundColor: '#1e1e1e', border: '1px solid #333' }}>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={2}>
                    {getStatusIcon(health.status)}
                    <Typography variant="h6" sx={{ ml: 1 }}>
                      System Status
                    </Typography>
                  </Box>
                  <Typography variant="h4" color="primary" sx={{ mb: 1 }}>
                    {health.status?.toUpperCase()}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Last updated: {new Date(health.server_time * 1000).toLocaleString()}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={4}>
              <Card sx={{ height: '100%', backgroundColor: '#1e1e1e', border: '1px solid #333' }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Devices Reporting
                  </Typography>
                  <Typography variant="h3" color="primary">
                    {health.devices_reporting || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total monitored devices
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={4}>
              <Card sx={{ height: '100%', backgroundColor: '#1e1e1e', border: '1px solid #333' }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Active Alerts
                  </Typography>
                  <Typography variant="h3" color={health.total_alerts > 0 ? 'secondary' : 'primary'}>
                    {health.total_alerts || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Issues requiring attention
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </>
        )}
      </Grid>

      {/* Quick Actions */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12}>
          <Card sx={{ backgroundColor: '#1e1e1e', border: '1px solid #333' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Quick Actions
              </Typography>
              <Box display="flex" gap={2} flexWrap="wrap">
                <Button
                  variant="outlined"
                  component={Link}
                  to="/metrics"
                  sx={{ borderColor: '#888', color: 'primary' }}
                >
                  View Detailed Metrics
                </Button>
                <Button
                  variant="outlined"
                  component={Link}
                  to="/alerts"
                  sx={{ borderColor: '#888', color: health?.total_alerts > 0 ? 'secondary' : 'primary' }}
                >
                  View Alerts ({health?.total_alerts || 0})
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Server Overview */}
      {overview && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12}>
            <Card sx={{ backgroundColor: '#1e1e1e', border: '1px solid #333' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Server Overview
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6} md={4}>
                    <Typography variant="body2" color="text.secondary">Hostname</Typography>
                    <Typography>{overview.hostname}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6} md={4}>
                    <Typography variant="body2" color="text.secondary">Operating System</Typography>
                    <Typography>{overview.os_name} {overview.os_version}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6} md={4}>
                    <Typography variant="body2" color="text.secondary">CPU</Typography>
                    <Typography>{overview.cpu}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6} md={4}>
                    <Typography variant="body2" color="text.secondary">GPU</Typography>
                    <Typography>{overview.gpu || 'N/A'}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6} md={4}>
                    <Typography variant="body2" color="text.secondary">RAM</Typography>
                    <Typography>{overview.ram}</Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </Box>
  );
}

export default Dashboard;