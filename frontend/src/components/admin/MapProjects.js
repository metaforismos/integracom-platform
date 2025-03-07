import React, { useState, useEffect } from 'react';
import { Card, Spinner, Alert, Button, Modal, Row, Col, Badge } from 'react-bootstrap';
import { FaMapMarkerAlt, FaBuilding, FaCalendarAlt, FaUser, FaUsers, FaTools, FaClipboardList } from 'react-icons/fa';
import { getProjects } from '../../services/projectService';
import { getServiceRequestsCountByProject } from '../../services/serviceRequestService';
import AdminLayout from '../layouts/AdminLayout';

// Importar React-Leaflet
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Arreglar el problema de los íconos de Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

// Íconos personalizados para los marcadores según estado del proyecto
const getMarkerIcon = (status) => {
  let color = 'blue';
  
  switch (status) {
    case 'En progreso':
      color = 'blue';
      break;
    case 'Finalizado':
      color = 'green';
      break;
    case 'En pausa':
      color = 'orange';
      break;
    case 'Cancelado':
      color = 'red';
      break;
    case 'En revisión':
      color = 'purple';
      break;
    default:
      color = 'blue';
  }
  
  return new L.Icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });
};

// Íconos personalizados para los puntos de localización por tipo
const getLocationPointIcon = (type) => {
  let color = 'gray';
  
  switch (type) {
    case 'Escuela':
      color = 'gold';
      break;
    case 'Baliza':
      color = 'violet';
      break;
    case 'Fuente de poder':
      color = 'yellow';
      break;
    case 'Señalética':
      color = 'black';
      break;
    case 'Letrero':
      color = 'cadetblue';
      break;
    default:
      color = 'gray';
  }
  
  return new L.Icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [20, 33], // Ligeramente más pequeño que el principal
    iconAnchor: [10, 33],
    popupAnchor: [1, -34],
    shadowSize: [33, 33]
  });
};

const MapProjects = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [projects, setProjects] = useState([]);
  const [center, setCenter] = useState([-33.4489, -70.6693]); // Santiago, Chile por defecto
  const [zoom, setZoom] = useState(6);
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showPointModal, setShowPointModal] = useState(false);
  const [requestCounts, setRequestCounts] = useState({});

  // Cargar proyectos
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setLoading(true);
        setError('');
        
        const response = await getProjects();
        
        // Filtrar proyectos que tienen coordenadas válidas
        const projectsWithCoordinates = response.data.filter(
          project => project.coordinates && 
                     project.coordinates.coordinates && 
                     project.coordinates.coordinates.length === 2
        );
        
        setProjects(projectsWithCoordinates);
        
        // Calcular el centro del mapa basado en todas las coordenadas
        if (projectsWithCoordinates.length > 0) {
          const latSum = projectsWithCoordinates.reduce(
            (sum, project) => sum + project.coordinates.coordinates[1], 0
          );
          const lngSum = projectsWithCoordinates.reduce(
            (sum, project) => sum + project.coordinates.coordinates[0], 0
          );
          
          setCenter([
            latSum / projectsWithCoordinates.length,
            lngSum / projectsWithCoordinates.length
          ]);
        }
        
        // Obtener conteo de solicitudes para cada proyecto
        const counts = {};
        for (const project of projectsWithCoordinates) {
          try {
            const countResponse = await getServiceRequestsCountByProject(project.id);
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

  // Manejar clic en un marcador
  const handleMarkerClick = (project) => {
    setSelectedProject(project);
    setShowModal(true);
  };

  // Manejar clic en un punto de localización
  const handlePointClick = (point, project) => {
    setSelectedPoint({...point, projectName: project.name});
    setShowPointModal(true);
  };

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
    <AdminLayout>
      <div className="map-projects-container">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h1>Mapa de Proyectos</h1>
        </div>
        
        {error && <Alert variant="danger">{error}</Alert>}
        
        <Card className="mb-4">
          <Card.Body>
            <div className="map-legend mb-2">
              <h6>Leyenda:</h6>
              <div className="d-flex flex-wrap mb-2">
                <div className="d-flex align-items-center me-3 mb-2">
                  <div style={{ background: '#2A81CB', width: '12px', height: '12px', borderRadius: '50%', marginRight: '5px' }}></div>
                  <span>En progreso</span>
                </div>
                <div className="d-flex align-items-center me-3 mb-2">
                  <div style={{ background: '#38A800', width: '12px', height: '12px', borderRadius: '50%', marginRight: '5px' }}></div>
                  <span>Finalizado</span>
                </div>
                <div className="d-flex align-items-center me-3 mb-2">
                  <div style={{ background: '#DB8500', width: '12px', height: '12px', borderRadius: '50%', marginRight: '5px' }}></div>
                  <span>En pausa</span>
                </div>
                <div className="d-flex align-items-center me-3 mb-2">
                  <div style={{ background: '#CB2B2B', width: '12px', height: '12px', borderRadius: '50%', marginRight: '5px' }}></div>
                  <span>Cancelado</span>
                </div>
                <div className="d-flex align-items-center mb-2">
                  <div style={{ background: '#8A2BE2', width: '12px', height: '12px', borderRadius: '50%', marginRight: '5px' }}></div>
                  <span>En revisión</span>
                </div>
              </div>
              
              <h6>Puntos de localización:</h6>
              <div className="d-flex flex-wrap">
                <div className="d-flex align-items-center me-3 mb-2">
                  <div style={{ background: '#FFD700', width: '10px', height: '10px', borderRadius: '50%', marginRight: '5px' }}></div>
                  <span>Escuela</span>
                </div>
                <div className="d-flex align-items-center me-3 mb-2">
                  <div style={{ background: '#EE82EE', width: '10px', height: '10px', borderRadius: '50%', marginRight: '5px' }}></div>
                  <span>Baliza</span>
                </div>
                <div className="d-flex align-items-center me-3 mb-2">
                  <div style={{ background: '#FFFF00', width: '10px', height: '10px', borderRadius: '50%', marginRight: '5px' }}></div>
                  <span>Fuente de poder</span>
                </div>
                <div className="d-flex align-items-center me-3 mb-2">
                  <div style={{ background: '#000000', width: '10px', height: '10px', borderRadius: '50%', marginRight: '5px' }}></div>
                  <span>Señalética</span>
                </div>
                <div className="d-flex align-items-center me-3 mb-2">
                  <div style={{ background: '#5F9EA0', width: '10px', height: '10px', borderRadius: '50%', marginRight: '5px' }}></div>
                  <span>Letrero</span>
                </div>
                <div className="d-flex align-items-center mb-2">
                  <div style={{ background: '#808080', width: '10px', height: '10px', borderRadius: '50%', marginRight: '5px' }}></div>
                  <span>Otro</span>
                </div>
              </div>
            </div>
            
            {loading ? (
              <div className="text-center py-5">
                <Spinner animation="border" variant="primary" />
                <p className="mt-2">Cargando proyectos...</p>
              </div>
            ) : projects.length > 0 ? (
              <div className="map-container" style={{ height: '600px', width: '100%' }}>
                <MapContainer 
                  center={center} 
                  zoom={zoom} 
                  style={{ height: '100%', width: '100%' }}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  />
                  
                  {projects.map(project => (
                    <React.Fragment key={`project-${project.id}`}>
                      {/* Marcador principal del proyecto */}
                      <Marker
                        position={[
                          project.coordinates.coordinates[1],
                          project.coordinates.coordinates[0]
                        ]}
                        icon={getMarkerIcon(project.status)}
                        eventHandlers={{
                          click: () => handleMarkerClick(project)
                        }}
                      >
                        <Popup>
                          <div>
                            <h6>{project.name}</h6>
                            <p><small>{project.location}</small></p>
                            <Button 
                              size="sm" 
                              variant="primary" 
                              onClick={() => handleMarkerClick(project)}
                            >
                              Ver detalles
                            </Button>
                          </div>
                        </Popup>
                      </Marker>
                      
                      {/* Puntos de localización del proyecto */}
                      {project.locationPoints && project.locationPoints.length > 0 && 
                        project.locationPoints.map(point => (
                          <Marker
                            key={`point-${point._id}`}
                            position={[
                              point.coordinates.coordinates[1],
                              point.coordinates.coordinates[0]
                            ]}
                            icon={getLocationPointIcon(point.type)}
                            eventHandlers={{
                              click: () => handlePointClick(point, project)
                            }}
                          >
                            <Popup>
                              <div>
                                <h6>{point.name}</h6>
                                <p><small>Tipo: {point.type}</small></p>
                                <p><small>Proyecto: {project.name}</small></p>
                                <Button 
                                  size="sm" 
                                  variant="info" 
                                  onClick={() => handlePointClick(point, project)}
                                >
                                  Ver detalles
                                </Button>
                              </div>
                            </Popup>
                          </Marker>
                        ))
                      }
                    </React.Fragment>
                  ))}
                </MapContainer>
              </div>
            ) : (
              <div className="text-center py-5">
                <p className="text-muted">No hay proyectos con coordenadas geográficas.</p>
              </div>
            )}
          </Card.Body>
        </Card>
        
        {/* Modal de detalles del proyecto */}
        <Modal 
          show={showModal} 
          onHide={() => setShowModal(false)}
          size="lg"
          centered
        >
          <Modal.Header closeButton>
            <Modal.Title>
              {selectedProject?.name}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {selectedProject && (
              <div className="project-details">
                <div className="d-flex justify-content-between align-items-start mb-3">
                  <h5>Información del Proyecto</h5>
                  {renderStatus(selectedProject.status)}
                </div>
                
                <Row className="mb-3">
                  <Col md={6}>
                    <div className="mb-2">
                      <FaMapMarkerAlt className="me-2 text-primary" />
                      <strong>Ubicación:</strong> {selectedProject.location}
                    </div>
                    <div className="mb-2">
                      <FaCalendarAlt className="me-2 text-primary" />
                      <strong>Inicio:</strong> {new Date(selectedProject.startDate).toLocaleDateString()}
                    </div>
                    {selectedProject.endDate && (
                      <div className="mb-2">
                        <FaCalendarAlt className="me-2 text-primary" />
                        <strong>Término:</strong> {new Date(selectedProject.endDate).toLocaleDateString()}
                      </div>
                    )}
                  </Col>
                  <Col md={6}>
                    <div className="mb-2">
                      <FaBuilding className="me-2 text-primary" />
                      <strong>Cliente:</strong> {selectedProject.clientCompanyName || 'No especificado'}
                    </div>
                    <div className="mb-2">
                      <FaUser className="me-2 text-primary" />
                      <strong>Responsable cliente:</strong> {selectedProject.clientContactName || 'No especificado'}
                    </div>
                    <div className="mb-2">
                      <FaClipboardList className="me-2 text-primary" />
                      <strong>Solicitudes:</strong> {requestCounts[selectedProject.id] || 0}
                    </div>
                  </Col>
                </Row>
                
                {selectedProject.description && (
                  <div className="mb-3">
                    <h6>Descripción:</h6>
                    <p>{selectedProject.description}</p>
                  </div>
                )}
                
                <div className="mb-3">
                  <h6>Coordenadas geográficas:</h6>
                  <p>
                    Latitud: {selectedProject.coordinates.coordinates[1]}<br />
                    Longitud: {selectedProject.coordinates.coordinates[0]}
                  </p>
                </div>
                
                {selectedProject.locationPoints && selectedProject.locationPoints.length > 0 && (
                  <div className="mb-3">
                    <h6>Puntos de localización ({selectedProject.locationPoints.length}):</h6>
                    <ul className="list-group">
                      {selectedProject.locationPoints.map(point => (
                        <li key={point._id} className="list-group-item">
                          <strong>{point.name}</strong> - {point.type}
                          {point.description && <div><small>{point.description}</small></div>}
                          <div><small>Lat: {point.coordinates.coordinates[1]}, Lng: {point.coordinates.coordinates[0]}</small></div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                <div className="d-flex justify-content-between">
                  <Button 
                    variant="outline-secondary" 
                    onClick={() => setShowModal(false)}
                  >
                    Cerrar
                  </Button>
                  <Button 
                    variant="primary"
                    onClick={() => {
                      setShowModal(false);
                      window.location.href = `/admin/projects/${selectedProject.id}`;
                    }}
                  >
                    Ver Proyecto Completo
                  </Button>
                </div>
              </div>
            )}
          </Modal.Body>
        </Modal>
        
        {/* Modal de detalles del punto de localización */}
        <Modal 
          show={showPointModal} 
          onHide={() => setShowPointModal(false)}
          centered
        >
          <Modal.Header closeButton>
            <Modal.Title>
              {selectedPoint?.name}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {selectedPoint && (
              <div className="location-point-details">
                <div className="mb-3">
                  <Badge bg={
                    selectedPoint.type === 'Escuela' ? 'warning' :
                    selectedPoint.type === 'Baliza' ? 'info' :
                    selectedPoint.type === 'Fuente de poder' ? 'warning' :
                    selectedPoint.type === 'Señalética' ? 'dark' :
                    selectedPoint.type === 'Letrero' ? 'primary' :
                    'secondary'
                  }>
                    {selectedPoint.type}
                  </Badge>
                </div>
                
                <div className="mb-3">
                  <strong>Proyecto:</strong> {selectedPoint.projectName}
                </div>
                
                {selectedPoint.description && (
                  <div className="mb-3">
                    <strong>Descripción:</strong> {selectedPoint.description}
                  </div>
                )}
                
                <div className="mb-3">
                  <strong>Coordenadas:</strong><br />
                  Latitud: {selectedPoint.coordinates.coordinates[1]}<br />
                  Longitud: {selectedPoint.coordinates.coordinates[0]}
                </div>
                
                <div className="d-flex justify-content-between mt-4">
                  <Button 
                    variant="outline-secondary" 
                    onClick={() => setShowPointModal(false)}
                  >
                    Cerrar
                  </Button>
                  <Button 
                    variant="primary"
                    onClick={() => {
                      setShowPointModal(false);
                      window.location.href = `/admin/projects/${selectedPoint.project}/location-points/${selectedPoint._id}`;
                    }}
                  >
                    Editar Punto
                  </Button>
                </div>
              </div>
            )}
          </Modal.Body>
        </Modal>
      </div>
    </AdminLayout>
  );
};

export default MapProjects;