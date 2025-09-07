// import React, { useEffect, useState } from "react";
// import axios from "axios";
// import { Card, CardContent, Typography, CircularProgress } from "@mui/material";

// function Health() {
//   const [health, setHealth] = useState(null);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     let mounted = true;
//     const fetchHealth = () => {
//       axios.get("/api/health").then(res => {
//         if (mounted) {
//           setHealth(res.data);
//           setLoading(false);
//         }
//       });
//     };
//     fetchHealth();
//     const interval = setInterval(fetchHealth, 1000);
//     return () => {
//       mounted = false;
//       clearInterval(interval);
//     };
//   }, []);

//   if (loading) return <CircularProgress />;

//   return (
//     <Card>
//       <CardContent>
//         <Typography variant="h5">Health Check</Typography>
//         <Typography>Status: {health.status}</Typography>
//         <Typography>Devices Reporting: {health.devices_reporting}</Typography>
//         <Typography>Total Alerts: {health.total_alerts}</Typography>
//         <Typography>Server Time: {new Date(health.server_time * 1000).toLocaleString()}</Typography>
//       </CardContent>
//     </Card>
//   );
// }

// export default Health;
