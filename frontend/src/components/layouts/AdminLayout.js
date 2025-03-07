import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Navbar, Nav, Container, Dropdown, Badge } from 'react-bootstrap';
import { 
  FaHome, 
  FaProjectDiagram, 
  FaUsers, 
  FaBell, 
  FaTools, 
  FaChartLine, 
  FaCog,
  FaSignOutAlt,
  FaUserCircle,
  FaBars
} from 'react-icons/fa';
import { useAuth } from '../../contexts/authContext';
import { getUnreadNotifications } from '../../services/notificationService';

const AdminLayout = ({ children }) => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);

  // Función para cargar notificaciones no leídas
  const loadNotifications = async () => {
    try {
      setNotificationsLoading(true);
      const response = await getUnreadNotifications();
      setNotifications(response.data.slice(0, 5)); // Mostrar solo las 5 más recientes
      setNotificationsLoading(false);
    } catch (error) {
      console.error('Error al cargar notificaciones:', error);
      setNotificationsLoading(false);
    }
  };

  // Manejar cierre de sesión
  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Elementos de la barra lateral
  const sidebarItems = [
    {
      name: 'Dashboard',
      icon: <FaHome />,
      path: '/admin/dashboard'
    },
    {
      name: 'Proyectos',
      icon: <FaProjectDiagram />,
      path: '/admin/projects'
    },
    {
      name: 'Solicitudes',
      icon: <FaBell />,
      path: '/admin/service-requests'
    },
    {
      name: 'Rendiciones',
      icon: <FaTools />,
      path: '/admin/renditions'
    },
    {
      name: 'Usuarios',
      icon: <FaUsers />,
      path: '/admin/users'
    },
    {
      name: 'Reportes',
      icon: <FaChartLine />,
      path: '/admin/reports'
    },
    {
      name: 'Configuración',
      icon: <FaCog />,
      path: '/admin/settings'
    }
  ];

  return (
    <div className={`admin-layout ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
      {/* Barra superior */}
      <Navbar bg="primary" variant="dark" expand="lg" className="admin-navbar">
        <Container fluid>
          <div className="d-flex align-items-center">
            <button 
              className="sidebar-toggle me-3 bg-transparent border-0"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <FaBars color="white" />
            </button>
            <Navbar.Brand as={Link} to="/admin/dashboard">
              Integracom Admin
            </Navbar.Brand>
          </div>
          
          <Nav className="ms-auto d-flex align-items-center">
            {/* Notificaciones */}
            <Dropdown 
              align="end" 
              className="me-3"
              onClick={loadNotifications}
            >
              <Dropdown.Toggle variant="transparent" id="dropdown-notifications" className="nav-icon">
                <FaBell color="white" />
                {currentUser?.unreadNotifications > 0 && (
                  <Badge bg="danger" pill className="notification-badge">
                    {currentUser?.unreadNotifications}
                  </Badge>
                )}
              </Dropdown.Toggle>

              <Dropdown.Menu className="notifications-dropdown">
                <Dropdown.Header>Notificaciones</Dropdown.Header>
                <div className="notifications-container">
                  {notificationsLoading ? (
                    <div className="text-center py-3">Cargando...</div>
                  ) : notifications.length > 0 ? (
                    notifications.map((notification, index) => (
                      <Dropdown.Item key={index} href={notification.link || '#'}>
                        <div className="notification-item">
                          <div className="notification-title">{notification.title}</div>
                          <div className="notification-text">{notification.message}</div>
                          <small className="notification-time">
                            {new Date(notification.createdAt).toLocaleString()}
                          </small>
                        </div>
                      </Dropdown.Item>
                    ))
                  ) : (
                    <div className="text-center py-3">No hay notificaciones</div>
                  )}
                </div>
                <Dropdown.Divider />
                <Dropdown.Item as={Link} to="/admin/notifications" className="text-center">
                  Ver todas
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
            
            {/* Perfil del usuario */}
            <Dropdown align="end">
              <Dropdown.Toggle variant="transparent" id="dropdown-user" className="nav-icon">
                <div className="d-flex align-items-center">
                  {currentUser?.profilePicture ? (
                    <img 
                      src={`${process.env.REACT_APP_API_URL}/uploads/profiles/${currentUser.profilePicture}`} 
                      alt="Perfil" 
                      className="user-avatar me-2"
                    />
                  ) : (
                    <FaUserCircle color="white" size={24} className="me-2" />
                  )}
                  <span className="d-none d-md-inline text-white">
                    {currentUser?.firstName} {currentUser?.lastName}
                  </span>
                </div>
              </Dropdown.Toggle>

              <Dropdown.Menu>
                <Dropdown.Item as={Link} to="/admin/profile">
                  <FaUserCircle className="me-2" /> Mi Perfil
                </Dropdown.Item>
                <Dropdown.Item as={Link} to="/admin/settings">
                  <FaCog className="me-2" /> Configuración
                </Dropdown.Item>
                <Dropdown.Divider />
                <Dropdown.Item onClick={handleLogout}>
                  <FaSignOutAlt className="me-2" /> Cerrar Sesión
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
          </Nav>
        </Container>
      </Navbar>

      {/* Barra lateral */}
      <div className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <h5>Menú</h5>
        </div>
        <Nav className="flex-column sidebar-nav">
          {sidebarItems.map((item, index) => (
            <Nav.Item key={index}>
              <Nav.Link 
                as={Link} 
                to={item.path}
                className={location.pathname === item.path ? 'active' : ''}
              >
                <span className="sidebar-icon">{item.icon}</span>
                <span className="sidebar-text">{item.name}</span>
              </Nav.Link>
            </Nav.Item>
          ))}
        </Nav>
        <div className="sidebar-footer">
          <button onClick={handleLogout} className="btn btn-outline-secondary w-100">
            <FaSignOutAlt className="me-2" /> Cerrar Sesión
          </button>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="main-content">
        <Container fluid className="py-4">
          {children}
        </Container>
      </div>
    </div>
  );
};

export default AdminLayout;