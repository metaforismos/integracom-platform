const ServiceRequest = require('../models/serviceRequest.model');
const Project = require('../models/project.model');
const User = require('../models/user.model');
const Notification = require('../models/notification.model');
const { validationResult } = require('express-validator');
const mongoose = require('mongoose');

// @desc    Crear una nueva solicitud de servicio
// @route   POST /api/service-requests
// @access  Private
exports.createServiceRequest = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const {
      project,
      title,
      description,
      priority,
      requestType,
      location,
    } = req.body;

    // Verificar si el proyecto existe
    const projectExists = await Project.findById(project);
    if (!projectExists) {
      return res.status(404).json({
        success: false,
        message: 'Proyecto no encontrado',
      });
    }

    // Verificar acceso al proyecto
    if (!projectExists.hasAccess(req.user._id, req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'No tiene permiso para crear solicitudes en este proyecto',
      });
    }

    // Crear la solicitud
    const serviceRequest = new ServiceRequest({
      project,
      title,
      description,
      priority: priority || 'Media',
      requestType: requestType || 'Mantenimiento',
      location: location || {},
      requestedBy: req.user._id,
      status: 'Solicitada',
    });

    // Si hay archivos adjuntos desde multer, añadirlos
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        serviceRequest.attachments.push({
          url: `/uploads/${file.filename}`,
          name: file.originalname,
          type: file.mimetype,
          uploadedBy: req.user._id,
        });
      }
    }

    // Generar número de solicitud
    serviceRequest.requestNumber = await ServiceRequest.generateRequestNumber();

    await serviceRequest.save();

    // Notificar a administradores
    await notifyNewServiceRequest(serviceRequest, projectExists);

    res.status(201).json({
      success: true,
      data: serviceRequest,
    });
  } catch (error) {
    console.error('Error al crear solicitud de servicio:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear la solicitud de servicio',
      error: error.message,
    });
  }
};

// @desc    Obtener todas las solicitudes de servicio
// @route   GET /api/service-requests
// @access  Private
exports.getServiceRequests = async (req, res) => {
  try {
    let query = {};

    // Filtrar por rol del usuario
    if (req.user.role === 'client') {
      // Clientes solo ven solicitudes creadas por ellos
      query.requestedBy = req.user._id;
    } else if (req.user.role === 'technician') {
      // Técnicos solo ven solicitudes asignadas a ellos
      query.assignedTo = req.user._id;
    }

    // Filtros adicionales
    if (req.query.project) {
      query.project = req.query.project;
    }

    if (req.query.status) {
      query.status = req.query.status;
    }

    if (req.query.priority) {
      query.priority = req.query.priority;
    }

    if (req.query.search) {
      query.$or = [
        { title: { $regex: req.query.search, $options: 'i' } },
        { description: { $regex: req.query.search, $options: 'i' } },
        { requestNumber: { $regex: req.query.search, $options: 'i' } },
      ];
    }

    // Paginación
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;

    // Ejecutar consulta
    const serviceRequests = await ServiceRequest.find(query)
      .populate('project', 'name location')
      .populate('requestedBy', 'firstName lastName email')
      .populate('assignedTo', 'firstName lastName email')
      .skip(startIndex)
      .limit(limit)
      .sort({ createdAt: -1 });

    // Obtener total de documentos para paginación
    const total = await ServiceRequest.countDocuments(query);

    res.status(200).json({
      success: true,
      count: serviceRequests.length,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
      },
      data: serviceRequests,
    });
  } catch (error) {
    console.error('Error al obtener solicitudes:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener las solicitudes de servicio',
      error: error.message,
    });
  }
};

// @desc    Obtener una solicitud de servicio por ID
// @route   GET /api/service-requests/:id
// @access  Private
exports.getServiceRequestById = async (req, res) => {
  try {
    const serviceRequest = await ServiceRequest.findById(req.params.id)
      .populate('project', 'name location')
      .populate('requestedBy', 'firstName lastName email')
      .populate('assignedTo', 'firstName lastName email')
      .populate('comments.createdBy', 'firstName lastName email')
      .populate('history.changedBy', 'firstName lastName email');

    if (!serviceRequest) {
      return res.status(404).json({
        success: false,
        message: 'Solicitud de servicio no encontrada',
      });
    }

    // Verificar acceso
    const project = await Project.findById(serviceRequest.project);
    
    if (!project || !project.hasAccess(req.user._id, req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'No tiene permiso para ver esta solicitud',
      });
    }

    res.status(200).json({
      success: true,
      data: serviceRequest,
    });
  } catch (error) {
    console.error('Error al obtener solicitud:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener la solicitud de servicio',
      error: error.message,
    });
  }
};

// @desc    Actualizar una solicitud de servicio
// @route   PUT /api/service-requests/:id
// @access  Private/Admin
exports.updateServiceRequest = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const {
      title,
      description,
      priority,
      requestType,
      assignedTo,
      scheduledDate,
    } = req.body;

    let serviceRequest = await ServiceRequest.findById(req.params.id);

    if (!serviceRequest) {
      return res.status(404).json({
        success: false,
        message: 'Solicitud de servicio no encontrada',
      });
    }

    // Verificar acceso (solo administradores pueden actualizar)
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'No tiene permiso para actualizar esta solicitud',
      });
    }

    // Actualizar campos
    if (title) serviceRequest.title = title;
    if (description) serviceRequest.description = description;
    if (priority) serviceRequest.priority = priority;
    if (requestType) serviceRequest.requestType = requestType;
    if (assignedTo) serviceRequest.assignedTo = assignedTo;
    if (scheduledDate) serviceRequest.scheduledDate = scheduledDate;

    // Si hay cambio de asignación, registrar en historial
    if (assignedTo && (!serviceRequest.assignedTo || assignedTo !== serviceRequest.assignedTo.toString())) {
      serviceRequest._lastModifiedBy = req.user._id;
      serviceRequest._statusChangeNotes = 'Técnico asignado a la solicitud';
      
      // Notificar al técnico asignado
      const assignedUser = await User.findById(assignedTo);
      if (assignedUser) {
        await Notification.createNotification({
          recipient: assignedUser._id,
          title: 'Nueva asignación de solicitud',
          message: `Se le ha asignado la solicitud ${serviceRequest.requestNumber}: ${serviceRequest.title}`,
          type: 'info',
          relatedTo: {
            model: 'ServiceRequest',
            id: serviceRequest._id,
          },
          link: `/service-requests/${serviceRequest._id}`,
        });
      }
    }

    await serviceRequest.save();

    res.status(200).json({
      success: true,
      data: serviceRequest,
    });
  } catch (error) {
    console.error('Error al actualizar solicitud:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar la solicitud de servicio',
      error: error.message,
    });
  }
};

// @desc    Eliminar una solicitud de servicio
// @route   DELETE /api/service-requests/:id
// @access  Private/Admin
exports.deleteServiceRequest = async (req, res) => {
  try {
    const serviceRequest = await ServiceRequest.findById(req.params.id);

    if (!serviceRequest) {
      return res.status(404).json({
        success: false,
        message: 'Solicitud de servicio no encontrada',
      });
    }

    // Solo administradores pueden eliminar
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'No tiene permiso para eliminar esta solicitud',
      });
    }

    await serviceRequest.remove();

    res.status(200).json({
      success: true,
      data: {},
      message: 'Solicitud de servicio eliminada correctamente',
    });
  } catch (error) {
    console.error('Error al eliminar solicitud:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar la solicitud de servicio',
      error: error.message,
    });
  }
};

// @desc    Cambiar el estado de una solicitud
// @route   PUT /api/service-requests/:id/status
// @access  Private/Admin,Technician
exports.changeStatus = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { status, notes } = req.body;

    const serviceRequest = await ServiceRequest.findById(req.params.id);

    if (!serviceRequest) {
      return res.status(404).json({
        success: false,
        message: 'Solicitud de servicio no encontrada',
      });
    }

    // Verificar permisos según rol
    if (req.user.role === 'technician' && (!serviceRequest.assignedTo || serviceRequest.assignedTo.toString() !== req.user._id.toString())) {
      return res.status(403).json({
        success: false,
        message: 'No tiene permiso para cambiar el estado de esta solicitud',
      });
    } else if (req.user.role === 'client') {
      return res.status(403).json({
        success: false,
        message: 'Los clientes no pueden cambiar el estado de las solicitudes',
      });
    }

    // Guardar estado anterior para notificaciones
    const previousStatus = serviceRequest.status;

    // Actualizar estado y notas de cambio
    serviceRequest.status = status;
    serviceRequest._lastModifiedBy = req.user._id;
    serviceRequest._statusChangeNotes = notes || `Estado cambiado a ${status}`;

    await serviceRequest.save();

    // Notificar al solicitante del cambio de estado
    await notifyStatusChange(serviceRequest, previousStatus);

    res.status(200).json({
      success: true,
      data: serviceRequest,
    });
  } catch (error) {
    console.error('Error al cambiar estado:', error);
    res.status(500).json({
      success: false,
      message: 'Error al cambiar el estado de la solicitud',
      error: error.message,
    });
  }
};

// @desc    Agregar un comentario a una solicitud
// @route   POST /api/service-requests/:id/comments
// @access  Private
exports.addComment = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { text } = req.body;

    const serviceRequest = await ServiceRequest.findById(req.params.id);

    if (!serviceRequest) {
      return res.status(404).json({
        success: false,
        message: 'Solicitud de servicio no encontrada',
      });
    }

    // Verificar acceso al proyecto
    const project = await Project.findById(serviceRequest.project);
    
    if (!project || !project.hasAccess(req.user._id, req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'No tiene permiso para comentar en esta solicitud',
      });
    }

    // Agregar comentario
    const comment = {
      text,
      createdBy: req.user._id,
    };

    serviceRequest.comments.push(comment);
    await serviceRequest.save();

    // Notificar a los involucrados
    await notifyNewComment(serviceRequest, comment);

    // Obtener el comentario con datos de usuario
    const populatedServiceRequest = await ServiceRequest.findById(req.params.id)
      .populate('comments.createdBy', 'firstName lastName email');

    const newComment = populatedServiceRequest.comments[populatedServiceRequest.comments.length - 1];

    res.status(200).json({
      success: true,
      data: newComment,
    });
  } catch (error) {
    console.error('Error al agregar comentario:', error);
    res.status(500).json({
      success: false,
      message: 'Error al agregar comentario a la solicitud',
      error: error.message,
    });
  }
};

// @desc    Subir archivos adjuntos a una solicitud
// @route   POST /api/service-requests/:id/attachments
// @access  Private
exports.uploadAttachments = async (req, res) => {
  try {
    const serviceRequest = await ServiceRequest.findById(req.params.id);

    if (!serviceRequest) {
      return res.status(404).json({
        success: false,
        message: 'Solicitud de servicio no encontrada',
      });
    }

    // Verificar acceso al proyecto
    const project = await Project.findById(serviceRequest.project);
    
    if (!project || !project.hasAccess(req.user._id, req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'No tiene permiso para agregar archivos a esta solicitud',
      });
    }

    // Verificar si hay archivos
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No se han subido archivos',
      });
    }

    // Agregar archivos
    for (const file of req.files) {
      serviceRequest.attachments.push({
        url: `/uploads/${file.filename}`,
        name: file.originalname,
        type: file.mimetype,
        uploadedBy: req.user._id,
      });
    }

    await serviceRequest.save();

    res.status(200).json({
      success: true,
      data: serviceRequest.attachments,
      message: `${req.files.length} archivo(s) subido(s) correctamente`,
    });
  } catch (error) {
    console.error('Error al subir archivos:', error);
    res.status(500).json({
      success: false,
      message: 'Error al subir archivos a la solicitud',
      error: error.message,
    });
  }
};

// Funciones auxiliares para notificaciones

// Notificar nueva solicitud de servicio
async function notifyNewServiceRequest(serviceRequest, project) {
  try {
    // Notificar a los administradores
    const admins = await User.find({ role: 'admin' });
    
    for (const admin of admins) {
      await Notification.createNotification({
        recipient: admin._id,
        title: 'Nueva solicitud de servicio',
        message: `Se ha creado una nueva solicitud: ${serviceRequest.requestNumber} - ${serviceRequest.title}`,
        type: 'info',
        relatedTo: {
          model: 'ServiceRequest',
          id: serviceRequest._id,
        },
        link: `/service-requests/${serviceRequest._id}`,
      });
    }
    
    // Si hay técnico asignado al proyecto, notificarle también
    if (project.technician) {
      await Notification.createNotification({
        recipient: project.technician,
        title: 'Nueva solicitud en tu proyecto',
        message: `Se ha creado una nueva solicitud: ${serviceRequest.requestNumber} - ${serviceRequest.title}`,
        type: 'info',
        relatedTo: {
          model: 'ServiceRequest',
          id: serviceRequest._id,
        },
        link: `/service-requests/${serviceRequest._id}`,
      });
    }
  } catch (error) {
    console.error('Error al enviar notificaciones de nueva solicitud:', error);
  }
}

// Notificar cambio de estado
async function notifyStatusChange(serviceRequest, previousStatus) {
  try {
    // Notificar al solicitante
    await Notification.createNotification({
      recipient: serviceRequest.requestedBy,
      title: 'Actualización de solicitud',
      message: `Su solicitud ${serviceRequest.requestNumber} ha cambiado de estado: ${previousStatus} -> ${serviceRequest.status}`,
      type: 'info',
      relatedTo: {
        model: 'ServiceRequest',
        id: serviceRequest._id,
      },
      link: `/service-requests/${serviceRequest._id}`,
    });
    
    // Si hay técnico asignado y no es quien hizo el cambio, notificarle
    if (
      serviceRequest.assignedTo && 
      serviceRequest._lastModifiedBy.toString() !== serviceRequest.assignedTo.toString()
    ) {
      await Notification.createNotification({
        recipient: serviceRequest.assignedTo,
        title: 'Actualización de solicitud asignada',
        message: `La solicitud ${serviceRequest.requestNumber} ha cambiado de estado: ${previousStatus} -> ${serviceRequest.status}`,
        type: 'info',
        relatedTo: {
          model: 'ServiceRequest',
          id: serviceRequest._id,
        },
        link: `/service-requests/${serviceRequest._id}`,
      });
    }
  } catch (error) {
    console.error('Error al enviar notificaciones de cambio de estado:', error);
  }
}

// Notificar nuevo comentario
async function notifyNewComment(serviceRequest, comment) {
  try {
    // Obtener personas a notificar (evitando duplicados y excluyendo al autor)
    const recipientsSet = new Set();
    
    // Agregar al solicitante
    if (serviceRequest.requestedBy.toString() !== comment.createdBy.toString()) {
      recipientsSet.add(serviceRequest.requestedBy.toString());
    }
    
    // Agregar al técnico asignado si existe
    if (
      serviceRequest.assignedTo && 
      serviceRequest.assignedTo.toString() !== comment.createdBy.toString()
    ) {
      recipientsSet.add(serviceRequest.assignedTo.toString());
    }
    
    // Notificar a todos los involucrados
    for (const recipientId of recipientsSet) {
      await Notification.createNotification({
        recipient: recipientId,
        title: 'Nuevo comentario en solicitud',
        message: `Se ha agregado un nuevo comentario a la solicitud ${serviceRequest.requestNumber}`,
        type: 'info',
        relatedTo: {
          model: 'ServiceRequest',
          id: serviceRequest._id,
        },
        link: `/service-requests/${serviceRequest._id}`,
      });
    }
  } catch (error) {
    console.error('Error al enviar notificaciones de nuevo comentario:', error);
  }
}