import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Row, Col, Alert } from 'react-bootstrap';
import { FaUsers, FaProjectDiagram, FaBell, FaTools, FaChartLine } from 'react-icons/fa';
import { getProjectsCount, getActiveProjectsCount } from '../../services/projectService';
import { getServiceRequestsCount, getPendingServiceRequestsCount } from '../../services/serviceRequestService';
import { getUnreadNotificationsCount } from '../../services/notificationService';
import { getUsersCount } from '../../services/userService';
import { getRenditionsToReviewCount } from '../../services/renditionService';
import { useAuth } from '../../contexts/authContext';
import AdminLayout from '../layouts/AdminLayout';

const AdminDashboard = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({
    totalProjects: 0,
    activeProjects: 0,
    totalRequests: 0,
    pendingRequests: 0,
    totalUsers: 0,
    unreadNotifications: 0,
    pendingRenditions: 0
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        setError('');
        
        // Obtener estadísticas en paralelo
        const [
          totalProjectsRes,
          activeProjectsRes,
          totalRequestsRes,
          pendingRequestsRes,
          totalUsersRes,
          notificationsRes,
          renditionsRes
        ] = await Promise.all([
          getProjectsCount(),
          getActiveProjectsCount(),
          getServiceRequestsCount(),
          getPendingServiceRequestsCount(),
          getUsersCount(),
          getUnreadNotificationsCount(),
          getRenditionsToReviewCount()
        ]);
        
        setStats({
          totalProjects: totalProjectsRes.count,
          activeProjects: activeProjectsRes.count,
          totalRequests: totalRequestsRes.count,
          pendingRequests: pendingRequestsRes.count,
          totalUsers: totalUsersRes.count,
          unreadNotifications: notificationsRes.count,
          pendingRenditions: renditionsRes.count
        });
        
        setLoading(false);
      } catch (err) {
        setError('Error al cargar las estadísticas');
        setLoading(false);
      }
    };
    
    fetchStats();
  }, []);

  // Tarjetas de estadísticas
  const statCards = [
    {
      title: 'Proyectos Totales',
      count: stats.totalProjects,
      icon: <FaProjectDiagram size={24} />,
      color: 'primary',
      link: '/admin/projects'
    },
    {
      title: 'Proyectos Activos',
      count: stats.activeProjects,
      icon: <FaProjectDiagram size={24} />,
      color: 'success',
      link: '/admin/projects?status=active'
    },
    {
      title: 'Solicitudes Pendientes',
      count: stats.pendingRequests,
      icon: <FaBell size={24} />,
      color: 'warning',
      link: '/admin/service-requests?status=pending'
    },
    {
      title: 'Rendiciones por Revisar',
      count: stats.pendingRenditions,
      icon: <FaTools size={24} />,
      color: 'info',
      link: '/admin/renditions?status=pending'
    },
    {
      title: 'Usuarios',
      count: stats.totalUsers,
      icon: <FaUsers size={24} />,
      color: 'secondary',
      link: '/admin/users'
    },
    {
      title: 'Notificaciones',
      count: stats.unreadNotifications,
      icon: <FaBell size={24} />,
      color: 'danger',
      link: '/admin/notifications'
    }
  ];

  return (
    <AdminLayout>
      <div className="admin-dashboard">
        <div className="dashboard-header">
          <h1>Panel de Administración</h1>
          <p>Bienvenido, {currentUser?.firstName}. Aquí tienes un resumen general.</p>
        </div>
        
        {error && <Alert variant="danger">{error}</Alert>}
        
        <Row className="stats-cards">
          {statCards.map((card, index) => (
            <Col key={index} lg={4} md={6} sm={12} className="mb-4">
              <Card 
                className={`dashboard-card bg-${card.color} text-white`}
                onClick={() => navigate(card.link)}
              >
                <Card.Body>
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <h3 className="card-count">{loading ? '...' : card.count}</h3>
                      <h5 className="card-title">{card.title}</h5>
                    </div>
                    <div className="card-icon">
                      {card.icon}
                    </div>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
        
        <Row className="mt-4">
          <Col lg={8} md={12} className="mb-4">
            <Card>
              <Card.Header className="d-flex justify-content-between">
                <h5>Solicitudes Recientes</h5>
                <button 
                  className="btn btn-sm btn-outline-primary"
                  onClick={() => navigate('/admin/service-requests')}
                >
                  Ver todas
                </button>
              </Card.Header>
              <Card.Body>
                {loading ? (
                  <p>Cargando solicitudes...</p>
                ) : (
                  <div className="recent-requests-list">
                    {/* Aquí irían las solicitudes recientes */}
                    <p className="text-muted">Implementar listado de solicitudes recientes</p>
                  </div>
                )}
              </Card.Body>
            </Card>
          </Col>
          
          <Col lg={4} md={12} className="mb-4">
            <Card>
              <Card.Header className="d-flex justify-content-between">
                <h5>Notificaciones</h5>
                <button 
                  className="btn btn-sm btn-outline-primary"
                  onClick={() => navigate('/admin/notifications')}
                >
                  Ver todas
                </button>
              </Card.Header>
              <Card.Body>
                {loading ? (
                  <p>Cargando notificaciones...</p>
                ) : (
                  <div className="recent-notifications-list">
                    {/* Aquí irían las notificaciones recientes */}
                    <p className="text-muted">Implementar listado de notificaciones recientes</p>
                  </div>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>
        
        <Row>
          <Col md={12}>
            <Card>
              <Card.Header className="d-flex justify-content-between">
                <h5>Rendimiento General</h5>
                <button 
                  className="btn btn-sm btn-outline-primary"
                  onClick={() => navigate('/admin/reports')}
                >
                  Ver reportes
                </button>
              </Card.Header>
              <Card.Body>
                <div className="performance-chart">
                  {/* Aquí iría un gráfico de rendimiento */}
                  <div className="text-center py-5">
                    <FaChartLine size={48} className="text-muted mb-3" />
                    <p className="text-muted">Implementar gráficos de rendimiento</p>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;