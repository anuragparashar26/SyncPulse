import React, { useEffect, useState } from "react";
import axios from "axios";
import { Card, CardContent, Typography, Grid, CircularProgress, MenuItem, Select, InputLabel, FormControl, Chip, Box, LinearProgress, Divider, Alert, Paper, Stack, IconButton, Tooltip } from "@mui/material";
import { Line, Pie } from "react-chartjs-2";
import { Refresh, Computer, Memory, Storage, NetworkCheck, Speed, Settings, Security } from "@mui/icons-material";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Legend,
  ArcElement,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Legend, ArcElement);

function Metrics() {
  const [metrics, setMetrics] = useState([]);
  const [selectedAgent, setSelectedAgent] = useState("");
  const [loading, setLoading] = useState(true);
  const [gpuInfo, setGpuInfo] = useState([]);
  const [gpuLoading, setGpuLoading] = useState(true);
  const [hist, setHist] = useState(null);

  useEffect(() => {
    let mounted = true;
    const fetchMetrics = () => {
      axios.get("/api/metrics").then(res => {
        if (mounted) {
          setMetrics(res.data);
          setLoading(false);
          if (res.data.length > 0 && !selectedAgent) setSelectedAgent(res.data[0].agent_id);
        }
      });
    };
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 1000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [selectedAgent]);

    useEffect(() => {
      let mounted = true;
      const fetchGpu = () => {
        axios.get("/gpu").then(res => {
          if (mounted) {
            setGpuInfo(res.data.gpus || []);
            setGpuLoading(false);
          }
        }).catch(()=>setGpuLoading(false));
      };
      fetchGpu();
      const interval = setInterval(fetchGpu, 5000);
      return () => {
        mounted = false;
        clearInterval(interval);
      };
    }, []);

    useEffect(() => {
      if (selectedAgent) {
        setHist(null); // reset when switching agent
        let active = true;
        const fetchHistory = () => {
          axios.get(`/api/history/${selectedAgent}`).then(res => {
            if (active) setHist(res.data);
          }).catch(err => {
            console.error("Error fetching history:", err);
            if (active && !hist) setHist({ cpu: [], mem: [] });
          });
        };
        fetchHistory();
        const interval = setInterval(fetchHistory, 5000);
        return () => { active = false; clearInterval(interval); };
      }
    }, [selectedAgent]);

  if (loading) return <CircularProgress />;
  if (!metrics.length) return <Typography>No metrics available.</Typography>;

    // GPU Info Section
    const renderGpuInfo = () => (
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h6">System GPUs</Typography>
          {gpuLoading ? <CircularProgress size={20} /> : (
            gpuInfo.length === 0 ? <Typography>No GPUs detected.</Typography> : (
              <Grid container spacing={2}>
                {gpuInfo.map((g, i) => (
                  <Grid key={i} item xs={12} md={3}>
                    <Typography variant="subtitle2">{g.vendor} {g.name}</Typography>
                    {g.load !== undefined && <Typography variant="caption">Load: {g.load || g.utilization || 0}%</Typography>}
                    {g.temperature_C !== undefined && <Typography variant="caption" display="block">Temp: {g.temperature_C}°C</Typography>}
                    {g.total_memory_MB !== undefined && <Typography variant="caption" display="block">Mem: {g.used_memory_MB || g.vram_usage_MB || 0} / {g.total_memory_MB || g.vram_total_MB || 0} MB</Typography>}
                  </Grid>
                ))}
              </Grid>
            )
          )}
        </CardContent>
      </Card>
    );

  const agent = metrics.find(m => m.agent_id === selectedAgent);

  return (
    <Box sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Typography variant="h4" fontWeight={700} color="primary">
          System Metrics Dashboard
        </Typography>
        <Tooltip title="Refresh Data">
          <IconButton color="primary" onClick={() => window.location.reload()}>
            <Refresh />
          </IconButton>
        </Tooltip>
      </Box>

      

      {agent && (
        <Box>
          {/* Enhanced System Overview Cards */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            {/* CPU Usage card first, with bar */}
            <Grid item xs={12} md={3}>
              <Card sx={{ height: '100%', background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', color: 'white' }}>
                <CardContent>
                  <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                    <Computer />
                    <Typography variant="h3" fontWeight={700}>
                      {agent.cpu.total_percent.toFixed(1)}%
                    </Typography>
                  </Box>
                  <Typography variant="h6" gutterBottom>CPU Usage</Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Total CPU utilization
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={agent.cpu.total_percent}
                    sx={{
                      mt: 2,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: 'rgba(255,255,255,0.2)',
                      '& .MuiLinearProgress-bar': { backgroundColor: 'white' }
                    }}
                    color={
                      agent.cpu.total_percent > 90
                        ? 'error'
                        : agent.cpu.total_percent > 75
                        ? 'warning'
                        : 'success'
                    }
                  />
                </CardContent>
              </Card>
            </Grid>
            {/* Memory Usage card */}
            <Grid item xs={12} md={3}>
              <Card sx={{ height: '100%', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
                <CardContent>
                  <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                    <Memory />
                    <Typography variant="h3" fontWeight={700}>
                      {agent.memory.percent.toFixed(1)}%
                    </Typography>
                  </Box>
                  <Typography variant="h6" gutterBottom>Memory Usage</Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    {(agent.memory.used / 1024 / 1024 / 1024).toFixed(1)} GB of {(agent.memory.total / 1024 / 1024 / 1024).toFixed(1)} GB
                  </Typography>
                  <LinearProgress 
                    variant="determinate" 
                    value={agent.memory.percent} 
                    sx={{ 
                      mt: 2, 
                      height: 8, 
                      borderRadius: 4,
                      backgroundColor: 'rgba(255,255,255,0.2)',
                      '& .MuiLinearProgress-bar': { backgroundColor: 'white' }
                    }} 
                  />
                </CardContent>
              </Card>
            </Grid>
            {/* Swap Usage card */}
            <Grid item xs={12} md={3}>
              <Card sx={{ height: '100%', background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', color: 'white' }}>
                <CardContent>
                  <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                    <Storage />
                    <Typography variant="h3" fontWeight={700}>
                      {agent.memory.swap_percent.toFixed(1)}%
                    </Typography>
                  </Box>
                  <Typography variant="h6" gutterBottom>Swap Usage</Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    {(agent.memory.swap_used / 1024 / 1024 / 1024).toFixed(1)} GB of {(agent.memory.swap_total / 1024 / 1024 / 1024).toFixed(1)} GB
                  </Typography>
                  <LinearProgress 
                    variant="determinate" 
                    value={agent.memory.swap_percent} 
                    sx={{ 
                      mt: 2, 
                      height: 8, 
                      borderRadius: 4,
                      backgroundColor: 'rgba(255,255,255,0.2)',
                      '& .MuiLinearProgress-bar': { backgroundColor: 'white' }
                    }} 
                  />
                </CardContent>
              </Card>
            </Grid>
            {/* System Uptime card */}
            <Grid item xs={12} md={3}>
              <Card sx={{ height: '100%', background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', color: 'white' }}>
                <CardContent>
                  <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                    <Speed />
                    <Typography variant="h3" fontWeight={700}>
                      {(agent.uptime_sec / 3600).toFixed(1)}h
                    </Typography>
                  </Box>
                  <Typography variant="h6" gutterBottom>System Uptime</Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    {(agent.uptime_sec / 86400).toFixed(1)} days running
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Enhanced Time Series Charts */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} md={6}>
              <Paper elevation={3} sx={{ borderRadius: 3, overflow: 'hidden' }}>
                <Box sx={{ bgcolor: 'primary.main', color: 'white', p: 2 }}>
                  <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Computer />
                    CPU Usage Trend
                  </Typography>
                  <Typography variant="caption" sx={{ opacity: 0.8 }}>
                    Last 2 minutes
                  </Typography>
                </Box>
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ height: 280 }}>
                    {hist && hist.cpu && hist.cpu.length > 0 ? (
                      <Line
                        data={{
                          labels: hist.cpu.map((_, i) => `${i * (hist.interval_sec || 5)}s`),
                          datasets: [{
                            label: 'CPU %',
                            data: hist.cpu,
                            borderColor: '#1976d2',
                            backgroundColor: 'rgba(25,118,210,0.1)',
                            fill: true,
                            tension: 0.4,
                            borderWidth: 3,
                            pointRadius: 0,
                            pointHoverRadius: 6,
                          }]
                        }}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          scales: {
                            y: { 
                              beginAtZero: true, 
                              max: 100,
                              grid: { color: 'rgba(0,0,0,0.1)' },
                              ticks: { color: '#666' }
                            },
                            x: { 
                              grid: { display: false },
                              ticks: { color: '#666' }
                            }
                          },
                          plugins: {
                            legend: { display: false },
                            tooltip: {
                              backgroundColor: 'rgba(0,0,0,0.8)',
                              borderColor: '#1976d2',
                              borderWidth: 1,
                            }
                          }
                        }}
                      />
                    ) : (
                      <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" height="100%">
                        <CircularProgress sx={{ mb: 2 }} />
                        <Typography variant="body2" color="text.secondary">
                          Loading chart data...
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </CardContent>
              </Paper>
            </Grid>

            <Grid item xs={12} md={6}>
              <Paper elevation={3} sx={{ borderRadius: 3, overflow: 'hidden' }}>
                <Box sx={{ bgcolor: 'error.main', color: 'white', p: 2 }}>
                  <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Memory />
                    Memory Usage Trend
                  </Typography>
                  <Typography variant="caption" sx={{ opacity: 0.8 }}>
                    Last 2 minutes
                  </Typography>
                </Box>
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ height: 280 }}>
                    {hist && hist.mem && hist.mem.length > 0 ? (
                      <Line
                        data={{
                          labels: hist.mem.map((_, i) => `${i * (hist.interval_sec || 5)}s`),
                          datasets: [{
                            label: 'Memory %',
                            data: hist.mem,
                            borderColor: '#d32f2f',
                            backgroundColor: 'rgba(211,47,47,0.1)',
                            fill: true,
                            tension: 0.4,
                            borderWidth: 3,
                            pointRadius: 0,
                            pointHoverRadius: 6,
                          }]
                        }}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          scales: {
                            y: { 
                              beginAtZero: true, 
                              max: 100,
                              grid: { color: 'rgba(0,0,0,0.1)' },
                              ticks: { color: '#666' }
                            },
                            x: { 
                              grid: { display: false },
                              ticks: { color: '#666' }
                            }
                          },
                          plugins: {
                            legend: { display: false },
                            tooltip: {
                              backgroundColor: 'rgba(0,0,0,0.8)',
                              borderColor: '#d32f2f',
                              borderWidth: 1,
                            }
                          }
                        }}
                      />
                    ) : (
                      <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" height="100%">
                        <CircularProgress sx={{ mb: 2 }} />
                        <Typography variant="body2" color="text.secondary">
                          Loading chart data...
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </CardContent>
              </Paper>
            </Grid>
          </Grid>


          {renderGpuInfo()}
          
          {/* Enhanced Network Information */}
          <Paper elevation={2} sx={{ mb: 4, borderRadius: 3, overflow: 'hidden' }}>
            <Box sx={{ bgcolor: 'success.main', color: 'white', p: 2 }}>
              <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <NetworkCheck />
                Network Activity
              </Typography>
            </Box>
            <CardContent sx={{ p: 3 }}>
              {agent.network && agent.network.length > 0 ? (
                <Box>
                  <Grid container spacing={3} sx={{ mb: 3 }}>
                    <Grid item xs={12} md={6}>
                      <Card variant="outlined" sx={{ p: 2, textAlign: 'center', borderColor: 'success.main' }}>
                        <Typography variant="h4" color="success.main" fontWeight={700}>
                          {(agent.network.reduce((acc, n) => acc + (n.bytes_recv || 0), 0) / 1024 / 1024 * 8).toFixed(2)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Mb/s Download
                        </Typography>
                      </Card>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Card variant="outlined" sx={{ p: 2, textAlign: 'center', borderColor: 'warning.main' }}>
                        <Typography variant="h4" color="warning.main" fontWeight={700}>
                          {(agent.network.reduce((acc, n) => acc + (n.bytes_sent || 0), 0) / 1024 / 1024 * 8).toFixed(2)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Mb/s Upload
                        </Typography>
                      </Card>
                    </Grid>
                  </Grid>

                  <Divider sx={{ my: 3 }} />

                  <Typography variant="subtitle1" gutterBottom fontWeight={600}>
                    Network Interfaces ({agent.network.length})
                  </Typography>
                  <Grid container spacing={2}>
                    {agent.network.map((iface, index) => (
                      <Grid item xs={12} sm={6} md={4} key={index}>
                        <Card variant="outlined" sx={{ height: '100%', transition: 'all 0.2s', '&:hover': { boxShadow: 3 } }}>
                          <CardContent>
                            <Typography variant="subtitle2" color="primary" fontWeight={600}>
                              {iface.interface || `Interface ${index + 1}`}
                            </Typography>
                            <Stack spacing={1} mt={1}>
                              <Box display="flex" justifyContent="space-between">
                                <Typography variant="caption" color="text.secondary">Download:</Typography>
                                <Chip size="small" label={`${(iface.bytes_recv / 1024 / 1024 * 8).toFixed(2)} Mb/s`} color="success" />
                              </Box>
                              <Box display="flex" justifyContent="space-between">
                                <Typography variant="caption" color="text.secondary">Upload:</Typography>
                                <Chip size="small" label={`${(iface.bytes_sent / 1024 / 1024 * 8).toFixed(2)} Mb/s`} color="warning" />
                              </Box>
                            </Stack>
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              ) : (
                <Alert severity="info" sx={{ borderRadius: 2 }}>
                  No network data available for this device.
                </Alert>
              )}
            </CardContent>
          </Paper>

          {/* Temperature Sensors */}
          {agent.sensors_temperature && Object.keys(agent.sensors_temperature).length > 0 && (
            <Paper elevation={2} sx={{ mb: 4, borderRadius: 3, overflow: 'hidden' }}>
              <Box sx={{ bgcolor: 'warning.main', color: 'white', p: 2 }}>
                <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Settings />
                  Temperature Sensors
                </Typography>
              </Box>
              <CardContent sx={{ p: 3 }}>
                <Grid container spacing={2}>
                  {Object.entries(agent.sensors_temperature).map(([group, sensors]) => (
                    <Grid item xs={12} md={6} key={group}>
                      <Card variant="outlined" sx={{ height: '100%' }}>
                        <CardContent>
                          <Typography variant="subtitle1" fontWeight={600} mb={2}>
                            {group}
                          </Typography>
                          <Stack spacing={1}>
                            {sensors.map((sensor, idx) => (
                              <Box key={idx} display="flex" justifyContent="space-between" alignItems="center">
                                <Typography variant="body2" color="text.secondary">
                                  {sensor.label || `Sensor ${idx + 1}`}
                                </Typography>
                                <Box display="flex" alignItems="center" gap={1}>
                                  <Typography variant="body2" fontWeight={600}>
                                    {sensor.current ? `${sensor.current}°C` : 'N/A'}
                                  </Typography>
                                  {sensor.high && sensor.current && sensor.current >= sensor.high && (
                                    <Chip size="small" label="High" color="error" />
                                  )}
                                </Box>
                              </Box>
                            ))}
                          </Stack>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </Paper>
          )}

          {/* Enhanced CPU and Storage Section */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} md={6}>
              <Paper elevation={2} sx={{ height: '100%', borderRadius: 3, overflow: 'hidden' }}>
                <Box sx={{ bgcolor: 'info.main', color: 'white', p: 2 }}>
                  <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Computer />
                    CPU Core Usage
                  </Typography>
                  <Typography variant="caption" sx={{ opacity: 0.8 }}>
                    Total: {agent.cpu.total_percent.toFixed(1)}% | Cores: {agent.cpu.per_core_percent.length}
                  </Typography>
                </Box>
                <CardContent sx={{ p: 3 }}>
                  <Stack spacing={1.5}>
                    {agent.cpu.per_core_percent.map((v, i) => (
                      <Box key={i} display="flex" alignItems="center" gap={2}>
                        <Typography variant="caption" sx={{ minWidth: 40, fontWeight: 600 }}>
                          Core {i}
                        </Typography>
                        <LinearProgress 
                          variant="determinate" 
                          value={v} 
                          sx={{ 
                            flex: 1, 
                            height: 12, 
                            borderRadius: 6,
                            backgroundColor: 'rgba(0,0,0,0.1)'
                          }} 
                          color={v > 85 ? 'error' : v > 60 ? 'warning' : 'primary'} 
                        />
                        <Typography variant="caption" sx={{ minWidth: 45, textAlign: 'right', fontWeight: 600 }}>
                          {v.toFixed(0)}%
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                </CardContent>
              </Paper>
            </Grid>

            <Grid item xs={12} md={6}>
              <Paper elevation={2} sx={{ height: '100%', borderRadius: 3, overflow: 'hidden' }}>
                <Box sx={{ bgcolor: 'secondary.main', color: 'white', p: 2 }}>
                  <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Storage />
                    Storage Usage
                  </Typography>
                </Box>
                <CardContent sx={{ p: 3 }}>
                  {agent.disks.filter(d => d.mountpoint === '/').map(d => (
                    <Box key={d.mountpoint} textAlign="center">
                      <Typography variant="subtitle1" fontWeight={600} mb={2}>
                        Root Filesystem ({d.mountpoint})
                      </Typography>
                      <Typography variant="h4" color="secondary.main" fontWeight={700} mb={1}>
                        {d.percent.toFixed(1)}%
                      </Typography>
                      <Typography variant="body2" color="text.secondary" mb={3}>
                        {(d.used / 1024 / 1024 / 1024).toFixed(1)} GB of {(d.total / 1024 / 1024 / 1024).toFixed(1)} GB used
                      </Typography>
                      <Box sx={{ width: 200, height: 200, margin: 'auto', position: 'relative' }}>
                        <Pie
                          data={{
                            labels: ['Used', 'Free'],
                            datasets: [{
                              data: [d.used, d.total - d.used],
                              backgroundColor: [
                                d.percent > 90 ? '#d32f2f' : d.percent > 75 ? '#ed6c02' : '#2e7d32', 
                                '#e0e0e0'
                              ],
                              borderWidth: 0,
                            }]
                          }}
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                              legend: { 
                                position: 'bottom',
                                labels: { 
                                  usePointStyle: true,
                                  padding: 20
                                }
                              },
                              tooltip: { 
                                callbacks: {
                                  label: (context) => {
                                    const label = context.label;
                                    const value = (context.raw / 1024 / 1024 / 1024).toFixed(1);
                                    return `${label}: ${value} GB`;
                                  }
                                }
                              }
                            },
                            cutout: '60%'
                          }}
                        />
                      </Box>
                    </Box>
                  ))}
                </CardContent>
              </Paper>
            </Grid>
          </Grid>

          {/* Enhanced Process Information */}
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Paper elevation={2} sx={{ height: '100%', borderRadius: 3, overflow: 'hidden' }}>
                <Box sx={{ bgcolor: 'warning.main', color: 'white', p: 2 }}>
                  <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Settings />
                    Top Processes
                  </Typography>
                  <Typography variant="caption" sx={{ opacity: 0.8 }}>
                    Highest resource usage
                  </Typography>
                </Box>
                <CardContent sx={{ p: 2 }}>
                  <Stack spacing={1}>
                    {agent.processes.slice(0, 10).map(p => (
                      <Card key={p.pid} variant="outlined" sx={{ p: 1.5 }}>
                        <Box display="flex" justifyContent="space-between" alignItems="center">
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="body2" fontWeight={600} noWrap>
                              {p.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              PID: {p.pid}
                            </Typography>
                          </Box>
                          <Box display="flex" gap={1}>
                            <Chip 
                              size="small" 
                              label={`${p.cpu.toFixed(1)}%`} 
                              color={p.cpu > 50 ? 'error' : p.cpu > 20 ? 'warning' : 'default'}
                              sx={{ minWidth: 60 }}
                            />
                            <Chip 
                              size="small" 
                              label={`${p.memory.toFixed(1)}%`} 
                              variant="outlined"
                              sx={{ minWidth: 60 }}
                            />
                          </Box>
                        </Box>
                      </Card>
                    ))}
                  </Stack>
                </CardContent>
              </Paper>
            </Grid>

            <Grid item xs={12} md={6}>
              <Paper elevation={2} sx={{ height: '100%', borderRadius: 3, overflow: 'hidden' }}>
                <Box sx={{ bgcolor: 'error.main', color: 'white', p: 2 }}>
                  <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Security />
                    System Health
                  </Typography>
                </Box>
                <CardContent sx={{ p: 3 }}>
                  <Stack spacing={3}>
                    <Box>
                      <Typography variant="subtitle2" gutterBottom>Zombie Processes</Typography>
                      <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Typography variant="body2">Count:</Typography>
                        <Chip 
                          label={agent.zombie_processes} 
                          color={agent.zombie_processes > 0 ? 'error' : 'success'}
                          size="small"
                        />
                      </Box>
                    </Box>
                    
                    <Divider />
                    
                    <Box>
                      <Typography variant="subtitle2" gutterBottom>Critical Services</Typography>
                      <Stack spacing={1}>
                        {agent.critical_processes && Object.entries(agent.critical_processes).map(([proc, running]) => (
                          <Box key={proc} display="flex" justifyContent="space-between" alignItems="center">
                            <Typography variant="body2">{proc}:</Typography>
                            <Chip 
                              label={running ? 'Running' : 'Stopped'} 
                              color={running ? 'success' : 'error'}
                              size="small"
                              variant={running ? 'outlined' : 'filled'}
                            />
                          </Box>
                        ))}
                      </Stack>
                    </Box>
                  </Stack>
                </CardContent>
              </Paper>
            </Grid>
          </Grid>
        </Box>
      )}
    </Box>
  );
}

export default Metrics;
