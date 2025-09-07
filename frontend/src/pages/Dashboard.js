import React, { useEffect, useState } from "react";
import axios from "axios";
import { Grid, CircularProgress, Typography, Card, CardContent, Chip, Box, Button, Alert, FormControl, InputLabel, Select, MenuItem, Divider } from "@mui/material";
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

  useEffect(() => {
    let mounted = true;
    const fetchData = async () => {
      try {
        const [h, m] = await Promise.all([
          axios.get("/api/health"),
          axios.get("/api/metrics")
        ]);
        if (mounted) {
          setHealth(h.data);
          setMetrics(m.data);
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

      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* System Health Summary */}
        {health && (
          <>
            <Grid item xs={12} md={4}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={2}>
                    {getStatusIcon(health.status)}
                    <Typography variant="h6" sx={{ ml: 1 }}>
                      System Status
                    </Typography>
                  </Box>
                  <Typography variant="h4" color={`${getStatusColor(health.status)}.main`} sx={{ mb: 1 }}>
                    {health.status?.toUpperCase()}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Last updated: {new Date(health.server_time * 1000).toLocaleString()}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={4}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Devices Reporting
                  </Typography>
                  <Typography variant="h3" color="primary.main">
                    {health.devices_reporting || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total monitored devices
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={4}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Active Alerts
                  </Typography>
                  <Typography variant="h3" color={health.total_alerts > 0 ? 'error.main' : 'success.main'}>
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
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Quick Actions
              </Typography>
              <Box display="flex" gap={2} flexWrap="wrap">
                <Button
                  variant="contained"
                  component={Link}
                  to="/metrics"
                  startIcon={<Assessment />}
                >
                  View Detailed Metrics
                </Button>
                <Button
                  variant="outlined"
                  component={Link}
                  to="/alerts"
                  startIcon={<Notifications />}
                  color={health?.total_alerts > 0 ? 'error' : 'primary'}
                >
                  View Alerts ({health?.total_alerts || 0})
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Device Summary */}
      {metrics.length > 0 && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Device Summary
                </Typography>
                <Grid container spacing={2}>
                  {metrics.slice(0, 6).map((device) => (
                    <Grid item xs={12} sm={6} md={4} key={device.agent_id}>
                      <Card variant="outlined" sx={{ height: '100%' }}>
                        <CardContent>
                          <Typography variant="subtitle1" gutterBottom>
                            {device.device || 'Device'} - {device.agent_id.slice(0, 8)}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Platform: {device.platform} {device.platform_release}
                          </Typography>
                          <Box mt={1}>
                            <Typography variant="caption" display="block">
                              CPU: {device.cpu?.total_percent?.toFixed(1) || 'N/A'}%
                            </Typography>
                            <Typography variant="caption" display="block">
                              Memory: {device.memory?.percent?.toFixed(1) || 'N/A'}%
                            </Typography>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Selected Device Details */}
      {agent && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Selected Device: {agent.device || 'Device'} ({agent.agent_id.slice(0, 8)})
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                      title="CPU Usage"
                      value={agent.cpu?.total_percent?.toFixed(1) || '0'}
                      unit="%"
                      percent={agent.cpu?.total_percent || 0}
                      icon={<Computer />}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                      title="Memory Usage"
                      value={agent.memory?.percent?.toFixed(1) || '0'}
                      unit="%"
                      percent={agent.memory?.percent || 0}
                      icon={<Memory />}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                      title="Swap Usage"
                      value={agent.memory?.swap_percent?.toFixed(1) || '0'}
                      unit="%"
                      percent={agent.memory?.swap_percent || 0}
                      color="secondary"
                      icon={<Storage />}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                      title="Uptime"
                      value={(agent.uptime_sec / 3600)?.toFixed(1) || '0'}
                      unit="h"
                      icon={<AccessTime />}
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Charts */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  CPU Usage (Last 2 min)
                </Typography>
                {hist && hist.cpu && hist.cpu.length > 0 ? (
                  <TimeSeriesChart
                    dataPoints={hist.cpu}
                    labels={hist.cpu.map((_,i)=>`${i * (hist.interval_sec || 5)}s`)}
                    label="CPU %"
                    color="rgba(25,118,210,1)"
                  />
                ) : (
                  <Typography variant="body2" color="text.secondary">Gathering samples...</Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Memory Usage (Last 2 min)
                </Typography>
                {hist && hist.mem && hist.mem.length > 0 ? (
                  <TimeSeriesChart
                    dataPoints={hist.mem}
                    labels={hist.mem.map((_,i)=>`${i * (hist.interval_sec || 5)}s`)}
                    label="Memory %"
                    color="rgba(211,47,47,1)"
                  />
                ) : (
                  <Typography variant="body2" color="text.secondary">Gathering samples...</Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </Box>
  );
}

export default Dashboard;
