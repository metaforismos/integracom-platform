import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Row, Col, Card, Button, Spinner, Alert, Badge, Form, InputGroup } from 'react-bootstrap';
import { FaSearch, FaBuilding, FaMapMarkerAlt, FaCalendarAlt, FaEye, FaClipboardList } from 'react-icons/fa';
import { getProjects } from '../../services/projectService';
import { getProjectServiceRequestsCount } from '../../services/serviceRequestService';
import ClientLayout from '../layouts/ClientLayout';

const ProjectList = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [projects, setProjects] = useState([]);
  const [filteredProjects, setFilteredProjects] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [requestCounts, setRequestCounts] = useState({});

  // Cargar proyectos del cliente
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setLoading(true);
        setError('');
        
        const response = await getProjects();
        setProjects(response.data);
        setFilteredProjects(response.data);
        
        // Obtener conteo de solicitudes para cada proyecto
        const counts = {};
        for (const project of response.data) {
          try {
            const countResponse = await getProjectServiceRequestsCount(project.id);
            counts[project.id] = countResponse.count;
          } catch (err) {
            console.error(`Error al obtener conteo para proyecto ${project.id}:`, err);
            counts[project.id] = 0;
          }
        }
        setRequestCounts(counts);
        
        setLoading(false);
      } catch (err) {
        setError('Error al cargar los proyectos. Por favor intente nuevamente.');
        setLoading(false);
      }
    };
    
    fetchProjects();
  }, []);

  // Filtrar proyectos
  useEffect(() => {
    let result = projects;
    
    // Filtrar por término de búsqueda
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(project => 
        project.name.toLowerCase().includes(term) || 
        project.location.toLowerCase().includes(term) ||
        (project.description && project.description.toLowerCase().includes(term))
      );
    }
    
    // Filtrar por estado
    if (statusFilter) {
      result = result.filter(project => project.status === statusFilter);
    }
    
    setFilteredProjects(result);
  }, [searchTerm, statusFilter, projects]);

  // Renderizar estado del proyecto
  const renderStatus = (status) => {
    let color = 'secondary';
    
    switch (status) {
      case 'En progreso':
        color = 'primary';
        break;
      case 'Finalizado':
        color = 'success';
        break;
      case 'En pausa':
        color = 'warning';
        break;
      case 'Cancelado':
        color = 'danger';
        break;
      case 'En revisión':
        color = 'info';
        break;
      default:
        color = 'secondary';
    }
    
    return <Badge bg={color}>{status}</Badge>;
  };

  return (
    <ClientLayout>
      <div className="project-list-container">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h1>Mis Proyectos</h1>
        </div>
        
        {error && <Alert variant="danger">{error}</Alert>}
        
        {/* Filtros */}
        <Card className="mb-4">
          <Card.Body>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3 mb-md-0">
                  <InputGroup>
                    <InputGroup.Text>
                      <FaSearch />
                    </InputGroup.Text>
                    <Form.Control
                      type="text"
                      placeholder="Buscar por nombre, ubicación o descripción"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </InputGroup>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <InputGroup>
                    <InputGroup.Text>Estado</InputGroup.Text>
                    <Form.Select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                    >
                      <option value="">Todos</option>
                      <option value="En progreso">En progreso</option>
                      <option value="Finalizado">Finalizado</option>
                      <option value="En pausa">En pausa</option>
                      <option value="En revisión">En revisión</option>
                      <option value="Cancelado">Cancelado</option>
                    </Form.Select>
                  </InputGroup>
                </Form.Group>
              </Col>
            </Row>
          </Card.Body>
        </Card>
        
        {/* Lista de proyectos */}
        {loading ? (
          <div className="text-center py-5">
            <Spinner animation="border" variant="primary" />
            <p className="mt-2">Cargando proyectos...</p>
          </div>
        ) : filteredProjects.length > 0 ? (
          <Row>
            {filteredProjects.map((project) => (
              <Col key={project.id} lg={6} xl={4} className="mb-4">
                <Card className="project-card h-100">
                  {project.photos && project.photos.length > 0 ? (
                    <Card.Img 
                      variant="top" 
                      src={`${process.env.REACT_APP_API_URL}${project.photos[0].url}`}
                      className="project-card-img"
                      alt={project.name}
                    />
                  ) : (
                    <div className="project-card-placeholder">
                      <FaBuilding size={48} />
                    </div>
                  )}
                  <Card.Body>
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <Card.Title>{project.name}</Card.Title>
                      {renderStatus(project.status)}
                    </div>
                    
                    <div className="text-muted mb-3">
                      <div className="d-flex align-items-center mb-1">
                        <FaMapMarkerAlt className="me-2" /> 
                        {project.location}
                      </div>
                      <div className="d-flex align-items-center">
                        <FaCalendarAlt className="me-2" /> 
                        Inicio: {new Date(project.startDate).toLocaleDateString()}
                      </div>
                      {project.endDate && (
                        <div className="d-flex align-items-center">
                          <FaCalendarAlt className="me-2" /> 
                          Término: {new Date(project.endDate).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                    
                    <Card.Text className="project-description">
                      {project.description?.length > 120
                        ? `${project.description.substring(0, 120)}...`
                        : project.description || 'Sin descripción'}
                    </Card.Text>
                    
                    <div className="d-flex justify-content-between align-items-center mt-3">
                      <span className="text-muted">
                        <FaClipboardList className="me-1" /> 
                        {requestCounts[project.id] || 0} Solicitudes
                      </span>
                      <Button
                        variant="outline-primary"
                        size="sm"
                        onClick={() => navigate(`/client/projects/${project.id}`)}
                      >
                        <FaEye className="me-1" /> Ver Detalles
                      </Button>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>
        ) : (
          <div className="text-center py-5">
            <p className="text-muted">No se encontraron proyectos con los filtros seleccionados.</p>
          </div>
        )}
      </div>
    </ClientLayout>
  );
};

export default ProjectList;