import React from "react";
import { Routes, Route, Link } from "react-router-dom";
import { AppBar, Toolbar, Typography, Button, Container, ThemeProvider, createTheme, CssBaseline, Box, Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText, useMediaQuery, IconButton } from "@mui/material";
import { Dashboard as DashboardIcon, Assessment, Notifications, Menu } from "@mui/icons-material";
import Dashboard from "./pages/Dashboard";
import Metrics from "./pages/Metrics";
import Alerts from "./pages/Alerts";

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
    background: {
      default: '#f5f5f5',
    },
  },
  typography: {
    h6: {
      fontWeight: 600,
    },
  },
});

const navigationItems = [
  { text: 'Overview', icon: <DashboardIcon />, path: '/' },
  { text: 'Metrics', icon: <Assessment />, path: '/metrics' },
  { text: 'Alerts', icon: <Notifications />, path: '/alerts' },
];

function App() {
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const toggleDrawer = () => {
    setDrawerOpen(!drawerOpen);
  };

  const drawer = (
    <Box sx={{ width: 250 }} role="presentation" onClick={toggleDrawer}>
      <List>
        {navigationItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton component={Link} to={item.path}>
              <ListItemIcon>
                {item.icon}
              </ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Box>
  );

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppBar position="static">
        <Toolbar>
          {isMobile && (
            <IconButton
              size="large"
              edge="start"
              color="inherit"
              aria-label="menu"
              sx={{ mr: 2 }}
              onClick={toggleDrawer}
            >
              <Menu />
            </IconButton>
          )}
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Distributed Hardware Monitoring
          </Typography>
          {!isMobile && navigationItems.map((item) => (
            <Button
              key={item.text}
              color="inherit"
              component={Link}
              to={item.path}
              startIcon={item.icon}
              sx={{ ml: 1 }}
            >
              {item.text}
            </Button>
          ))}
        </Toolbar>
      </AppBar>
      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={toggleDrawer}
        sx={{
          display: { xs: 'block', md: 'none' },
        }}
      >
        {drawer}
      </Drawer>
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/metrics" element={<Metrics />} />
          <Route path="/alerts" element={<Alerts />} />
        </Routes>
      </Container>
    </ThemeProvider>
  );
}

export default App;
