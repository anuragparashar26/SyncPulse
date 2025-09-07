import React, { useEffect, useState } from "react";
import axios from "axios";
import { Card, CardContent, Typography, Grid, CircularProgress, MenuItem, Select, InputLabel, FormControl, Chip, Box, LinearProgress, Divider, Alert, Paper, Stack, IconButton, Tooltip } from "@mui/material";
import { Line, Pie } from "react-chartjs-2";
import { Refresh, Computer, Memory, Storage, NetworkCheck, Speed, Settings, Security, GraphicEq } from "@mui/icons-material";

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
        axios.get("http://localhost:8000/gpu").then(res => {
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
      <Box sx={{ display: 'flex', flexDirection: 'row', gap: 3, mb: 4, overflowX: 'auto', width: '100%' }}>
        {gpuLoading ? (
          <Card sx={{ flex: 1, minWidth: 300, backgroundColor: '#1e1e1e', border: '1px solid #333' }}>
            <CardContent>
              <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <GraphicEq />
                System GPUs
              </Typography>
              <CircularProgress size={20} sx={{ mt: 2 }} />
            </CardContent>
          </Card>
        ) : (
          gpuInfo.length === 0 ? (
            <Card sx={{ flex: 1, minWidth: 300, backgroundColor: '#1e1e1e', border: '1px solid #333' }}>
              <CardContent>
                <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <GraphicEq />
                  System GPUs
                </Typography>
                <Typography>No GPUs detected.</Typography>
              </CardContent>
            </Card>
          ) : (
            gpuInfo.map((g, i) => {
              const load = typeof g.load === 'number' ? g.load : (typeof g.utilization === 'number' ? g.utilization : null);
              const memUsed = typeof g.used_memory_MB === 'number' ? g.used_memory_MB : (typeof g.vram_usage_MB === 'number' ? g.vram_usage_MB : null);
              const memTotal = typeof g.total_memory_MB === 'number' ? g.total_memory_MB : (typeof g.vram_total_MB === 'number' ? g.vram_total_MB : null);
              const memPercent = (memUsed !== null && memTotal !== null && memTotal > 0) ? (memUsed / memTotal) * 100 : null;

              return (
                <Card key={i} sx={{ flex: 1, minWidth: 300, backgroundColor: '#1e1e1e', border: '1px solid #333' }}>
                  <CardContent>
                    <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                      <GraphicEq />
                      <Typography variant="h6" fontWeight={700}>
                        {g.vendor}
                      </Typography>
                    </Box>
                    <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                      {g.name}
                    </Typography>
                    
                    {/* GPU Load Graph */}
                    {load !== null && (
                      <Box mt={2}>
                        <Typography variant="caption" color="text.secondary">Load: {load.toFixed(1)}%</Typography>
                        <LinearProgress
                          variant="determinate"
                          value={load}
                          sx={{ mt: 0.5, height: 8, borderRadius: 4, backgroundColor: '#333', '& .MuiLinearProgress-bar': { backgroundColor: '#888' } }}
                        />
                      </Box>
                    )}

                    {/* GPU Memory Graph */}
                    {memPercent !== null && (
                      <Box mt={2}>
                        <Typography variant="caption" color="text.secondary">Memory: {memUsed.toFixed(0)} / {memTotal.toFixed(0)} MB</Typography>
                        <LinearProgress
                          variant="determinate"
                          value={memPercent}
                          sx={{ mt: 0.5, height: 8, borderRadius: 4, backgroundColor: '#333', '& .MuiLinearProgress-bar': { backgroundColor: '#888' } }}
                        />
                      </Box>
                    )}

                    {/* Temperature */}
                    {typeof g.temperature_C === 'number' && (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                        Temp: {g.temperature_C}°C
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )
        )}
      </Box>
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
            <Grid item xs={12} md={3}>
              <Card sx={{ height: '100%', backgroundColor: '#1e1e1e', border: '1px solid #333' }}>
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
                      backgroundColor: '#333',
                      '& .MuiLinearProgress-bar': { backgroundColor: '#888' }
                    }}
                  />
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card sx={{ height: '100%', backgroundColor: '#1e1e1e', border: '1px solid #333' }}>
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
                      backgroundColor: '#333',
                      '& .MuiLinearProgress-bar': { backgroundColor: '#888' }
                    }} 
                  />
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card sx={{ height: '100%', backgroundColor: '#1e1e1e', border: '1px solid #333' }}>
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
                      backgroundColor: '#333',
                      '& .MuiLinearProgress-bar': { backgroundColor: '#888' }
                    }} 
                  />
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card sx={{ height: '100%', backgroundColor: '#1e1e1e', border: '1px solid #333' }}>
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
              <Paper elevation={3} sx={{ borderRadius: 3, overflow: 'hidden', backgroundColor: '#1e1e1e', border: '1px solid #333' }}>
                <Box sx={{ bgcolor: '#333', color: 'white', p: 2 }}>
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
                            borderColor: '#888888', // Minimal gray color
                            backgroundColor: 'rgba(136,136,136,0.1)',
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
                              ticks: { color: '#ccc' }
                            },
                            x: { 
                              grid: { display: false },
                              ticks: { color: '#ccc' }
                            }
                          },
                          plugins: {
                            legend: { display: false },
                            tooltip: {
                              backgroundColor: '#333',
                              borderColor: '#888',
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
              <Paper elevation={3} sx={{ borderRadius: 3, overflow: 'hidden', backgroundColor: '#1e1e1e', border: '1px solid #333' }}>
                <Box sx={{ bgcolor: '#333', color: 'white', p: 2 }}>
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
                            borderColor: '#888888', // Minimal gray color
                            backgroundColor: 'rgba(136,136,136,0.1)',
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
                              ticks: { color: '#ccc' }
                            },
                            x: { 
                              grid: { display: false },
                              ticks: { color: '#ccc' }
                            }
                          },
                          plugins: {
                            legend: { display: false },
                            tooltip: {
                              backgroundColor: '#333',
                              borderColor: '#888',
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
          <Paper elevation={2} sx={{ mb: 4, borderRadius: 3, overflow: 'hidden', backgroundColor: '#1e1e1e', border: '1px solid #333' }}>
            <Box sx={{ bgcolor: '#333', color: 'white', p: 2 }}>
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
                      <Card variant="outlined" sx={{ p: 2, textAlign: 'center', borderColor: '#333', backgroundColor: '#1e1e1e' }}>
                        <Typography variant="h4" color="primary" fontWeight={700}>
                          {(agent.network.reduce((acc, n) => acc + (n.bytes_recv || 0), 0) / 1024 / 1024 * 8).toFixed(2)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Mb/s Download
                        </Typography>
                      </Card>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Card variant="outlined" sx={{ p: 2, textAlign: 'center', borderColor: '#333', backgroundColor: '#1e1e1e' }}>
                        <Typography variant="h4" color="primary" fontWeight={700}>
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
                        <Card variant="outlined" sx={{ height: '100%', transition: 'all 0.2s', '&:hover': { boxShadow: 3 }, borderColor: '#333', backgroundColor: '#1e1e1e' }}>
                          <CardContent>
                            <Typography variant="subtitle2" color="primary" fontWeight={600}>
                              {iface.interface || `Interface ${index + 1}`}
                            </Typography>
                            <Stack spacing={1} mt={1}>
                              <Box display="flex" justifyContent="space-between">
                                <Typography variant="caption" color="text.secondary">Download:</Typography>
                                <Chip size="small" label={`${(iface.bytes_recv / 1024 / 1024 * 8).toFixed(2)} Mb/s`} sx={{ backgroundColor: '#333', color: 'white' }} />
                              </Box>
                              <Box display="flex" justifyContent="space-between">
                                <Typography variant="caption" color="text.secondary">Upload:</Typography>
                                <Chip size="small" label={`${(iface.bytes_sent / 1024 / 1024 * 8).toFixed(2)} Mb/s`} sx={{ backgroundColor: '#333', color: 'white' }} />
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
              <Box sx={{ bgcolor: '#333', color: 'white', p: 2 }}>
                <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Settings />
                  Temperature Sensors
                </Typography>
              </Box>
              <CardContent sx={{ p: 3 }}>
                <Grid container spacing={2}>
                  {Object.entries(agent.sensors_temperature).map(([group, sensors]) => (
                    <Grid item xs={12} md={6} key={group}>
                      <Card variant="outlined" sx={{ height: '100%', borderColor: '#333', backgroundColor: '#1e1e1e' }}>
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
                                    <Chip size="small" label="High" sx={{ backgroundColor: '#555', color: 'white' }} />
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
              <Paper elevation={2} sx={{ height: '100%', borderRadius: 3, overflow: 'hidden', backgroundColor: '#1e1e1e', border: '1px solid #333' }}>
                <Box sx={{ bgcolor: '#333', color: 'white', p: 2 }}>
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
                            backgroundColor: '#333',
                            '& .MuiLinearProgress-bar': { backgroundColor: '#888' }
                          }} 
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
              <Paper elevation={2} sx={{ height: '100%', borderRadius: 3, overflow: 'hidden', backgroundColor: '#1e1e1e', border: '1px solid #333' }}>
                <Box sx={{ bgcolor: '#333', color: 'white', p: 2 }}>
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
                      <Typography variant="h4" color="primary" fontWeight={700} mb={1}>
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
                                '#888888', // Used - gray
                                '#cccccc'  // Free - lighter gray
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
                                  padding: 20,
                                  color: '#ffffff' // White text for legend
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
              <Paper elevation={2} sx={{ height: '100%', borderRadius: 3, overflow: 'hidden', backgroundColor: '#1e1e1e', border: '1px solid #333' }}>
                <Box sx={{ bgcolor: '#333', color: 'white', p: 2 }}>
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
                      <Card key={p.pid} variant="outlined" sx={{ p: 1.5, borderColor: '#333', backgroundColor: '#1e1e1e' }}>
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
                              sx={{ backgroundColor: '#333', color: 'white' }}
                            />
                            <Chip 
                              size="small" 
                              label={`${p.memory.toFixed(1)}%`} 
                              sx={{ backgroundColor: '#333', color: 'white' }}
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
              <Paper elevation={2} sx={{ height: '100%', borderRadius: 3, overflow: 'hidden', backgroundColor: '#1e1e1e', border: '1px solid #333' }}>
                <Box sx={{ bgcolor: '#333', color: 'white', p: 2 }}>
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
                          sx={{ backgroundColor: '#333', color: 'white' }}
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
                              sx={{ backgroundColor: running ? '#555' : '#333', color: 'white' }}
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
