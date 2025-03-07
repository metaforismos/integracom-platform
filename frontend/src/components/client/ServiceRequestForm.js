import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Form, Button, Card, Alert, Spinner, Row, Col } from 'react-bootstrap';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { FaMapMarkerAlt, FaUpload, FaCamera, FaSave, FaTrash } from 'react-icons/fa';
import { createServiceRequest } from '../../services/serviceRequestService';
import { getProjectById } from '../../services/projectService';
import ClientLayout from '../layouts/ClientLayout';

// Esquema de validación
const validationSchema = Yup.object({
  title: Yup.string()
    .required('El título es obligatorio')
    .min(5, 'El título debe tener al menos 5 caracteres')
    .max(100, 'El título no puede tener más de 100 caracteres'),
  description: Yup.string()
    .required('La descripción es obligatoria')
    .min(10, 'La descripción debe tener al menos 10 caracteres'),
  priority: Yup.string()
    .required('La prioridad es obligatoria'),
  requestType: Yup.string()
    .required('El tipo de solicitud es obligatorio')
});

const ServiceRequestForm = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [project, setProject] = useState(null);
  const [attachments, setAttachments] = useState([]);
  const [location, setLocation] = useState(null);
  const [locationError, setLocationError] = useState('');
  const [locationLoading, setLocationLoading] = useState(false);

  // Obtener detalles del proyecto
  useEffect(() => {
    const fetchProject = async () => {
      try {
        setLoading(true);
        setError('');
        
        const response = await getProjectById(projectId);
        setProject(response.data);
        
        setLoading(false);
      } catch (err) {
        setError('Error al cargar los datos del proyecto. Por favor intente nuevamente.');
        setLoading(false);
      }
    };
    
    fetchProject();
  }, [projectId]);

  // Función para obtener ubicación
  const getLocation = () => {
    if (navigator.geolocation) {
      setLocationLoading(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            type: 'Point',
            coordinates: [position.coords.longitude, position.coords.latitude],
            address: 'Ubicación actual'
          });
          setLocationLoading(false);
          setLocationError('');
        },
        (error) => {
          setLocationError('No se pudo obtener la ubicación. Por favor habilite el servicio de GPS.');
          setLocationLoading(false);
        },
        { enableHighAccuracy: true }
      );
    } else {
      setLocationError('La geolocalización no está soportada por este dispositivo.');
    }
  };

  // Manejar cambio de archivos adjuntos
  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setAttachments([...attachments, ...files]);
  };

  // Manejar envío del formulario
  const handleSubmit = async (values, { resetForm }) => {
    try {
      setSubmitting(true);
      setError('');
      setSuccess('');
      
      // Crear FormData para subir archivos
      const formData = new FormData();
      
      // Agregar datos básicos
      formData.append('project', projectId);
      formData.append('title', values.title);
      formData.append('description', values.description);
      formData.append('priority', values.priority);
      formData.append('requestType', values.requestType);
      
      // Agregar ubicación si existe
      if (location) {
        formData.append('location[type]', location.type);
        formData.append('location[coordinates][0]', location.coordinates[0]);
        formData.append('location[coordinates][1]', location.coordinates[1]);
        formData.append('location[address]', location.address);
      }
      
      // Agregar archivos adjuntos
      attachments.forEach((file) => {
        formData.append('files', file);
      });
      
      // Crear la solicitud
      const response = await createServiceRequest(formData);
      
      setSuccess('Solicitud creada exitosamente');
      resetForm();
      setAttachments([]);
      
      // Redireccionar después de 2 segundos
      setTimeout(() => {
        navigate(`/client/service-requests/${response.data.id}`);
      }, 2000);
      
    } catch (err) {
      setError('Error al crear la solicitud. Por favor intente nuevamente.');
    } finally {
      setSubmitting(false);
    }
  };

  // Si está cargando, mostrar spinner
  if (loading) {
    return (
      <ClientLayout>
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="mt-2">Cargando datos del proyecto...</p>
        </div>
      </ClientLayout>
    );
  }

  return (
    <ClientLayout>
      <div className="service-request-form-container">
        <h1 className="mb-4">Nueva Solicitud de Servicio</h1>
        
        {error && <Alert variant="danger">{error}</Alert>}
        {success && <Alert variant="success">{success}</Alert>}
        
        <Card className="mb-4">
          <Card.Header>
            <h5>Información del Proyecto</h5>
          </Card.Header>
          <Card.Body>
            <Row>
              <Col md={6}>
                <p><strong>Nombre:</strong> {project?.name}</p>
                <p><strong>Ubicación:</strong> {project?.location}</p>
              </Col>
              <Col md={6}>
                <p><strong>Estado:</strong> {project?.status}</p>
                <p><strong>Responsable:</strong> {project?.companyResponsible || 'No asignado'}</p>
              </Col>
            </Row>
          </Card.Body>
        </Card>
        
        <Formik
          initialValues={{
            title: '',
            description: '',
            priority: 'Media',
            requestType: 'Mantenimiento'
          }}
          validationSchema={validationSchema}
          onSubmit={handleSubmit}
        >
          {({
            values,
            errors,
            touched,
            handleChange,
            handleBlur,
            handleSubmit,
            isSubmitting,
          }) => (
            <Form onSubmit={handleSubmit}>
              <Card className="mb-4">
                <Card.Header>
                  <h5>Detalles de la Solicitud</h5>
                </Card.Header>
                <Card.Body>
                  <Form.Group className="mb-3">
                    <Form.Label>Título</Form.Label>
                    <Form.Control
                      type="text"
                      name="title"
                      value={values.title}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      isInvalid={touched.title && errors.title}
                      placeholder="Título breve y descriptivo"
                    />
                    <Form.Control.Feedback type="invalid">
                      {errors.title}
                    </Form.Control.Feedback>
                  </Form.Group>
                  
                  <Form.Group className="mb-3">
                    <Form.Label>Descripción</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={4}
                      name="description"
                      value={values.description}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      isInvalid={touched.description && errors.description}
                      placeholder="Describa su solicitud con el mayor detalle posible"
                    />
                    <Form.Control.Feedback type="invalid">
                      {errors.description}
                    </Form.Control.Feedback>
                  </Form.Group>
                  
                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Prioridad</Form.Label>
                        <Form.Select
                          name="priority"
                          value={values.priority}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          isInvalid={touched.priority && errors.priority}
                        >
                          <option value="Alta">Alta</option>
                          <option value="Media">Media</option>
                          <option value="Baja">Baja</option>
                        </Form.Select>
                        <Form.Control.Feedback type="invalid">
                          {errors.priority}
                        </Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Tipo de Solicitud</Form.Label>
                        <Form.Select
                          name="requestType"
                          value={values.requestType}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          isInvalid={touched.requestType && errors.requestType}
                        >
                          <option value="Entrega final">Entrega final</option>
                          <option value="Entrega provisoria">Entrega provisoria</option>
                          <option value="Reparación en Garantía">Reparación en Garantía</option>
                          <option value="Reparación fuera de Garantía">Reparación fuera de Garantía</option>
                          <option value="Otro">Otro</option>
                        </Form.Select>
                        <Form.Control.Feedback type="invalid">
                          {errors.requestType}
                        </Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                  </Row>
                  
                  <div className="mb-3">
                    <p><strong>Ubicación:</strong></p>
                    {locationLoading ? (
                      <div className="d-flex align-items-center">
                        <Spinner animation="border" size="sm" className="me-2" />
                        <span>Obteniendo ubicación...</span>
                      </div>
                    ) : location ? (
                      <div className="location-info">
                        <p className="mb-1">
                          <FaMapMarkerAlt className="me-1" />
                          Lat: {location.coordinates[1]}, Long: {location.coordinates[0]}
                        </p>
                        <Button variant="outline-secondary" size="sm" onClick={getLocation}>
                          Actualizar ubicación
                        </Button>
                      </div>
                    ) : (
                      <div>
                        {locationError && <Alert variant="warning">{locationError}</Alert>}
                        <Button variant="outline-secondary" onClick={getLocation}>
                          <FaMapMarkerAlt className="me-1" />
                          Incluir mi ubicación actual
                        </Button>
                      </div>
                    )}
                    <Form.Text className="text-muted">
                      Opcional: Incluya su ubicación para ayudar al técnico a localizar el problema.
                    </Form.Text>
                  </div>
                  
                  <div className="mb-3">
                    <Form.Label>Adjuntar archivos</Form.Label>
                    <div className="file-upload-container">
                      <input
                        type="file"
                        multiple
                        id="attachments"
                        className="d-none"
                        onChange={handleFileChange}
                      />
                      <div className="d-grid gap-2 d-md-flex">
                        <label htmlFor="attachments" className="btn btn-outline-primary">
                          <FaUpload className="me-1" /> Subir archivos
                        </label>
                        <Button 
                          variant="outline-secondary"
                          onClick={() => {
                            // Abrir cámara si está disponible
                            const input = document.createElement('input');
                            input.type = 'file';
                            input.accept = 'image/*';
                            input.capture = 'environment';
                            input.onchange = (e) => handleFileChange(e);
                            input.click();
                          }}
                        >
                          <FaCamera className="me-1" /> Tomar foto
                        </Button>
                      </div>
                    </div>
                    <Form.Text className="text-muted">
                      Puede adjuntar fotos, documentos o cualquier archivo relevante (máx. 50MB).
                    </Form.Text>
                    
                    {attachments.length > 0 && (
                      <div className="mt-2">
                        <p><strong>Archivos seleccionados:</strong></p>
                        <ul className="list-group">
                          {attachments.map((file, index) => (
                            <li key={index} className="list-group-item d-flex justify-content-between align-items-center">
                              {file.name}
                              <Button 
                                variant="danger" 
                                size="sm"
                                onClick={() => {
                                  const newAttachments = [...attachments];
                                  newAttachments.splice(index, 1);
                                  setAttachments(newAttachments);
                                }}
                              >
                                <FaTrash />
                              </Button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
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
                      Enviando...
                    </>
                  ) : (
                    <>
                      <FaSave className="me-2" /> Enviar Solicitud
                    </>
                  )}
                </Button>
              </div>
            </Form>
          )}
        </Formik>
      </div>
    </ClientLayout>
  );
};

export default ServiceRequestForm;