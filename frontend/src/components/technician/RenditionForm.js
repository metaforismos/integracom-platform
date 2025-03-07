import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Form, Button, Card, Alert, Spinner, Row, Col } from 'react-bootstrap';
import { Formik, Field, ErrorMessage, FieldArray } from 'formik';
import * as Yup from 'yup';
import { FaPlus, FaTrash, FaCamera, FaUpload, FaSave, FaMapMarkerAlt } from 'react-icons/fa';
import { createRendition } from '../../services/renditionService';
import { getServiceRequestById } from '../../services/serviceRequestService';
import { getExpenseCategories } from '../../services/expenseCategoryService';
import TechnicianLayout from '../layouts/TechnicianLayout';

// Esquema de validación
const validationSchema = Yup.object({
  description: Yup.string()
    .required('La descripción es obligatoria'),
  workPerformed: Yup.string()
    .required('Debe describir el trabajo realizado'),
  expenses: Yup.array().of(
    Yup.object({
      category: Yup.string().required('La categoría es obligatoria'),
      amount: Yup.number()
        .required('El monto es obligatorio')
        .positive('El monto debe ser positivo'),
      description: Yup.string().required('La descripción es obligatoria')
    })
  )
});

const RenditionForm = () => {
  const { requestId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [serviceRequest, setServiceRequest] = useState(null);
  const [expenseCategories, setExpenseCategories] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [expenseAttachments, setExpenseAttachments] = useState({});
  const [location, setLocation] = useState(null);
  const [locationError, setLocationError] = useState('');
  const [locationLoading, setLocationLoading] = useState(false);

  // Obtener datos iniciales
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError('');
        
        // Obtener detalles de la solicitud de servicio
        const requestResponse = await getServiceRequestById(requestId);
        setServiceRequest(requestResponse.data);
        
        // Obtener categorías de gastos
        const categoriesResponse = await getExpenseCategories();
        setExpenseCategories(categoriesResponse.data);
        
        // Obtener ubicación actual
        getLocation();
        
        setLoading(false);
      } catch (err) {
        setError('Error al cargar los datos. Por favor intente nuevamente.');
        setLoading(false);
      }
    };
    
    fetchData();
  }, [requestId]);

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

  // Manejar cambio de archivos adjuntos para gastos
  const handleExpenseFileChange = (e, index) => {
    const file = e.target.files[0];
    if (file) {
      setExpenseAttachments({
        ...expenseAttachments,
        [index]: file
      });
    }
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
      formData.append('serviceRequest', requestId);
      formData.append('description', values.description);
      formData.append('workDetails[workPerformed]', values.workPerformed);
      
      if (values.startTime) {
        formData.append('startTime', values.startTime);
      }
      
      if (values.endTime) {
        formData.append('endTime', values.endTime);
      }
      
      // Agregar ubicación
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
      
      // Crear la rendición
      const response = await createRendition(formData);
      
      // Para cada gasto, crear una solicitud separada
      if (values.expenses && values.expenses.length > 0) {
        for (let i = 0; i < values.expenses.length; i++) {
          const expense = values.expenses[i];
          const expenseData = new FormData();
          
          expenseData.append('category', expense.category);
          expenseData.append('amount', expense.amount);
          expenseData.append('description', expense.description);
          
          // Agregar comprobante de pago si existe
          if (expenseAttachments[i]) {
            expenseData.append('paymentProof', expenseAttachments[i]);
          }
          
          // Agregar gasto a la rendición
          await addExpenseToRendition(response.data.id, expenseData);
        }
      }
      
      setSuccess('Rendición creada exitosamente');
      resetForm();
      setAttachments([]);
      setExpenseAttachments({});
      
      // Redireccionar después de 2 segundos
      setTimeout(() => {
        navigate(`/tech/renditions/${response.data.id}`);
      }, 2000);
      
    } catch (err) {
      setError('Error al crear la rendición. Por favor intente nuevamente.');
    } finally {
      setSubmitting(false);
    }
  };

  // Si está cargando, mostrar spinner
  if (loading) {
    return (
      <TechnicianLayout>
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="mt-2">Cargando datos...</p>
        </div>
      </TechnicianLayout>
    );
  }

  return (
    <TechnicianLayout>
      <div className="rendition-form-container">
        <h1 className="mb-4">Nueva Rendición</h1>
        
        {error && <Alert variant="danger">{error}</Alert>}
        {success && <Alert variant="success">{success}</Alert>}
        
        <Card className="mb-4">
          <Card.Header>
            <h5>Información de la Solicitud</h5>
          </Card.Header>
          <Card.Body>
            <Row>
              <Col xs={12} md={6}>
                <p><strong>Número:</strong> {serviceRequest?.requestNumber}</p>
                <p><strong>Título:</strong> {serviceRequest?.title}</p>
                <p><strong>Proyecto:</strong> {serviceRequest?.project?.name}</p>
              </Col>
              <Col xs={12} md={6}>
                <p><strong>Estado:</strong> {serviceRequest?.status}</p>
                <p><strong>Prioridad:</strong> {serviceRequest?.priority}</p>
                <p><strong>Tipo:</strong> {serviceRequest?.requestType}</p>
              </Col>
            </Row>
            <hr />
            <p><strong>Descripción:</strong> {serviceRequest?.description}</p>
          </Card.Body>
        </Card>
        
        <Formik
          initialValues={{
            description: '',
            workPerformed: '',
            startTime: '',
            endTime: '',
            expenses: [{ category: '', amount: '', description: '' }]
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
                  <h5>Detalles de la Rendición</h5>
                </Card.Header>
                <Card.Body>
                  <Form.Group className="mb-3">
                    <Form.Label>Descripción de la rendición</Form.Label>
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
                  
                  <Form.Group className="mb-3">
                    <Form.Label>Trabajo realizado</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={3}
                      name="workPerformed"
                      value={values.workPerformed}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      isInvalid={touched.workPerformed && errors.workPerformed}
                    />
                    <Form.Control.Feedback type="invalid">
                      {errors.workPerformed}
                    </Form.Control.Feedback>
                  </Form.Group>
                  
                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Hora de inicio</Form.Label>
                        <Form.Control
                          type="datetime-local"
                          name="startTime"
                          value={values.startTime}
                          onChange={handleChange}
                          onBlur={handleBlur}
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Hora de finalización</Form.Label>
                        <Form.Control
                          type="datetime-local"
                          name="endTime"
                          value={values.endTime}
                          onChange={handleChange}
                          onBlur={handleBlur}
                        />
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
                        <Button variant="primary" onClick={getLocation}>
                          <FaMapMarkerAlt className="me-1" />
                          Obtener ubicación
                        </Button>
                      </div>
                    )}
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
              
              <Card className="mb-4">
                <Card.Header className="d-flex justify-content-between align-items-center">
                  <h5>Gastos</h5>
                </Card.Header>
                <Card.Body>
                  <FieldArray name="expenses">
                    {({ push, remove }) => (
                      <>
                        {values.expenses.map((expense, index) => (
                          <div key={index} className="expense-item mb-4 pb-3 border-bottom">
                            <div className="d-flex justify-content-between align-items-center mb-2">
                              <h6>Gasto #{index + 1}</h6>
                              {index > 0 && (
                                <Button 
                                  variant="danger" 
                                  size="sm"
                                  onClick={() => {
                                    remove(index);
                                    // Eliminar archivo adjunto si existe
                                    const newExpenseAttachments = { ...expenseAttachments };
                                    delete newExpenseAttachments[index];
                                    setExpenseAttachments(newExpenseAttachments);
                                  }}
                                >
                                  <FaTrash className="me-1" /> Eliminar
                                </Button>
                              )}
                            </div>
                            
                            <Row>
                              <Col md={6}>
                                <Form.Group className="mb-3">
                                  <Form.Label>Categoría</Form.Label>
                                  <Form.Select
                                    name={`expenses[${index}].category`}
                                    value={expense.category}
                                    onChange={handleChange}
                                    onBlur={handleBlur}
                                    isInvalid={
                                      touched.expenses && 
                                      touched.expenses[index] && 
                                      touched.expenses[index].category && 
                                      errors.expenses && 
                                      errors.expenses[index] && 
                                      errors.expenses[index].category
                                    }
                                  >
                                    <option value="">Seleccione una categoría</option>
                                    <option value="Gastos de combustible/petróleo">Gastos de combustible/petróleo</option>
                                    <option value="Alimentación">Alimentación</option>
                                    <option value="Materiales">Materiales</option>
                                    <option value="Hospedaje">Hospedaje</option>
                                    <option value="Transporte">Transporte</option>
                                    <option value="Herramientas">Herramientas</option>
                                    <option value="Otros">Otros</option>
                                  </Form.Select>
                                  {touched.expenses && 
                                   touched.expenses[index] && 
                                   touched.expenses[index].category && 
                                   errors.expenses && 
                                   errors.expenses[index] && 
                                   errors.expenses[index].category && (
                                    <div className="invalid-feedback d-block">
                                      {errors.expenses[index].category}
                                    </div>
                                  )}
                                </Form.Group>
                              </Col>
                              <Col md={6}>
                                <Form.Group className="mb-3">
                                  <Form.Label>Monto</Form.Label>
                                  <Form.Control
                                    type="number"
                                    name={`expenses[${index}].amount`}
                                    value={expense.amount}
                                    onChange={handleChange}
                                    onBlur={handleBlur}
                                    isInvalid={
                                      touched.expenses && 
                                      touched.expenses[index] && 
                                      touched.expenses[index].amount && 
                                      errors.expenses && 
                                      errors.expenses[index] && 
                                      errors.expenses[index].amount
                                    }
                                  />
                                  {touched.expenses && 
                                   touched.expenses[index] && 
                                   touched.expenses[index].amount && 
                                   errors.expenses && 
                                   errors.expenses[index] && 
                                   errors.expenses[index].amount && (
                                    <div className="invalid-feedback d-block">
                                      {errors.expenses[index].amount}
                                    </div>
                                  )}
                                </Form.Group>
                              </Col>
                            </Row>
                            
                            <Form.Group className="mb-3">
                              <Form.Label>Descripción</Form.Label>
                              <Form.Control
                                type="text"
                                name={`expenses[${index}].description`}
                                value={expense.description}
                                onChange={handleChange}
                                onBlur={handleBlur}
                                isInvalid={
                                  touched.expenses && 
                                  touched.expenses[index] && 
                                  touched.expenses[index].description && 
                                  errors.expenses && 
                                  errors.expenses[index] && 
                                  errors.expenses[index].description
                                }
                              />
                              {touched.expenses && 
                               touched.expenses[index] && 
                               touched.expenses[index].description && 
                               errors.expenses && 
                               errors.expenses[index] && 
                               errors.expenses[index].description && (
                                <div className="invalid-feedback d-block">
                                  {errors.expenses[index].description}
                                </div>
                              )}
                            </Form.Group>
                            
                            <Form.Group className="mb-3">
                              <Form.Label>Comprobante de pago</Form.Label>
                              <div className="d-grid gap-2 d-md-flex">
                                <input
                                  type="file"
                                  id={`expense-attachment-${index}`}
                                  className="d-none"
                                  onChange={(e) => handleExpenseFileChange(e, index)}
                                />
                                <label 
                                  htmlFor={`expense-attachment-${index}`} 
                                  className="btn btn-outline-secondary"
                                >
                                  <FaUpload className="me-1" /> Subir comprobante
                                </label>
                                <Button 
                                  variant="outline-secondary"
                                  onClick={() => {
                                    // Abrir cámara para comprobante
                                    const input = document.createElement('input');
                                    input.type = 'file';
                                    input.accept = 'image/*';
                                    input.capture = 'environment';
                                    input.onchange = (e) => handleExpenseFileChange(e, index);
                                    input.click();
                                  }}
                                >
                                  <FaCamera className="me-1" /> Tomar foto
                                </Button>
                              </div>
                              
                              {expenseAttachments[index] && (
                                <div className="mt-2">
                                  <p className="mb-1"><strong>Comprobante:</strong> {expenseAttachments[index].name}</p>
                                  <Button 
                                    variant="danger" 
                                    size="sm"
                                    onClick={() => {
                                      const newExpenseAttachments = { ...expenseAttachments };
                                      delete newExpenseAttachments[index];
                                      setExpenseAttachments(newExpenseAttachments);
                                    }}
                                  >
                                    <FaTrash className="me-1" /> Eliminar
                                  </Button>
                                </div>
                              )}
                            </Form.Group>
                          </div>
                        ))}
                        
                        <Button
                          variant="success"
                          onClick={() => push({ category: '', amount: '', description: '' })}
                        >
                          <FaPlus className="me-1" /> Agregar otro gasto
                        </Button>
                      </>
                    )}
                  </FieldArray>
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
                      <FaSave className="me-2" /> Guardar Rendición
                    </>
                  )}
                </Button>
              </div>
            </Form>
          )}
        </Formik>
      </div>
    </TechnicianLayout>
  );
};

export default RenditionForm;