import React, { useEffect, useState } from "react";
import axios from "axios";
import { Card, CardContent, Typography, Grid, CircularProgress, Chip } from "@mui/material";

function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const fetchAlerts = () => {
      axios.get("/api/alerts").then(res => {
        if (mounted) {
          setAlerts(res.data);
          setLoading(false);
        }
      });
    };
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 5000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  if (loading) return <CircularProgress />;
  if (!alerts.length) return <Typography>No alerts found.</Typography>;

  return (
    <Grid container spacing={3}>
      {alerts.map((alert, idx) => (
        <Grid item xs={12} md={6} key={idx}>
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="h6">{alert.device}</Typography>
              <Typography>{alert.alert}</Typography>
              <Chip label={alert.severity} color={alert.severity === "critical" ? "error" : "warning"} sx={{ mt: 1, mb: 1 }} />
              <Typography variant="body2" color="text.secondary">
                {new Date(alert.timestamp * 1000).toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
}

export default Alerts;
