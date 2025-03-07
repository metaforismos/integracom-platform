import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Navbar, Nav, Container, Offcanvas, Badge } from 'react-bootstrap';
import { 
  FaHome, 
  FaProjectDiagram, 
  FaBell, 
  FaTools, 
  FaCog,
  FaSignOutAlt,
  FaUserCircle,
  FaBars,
  FaClipboardList
} from 'react-icons/fa';
import { useAuth } from '../../contexts/authContext';
import { getUnreadNotifications } from '../../services/notificationService';

// Layout diseñado para ser mobile-first
const TechnicianLayout = ({ children }) => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showMenu, setShowMenu] = useState(false);
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

  // Elementos del menú
  const menuItems = [
    {
      name: 'Dashboard',
      icon: <FaHome size={20} />,
      path: '/tech/dashboard'
    },
    {
      name: 'Mis Proyectos',
      icon: <FaProjectDiagram size={20} />,
      path: '/tech/projects'
    },
    {
      name: 'Solicitudes',
      icon: <FaClipboardList size={20} />,
      path: '/tech/service-requests'
    },
    {
      name: 'Rendiciones',
      icon: <FaTools size={20} />,
      path: '/tech/renditions'
    },
    {
      name: 'Mi Perfil',
      icon: <FaUserCircle size={20} />,
      path: '/tech/profile'
    },
    {
      name: 'Configuración',
      icon: <FaCog size={20} />,
      path: '/tech/settings'
    }
  ];

  // Manejar mostrar notificaciones
  const handleShowNotifications = () => {
    loadNotifications();
    setShowNotifications(true);
  };

  return (
    <div className="technician-layout">
      {/* Barra superior */}
      <Navbar bg="primary" variant="dark" expand={false} fixed="top" className="tech-navbar">
        <Container fluid>
          <button
            className="menu-toggle me-2 bg-transparent border-0"
            onClick={() => setShowMenu(true)}
          >
            <FaBars color="white" size={22} />
          </button>
          
          <Navbar.Brand as={Link} to="/tech/dashboard" className="me-auto">
            Integracom Técnicos
          </Navbar.Brand>
          
          <button
            className="notification-button bg-transparent border-0 position-relative me-3"
            onClick={handleShowNotifications}
          >
            <FaBell color="white" size={22} />
            {currentUser?.unreadNotifications > 0 && (
              <Badge bg="danger" pill className="notification-badge">
                {currentUser?.unreadNotifications}
              </Badge>
            )}
          </button>
          
          <Link to="/tech/profile" className="profile-link">
            {currentUser?.profilePicture ? (
              <img 
                src={`${process.env.REACT_APP_API_URL}/uploads/profiles/${currentUser.profilePicture}`} 
                alt="Perfil" 
                className="tech-avatar"
              />
            ) : (
              <FaUserCircle color="white" size={24} />
            )}
          </Link>
        </Container>
      </Navbar>

      {/* Menú lateral deslizable */}
      <Offcanvas show={showMenu} onHide={() => setShowMenu(false)} placement="start" className="tech-menu">
        <Offcanvas.Header closeButton>
          <Offcanvas.Title>
            <div className="d-flex align-items-center">
              {currentUser?.profilePicture ? (
                <img 
                  src={`${process.env.REACT_APP_API_URL}/uploads/profiles/${currentUser.profilePicture}`} 
                  alt="Perfil" 
                  className="tech-menu-avatar me-2"
                />
              ) : (
                <FaUserCircle size={36} className="me-2" />
              )}
              <div>
                <div className="fw-bold">{currentUser?.firstName} {currentUser?.lastName}</div>
                <small className="text-muted">{currentUser?.email}</small>
              </div>
            </div>
          </Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body className="p-0">
          <Nav className="flex-column tech-menu-nav">
            {menuItems.map((item, index) => (
              <Nav.Item key={index}>
                <Nav.Link 
                  as={Link} 
                  to={item.path}
                  className={location.pathname === item.path ? 'active' : ''}
                  onClick={() => setShowMenu(false)}
                >
                  <span className="menu-icon">{item.icon}</span>
                  <span className="menu-text">{item.name}</span>
                </Nav.Link>
              </Nav.Item>
            ))}
          </Nav>
          <div className="tech-menu-footer">
            <button onClick={handleLogout} className="btn btn-outline-danger w-100">
              <FaSignOutAlt className="me-2" /> Cerrar Sesión
            </button>
          </div>
        </Offcanvas.Body>
      </Offcanvas>

      {/* Panel de notificaciones deslizable */}
      <Offcanvas show={showNotifications} onHide={() => setShowNotifications(false)} placement="end" className="notification-panel">
        <Offcanvas.Header closeButton>
          <Offcanvas.Title>Notificaciones</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body className="p-0">
          <div className="notifications-container">
            {notificationsLoading ? (
              <div className="text-center p-4">Cargando notificaciones...</div>
            ) : notifications.length > 0 ? (
              <div className="notification-list">
                {notifications.map((notification, index) => (
                  <div 
                    key={index} 
                    className="notification-item"
                    onClick={() => {
                      navigate(notification.link || '#');
                      setShowNotifications(false);
                    }}
                  >
                    <div className="notification-title">{notification.title}</div>
                    <div className="notification-text">{notification.message}</div>
                    <small className="notification-time">
                      {new Date(notification.createdAt).toLocaleString()}
                    </small>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center p-4">No tienes notificaciones</div>
            )}
          </div>
          <div className="p-3 border-top">
            <Link to="/tech/notifications" className="btn btn-outline-primary w-100" onClick={() => setShowNotifications(false)}>
              Ver todas las notificaciones
            </Link>
          </div>
        </Offcanvas.Body>
      </Offcanvas>

      {/* Contenido principal */}
      <div className="tech-content">
        <Container className="py-4 mt-5">
          {children}
        </Container>
      </div>
      
      {/* Barra inferior para navegación rápida */}
      <Navbar bg="white" fixed="bottom" className="tech-bottom-navbar">
        <Nav className="w-100 justify-content-around">
          <Nav.Link 
            as={Link} 
            to="/tech/dashboard"
            className={location.pathname === '/tech/dashboard' ? 'active' : ''}
          >
            <FaHome size={20} />
            <small className="d-block">Inicio</small>
          </Nav.Link>
          <Nav.Link 
            as={Link} 
            to="/tech/projects"
            className={location.pathname.startsWith('/tech/projects') ? 'active' : ''}
          >
            <FaProjectDiagram size={20} />
            <small className="d-block">Proyectos</small>
          </Nav.Link>
          <Nav.Link 
            as={Link} 
            to="/tech/service-requests"
            className={location.pathname.startsWith('/tech/service-requests') ? 'active' : ''}
          >
            <FaClipboardList size={20} />
            <small className="d-block">Solicitudes</small>
          </Nav.Link>
          <Nav.Link 
            as={Link} 
            to="/tech/renditions"
            className={location.pathname.startsWith('/tech/renditions') ? 'active' : ''}
          >
            <FaTools size={20} />
            <small className="d-block">Rendiciones</small>
          </Nav.Link>
        </Nav>
      </Navbar>
    </div>
  );
};

export default TechnicianLayout;