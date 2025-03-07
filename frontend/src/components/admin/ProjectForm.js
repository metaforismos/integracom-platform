import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Form, Button, Card, Alert, Spinner, Row, Col } from 'react-bootstrap';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { FaMapMarkerAlt, FaSave, FaTimes, FaPlus, FaTrash } from 'react-icons/fa';
import { createProject, getProjectById, updateProject } from '../../services/projectService';
import { getUsers } from '../../services/userService';
import AdminLayout from '../layouts/AdminLayout';

// Leaflet para seleccionar ubicación en el mapa
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Arreglar el problema de los íconos de Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

// Componente para capturar clics en el mapa
const LocationMarker = ({ position, setPosition }) => {
  useMapEvents({
    click(e) {
      setPosition([e.latlng.lat, e.latlng.lng]);
    },
  });

  return position ? 
    <Marker position={position} /> : 
    null;
};

// Esquema de validación
const validationSchema = Yup.object({
  name: Yup.string()
    .required('El nombre es obligatorio')
    .min(3, 'El nombre debe tener al menos 3 caracteres'),
  location: Yup.string()
    .required('La ubicación es obligatoria'),
  description: Yup.string()
    .required('La descripción es obligatoria'),
  orderNumber: Yup.string()
    .required('El número de orden es obligatorio'),
  identificationNumber: Yup.string()
    .required('El número de identificación es obligatorio'),
  receptionType: Yup.string()
    .required('El tipo de recepción es obligatorio'),
  companyResponsible: Yup.string()
    .required('El responsable de la empresa es obligatorio'),
  clientContactName: Yup.string()
    .required('El nombre del contacto del cliente es obligatorio'),
  clientCompanyName: Yup.string()
    .required('El nombre de la empresa del cliente es obligatorio'),
  technician: Yup.string()
    .required('Debe seleccionar un técnico'),
  costCenter: Yup.string()
    .required('El centro de costos es obligatorio'),
  status: Yup.string()
    .required('El estado es obligatorio'),
  startDate: Yup.date()
    .required('La fecha de inicio es obligatoria'),
  endDate: Yup.date()
    .nullable(),
  clients: Yup.array()
    .min(1, 'Debe seleccionar al menos un cliente')
});

const ProjectForm = () => {
  const { projectId } = useParams();
  const isEditMode = !!projectId;
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(isEditMode);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [users, setUsers] = useState({ technicians: [], clients: [] });
  const [mapPosition, setMapPosition] = useState([-33.4489, -70.6693]); // Santiago, Chile por defecto
  const [markerPosition, setMarkerPosition] = useState(null);
  const [locationPoints, setLocationPoints] = useState([]);
  const [showLocationPointForm, setShowLocationPointForm] = useState(false);
  const [currentPoint, setCurrentPoint] = useState({
    name: '',
    type: 'Otro',
    description: '',
    coordinates: null
  });

  // Valores iniciales para el formulario
  const initialValues = {
    name: '',
    location: '',
    description: '',
    orderNumber: '',
    identificationNumber: '',
    receptionType: 'Total',
    companyResponsible: '',
    clientContactName: '',
    clientCompanyName: '',
    technician: '',
    costCenter: '',
    status: 'En progreso',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    clients: []
  };

  // Cargar datos para edición y listas de usuarios
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError('');
        
        // Obtener usuarios para los selectores
        const usersResponse = await getUsers();
        const technicians = usersResponse.data.filter(user => user.role === 'technician');
        const clients = usersResponse.data.filter(user => user.role === 'client');
        setUsers({ technicians, clients });
        
        // Si estamos en modo edición, obtener datos del proyecto
        if (isEditMode) {
          const projectResponse = await getProjectById(projectId);
          const project = projectResponse.data;
          
          // Si el proyecto tiene coordenadas, establecer la posición del marcador
          if (project.coordinates && project.coordinates.coordinates) {
            const coords = project.coordinates.coordinates;
            setMarkerPosition([coords[1], coords[0]]); // [lat, lng]
            setMapPosition([coords[1], coords[0]]); // centrar mapa
          }
          
          // Cargar puntos de localización si existen
          if (project.locationPoints && project.locationPoints.length > 0) {
            setLocationPoints(project.locationPoints);
          }
          
          // Formatear fechas para el formulario
          const startDate = project.startDate ? new Date(project.startDate).toISOString().split('T')[0] : '';
          const endDate = project.endDate ? new Date(project.endDate).toISOString().split('T')[0] : '';
          
          // Formatear clientes para multiselector
          const selectedClients = project.clients ? project.clients.map(client => client._id || client) : [];
          
          // Actualizar valores iniciales
          initialValues.name = project.name || '';
          initialValues.location = project.location || '';
          initialValues.description = project.description || '';
          initialValues.orderNumber = project.orderNumber || '';
          initialValues.identificationNumber = project.identificationNumber || '';
          initialValues.receptionType = project.receptionType || 'Total';
          initialValues.companyResponsible = project.companyResponsible || '';
          initialValues.clientContactName = project.clientContactName || '';
          initialValues.clientCompanyName = project.clientCompanyName || '';
          initialValues.technician = project.technician?._id || project.technician || '';
          initialValues.costCenter = project.costCenter || '';
          initialValues.status = project.status || 'En progreso';
          initialValues.startDate = startDate;
          initialValues.endDate = endDate;
          initialValues.clients = selectedClients;
        }
        
        setLoading(false);
      } catch (err) {
        setError('Error al cargar datos. Por favor intente nuevamente.');
        setLoading(false);
      }
    };
    
    fetchData();
  }, [projectId, isEditMode]);

  // Manejar envío del formulario
  const handleSubmit = async (values, { resetForm }) => {
    try {
      setSubmitting(true);
      setError('');
      setSuccess('');
      
      // Preparar datos del proyecto
      const projectData = {
        ...values,
        // Agregar coordenadas si se ha seleccionado una ubicación en el mapa
        coordinates: markerPosition ? {
          type: 'Point',
          coordinates: [markerPosition[1], markerPosition[0]] // [lng, lat] para MongoDB
        } : undefined,
        // Incluir puntos de localización
        locationPoints: locationPoints.map(point => ({
          ...point,
          coordinates: {
            type: 'Point',
            coordinates: [point.coordinates.coordinates[1], point.coordinates.coordinates[0]] // Asegurar formato
          }
        }))
      };
      
      // Crear o actualizar proyecto
      if (isEditMode) {
        await updateProject(projectId, projectData);
        setSuccess('Proyecto actualizado exitosamente');
      } else {
        await createProject(projectData);
        setSuccess('Proyecto creado exitosamente');
        resetForm();
        setMarkerPosition(null);
        setLocationPoints([]);
      }
      
      // Redireccionar después de 2 segundos
      setTimeout(() => {
        navigate('/admin/projects');
      }, 2000);
      
    } catch (err) {
      setError('Error al guardar el proyecto. Por favor intente nuevamente.');
    } finally {
      setSubmitting(false);
    }
  };

  // Si está cargando, mostrar spinner
  if (loading) {
    return (
      <AdminLayout>
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="mt-2">Cargando datos...</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="project-form-container">
        <h1 className="mb-4">{isEditMode ? 'Editar Proyecto' : 'Nuevo Proyecto'}</h1>
        
        {error && <Alert variant="danger">{error}</Alert>}
        {success && <Alert variant="success">{success}</Alert>}
        
        <Formik
          initialValues={initialValues}
          validationSchema={validationSchema}
          onSubmit={handleSubmit}
          enableReinitialize
        >
          {({
            values,
            errors,
            touched,
            handleChange,
            handleBlur,
            handleSubmit,
            isSubmitting,
            setFieldValue
          }) => (
            <Form onSubmit={handleSubmit}>
              <Card className="mb-4">
                <Card.Header>
                  <h5>Información General</h5>
                </Card.Header>
                <Card.Body>
                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Nombre del Proyecto</Form.Label>
                        <Form.Control
                          type="text"
                          name="name"
                          value={values.name}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          isInvalid={touched.name && errors.name}
                        />
                        <Form.Control.Feedback type="invalid">
                          {errors.name}
                        </Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Ubicación</Form.Label>
                        <Form.Control
                          type="text"
                          name="location"
                          value={values.location}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          isInvalid={touched.location && errors.location}
                          placeholder="Ej: Ruta 68, Km 30, Región de Valparaíso"
                        />
                        <Form.Control.Feedback type="invalid">
                          {errors.location}
                        </Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                  </Row>
                  
                  <Form.Group className="mb-3">
                    <Form.Label>Descripción</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={3}
                      name="description"
                      value={values.description}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      isInvalid={touched.description && errors.description}
                    />
                    <Form.Control.Feedback type="invalid">
                      {errors.description}
                    </Form.Control.Feedback>
                  </Form.Group>
                  
                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Número de OC</Form.Label>
                        <Form.Control
                          type="text"
                          name="orderNumber"
                          value={values.orderNumber}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          isInvalid={touched.orderNumber && errors.orderNumber}
                        />
                        <Form.Control.Feedback type="invalid">
                          {errors.orderNumber}
                        </Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Número de Identificación</Form.Label>
                        <Form.Control
                          type="text"
                          name="identificationNumber"
                          value={values.identificationNumber}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          isInvalid={touched.identificationNumber && errors.identificationNumber}
                        />
                        <Form.Control.Feedback type="invalid">
                          {errors.identificationNumber}
                        </Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                  </Row>
                  
                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Tipo de Recepción</Form.Label>
                        <Form.Select
                          name="receptionType"
                          value={values.receptionType}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          isInvalid={touched.receptionType && errors.receptionType}
                        >
                          <option value="Total">Total</option>
                          <option value="Parcial">Parcial</option>
                          <option value="Otro">Otro</option>
                        </Form.Select>
                        <Form.Control.Feedback type="invalid">
                          {errors.receptionType}
                        </Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Estado</Form.Label>
                        <Form.Select
                          name="status"
                          value={values.status}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          isInvalid={touched.status && errors.status}
                        >
                          <option value="En progreso">En progreso</option>
                          <option value="Finalizado">Finalizado</option>
                          <option value="En pausa">En pausa</option>
                          <option value="Cancelado">Cancelado</option>
                          <option value="En revisión">En revisión</option>
                        </Form.Select>
                        <Form.Control.Feedback type="invalid">
                          {errors.status}
                        </Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
              
              <Card className="mb-4">
                <Card.Header>
                  <h5>Ubicación Geográfica</h5>
                </Card.Header>
                <Card.Body>
                  <p className="mb-3">
                    <strong>Instrucciones:</strong> Haga clic en el mapa para seleccionar la ubicación principal del proyecto.
                  </p>
                  
                  <div className="map-container mb-3" style={{ height: '400px', width: '100%' }}>
                    <MapContainer 
                      center={mapPosition}
                      zoom={6}
                      style={{ height: '100%', width: '100%' }}
                    >
                      <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      />
                      <LocationMarker 
                        position={markerPosition}
                        setPosition={setMarkerPosition}
                      />
                      
                      {/* Mostrar puntos de localización existentes */}
                      {locationPoints.map((point, index) => (
                        <Marker
                          key={`point-${point._id || index}`}
                          position={[
                            point.coordinates.coordinates[0],
                            point.coordinates.coordinates[1]
                          ]}
                          icon={new L.Icon({
                            iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-gold.png',
                            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                            iconSize: [20, 33],
                            iconAnchor: [10, 33],
                            popupAnchor: [1, -34],
                            shadowSize: [33, 33]
                          })}
                        >
                          <Popup>
                            <div>
                              <h6>{point.name}</h6>
                              <p><small>Tipo: {point.type}</small></p>
                              {point.description && (
                                <p><small>{point.description}</small></p>
                              )}
                              <Button 
                                size="sm" 
                                variant="danger" 
                                onClick={() => {
                                  setLocationPoints(
                                    locationPoints.filter((p, i) => 
                                      p._id ? p._id !== point._id : i !== index
                                    )
                                  );
                                }}
                              >
                                Eliminar
                              </Button>
                            </div>
                          </Popup>
                        </Marker>
                      ))}
                    </MapContainer>
                  </div>
                  
                  {markerPosition && (
                    <div className="selected-location mb-3">
                      <h6>Coordenadas principales del proyecto:</h6>
                      <p>
                        Latitud: {markerPosition[0].toFixed(6)}<br />
                        Longitud: {markerPosition[1].toFixed(6)}
                      </p>
                      <Button 
                        variant="outline-danger" 
                        size="sm"
                        onClick={() => setMarkerPosition(null)}
                      >
                        <FaTimes className="me-1" /> Borrar ubicación
                      </Button>
                    </div>
                  )}
                  
                  <Alert variant={markerPosition ? 'success' : 'warning'}>
                    {markerPosition 
                      ? 'Ubicación geográfica principal seleccionada correctamente.' 
                      : 'Por favor, seleccione la ubicación geográfica principal del proyecto en el mapa.'}
                  </Alert>
                  
                  <hr />
                  
                  <h5 className="mb-3">Puntos de Localización</h5>
                  
                  {locationPoints.length > 0 ? (
                    <div className="mb-3">
                      <h6>Puntos agregados ({locationPoints.length}):</h6>
                      <ul className="list-group">
                        {locationPoints.map((point, index) => (
                          <li key={point._id || index} className="list-group-item d-flex justify-content-between align-items-center">
                            <div>
                              <strong>{point.name}</strong> - {point.type}
                              {point.description && <div><small>{point.description}</small></div>}
                            </div>
                            <Button 
                              variant="danger" 
                              size="sm"
                              onClick={() => {
                                setLocationPoints(
                                  locationPoints.filter((p, i) => 
                                    p._id ? p._id !== point._id : i !== index
                                  )
                                );
                              }}
                            >
                              <FaTrash />
                            </Button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <Alert variant="info">
                      No hay puntos de localización agregados. Puede agregar puntos específicos como escuelas, balizas, fuentes de poder, etc.
                    </Alert>
                  )}
                  
                  <Button
                    variant="success"
                    onClick={() => setShowLocationPointForm(true)}
                    className="mb-3"
                  >
                    <FaPlus className="me-1" /> Agregar Punto de Localización
                  </Button>
                  
                  {/* Formulario para agregar puntos de localización */}
                  {showLocationPointForm && (
                    <Card className="mb-3">
                      <Card.Header>
                        <h6>Nuevo Punto de Localización</h6>
                      </Card.Header>
                      <Card.Body>
                        <Form.Group className="mb-3">
                          <Form.Label>Nombre del Punto</Form.Label>
                          <Form.Control
                            type="text"
                            value={currentPoint.name}
                            onChange={(e) => setCurrentPoint({...currentPoint, name: e.target.value})}
                            placeholder="Ej: Escuela Los Pinos, Baliza Km 45, etc."
                          />
                        </Form.Group>
                        
                        <Form.Group className="mb-3">
                          <Form.Label>Tipo</Form.Label>
                          <Form.Select
                            value={currentPoint.type}
                            onChange={(e) => setCurrentPoint({...currentPoint, type: e.target.value})}
                          >
                            <option value="Escuela">Escuela</option>
                            <option value="Baliza">Baliza</option>
                            <option value="Fuente de poder">Fuente de poder</option>
                            <option value="Señalética">Señalética</option>
                            <option value="Letrero">Letrero</option>
                            <option value="Otro">Otro</option>
                          </Form.Select>
                        </Form.Group>
                        
                        <Form.Group className="mb-3">
                          <Form.Label>Descripción (opcional)</Form.Label>
                          <Form.Control
                            as="textarea"
                            rows={2}
                            value={currentPoint.description}
                            onChange={(e) => setCurrentPoint({...currentPoint, description: e.target.value})}
                            placeholder="Descripción breve del punto de localización"
                          />
                        </Form.Group>
                        
                        <Form.Group className="mb-3">
                          <Form.Label>Coordenadas</Form.Label>
                          <Row>
                            <Col md={6}>
                              <Form.Control
                                type="number"
                                placeholder="Latitud"
                                value={currentPoint.coordinates ? currentPoint.coordinates[0] : ''}
                                onChange={(e) => setCurrentPoint({
                                  ...currentPoint, 
                                  coordinates: [parseFloat(e.target.value), currentPoint.coordinates ? currentPoint.coordinates[1] : 0]
                                })}
                                step="0.000001"
                              />
                            </Col>
                            <Col md={6}>
                              <Form.Control
                                type="number"
                                placeholder="Longitud"
                                value={currentPoint.coordinates ? currentPoint.coordinates[1] : ''}
                                onChange={(e) => setCurrentPoint({
                                  ...currentPoint, 
                                  coordinates: [currentPoint.coordinates ? currentPoint.coordinates[0] : 0, parseFloat(e.target.value)]
                                })}
                                step="0.000001"
                              />
                            </Col>
                          </Row>
                          <Form.Text className="text-muted">
                            Puede ingresar manualmente las coordenadas o usar la ubicación principal del proyecto.
                          </Form.Text>
                        </Form.Group>
                        
                        <div className="d-flex justify-content-between">
                          <Button
                            variant="outline-secondary"
                            onClick={() => {
                              setShowLocationPointForm(false);
                              setCurrentPoint({
                                name: '',
                                type: 'Otro',
                                description: '',
                                coordinates: null
                              });
                            }}
                          >
                            Cancelar
                          </Button>
                          
                          <div>
                            <Button
                              variant="outline-primary"
                              className="me-2"
                              onClick={() => {
                                if (markerPosition) {
                                  setCurrentPoint({
                                    ...currentPoint,
                                    coordinates: [markerPosition[0], markerPosition[1]]
                                  });
                                }
                              }}
                              disabled={!markerPosition}
                            >
                              Usar Ubicación Principal
                            </Button>
                            
                            <Button
                              variant="primary"
                              onClick={() => {
                                // Validar campos obligatorios
                                if (!currentPoint.name) {
                                  alert('El nombre del punto es obligatorio');
                                  return;
                                }
                                if (!currentPoint.coordinates) {
                                  alert('Las coordenadas son obligatorias');
                                  return;
                                }
                                
                                // Agregar el punto a la lista
                                setLocationPoints([
                                  ...locationPoints,
                                  {
                                    ...currentPoint,
                                    coordinates: {
                                      type: 'Point',
                                      coordinates: currentPoint.coordinates
                                    }
                                  }
                                ]);
                                
                                // Reiniciar el formulario
                                setShowLocationPointForm(false);
                                setCurrentPoint({
                                  name: '',
                                  type: 'Otro',
                                  description: '',
                                  coordinates: null
                                });
                              }}
                            >
                              Guardar Punto
                            </Button>
                          </div>
                        </div>
                      </Card.Body>
                    </Card>
                  )}
                </Card.Body>
              </Card>
              
              <Card className="mb-4">
                <Card.Header>
                  <h5>Información del Cliente</h5>
                </Card.Header>
                <Card.Body>
                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Nombre Empresa Cliente</Form.Label>
                        <Form.Control
                          type="text"
                          name="clientCompanyName"
                          value={values.clientCompanyName}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          isInvalid={touched.clientCompanyName && errors.clientCompanyName}
                        />
                        <Form.Control.Feedback type="invalid">
                          {errors.clientCompanyName}
                        </Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Nombre Contacto Cliente</Form.Label>
                        <Form.Control
                          type="text"
                          name="clientContactName"
                          value={values.clientContactName}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          isInvalid={touched.clientContactName && errors.clientContactName}
                        />
                        <Form.Control.Feedback type="invalid">
                          {errors.clientContactName}
                        </Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                  </Row>
                  
                  <Form.Group className="mb-3">
                    <Form.Label>Usuarios Cliente</Form.Label>
                    <Form.Select
                      multiple
                      name="clients"
                      value={values.clients}
                      onChange={(e) => {
                        const options = e.target.options;
                        const selectedValues = [];
                        for (let i = 0; i < options.length; i++) {
                          if (options[i].selected) {
                            selectedValues.push(options[i].value);
                          }
                        }
                        setFieldValue('clients', selectedValues);
                      }}
                      onBlur={handleBlur}
                      isInvalid={touched.clients && errors.clients}
                      style={{ height: '150px' }}
                    >
                      {users.clients.map(client => (
                        <option key={client._id} value={client._id}>
                          {client.firstName} {client.lastName} ({client.email})
                        </option>
                      ))}
                    </Form.Select>
                    <Form.Text className="text-muted">
                      Mantenga presionada la tecla Ctrl (o Cmd en Mac) para seleccionar múltiples usuarios.
                    </Form.Text>
                    <Form.Control.Feedback type="invalid">
                      {errors.clients}
                    </Form.Control.Feedback>
                  </Form.Group>
                </Card.Body>
              </Card>
              
              <Card className="mb-4">
                <Card.Header>
                  <h5>Información Interna</h5>
                </Card.Header>
                <Card.Body>
                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Responsable Empresa</Form.Label>
                        <Form.Control
                          type="text"
                          name="companyResponsible"
                          value={values.companyResponsible}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          isInvalid={touched.companyResponsible && errors.companyResponsible}
                        />
                        <Form.Control.Feedback type="invalid">
                          {errors.companyResponsible}
                        </Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Centro de Costos</Form.Label>
                        <Form.Control
                          type="text"
                          name="costCenter"
                          import React, { useState, useEffect } from 'react';
                          import { useNavigate, useParams } from 'react-router-dom';
                          import { Form, Button, Card, Alert, Spinner, Row, Col } from 'react-bootstrap';
                          import { Formik } from 'formik';
                          import * as Yup from 'yup';
                          import { FaMapMarkerAlt, FaSave, FaTimes, FaPlus, FaTrash } from 'react-icons/fa';
                          import { createProject, getProjectById, updateProject } from '../../services/projectService';
                          import { getUsers } from '../../services/userService';
                          import AdminLayout from '../layouts/AdminLayout';
                          
                          // Leaflet para seleccionar ubicación en el mapa
                          import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
                          import 'leaflet/dist/leaflet.css';
                          import L from 'leaflet';
                          
                          // Arreglar el problema de los íconos de Leaflet
                          delete L.Icon.Default.prototype._getIconUrl;
                          L.Icon.Default.mergeOptions({
                            iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
                            iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
                            shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
                          });
                          
                          // Componente para capturar clics en el mapa
                          const LocationMarker = ({ position, setPosition }) => {
                            useMapEvents({
                              click(e) {
                                setPosition([e.latlng.lat, e.latlng.lng]);
                              },
                            });
                          
                            return position ? 
                              <Marker position={position} /> : 
                              null;
                          };
                          
                          // Esquema de validación
                          const validationSchema = Yup.object({
                            name: Yup.string()
                              .required('El nombre es obligatorio')
                              .min(3, 'El nombre debe tener al menos 3 caracteres'),
                            location: Yup.string()
                              .required('La ubicación es obligatoria'),
                            description: Yup.string()
                              .required('La descripción es obligatoria'),
                            orderNumber: Yup.string()
                              .required('El número de orden es obligatorio'),
                            identificationNumber: Yup.string()
                              .required('El número de identificación es obligatorio'),
                            receptionType: Yup.string()
                              .required('El tipo de recepción es obligatorio'),
                            companyResponsible: Yup.string()
                              .required('El responsable de la empresa es obligatorio'),
                            clientContactName: Yup.string()
                              .required('El nombre del contacto del cliente es obligatorio'),
                            clientCompanyName: Yup.string()
                              .required('El nombre de la empresa del cliente es obligatorio'),
                            technician: Yup.string()
                              .required('Debe seleccionar un técnico'),
                            costCenter: Yup.string()
                              .required('El centro de costos es obligatorio'),
                            status: Yup.string()
                              .required('El estado es obligatorio'),
                            startDate: Yup.date()
                              .required('La fecha de inicio es obligatoria'),
                            endDate: Yup.date()
                              .nullable(),
                            clients: Yup.array()
                              .min(1, 'Debe seleccionar al menos un cliente')
                          });
                          
                          const ProjectForm = () => {
                            const { projectId } = useParams();
                            const isEditMode = !!projectId;
                            const navigate = useNavigate();
                            
                            const [loading, setLoading] = useState(isEditMode);
                            const [submitting, setSubmitting] = useState(false);
                            const [error, setError] = useState('');
                            const [success, setSuccess] = useState('');
                            const [users, setUsers] = useState({ technicians: [], clients: [] });
                            const [mapPosition, setMapPosition] = useState([-33.4489, -70.6693]); // Santiago, Chile por defecto
                            const [markerPosition, setMarkerPosition] = useState(null);
                            const [locationPoints, setLocationPoints] = useState([]);
                            const [showLocationPointForm, setShowLocationPointForm] = useState(false);
                            const [currentPoint, setCurrentPoint] = useState({
                              name: '',
                              type: 'Otro',
                              description: '',
                              coordinates: null
                            });
                          
                            // Valores iniciales para el formulario
                            const initialValues = {
                              name: '',
                              location: '',
                              description: '',
                              orderNumber: '',
                              identificationNumber: '',
                              receptionType: 'Total',
                              companyResponsible: '',
                              clientContactName: '',
                              clientCompanyName: '',
                              technician: '',
                              costCenter: '',
                              status: 'En progreso',
                              startDate: new Date().toISOString().split('T')[0],
                              endDate: '',
                              clients: []
                            };
                          
                            // Cargar datos para edición y listas de usuarios
                            useEffect(() => {
                              const fetchData = async () => {
                                try {
                                  setLoading(true);
                                  setError('');
                                  
                                  // Obtener usuarios para los selectores
                                  const usersResponse = await getUsers();
                                  const technicians = usersResponse.data.filter(user => user.role === 'technician');
                                  const clients = usersResponse.data.filter(user => user.role === 'client');
                                  setUsers({ technicians, clients });
                                  
                                  // Si estamos en modo edición, obtener datos del proyecto
                                  if (isEditMode) {
                                    const projectResponse = await getProjectById(projectId);
                                    const project = projectResponse.data;
                                    
                                    // Si el proyecto tiene coordenadas, establecer la posición del marcador
                                    if (project.coordinates && project.coordinates.coordinates) {
                                      const coords = project.coordinates.coordinates;
                                      setMarkerPosition([coords[1], coords[0]]); // [lat, lng]
                                      setMapPosition([coords[1], coords[0]]); // centrar mapa
                                    }
                                    
                                    // Cargar puntos de localización si existen
                                    if (project.locationPoints && project.locationPoints.length > 0) {
                                      setLocationPoints(project.locationPoints);
                                    }
                                    
                                    // Formatear fechas para el formulario
                                    const startDate = project.startDate ? new Date(project.startDate).toISOString().split('T')[0] : '';
                                    const endDate = project.endDate ? new Date(project.endDate).toISOString().split('T')[0] : '';
                                    
                                    // Formatear clientes para multiselector
                                    const selectedClients = project.clients ? project.clients.map(client => client._id || client) : [];
                                    
                                    // Actualizar valores iniciales
                                    initialValues.name = project.name || '';
                                    initialValues.location = project.location || '';
                                    initialValues.description = project.description || '';
                                    initialValues.orderNumber = project.orderNumber || '';
                                    initialValues.identificationNumber = project.identificationNumber || '';
                                    initialValues.receptionType = project.receptionType || 'Total';
                                    initialValues.companyResponsible = project.companyResponsible || '';
                                    initialValues.clientContactName = project.clientContactName || '';
                                    initialValues.clientCompanyName = project.clientCompanyName || '';
                                    initialValues.technician = project.technician?._id || project.technician || '';
                                    initialValues.costCenter = project.costCenter || '';
                                    initialValues.status = project.status || 'En progreso';
                                    initialValues.startDate = startDate;
                                    initialValues.endDate = endDate;
                                    initialValues.clients = selectedClients;
                                  }
                                  
                                  setLoading(false);
                                } catch (err) {
                                  setError('Error al cargar datos. Por favor intente nuevamente.');
                                  setLoading(false);
                                }
                              };
                              
                              fetchData();
                            }, [projectId, isEditMode]);
                          
                            // Manejar envío del formulario
                            const handleSubmit = async (values, { resetForm }) => {
                              try {
                                setSubmitting(true);
                                setError('');
                                setSuccess('');
                                
                                // Preparar datos del proyecto
                                const projectData = {
                                  ...values,
                                  // Agregar coordenadas si se ha seleccionado una ubicación en el mapa
                                  coordinates: markerPosition ? {
                                    type: 'Point',
                                    coordinates: [markerPosition[1], markerPosition[0]] // [lng, lat] para MongoDB
                                  } : undefined,
                                  // Incluir puntos de localización
                                  locationPoints: locationPoints.map(point => ({
                                    ...point,
                                    coordinates: {
                                      type: 'Point',
                                      coordinates: [point.coordinates.coordinates[1], point.coordinates.coordinates[0]] // Asegurar formato
                                    }
                                  }))
                                };
                                
                                // Crear o actualizar proyecto
                                if (isEditMode) {
                                  await updateProject(projectId, projectData);
                                  setSuccess('Proyecto actualizado exitosamente');
                                } else {
                                  await createProject(projectData);
                                  setSuccess('Proyecto creado exitosamente');
                                  resetForm();
                                  setMarkerPosition(null);
                                  setLocationPoints([]);
                                }
                                
                                // Redireccionar después de 2 segundos
                                setTimeout(() => {
                                  navigate('/admin/projects');
                                }, 2000);
                                
                              } catch (err) {
                                setError('Error al guardar el proyecto. Por favor intente nuevamente.');
                              } finally {
                                setSubmitting(false);
                              }
                            };
                          
                            // Si está cargando, mostrar spinner
                            if (loading) {
                              return (
                                <AdminLayout>
                                  <div className="text-center py-5">
                                    <Spinner animation="border" variant="primary" />
                                    <p className="mt-2">Cargando datos...</p>
                                  </div>
                                </AdminLayout>
                              );
                            }
                          
                            return (
                              <AdminLayout>
                                <div className="project-form-container">
                                  <h1 className="mb-4">{isEditMode ? 'Editar Proyecto' : 'Nuevo Proyecto'}</h1>
                                  
                                  {error && <Alert variant="danger">{error}</Alert>}
                                  {success && <Alert variant="success">{success}</Alert>}
                                  
                                  <Formik
                                    initialValues={initialValues}
                                    validationSchema={validationSchema}
                                    onSubmit={handleSubmit}
                                    enableReinitialize
                                  >
                                    {({
                                      values,
                                      errors,
                                      touched,
                                      handleChange,
                                      handleBlur,
                                      handleSubmit,
                                      isSubmitting,
                                      setFieldValue
                                    }) => (
                                      <Form onSubmit={handleSubmit}>
                                        <Card className="mb-4">
                                          <Card.Header>
                                            <h5>Información General</h5>
                                          </Card.Header>
                                          <Card.Body>
                                            <Row>
                                              <Col md={6}>
                                                <Form.Group className="mb-3">
                                                  <Form.Label>Nombre del Proyecto</Form.Label>
                                                  <Form.Control
                                                    type="text"
                                                    name="name"
                                                    value={values.name}
                                                    onChange={handleChange}
                                                    onBlur={handleBlur}
                                                    isInvalid={touched.name && errors.name}
                                                  />
                                                  <Form.Control.Feedback type="invalid">
                                                    {errors.name}
                                                  </Form.Control.Feedback>
                                                </Form.Group>
                                              </Col>
                                              <Col md={6}>
                                                <Form.Group className="mb-3">
                                                  <Form.Label>Ubicación</Form.Label>
                                                  <Form.Control
                                                    type="text"
                                                    name="location"
                                                    value={values.location}
                                                    onChange={handleChange}
                                                    onBlur={handleBlur}
                                                    isInvalid={touched.location && errors.location}
                                                    placeholder="Ej: Ruta 68, Km 30, Región de Valparaíso"
                                                  />
                                                  <Form.Control.Feedback type="invalid">
                                                    {errors.location}
                                                  </Form.Control.Feedback>
                                                </Form.Group>
                                              </Col>
                                            </Row>
                                            
                                            <Form.Group className="mb-3">
                                              <Form.Label>Descripción</Form.Label>
                                              <Form.Control
                                                as="textarea"
                                                rows={3}
                                                name="description"
                                                value={values.description}
                                                onChange={handleChange}
                                                onBlur={handleBlur}
                                                isInvalid={touched.description && errors.description}
                                              />
                                              <Form.Control.Feedback type="invalid">
                                                {errors.description}
                                              </Form.Control.Feedback>
                                            </Form.Group>
                                            
                                            <Row>
                                              <Col md={6}>
                                                <Form.Group className="mb-3">
                                                  <Form.Label>Número de OC</Form.Label>
                                                  <Form.Control
                                                    type="text"
                                                    name="orderNumber"
                                                    value={values.orderNumber}
                                                    onChange={handleChange}
                                                    onBlur={handleBlur}
                                                    isInvalid={touched.orderNumber && errors.orderNumber}
                                                  />
                                                  <Form.Control.Feedback type="invalid">
                                                    {errors.orderNumber}
                                                  </Form.Control.Feedback>
                                                </Form.Group>
                                              </Col>
                                              <Col md={6}>
                                                <Form.Group className="mb-3">
                                                  <Form.Label>Número de Identificación</Form.Label>
                                                  <Form.Control
                                                    type="text"
                                                    name="identificationNumber"
                                                    value={values.identificationNumber}
                                                    onChange={handleChange}
                                                    onBlur={handleBlur}
                                                    isInvalid={touched.identificationNumber && errors.identificationNumber}
                                                  />
                                                  <Form.Control.Feedback type="invalid">
                                                    {errors.identificationNumber}
                                                  </Form.Control.Feedback>
                                                </Form.Group>
                                              </Col>
                                            </Row>
                                            
                                            <Row>
                                              <Col md={6}>
                                                <Form.Group className="mb-3">
                                                  <Form.Label>Tipo de Recepción</Form.Label>
                                                  <Form.Select
                                                    name="receptionType"
                                                    value={values.receptionType}
                                                    onChange={handleChange}
                                                    onBlur={handleBlur}
                                                    isInvalid={touched.receptionType && errors.receptionType}
                                                  >
                                                    <option value="Total">Total</option>
                                                    <option value="Parcial">Parcial</option>
                                                    <option value="Otro">Otro</option>
                                                  </Form.Select>
                                                  <Form.Control.Feedback type="invalid">
                                                    {errors.receptionType}
                                                  </Form.Control.Feedback>
                                                </Form.Group>
                                              </Col>
                                              <Col md={6}>
                                                <Form.Group className="mb-3">
                                                  <Form.Label>Estado</Form.Label>
                                                  <Form.Select
                                                    name="status"
                                                    value={values.status}
                                                    onChange={handleChange}
                                                    onBlur={handleBlur}
                                                    isInvalid={touched.status && errors.status}
                                                  >
                                                    <option value="En progreso">En progreso</option>
                                                    <option value="Finalizado">Finalizado</option>
                                                    <option value="En pausa">En pausa</option>
                                                    <option value="Cancelado">Cancelado</option>
                                                    <option value="En revisión">En revisión</option>
                                                  </Form.Select>
                                                  <Form.Control.Feedback type="invalid">
                                                    {errors.status}
                                                  </Form.Control.Feedback>
                                                </Form.Group>
                                              </Col>
                                            </Row>
                                          </Card.Body>
                                        </Card>
                                        
                                        <Card className="mb-4">
                                          <Card.Header>
                                            <h5>Ubicación Geográfica</h5>
                                          </Card.Header>
                                          <Card.Body>
                                            <p className="mb-3">
                                              <strong>Instrucciones:</strong> Haga clic en el mapa para seleccionar la ubicación principal del proyecto.
                                            </p>
                                            
                                            <div className="map-container mb-3" style={{ height: '400px', width: '100%' }}>
                                              <MapContainer 
                                                center={mapPosition}
                                                zoom={6}
                                                style={{ height: '100%', width: '100%' }}
                                              >
                                                <TileLayer
                                                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                                />
                                                <LocationMarker 
                                                  position={markerPosition}
                                                  setPosition={setMarkerPosition}
                                                />
                                                
                                                {/* Mostrar puntos de localización existentes */}
                                                {locationPoints.map((point, index) => (
                                                  <Marker
                                                    key={`point-${point._id || index}`}
                                                    position={[
                                                      point.coordinates.coordinates[0],
                                                      point.coordinates.coordinates[1]
                                                    ]}
                                                    icon={new L.Icon({
                                                      iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-gold.png',
                                                      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                                                      iconSize: [20, 33],
                                                      iconAnchor: [10, 33],
                                                      popupAnchor: [1, -34],
                                                      shadowSize: [33, 33]
                                                    })}
                                                  >
                                                    <Popup>
                                                      <div>
                                                        <h6>{point.name}</h6>
                                                        <p><small>Tipo: {point.type}</small></p>
                                                        {point.description && (
                                                          <p><small>{point.description}</small></p>
                                                        )}
                                                        <Button 
                                                          size="sm" 
                                                          variant="danger" 
                                                          onClick={() => {
                                                            setLocationPoints(
                                                              locationPoints.filter((p, i) => 
                                                                p._id ? p._id !== point._id : i !== index
                                                              )
                                                            );
                                                          }}
                                                        >
                                                          Eliminar
                                                        </Button>
                                                      </div>
                                                    </Popup>
                                                  </Marker>
                                                ))}
                                              </MapContainer>
                                            </div>
                                            
                                            {markerPosition && (
                                              <div className="selected-location mb-3">
                                                <h6>Coordenadas principales del proyecto:</h6>
                                                <p>
                                                  Latitud: {markerPosition[0].toFixed(6)}<br />
                                                  Longitud: {markerPosition[1].toFixed(6)}
                                                </p>
                                                <Button 
                                                  variant="outline-danger" 
                                                  size="sm"
                                                  onClick={() => setMarkerPosition(null)}
                                                >
                                                  <FaTimes className="me-1" /> Borrar ubicación
                                                </Button>
                                              </div>
                                            )}
                                            
                                            <Alert variant={markerPosition ? 'success' : 'warning'}>
                                              {markerPosition 
                                                ? 'Ubicación geográfica principal seleccionada correctamente.' 
                                                : 'Por favor, seleccione la ubicación geográfica principal del proyecto en el mapa.'}
                                            </Alert>
                                            
                                            <hr />
                                            
                                            <h5 className="mb-3">Puntos de Localización</h5>
                                            
                                            {locationPoints.length > 0 ? (
                                              <div className="mb-3">
                                                <h6>Puntos agregados ({locationPoints.length}):</h6>
                                                <ul className="list-group">
                                                  {locationPoints.map((point, index) => (
                                                    <li key={point._id || index} className="list-group-item d-flex justify-content-between align-items-center">
                                                      <div>
                                                        <strong>{point.name}</strong> - {point.type}
                                                        {point.description && <div><small>{point.description}</small></div>}
                                                      </div>
                                                      <Button 
                                                        variant="danger" 
                                                        size="sm"
                                                        onClick={() => {
                                                          setLocationPoints(
                                                            locationPoints.filter((p, i) => 
                                                              p._id ? p._id !== point._id : i !== index
                                                            )
                                                          );
                                                        }}
                                                      >
                                                        <FaTrash />
                                                      </Button>
                                                    </li>
                                                  ))}
                                                </ul>
                                              </div>
                                            ) : (
                                              <Alert variant="info">
                                                No hay puntos de localización agregados. Puede agregar puntos específicos como escuelas, balizas, fuentes de poder, etc.
                                              </Alert>
                                            )}
                                            
                                            <Button
                                              variant="success"
                                              onClick={() => setShowLocationPointForm(true)}
                                              className="mb-3"
                                            >
                                              <FaPlus className="me-1" /> Agregar Punto de Localización
                                            </Button>
                                            
                                            {/* Formulario para agregar puntos de localización */}
                                            {showLocationPointForm && (
                                              <Card className="mb-3">
                                                <Card.Header>
                                                  <h6>Nuevo Punto de Localización</h6>
                                                </Card.Header>
                                                <Card.Body>
                                                  <Form.Group className="mb-3">
                                                    <Form.Label>Nombre del Punto</Form.Label>
                                                    <Form.Control
                                                      type="text"
                                                      value={currentPoint.name}
                                                      onChange={(e) => setCurrentPoint({...currentPoint, name: e.target.value})}
                                                      placeholder="Ej: Escuela Los Pinos, Baliza Km 45, etc."
                                                    />
                                                  </Form.Group>
                                                  
                                                  <Form.Group className="mb-3">
                                                    <Form.Label>Tipo</Form.Label>
                                                    <Form.Select
                                                      value={currentPoint.type}
                                                      onChange={(e) => setCurrentPoint({...currentPoint, type: e.target.value})}
                                                    >
                                                      <option value="Escuela">Escuela</option>
                                                      <option value="Baliza">Baliza</option>
                                                      <option value="Fuente de poder">Fuente de poder</option>
                                                      <option value="Señalética">Señalética</option>
                                                      <option value="Letrero">Letrero</option>
                                                      <option value="Otro">Otro</option>
                                                    </Form.Select>
                                                  </Form.Group>
                                                  
                                                  <Form.Group className="mb-3">
                                                    <Form.Label>Descripción (opcional)</Form.Label>
                                                    <Form.Control
                                                      as="textarea"
                                                      rows={2}
                                                      value={currentPoint.description}
                                                      onChange={(e) => setCurrentPoint({...currentPoint, description: e.target.value})}
                                                      placeholder="Descripción breve del punto de localización"
                                                    />
                                                  </Form.Group>
                                                  
                                                  <Form.Group className="mb-3">
                                                    <Form.Label>Coordenadas</Form.Label>
                                                    <Row>
                                                      <Col md={6}>
                                                        <Form.Control
                                                          type="number"
                                                          placeholder="Latitud"
                                                          value={currentPoint.coordinates ? currentPoint.coordinates[0] : ''}
                                                          onChange={(e) => setCurrentPoint({
                                                            ...currentPoint, 
                                                            coordinates: [parseFloat(e.target.value), currentPoint.coordinates ? currentPoint.coordinates[1] : 0]
                                                          })}
                                                          step="0.000001"
                                                        />
                                                      </Col>
                                                      <Col md={6}>
                                                        <Form.Control
                                                          type="number"
                                                          placeholder="Longitud"
                                                          value={currentPoint.coordinates ? currentPoint.coordinates[1] : ''}
                                                          onChange={(e) => setCurrentPoint({
                                                            ...currentPoint, 
                                                            coordinates: [currentPoint.coordinates ? currentPoint.coordinates[0] : 0, parseFloat(e.target.value)]
                                                          })}
                                                          step="0.000001"
                                                        />
                                                      </Col>
                                                    </Row>
                                                    <Form.Text className="text-muted">
                                                      Puede ingresar manualmente las coordenadas o usar la ubicación principal del proyecto.
                                                    </Form.Text>
                                                  </Form.Group>
                                                  
                                                  <div className="d-flex justify-content-between">
                                                    <Button
                                                      variant="outline-secondary"
                                                      onClick={() => {
                                                        setShowLocationPointForm(false);
                                                        setCurrentPoint({
                                                          name: '',
                                                          type: 'Otro',
                                                          description: '',
                                                          coordinates: null
                                                        });
                                                      }}
                                                    >
                                                      Cancelar
                                                    </Button>
                                                    
                                                    <div>
                                                      <Button
                                                        variant="outline-primary"
                                                        className="me-2"
                                                        onClick={() => {
                                                          if (markerPosition) {
                                                            setCurrentPoint({
                                                              ...currentPoint,
                                                              coordinates: [markerPosition[0], markerPosition[1]]
                                                            });
                                                          }
                                                        }}
                                                        disabled={!markerPosition}
                                                      >
                                                        Usar Ubicación Principal
                                                      </Button>
                                                      
                                                      <Button
                                                        variant="primary"
                                                        onClick={() => {
                                                          // Validar campos obligatorios
                                                          if (!currentPoint.name) {
                                                            alert('El nombre del punto es obligatorio');
                                                            return;
                                                          }
                                                          if (!currentPoint.coordinates) {
                                                            alert('Las coordenadas son obligatorias');
                                                            return;
                                                          }
                                                          
                                                          // Agregar el punto a la lista
                                                          setLocationPoints([
                                                            ...locationPoints,
                                                            {
                                                              ...currentPoint,
                                                              coordinates: {
                                                                type: 'Point',
                                                                coordinates: currentPoint.coordinates
                                                              }
                                                            }
                                                          ]);
                                                          
                                                          // Reiniciar el formulario
                                                          setShowLocationPointForm(false);
                                                          setCurrentPoint({
                                                            name: '',
                                                            type: 'Otro',
                                                            description: '',
                                                            coordinates: null
                                                          });
                                                        }}
                                                      >
                                                        Guardar Punto
                                                      </Button>
                                                    </div>
                                                  </div>
                                                </Card.Body>
                                              </Card>
                                            )}
                                          </Card.Body>
                                        </Card>
                                        
                                        <Card className="mb-4">
                                          <Card.Header>
                                            <h5>Información del Cliente</h5>
                                          </Card.Header>
                                          <Card.Body>
                                            <Row>
                                              <Col md={6}>
                                                <Form.Group className="mb-3">
                                                  <Form.Label>Nombre Empresa Cliente</Form.Label>
                                                  <Form.Control
                                                    type="text"
                                                    name="clientCompanyName"
                                                    value={values.clientCompanyName}
                                                    onChange={handleChange}
                                                    onBlur={handleBlur}
                                                    isInvalid={touched.clientCompanyName && errors.clientCompanyName}
                                                  />
                                                  <Form.Control.Feedback type="invalid">
                                                    {errors.clientCompanyName}
                                                  </Form.Control.Feedback>
                                                </Form.Group>
                                              </Col>
                                              <Col md={6}>
                                                <Form.Group className="mb-3">
                                                  <Form.Label>Nombre Contacto Cliente</Form.Label>
                                                  <Form.Control
                                                    type="text"
                                                    name="clientContactName"
                                                    value={values.clientContactName}
                                                    onChange={handleChange}
                                                    onBlur={handleBlur}
                                                    isInvalid={touched.clientContactName && errors.clientContactName}
                                                  />
                                                  <Form.Control.Feedback type="invalid">
                                                    {errors.clientContactName}
                                                  </Form.Control.Feedback>
                                                </Form.Group>
                                              </Col>
                                            </Row>
                                            
                                            <Form.Group className="mb-3">
                                              <Form.Label>Usuarios Cliente</Form.Label>
                                              <Form.Select
                                                multiple
                                                name="clients"
                                                value={values.clients}
                                                onChange={(e) => {
                                                  const options = e.target.options;
                                                  const selectedValues = [];
                                                  for (let i = 0; i < options.length; i++) {
                                                    if (options[i].selected) {
                                                      selectedValues.push(options[i].value);
                                                    }
                                                  }
                                                  setFieldValue('clients', selectedValues);
                                                }}
                                                onBlur={handleBlur}
                                                isInvalid={touched.clients && errors.clients}
                                                style={{ height: '150px' }}
                                              >
                                                {users.clients.map(client => (
                                                  <option key={client._id} value={client._id}>
                                                    {client.firstName} {client.lastName} ({client.email})
                                                  </option>
                                                ))}
                                              </Form.Select>
                                              <Form.Text className="text-muted">
                                                Mantenga presionada la tecla Ctrl (o Cmd en Mac) para seleccionar múltiples usuarios.
                                              </Form.Text>
                                              <Form.Control.Feedback type="invalid">
                                                {errors.clients}
                                              </Form.Control.Feedback>
                                            </Form.Group>
                                          </Card.Body>
                                        </Card>
                                        
                                        <Card className="mb-4">
                                          <Card.Header>
                                            <h5>Información Interna</h5>
                                          </Card.Header>
                                          <Card.Body>
                                            <Row>
                                              <Col md={6}>
                                                <Form.Group className="mb-3">
                                                  <Form.Label>Responsable Empresa</Form.Label>
                                                  <Form.Control
                                                    type="text"
                                                    name="companyResponsible"
                                                    value={values.companyResponsible}
                                                    onChange={handleChange}
                                                    onBlur={handleBlur}
                                                    isInvalid={touched.companyResponsible && errors.companyResponsible}
                                                  />
                                                  <Form.Control.Feedback type="invalid">
                                                    {errors.companyResponsible}
                                                  </Form.Control.Feedback>
                                                </Form.Group>
                                              </Col>
                                              <Col md={6}>
                                                <Form.Group className="mb-3">
                                                  <Form.Label>Centro de Costos</Form.Label>
                                                  <Form.Control
                                                    type="text"
                                                    name="costCenter"
                                                    value={values.costCenter}
                                                    onChange={handleChange}
                                                    onBlur={handleBlur}
                                                    isInvalid={touched.costCenter && errors.costCenter}
                                                  />
                                                  <Form.Control.Feedback type="invalid">
                                                    {errors.costCenter}
                                                  </Form.Control.Feedback>
                                                </Form.Group>
                                              </Col>
                                            </Row>
                                            
                                            <Form.Group className="mb-3">
                                              <Form.Label>Técnico Asignado</Form.Label>
                                              <Form.Select
                                                name="technician"
                                                value={values.technician}
                                                onChange={handleChange}
                                                onBlur={handleBlur}
                                                isInvalid={touched.technician && errors.technician}
                                              >
                                                <option value="">Seleccionar técnico</option>
                                                {users.technicians.map(tech => (
                                                  <option key={tech._id} value={tech._id}>
                                                    {tech.firstName} {tech.lastName}
                                                  </option>
                                                ))}
                                              </Form.Select>
                                              <Form.Control.Feedback type="invalid">
                                                {errors.technician}
                                              </Form.Control.Feedback>
                                            </Form.Group>
                                            
                                            <Row>
                                              <Col md={6}>
                                                <Form.Group className="mb-3">
                                                  <Form.Label>Fecha de Inicio</Form.Label>
                                                  <Form.Control
                                                    type="date"
                                                    name="startDate"
                                                    value={values.startDate}
                                                    onChange={handleChange}
                                                    onBlur={handleBlur}
                                                    isInvalid={touched.startDate && errors.startDate}
                                                  />
                                                  <Form.Control.Feedback type="invalid">
                                                    {errors.startDate}
                                                  </Form.Control.Feedback>
                                                </Form.Group>
                                              </Col>
                                              <Col md={6}>
                                                <Form.Group className="mb-3">
                                                  <Form.Label>Fecha de Término (opcional)</Form.Label>
                                                  <Form.Control
                                                    type="date"
                                                    name="endDate"
                                                    value={values.endDate}
                                                    onChange={handleChange}
                                                    onBlur={handleBlur}
                                                    isInvalid={touched.endDate && errors.endDate}
                                                  />
                                                  <Form.Control.Feedback type="invalid">
                                                    {errors.endDate}
                                                  </Form.Control.Feedback>
                                                </Form.Group>
                                              </Col>
                                            </Row>
                                          </Card.Body>
                                        </Card>
                                        
                                        <div className="d-grid gap-2 mb-5">
                                          <Button 
                                            variant="primary" 
                                            type="submit" 
                                            size="lg"
                                            disabled={submitting}
                                          >
                                            {submitting ? (
                                              <>
                                                <Spinner animation="border" size="sm" className="me-2" />
                                                Guardando...
                                              </>
                                            ) : (
                                              <>
                                                <FaSave className="me-2" /> 
                                                {isEditMode ? 'Actualizar Proyecto' : 'Crear Proyecto'}
                                              </>
                                            )}
                                          </Button>
                                        </div>
                                      </Form>
                                    )}
                                  </Formik>
                                </div>
                              </AdminLayout>
                            );
                          };
                          
                          export default ProjectForm;}                          