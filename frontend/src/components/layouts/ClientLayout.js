import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Navbar, Nav, Container, Dropdown, Badge } from 'react-bootstrap';
import { 
  FaHome, 
  FaProjectDiagram, 
  FaBell, 
  FaUserCircle,
  FaClipboardList,
  FaSignOutAlt,
  FaCog,
  FaBars
} from 'react-icons/fa';
import { useAuth } from '../../contexts/authContext';
import { getUnreadNotifications } from '../../services/notificationService';

const ClientLayout = ({ children }) => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showNotifications, setShowNotifications] = useState(false);
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

  return (
    <div className="client-layout">
      {/* Barra superior */}
      <Navbar bg="primary" variant="dark" expand="lg" className="client-navbar">
        <Container>
          <Navbar.Brand as={Link} to="/client/projects">
            Integracom
          </Navbar.Brand>
          <Navbar.Toggle aria-controls="client-navbar-nav" />
          <Navbar.Collapse id="client-navbar-nav">
            <Nav className="me-auto">
              <Nav.Link 
                as={Link} 
                to="/client/dashboard"
                className={location.pathname === '/client/dashboard' ? 'active' : ''}
              >
                <FaHome className="me-1" /> Inicio
              </Nav.Link>
              <Nav.Link 
                as={Link} 
                to="/client/projects"
                className={location.pathname.startsWith('/client/projects') ? 'active' : ''}
              >
                <FaProjectDiagram className="me-1" /> Proyectos
              </Nav.Link>
              <Nav.Link 
                as={Link} 
                to="/client/service-requests"
                className={location.pathname.startsWith('/client/service-requests') ? 'active' : ''}
              >
                <FaClipboardList className="me-1" /> Solicitudes
              </Nav.Link>
            </Nav>
            
            <Nav className="ms-auto">
              {/* Notificaciones */}
              <Dropdown 
                align="end" 
                className="me-2"
                onClick={loadNotifications}
              >
                <Dropdown.Toggle variant="transparent" id="dropdown-notifications" className="nav-icon">
                  <FaBell color="white" size={20} />
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
                  <Dropdown.Item as={Link} to="/client/notifications" className="text-center">
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
                        style={{ width: '30px', height: '30px', borderRadius: '50%' }}
                      />
                    ) : (
                      <FaUserCircle color="white" size={22} className="me-2" />
                    )}
                    <span className="d-none d-md-inline text-white">
                      {currentUser?.firstName} {currentUser?.lastName}
                    </span>
                  </div>
                </Dropdown.Toggle>

                <Dropdown.Menu>
                  <Dropdown.Item as={Link} to="/client/profile">
                    <FaUserCircle className="me-2" /> Mi Perfil
                  </Dropdown.Item>
                  <Dropdown.Item as={Link} to="/client/settings">
                    <FaCog className="me-2" /> Configuración
                  </Dropdown.Item>
                  <Dropdown.Divider />
                  <Dropdown.Item onClick={handleLogout}>
                    <FaSignOutAlt className="me-2" /> Cerrar Sesión
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>

      {/* Contenido principal */}
      <div className="client-content">
        <Container className="py-4">
          {children}
        </Container>
      </div>
      
      {/* Pie de página */}
      <footer className="client-footer">
        <Container>
          <div className="py-3 text-center">
            <p className="mb-0">© {new Date().getFullYear()} Integracom. Todos los derechos reservados.</p>
          </div>
        </Container>
      </footer>
    </div>
  );
};

export default ClientLayout;