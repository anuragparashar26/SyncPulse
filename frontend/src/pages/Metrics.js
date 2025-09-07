import React, { useEffect, useState } from "react";
import axios from "axios";
import { Card, CardContent, Typography, Grid, CircularProgress, MenuItem, Select, InputLabel, FormControl, Chip, Box, LinearProgress, Divider } from "@mui/material";
import { Line, Pie } from "react-chartjs-2";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, ArcElement);

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
        const fetchHistory = () => {
          axios.get(`/api/history/${selectedAgent}`).then(res => {
            setHist(res.data);
          }).catch(err => console.error("Error fetching history:", err));
        };
        fetchHistory();
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
      <div>
        <Typography variant="h4" gutterBottom sx={{ mb: 3 }}>
          Detailed Metrics
        </Typography>

        {renderGpuInfo()}

        {/* Agent Selector */}
        <FormControl sx={{ minWidth: 200, mb: 3 }}>
          <InputLabel>Agent</InputLabel>
          <Select
            value={selectedAgent}
            label="Agent"
            onChange={e => setSelectedAgent(e.target.value)}
          >
            {metrics.map(m => (
              <MenuItem key={m.agent_id} value={m.agent_id}>
                {m.device || 'Device'} - {m.agent_id.slice(0, 8)}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {agent && (
          <div>
            {/* Memory and System Information */}
            <Grid container spacing={3} sx={{ mb: 3 }}>
              <Grid item xs={12} md={3}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Memory</Typography>
                    <Typography variant="h4">{agent.memory.percent.toFixed(1)}%</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {(agent.memory.used / 1024 / 1024 / 1024).toFixed(1)} GB used of {(agent.memory.total / 1024 / 1024 / 1024).toFixed(1)} GB
                    </Typography>
                    <LinearProgress variant="determinate" value={agent.memory.percent} sx={{ mt: 1 }} />
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={3}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Swap</Typography>
                    <Typography variant="h4">{agent.memory.swap_percent.toFixed(1)}%</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {(agent.memory.swap_used / 1024 / 1024 / 1024).toFixed(1)} GB used of {(agent.memory.swap_total / 1024 / 1024 / 1024).toFixed(1)} GB
                    </Typography>
                    <LinearProgress variant="determinate" value={agent.memory.swap_percent} sx={{ mt: 1 }} color="secondary" />
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={3}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Uptime</Typography>
                    <Typography variant="h4">{(agent.uptime_sec / 3600).toFixed(1)}h</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {(agent.uptime_sec / 86400).toFixed(1)} days
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={3}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Load Average</Typography>
                    <Typography variant="h4">{agent.cpu.load_avg?.[0]?.toFixed(2) || 'N/A'}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      1 min average
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Time Series Charts */}
            <Grid container spacing={3} sx={{ mb: 3 }}>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>CPU Usage (Last 2 min)</Typography>
                    {hist && hist.cpu ? (
                      <Line
                        data={{
                          labels: hist.cpu.map((_, i) => `${i * 10}s`),
                          datasets: [{
                            label: 'CPU %',
                            data: hist.cpu,
                            borderColor: 'rgba(25,118,210,1)',
                            backgroundColor: 'rgba(25,118,210,0.1)',
                            fill: true,
                          }]
                        }}
                        options={{
                          responsive: true,
                          scales: {
                            y: { beginAtZero: true, max: 100 }
                          },
                          plugins: {
                            legend: { display: false }
                          }
                        }}
                      />
                    ) : (
                      <Typography variant="body2" color="text.secondary">Loading chart data...</Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Memory Usage (Last 2 min)</Typography>
                    {hist && hist.mem ? (
                      <Line
                        data={{
                          labels: hist.mem.map((_, i) => `${i * 10}s`),
                          datasets: [{
                            label: 'Memory %',
                            data: hist.mem,
                            borderColor: 'rgba(211,47,47,1)',
                            backgroundColor: 'rgba(211,47,47,0.1)',
                            fill: true,
                          }]
                        }}
                        options={{
                          responsive: true,
                          scales: {
                            y: { beginAtZero: true, max: 100 }
                          },
                          plugins: {
                            legend: { display: false }
                          }
                        }}
                      />
                    ) : (
                      <Typography variant="body2" color="text.secondary">Loading chart data...</Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Network Information */}
            <Grid container spacing={3} sx={{ mb: 3 }}>
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Network Information</Typography>
                    {agent.network && agent.network.length > 0 ? (
                      <Box>
                        <Typography variant="subtitle1" gutterBottom>
                          Current Activity
                        </Typography>
                        <Box display="flex" justifyContent="space-between" mb={2}>
                          <Typography variant="body1">Total Receive Rate:</Typography>
                          <Typography variant="body1" color="success.main" fontWeight="bold">
                            {(agent.network.reduce((acc, n) => acc + (n.bytes_recv || 0), 0) / 1024 / 1024 * 8).toFixed(2)} Mb/s
                          </Typography>
                        </Box>
                        <Box display="flex" justifyContent="space-between" mb={3}>
                          <Typography variant="body1">Total Send Rate:</Typography>
                          <Typography variant="body1" color="secondary.main" fontWeight="bold">
                            {(agent.network.reduce((acc, n) => acc + (n.bytes_sent || 0), 0) / 1024 / 1024 * 8).toFixed(2)} Mb/s
                          </Typography>
                        </Box>

                        <Divider sx={{ my: 2 }} />

                        <Typography variant="subtitle1" gutterBottom>
                          Network Interfaces ({agent.network.length})
                        </Typography>
                        <Grid container spacing={2}>
                          {agent.network.map((iface, index) => (
                            <Grid item xs={12} sm={6} md={4} key={index}>
                              <Card variant="outlined">
                                <CardContent>
                                  <Typography variant="subtitle2" color="primary">
                                    {iface.name || `Interface ${index + 1}`}
                                  </Typography>
                                  <Box mt={1}>
                                    <Typography variant="caption" display="block">
                                      RX: {(iface.bytes_recv / 1024 / 1024 * 8).toFixed(2)} Mb/s
                                    </Typography>
                                    <Typography variant="caption" display="block">
                                      TX: {(iface.bytes_sent / 1024 / 1024 * 8).toFixed(2)} Mb/s
                                    </Typography>
                                  </Box>
                                </CardContent>
                              </Card>
                            </Grid>
                          ))}
                        </Grid>
                      </Box>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        No network data available
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Existing CPU and Disk sections */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>CPU Usage</Typography>
                <Typography variant="body2" gutterBottom>Total: {agent.cpu.total_percent.toFixed(1)}% | Cores: {agent.cpu.per_core_percent.length}</Typography>
                <Box display="flex" flexDirection="column" gap={0.7}>
                  {agent.cpu.per_core_percent.map((v,i)=> (
                    <Box key={i} display="flex" alignItems="center" gap={1}>
                      <Typography variant="caption" sx={{ width:28 }}>C{i}</Typography>
                      <LinearProgress variant="determinate" value={v} sx={{ flex:1, height:8, borderRadius:4 }} color={v>85?'error': v>60?'warning':'primary'} />
                      <Typography variant="caption" sx={{ width:38, textAlign:'right' }}>{v.toFixed(0)}%</Typography>
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Disks</Typography>
                <Grid container spacing={2} alignItems="center">
                  {agent.disks.map(d => (
                    <Grid item xs={6} sm={4} md={6} key={d.mountpoint}>
                      <Box>
                        <Typography variant="caption" sx={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.mountpoint}</Typography>
                        <Typography variant="caption" display="block">{(d.total / 1024 / 1024 / 1024).toFixed(1)} GB</Typography>
                        {d.mountpoint === '/' && <Typography variant="caption" display="block">{d.percent.toFixed(1)}% used</Typography>}
                        {d.mountpoint === '/' && (
                          <Box sx={{ width: '100px', height: '100px', margin: 'auto', mt: 1, position: 'relative' }}>
                            <Pie
                              data={{
                                labels: ['Used', 'Free'],
                                datasets: [{
                                  data: [d.used, d.total - d.used],
                                  backgroundColor: [d.percent > 90 ? '#d32f2f' : d.percent > 75 ? '#fbc02d' : '#388e3c', '#e0e0e0'],
                                  borderWidth: 1,
                                }]
                              }}
                              options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: {
                                  legend: { display: false },
                                  tooltip: { enabled: false }
                                },
                                cutout: '70%'
                              }}
                            />
                            <Box
                              sx={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                bottom: 0,
                                right: 0,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexDirection: 'column',
                              }}
                            >
                              <Typography variant="caption" component="div" color="text.secondary">
                                {`${d.percent.toFixed(0)}%`}
                              </Typography>
                            </Box>
                          </Box>
                        )}
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </Card>
          </Grid>
          {agent.gpus && agent.gpus.length>0 && (
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6">GPUs</Typography>
                  <Grid container spacing={2}>
                    {agent.gpus.map((g,i)=>(
                      <Grid key={i} item xs={12} md={3}>
                        <Typography variant="subtitle2">{g.name}</Typography>
                        {'load' in g && <Typography variant="caption">Load: {g.load || g.utilization || 0}%</Typography>}
                        {'temperature_C' in g && <Typography variant="caption" display="block">Temp: {g.temperature_C}°C</Typography>}
                      </Grid>
                    ))}
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          )}
      <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
        <Typography variant="h6">Processes (Top 15)</Typography>
        {agent.processes.map(p => (
                  <Box key={p.pid} display="flex" justifyContent="space-between" mb={0.5}>
                    <Typography variant="body2" sx={{ maxWidth:140, overflow:'hidden', textOverflow:'ellipsis' }}>{p.name}</Typography>
                    <Chip size="small" label={`${p.cpu.toFixed(1)}%`} color={p.cpu>50?'error':'default'} />
                    <Chip size="small" label={`${p.memory.toFixed(1)}% mem`} />
                  </Box>
                ))}
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6">Critical / Zombie</Typography>
                <Typography variant="body2">Zombie Processes: <b style={{ color: agent.zombie_processes>0?'#d32f2f':'inherit' }}>{agent.zombie_processes}</b></Typography>
                {agent.critical_processes && Object.entries(agent.critical_processes).map(([proc, running]) => (
                  <Typography key={proc} variant="body2" color={running? 'text.primary':'error'}>{proc}: {running? 'OK':'DOWN'}</Typography>
                ))}
              </CardContent>
            </Card>
          </Grid>
        </div>
      )}
    </div>
  );
}

export default Metrics;
