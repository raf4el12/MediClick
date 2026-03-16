import React, { useState } from 'react';
import { 
  ThemeProvider, 
  createTheme, 
  CssBaseline, 
  Box, 
  Drawer, 
  AppBar, 
  Toolbar, 
  Typography, 
  IconButton, 
  List, 
  ListItem, 
  ListItemButton, 
  ListItemIcon, 
  ListItemText, 
  Card, 
  CardContent, 
  CardActionArea,
  Grid, 
  Button, 
  Avatar, 
  Badge, 
  Paper, 
  InputBase, 
  Divider, 
  Chip
} from '@mui/material';
import { 
  Calendar, FileText, Video, Activity, Clock, MapPin, 
  User, Bell, Search, ChevronRight, Menu as MenuIcon, 
  X, Home, Settings, LogOut 
} from 'lucide-react';

const drawerWidth = 260;

// Creación de un tema personalizado de Material UI
const theme = createTheme({
  palette: {
    background: {
      default: '#f8fafc', // slate-50
      paper: '#ffffff',
    },
    primary: {
      main: '#1d4ed8', // blue-700
      light: '#eff6ff', // blue-50
    },
    secondary: {
      main: '#0d9488', // teal-600
      light: '#f0fdfa', // teal-50
    },
    info: {
      main: '#4f46e5', // indigo-600
      light: '#eef2ff', // indigo-50
    },
    text: {
      primary: '#0f172a', // slate-900
      secondary: '#64748b', // slate-500
    }
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h4: { fontWeight: 800, letterSpacing: '-0.02em' },
    h5: { fontWeight: 700 },
    h6: { fontWeight: 700 },
    subtitle1: { fontWeight: 600 },
  },
  shape: {
    borderRadius: 16,
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
          border: '1px solid #e2e8f0',
        }
      }
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 700,
          borderRadius: '12px',
        }
      }
    }
  }
});

export default function App() {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const drawerContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box sx={{ p: 3, display: { xs: 'none', md: 'block' } }}>
        <Typography variant="h5" color="primary" sx={{ fontWeight: 800, letterSpacing: '-0.02em' }}>
          MediClick
        </Typography>
      </Box>
      <Box sx={{ px: 2, pt: { xs: 2, md: 0 }, flexGrow: 1 }}>
        <Typography variant="overline" color="text.secondary" sx={{ px: 2, fontWeight: 700 }}>
          Menú Principal
        </Typography>
        <List sx={{ '& .MuiListItemButton-root': { borderRadius: 2, mb: 0.5 } }}>
          <ListItem disablePadding>
            <ListItemButton sx={{ bgcolor: 'primary.light', color: 'primary.main', '&:hover': { bgcolor: 'primary.light' } }}>
              <ListItemIcon sx={{ minWidth: 40, color: 'inherit' }}><Home size={20} /></ListItemIcon>
              <ListItemText primary="Inicio" primaryTypographyProps={{ fontWeight: 600 }} />
            </ListItemButton>
          </ListItem>
          <ListItem disablePadding>
            <ListItemButton sx={{ color: 'text.secondary', '&:hover': { bgcolor: 'background.default', color: 'text.primary' } }}>
              <ListItemIcon sx={{ minWidth: 40, color: 'inherit' }}><User size={20} /></ListItemIcon>
              <ListItemText primary="Mi Perfil" primaryTypographyProps={{ fontWeight: 600 }} />
            </ListItemButton>
          </ListItem>
          <ListItem disablePadding>
            <ListItemButton sx={{ color: 'text.secondary', '&:hover': { bgcolor: 'background.default', color: 'text.primary' } }}>
              <ListItemIcon sx={{ minWidth: 40, color: 'inherit' }}><Calendar size={20} /></ListItemIcon>
              <ListItemText primary="Mis Citas" primaryTypographyProps={{ fontWeight: 600 }} />
            </ListItemButton>
          </ListItem>
          <ListItem disablePadding>
            <ListItemButton sx={{ color: 'text.secondary', '&:hover': { bgcolor: 'background.default', color: 'text.primary' } }}>
              <ListItemIcon sx={{ minWidth: 40, color: 'inherit' }}><FileText size={20} /></ListItemIcon>
              <ListItemText primary="Resultados" primaryTypographyProps={{ fontWeight: 600 }} />
              <Chip label="Nuevo" size="small" color="error" sx={{ height: 20, fontSize: '0.65rem', fontWeight: 'bold' }} />
            </ListItemButton>
          </ListItem>
        </List>
      </Box>
      <Box sx={{ p: 2, borderTop: '1px solid #f1f5f9' }}>
        <List sx={{ '& .MuiListItemButton-root': { borderRadius: 2, mb: 0.5 } }}>
          <ListItem disablePadding>
            <ListItemButton sx={{ color: 'text.secondary', '&:hover': { bgcolor: 'background.default', color: 'text.primary' } }}>
              <ListItemIcon sx={{ minWidth: 40, color: 'inherit' }}><Settings size={20} /></ListItemIcon>
              <ListItemText primary="Configuración" primaryTypographyProps={{ fontWeight: 600 }} />
            </ListItemButton>
          </ListItem>
          <ListItem disablePadding>
            <ListItemButton sx={{ color: '#dc2626', '&:hover': { bgcolor: '#fef2f2' } }}>
              <ListItemIcon sx={{ minWidth: 40, color: 'inherit' }}><LogOut size={20} /></ListItemIcon>
              <ListItemText primary="Cerrar Sesión" primaryTypographyProps={{ fontWeight: 600 }} />
            </ListItemButton>
          </ListItem>
        </List>
      </Box>
    </Box>
  );

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', minHeight: '100vh' }}>
        
        {/* --- AppBar para móvil --- */}
        <AppBar 
          position="fixed" 
          elevation={0}
          sx={{ 
            display: { md: 'none' }, 
            bgcolor: 'background.paper', 
            borderBottom: '1px solid #e2e8f0',
            color: 'primary.main' 
          }}
        >
          <Toolbar sx={{ justifyContent: 'space-between' }}>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              MediClick
            </Typography>
            <IconButton color="inherit" edge="end" onClick={handleDrawerToggle}>
              {mobileOpen ? <X size={24} /> : <MenuIcon size={24} />}
            </IconButton>
          </Toolbar>
        </AppBar>

        {/* --- Drawer (Sidebar) --- */}
        <Box component="nav" sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}>
          <Drawer
            variant="temporary"
            open={mobileOpen}
            onClose={handleDrawerToggle}
            ModalProps={{ keepMounted: true }} // Mejor rendimiento en móvil
            sx={{
              display: { xs: 'block', md: 'none' },
              '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
            }}
          >
            {drawerContent}
          </Drawer>
          <Drawer
            variant="permanent"
            sx={{
              display: { xs: 'none', md: 'block' },
              '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth, borderRight: '1px solid #e2e8f0' },
            }}
            open
          >
            {drawerContent}
          </Drawer>
        </Box>

        {/* --- Contenido Principal --- */}
        <Box 
          component="main" 
          sx={{ 
            flexGrow: 1, 
            p: { xs: 2, sm: 4, lg: 5 }, 
            width: { md: `calc(100% - ${drawerWidth}px)` },
            mt: { xs: 7, md: 0 },
            maxWidth: '1400px',
            mx: 'auto'
          }}
        >
          
          {/* Cabecera */}
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'center' }, mb: 5, gap: 2 }}>
            <Box>
              <Typography variant="h4" gutterBottom sx={{ mb: 0.5 }}>
                Hola, Héctor 👋
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Aquí está el resumen de tu salud al día de hoy.
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: { xs: '100%', md: 'auto' }, justifyContent: 'flex-end' }}>
              <Paper
                component="form"
                elevation={0}
                sx={{ p: '2px 4px', display: { xs: 'none', sm: 'flex' }, alignItems: 'center', width: 280, borderRadius: '50px', border: '1px solid #e2e8f0', bgcolor: 'background.paper' }}
              >
                <IconButton sx={{ p: '10px' }} aria-label="menu" disabled>
                  <Search size={20} color="#94a3b8" />
                </IconButton>
                <InputBase
                  sx={{ ml: 1, flex: 1, fontSize: '0.875rem' }}
                  placeholder="Buscar médicos, especialidades..."
                />
              </Paper>
              <IconButton sx={{ border: '1px solid #e2e8f0', bgcolor: 'background.paper' }}>
                <Badge color="error" variant="dot">
                  <Bell size={20} color="#64748b" />
                </Badge>
              </IconButton>
              <Avatar sx={{ bgcolor: 'primary.main', fontWeight: 'bold', cursor: 'pointer', boxShadow: 2, background: 'linear-gradient(45deg, #1d4ed8, #4f46e5)' }}>
                H
              </Avatar>
            </Box>
          </Box>

          {/* Acciones Rápidas */}
          <Grid container spacing={3} sx={{ mb: 5 }}>
            <Grid item xs={12} sm={6} lg={4}>
              <Card sx={{ borderRadius: '24px', transition: '0.3s', '&:hover': { transform: 'translateY(-4px)', borderColor: 'primary.main', boxShadow: 3 } }}>
                <CardActionArea sx={{ p: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                  <Box sx={{ w: 64, h: 64, p: 2, borderRadius: '16px', bgcolor: 'primary.light', color: 'primary.main', mb: 2 }}>
                    <Calendar size={32} />
                  </Box>
                  <Typography variant="h6">Agendar Cita</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Presencial o a domicilio</Typography>
                </CardActionArea>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} lg={4}>
              <Card sx={{ borderRadius: '24px', transition: '0.3s', '&:hover': { transform: 'translateY(-4px)', borderColor: 'secondary.main', boxShadow: 3 } }}>
                <CardActionArea sx={{ p: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                  <Box sx={{ w: 64, h: 64, p: 2, borderRadius: '16px', bgcolor: 'secondary.light', color: 'secondary.main', mb: 2 }}>
                    <Video size={32} />
                  </Box>
                  <Typography variant="h6">Teleconsulta</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Atención médica virtual</Typography>
                </CardActionArea>
              </Card>
            </Grid>
            <Grid item xs={12} sm={12} lg={4}>
              <Card sx={{ borderRadius: '24px', transition: '0.3s', '&:hover': { transform: 'translateY(-4px)', borderColor: 'info.main', boxShadow: 3 } }}>
                <CardActionArea sx={{ p: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                  <Box sx={{ w: 64, h: 64, p: 2, borderRadius: '16px', bgcolor: 'info.light', color: 'info.main', mb: 2 }}>
                    <FileText size={32} />
                  </Box>
                  <Typography variant="h6">Ver Resultados</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Exámenes y laboratorios</Typography>
                </CardActionArea>
              </Card>
            </Grid>
          </Grid>

          {/* Contenido Principal (Grilla 2/3 y 1/3) */}
          <Grid container spacing={4}>
            
            {/* Columna Izquierda */}
            <Grid item xs={12} lg={8}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', mb: 2, px: 1 }}>
                <Typography variant="h6">Tu próxima cita</Typography>
                <Button endIcon={<ChevronRight size={16} />} sx={{ fontWeight: 600 }}>Ver todas</Button>
              </Box>

              {/* Tarjeta de Próxima Cita con Gradiente */}
              <Card 
                sx={{ 
                  borderRadius: '24px', 
                  mb: 5, 
                  background: 'linear-gradient(135deg, #1d4ed8 0%, #3730a3 100%)', 
                  color: 'white', 
                  position: 'relative',
                  overflow: 'hidden',
                  border: 'none',
                  boxShadow: '0 20px 25px -5px rgb(29 78 216 / 0.2)'
                }}
              >
                <Box sx={{ position: 'absolute', top: -20, right: -20, opacity: 0.1, transform: 'rotate(15deg)' }}>
                  <Activity size={200} />
                </Box>
                
                <CardContent sx={{ p: { xs: 3, md: 4 }, position: 'relative', zIndex: 1 }}>
                  <Grid container spacing={4} alignItems="center" justifyContent="space-between">
                    <Grid item xs={12} md={7}>
                      <Chip 
                        label="Confirmada" 
                        size="small"
                        icon={<Box sx={{ w: 8, h: 8, bgcolor: '#34d399', borderRadius: '50%', ml: 1 }} />}
                        sx={{ bgcolor: 'rgba(52, 211, 153, 0.2)', color: '#d1fae5', border: '1px solid rgba(52, 211, 153, 0.3)', fontWeight: 'bold', mb: 2 }} 
                      />
                      <Typography variant="h4" sx={{ mb: 1 }}>Medicina General</Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, opacity: 0.9 }}>
                        <User size={18} />
                        <Typography variant="subtitle1">Dr. Carlos Mendoza</Typography>
                      </Box>
                    </Grid>
                    
                    <Grid item xs={12} md={5}>
                      <Paper sx={{ p: 2, borderRadius: '16px', display: 'flex', alignItems: 'center', gap: 2, boxShadow: 3 }}>
                        <Box sx={{ p: 1.5, bgcolor: 'primary.light', color: 'primary.main', borderRadius: '12px' }}>
                          <Calendar size={28} />
                        </Box>
                        <Box>
                          <Typography variant="h6" sx={{ color: 'text.primary', lineHeight: 1.2 }}>24 de Marzo</Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5, color: 'text.secondary' }}>
                            <Clock size={16} />
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>10:30 AM</Typography>
                          </Box>
                        </Box>
                      </Paper>
                    </Grid>
                  </Grid>

                  <Divider sx={{ borderColor: 'rgba(255,255,255,0.2)', my: 3 }} />

                  <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, gap: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, opacity: 0.9 }}>
                      <MapPin size={18} />
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>Clínica San Borja - Consultorio 302</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 2, width: { xs: '100%', sm: 'auto' } }}>
                      <Button variant="outlined" sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.3)', '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.1)' }, flex: { xs: 1, sm: 'none' } }}>
                        Reprogramar
                      </Button>
                      <Button variant="contained" sx={{ bgcolor: 'white', color: 'primary.main', '&:hover': { bgcolor: '#f8fafc' }, flex: { xs: 1, sm: 'none' } }}>
                        Ver detalle
                      </Button>
                    </Box>
                  </Box>
                </CardContent>
              </Card>

              {/* Atenciones Recientes */}
              <Typography variant="h6" sx={{ mb: 2, px: 1 }}>Atenciones recientes</Typography>
              <Paper sx={{ borderRadius: '24px', overflow: 'hidden', border: '1px solid #e2e8f0' }} elevation={0}>
                <List disablePadding>
                  <ListItemButton sx={{ p: 2.5, borderBottom: '1px solid #f1f5f9' }}>
                    <ListItemIcon>
                      <Avatar sx={{ bgcolor: '#f1f5f9', color: '#64748b' }}><Activity size={20} /></Avatar>
                    </ListItemIcon>
                    <ListItemText 
                      primary="Cardiología" 
                      secondary="10 de Febrero, 2026 • Dra. Elena Robles" 
                      primaryTypographyProps={{ fontWeight: 700, color: 'text.primary' }}
                    />
                    <ChevronRight size={20} color="#94a3b8" />
                  </ListItemButton>
                  <ListItemButton sx={{ p: 2.5 }}>
                    <ListItemIcon>
                      <Avatar sx={{ bgcolor: '#f1f5f9', color: '#64748b' }}><FileText size={20} /></Avatar>
                    </ListItemIcon>
                    <ListItemText 
                      primary="Análisis de Laboratorio" 
                      secondary="05 de Febrero, 2026 • Hemograma completo" 
                      primaryTypographyProps={{ fontWeight: 700, color: 'text.primary' }}
                    />
                    <ChevronRight size={20} color="#94a3b8" />
                  </ListItemButton>
                </List>
              </Paper>
            </Grid>

            {/* Columna Derecha */}
            <Grid item xs={12} lg={4}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                
                {/* Recordatorios */}
                <Card sx={{ borderRadius: '24px', p: 1 }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                      <Bell size={20} />
                      <Typography variant="h6">Alertas y Recordatorios</Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', gap: 2, p: 2, bgcolor: '#fff7ed', border: '1px solid #ffedd5', borderRadius: '16px', mb: 2 }}>
                      <Box sx={{ bgcolor: '#ffedd5', p: 1, borderRadius: '12px', color: '#f97316', height: 'fit-content' }}>
                        <Activity size={18} />
                      </Box>
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary' }}>Ayuno requerido</Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, lineHeight: 1.5 }}>
                          No olvides mantener 8 horas de ayuno para tus análisis de laboratorio de mañana.
                        </Typography>
                      </Box>
                    </Box>

                    <Box sx={{ display: 'flex', gap: 2, p: 2, bgcolor: '#eff6ff', border: '1px solid #dbeafe', borderRadius: '16px' }}>
                      <Box sx={{ bgcolor: '#dbeafe', p: 1, borderRadius: '12px', color: '#3b82f6', height: 'fit-content' }}>
                        <FileText size={18} />
                      </Box>
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary' }}>Resultados listos</Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, lineHeight: 1.5 }}>
                          Tus resultados de Radiología ya están disponibles.
                        </Typography>
                        <Button size="small" sx={{ mt: 1, p: 0, minWidth: 'auto', fontWeight: 700 }}>Ver resultados</Button>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>

                {/* Banner Seguro */}
                <Card sx={{ borderRadius: '24px', bgcolor: '#0f172a', color: 'white', position: 'relative', overflow: 'hidden' }}>
                  <Box sx={{ position: 'absolute', bottom: -40, right: -40, width: 120, height: 120, bgcolor: 'rgba(99, 102, 241, 0.3)', borderRadius: '50%', filter: 'blur(30px)' }} />
                  <CardContent sx={{ p: 4, position: 'relative', zIndex: 1 }}>
                    <Chip label="Mi Seguro" size="small" sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white', fontWeight: 700, mb: 2, fontSize: '0.7rem', textTransform: 'uppercase' }} />
                    <Typography variant="h6" sx={{ mb: 1 }}>Plan Salud Total</Typography>
                    <Typography variant="body2" sx={{ color: '#94a3b8', mb: 3 }}>
                      Aprovecha tu chequeo preventivo anual sin costo adicional.
                    </Typography>
                    <Button fullWidth variant="contained" sx={{ bgcolor: 'white', color: '#0f172a', '&:hover': { bgcolor: '#f1f5f9' } }}>
                      Ver cobertura
                    </Button>
                  </CardContent>
                </Card>

              </Box>
            </Grid>
          </Grid>
          
        </Box>
      </Box>
    </ThemeProvider>
  );
}