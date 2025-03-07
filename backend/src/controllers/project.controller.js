const Project = require('../models/project.model');
const User = require('../models/user.models');
const Notification = require('../models/notification.model');
const { validationResult } = require('express-validator');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// @desc    Crear un nuevo proyecto
// @route   POST /api/projects
// @access  Private/Admin
exports.createProject = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const {
      name,
      location,
      description,
      orderNumber,
      identificationNumber,
      receptionType,
      companyResponsible,
      clientContactName,
      clientCompanyName,
      technician,
      costCenter,
      status,
      startDate,
      endDate,
      clients,
    } = req.body;

    // Verificar si ya existe un proyecto con el mismo número de orden
    if (orderNumber) {
      const existingProject = await Project.findOne({ orderNumber });
      if (existingProject) {
        return res.status(400).json({
          success: false,
          message: 'Ya existe un proyecto con ese número de orden',
        });
      }
    }

    // Crear el proyecto
    const project = new Project({
      name,
      location,
      description,
      orderNumber,
      identificationNumber,
      receptionType,
      companyResponsible,
      clientContactName,
      clientCompanyName,
      technician,
      costCenter,
      status,
      startDate,
      endDate,
      clients,
    });

    await project.save();

    // Notificar a los usuarios asignados
    if (technician) {
      await notifyUserAssigned(project, technician, 'technician');
    }

    if (clients && clients.length > 0) {
      for (const clientId of clients) {
        await notifyUserAssigned(project, clientId, 'client');
      }
    }

    res.status(201).json({
      success: true,
      data: project,
    });
  } catch (error) {
    console.error('Error al crear proyecto:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear el proyecto',
      error: error.message,
    });
  }
};

// @desc    Obtener todos los proyectos (con filtros)
// @route   GET /api/projects
// @access  Private
exports.getProjects = async (req, res) => {
  try {
    let query = {};

    // Filtrar por rol del usuario
    if (req.user.role === 'client') {
      // Clientes solo ven proyectos asignados a ellos
      query.clients = req.user._id;
    } else if (req.user.role === 'technician') {
      // Técnicos solo ven proyectos asignados a ellos
      query.technician = req.user._id;
    }
    // Admins ven todos los proyectos

    // Filtros adicionales
    if (req.query.status) {
      query.status = req.query.status;
    }

    if (req.query.search) {
      query.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        { orderNumber: { $regex: req.query.search, $options: 'i' } },
        { location: { $regex: req.query.search, $options: 'i' } },
      ];
    }

    // Paginación
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;

    // Ejecutar consulta
    const projects = await Project.find(query)
      .skip(startIndex)
      .limit(limit)
      .populate('technician', 'firstName lastName email')
      .populate('clients', 'firstName lastName email')
      .sort({ createdAt: -1 });

    // Obtener total de documentos para paginación
    const total = await Project.countDocuments(query);

    res.status(200).json({
      success: true,
      count: projects.length,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
      },
      data: projects,
    });
  } catch (error) {
    console.error('Error al obtener proyectos:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener los proyectos',
      error: error.message,
    });
  }
};

// @desc    Obtener un proyecto por ID
// @route   GET /api/projects/:id
// @access  Private
exports.getProjectById = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('technician', 'firstName lastName email phone')
      .populate('clients', 'firstName lastName email');

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Proyecto no encontrado',
      });
    }

    // Verificar acceso según rol
    if (!project.hasAccess(req.user._id, req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'No tiene permiso para ver este proyecto',
      });
    }

    res.status(200).json({
      success: true,
      data: project,
    });
  } catch (error) {
    console.error('Error al obtener proyecto:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener el proyecto',
      error: error.message,
    });
  }
};

// @desc    Actualizar un proyecto
// @route   PUT /api/projects/:id
// @access  Private/Admin
exports.updateProject = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const {
      name,
      location,
      description,
      orderNumber,
      identificationNumber,
      receptionType,
      companyResponsible,
      clientContactName,
      clientCompanyName,
      technician,
      costCenter,
      status,
      startDate,
      endDate,
      clients,
    } = req.body;

    let project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Proyecto no encontrado',
      });
    }

    // Verificar número de orden único si se está cambiando
    if (orderNumber && orderNumber !== project.orderNumber) {
      const existingProject = await Project.findOne({ orderNumber });
      if (existingProject && existingProject._id.toString() !== req.params.id) {
        return res.status(400).json({
          success: false,
          message: 'Ya existe un proyecto con ese número de orden',
        });
      }
    }

    // Guardar técnico anterior para notificaciones
    const previousTechnician = project.technician;

    // Actualizar el proyecto
    project = await Project.findByIdAndUpdate(
      req.params.id,
      {
        name,
        location,
        description,
        orderNumber,
        identificationNumber,
        receptionType,
        companyResponsible,
        clientContactName,
        clientCompanyName,
        technician,
        costCenter,
        status,
        startDate,
        endDate,
        clients,
      },
      { new: true, runValidators: true }
    );

    // Notificar si se cambió el técnico asignado
    if (technician && (!previousTechnician || technician.toString() !== previousTechnician.toString())) {
      await notifyUserAssigned(project, technician, 'technician');
    }

    res.status(200).json({
      success: true,
      data: project,
    });
  } catch (error) {
    console.error('Error al actualizar proyecto:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar el proyecto',
      error: error.message,
    });
  }
};

// @desc    Eliminar un proyecto
// @route   DELETE /api/projects/:id
// @access  Private/Admin
exports.deleteProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Proyecto no encontrado',
      });
    }

    // Aquí se deberían eliminar también todos los recursos asociados al proyecto
    // como solicitudes de servicio, rendiciones, etc.
    // Idealmente en una transacción

    await project.deleteOne(); // Usando deleteOne en lugar de remove que está deprecado

    res.status(200).json({
      success: true,
      data: {},
      message: 'Proyecto eliminado exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar proyecto:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar el proyecto',
      error: error.message,
    });
  }
};

// @desc    Subir fotos a un proyecto
// @route   POST /api/projects/:id/photos
// @access  Private
exports.uploadProjectPhotos = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Proyecto no encontrado',
      });
    }
    
    // Verificar acceso al proyecto
    if (!project.hasAccess(req.user._id, req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'No tiene permiso para modificar este proyecto',
      });
    }

    // Verificar si hay archivos en la solicitud (multer los guarda en req.files)
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No se subieron archivos',
      });
    }

    // Añadir las fotos al proyecto con el formato correcto del modelo
    for (const file of req.files) {
      project.photos.push({
        url: `/uploads/${file.filename}`,
        description: req.body.description || '',
        uploadedBy: req.user._id,
        uploadedAt: Date.now()
      });
    }

    // Guardar el proyecto actualizado
    await project.save();

    res.status(200).json({
      success: true,
      count: req.files.length,
      data: project.photos,
      message: 'Fotos subidas exitosamente',
    });
  } catch (error) {
    console.error('Error al subir fotos:', error);
    res.status(500).json({
      success: false,
      message: 'Error al subir fotos al proyecto',
      error: error.message,
    });
  }
};

// @desc    Eliminar una foto de un proyecto
// @route   DELETE /api/projects/:id/photos/:photoId
// @access  Private
exports.deleteProjectPhoto = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Proyecto no encontrado',
      });
    }

    // Verificar acceso al proyecto
    if (!project.hasAccess(req.user._id, req.user.role) && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'No tiene permiso para modificar este proyecto',
      });
    }

    // Encontrar la foto en el array de fotos del proyecto
    const photoIndex = project.photos.findIndex(
      (photo) => photo._id.toString() === req.params.photoId
    );

    if (photoIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Foto no encontrada en este proyecto',
      });
    }

    // Obtener la información de la foto antes de eliminarla
    const photoToDelete = project.photos[photoIndex];

    // Intentar eliminar el archivo físico (solo si la URL apunta a un archivo local)
    const localFilePath = photoToDelete.url;
    if (localFilePath && localFilePath.startsWith('/uploads/')) {
      const filePath = path.join(__dirname, '../../public', localFilePath);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    // Eliminar la referencia en el array de fotos
    project.photos.splice(photoIndex, 1);
    await project.save();

    res.status(200).json({
      success: true,
      data: {},
      message: 'Foto eliminada exitosamente',
    });
  } catch (error) {
    console.error('Error al eliminar foto:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar la foto del proyecto',
      error: error.message,
    });
  }
};

// @desc    Asignar técnico a un proyecto
// @route   PUT /api/projects/:id/assign-technician
// @access  Private/Admin
exports.assignTechnician = async (req, res) => {
  try {
    const { technicianId } = req.body;

    if (!technicianId) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere ID del técnico',
      });
    }

    // Verificar que el técnico existe
    const technician = await User.findById(technicianId);
    if (!technician || technician.role !== 'technician') {
      return res.status(404).json({
        success: false,
        message: 'Técnico no encontrado',
      });
    }

    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Proyecto no encontrado',
      });
    }

    // Guardar técnico anterior para notificaciones
    const previousTechnician = project.technician;

    // Actualizar el proyecto con el nuevo técnico
    project.technician = technicianId;
    await project.save();

    // Notificar al nuevo técnico asignado
    if (!previousTechnician || technicianId !== previousTechnician.toString()) {
      await notifyUserAssigned(project, technicianId, 'technician');
    }

    res.status(200).json({
      success: true,
      data: project,
      message: 'Técnico asignado exitosamente',
    });
  } catch (error) {
    console.error('Error al asignar técnico:', error);
    res.status(500).json({
      success: false,
      message: 'Error al asignar técnico al proyecto',
      error: error.message,
    });
  }
};

// @desc    Añadir cliente a un proyecto
// @route   PUT /api/projects/:id/add-client
// @access  Private/Admin
exports.addClientToProject = async (req, res) => {
  try {
    const { clientId } = req.body;

    if (!clientId) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere ID del cliente',
      });
    }

    // Verificar que el cliente existe
    const client = await User.findById(clientId);
    if (!client || client.role !== 'client') {
      return res.status(404).json({
        success: false,
        message: 'Cliente no encontrado',
      });
    }

    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Proyecto no encontrado',
      });
    }

    // Verificar si el cliente ya está asociado al proyecto
    if (project.clients.includes(clientId)) {
      return res.status(400).json({
        success: false,
        message: 'El cliente ya está asociado a este proyecto',
      });
    }

    // Añadir el cliente al proyecto
    project.clients.push(clientId);
    await project.save();

    // Notificar al cliente
    await notifyUserAssigned(project, clientId, 'client');

    res.status(200).json({
      success: true,
      data: project,
      message: 'Cliente añadido exitosamente al proyecto',
    });
  } catch (error) {
    console.error('Error al añadir cliente:', error);
    res.status(500).json({
      success: false,
      message: 'Error al añadir cliente al proyecto',
      error: error.message,
    });
  }
};

// @desc    Cambiar estado de un proyecto
// @route   PUT /api/projects/:id/status
// @access  Private/Admin
exports.updateProjectStatus = async (req, res) => {
  try {
    const { status, comments } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere el nuevo estado del proyecto',
      });
    }

    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Proyecto no encontrado',
      });
    }

    // Actualizar estado
    const previousStatus = project.status;
    project.status = status;
    
    // Si no existe un array de historial de estados, crearlo
    if (!project.statusHistory) {
      project.statusHistory = [];
    }
    
    // Añadir entrada al historial
    project.statusHistory.push({
      status,
      changedBy: req.user._id,
      changedAt: Date.now(),
      comments: comments || `Estado cambiado de ${previousStatus} a ${status}`
    });
    
    await project.save();

    // Notificar a los usuarios asignados
    await notifyStatusChanged(project, previousStatus, status);

    res.status(200).json({
      success: true,
      data: project,
      message: 'Estado del proyecto actualizado exitosamente',
    });
  } catch (error) {
    console.error('Error al actualizar estado:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar el estado del proyecto',
      error: error.message,
    });
  }
};

// @desc    Obtener métricas de proyectos
// @route   GET /api/projects/metrics
// @access  Private/Admin
exports.getProjectMetrics = async (req, res) => {
  try {
    // Contar proyectos por estado
    const statusMetrics = await Project.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Contar proyectos por técnico
    const technicianMetrics = await Project.aggregate([
      { $match: { technician: { $exists: true, $ne: null } } },
      { $group: { _id: '$technician', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // Poblar los nombres de los técnicos
    const technicianIds = technicianMetrics.map(metric => metric._id);
    const technicians = await User.find({ _id: { $in: technicianIds } })
      .select('firstName lastName email');
    
    const technicianMap = {};
    technicians.forEach(tech => {
      technicianMap[tech._id] = `${tech.firstName} ${tech.lastName}`;
    });

    const formattedTechnicianMetrics = technicianMetrics.map(metric => ({
      _id: metric._id,
      name: technicianMap[metric._id] || 'Desconocido',
      count: metric.count
    }));

    // Obtener proyectos creados en el último mes
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    
    const recentProjects = await Project.countDocuments({
      createdAt: { $gte: lastMonth }
    });

    res.status(200).json({
      success: true,
      data: {
        totalProjects: await Project.countDocuments(),
        byStatus: statusMetrics,
        byTechnician: formattedTechnicianMetrics,
        recentProjects
      }
    });
  } catch (error) {
    console.error('Error al obtener métricas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener métricas de proyectos',
      error: error.message,
    });
  }
};

// Método estático para actualizar métricas de un proyecto
Project.updateMetrics = async function(projectId) {
  try {
    const ServiceRequest = mongoose.model('ServiceRequest');
    
    // Contar solicitudes por estado
    const requestMetrics = await ServiceRequest.aggregate([
      { $match: { project: mongoose.Types.ObjectId(projectId) } },
      { $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);
    
    // Preparar objeto de métricas
    let metrics = {
      totalRequests: 0,
      openRequests: 0,
      completedRequests: 0
    };
    
    // Calcular métricas
    requestMetrics.forEach(metric => {
      const status = metric._id;
      const count = metric.count;
      
      metrics.totalRequests += count;
      
      if (status === 'Finalizada') {
        metrics.completedRequests += count;
      } else if (status !== 'Cancelada') {
        metrics.openRequests += count;
      }
    });
    
    // Actualizar proyecto
    await Project.findByIdAndUpdate(projectId, { metrics });
    
    return metrics;
  } catch (error) {
    console.error('Error al actualizar métricas del proyecto:', error);
    throw error;
  }
};

// Funciones auxiliares para notificaciones

// Notificar asignación de usuario a proyecto
async function notifyUserAssigned(project, userId, role) {
  try {
    if (!Notification || !Notification.createNotification) {
      console.log('Sistema de notificaciones no disponible');
      return;
    }

    let title, message;
    
    if (role === 'technician') {
      title = 'Asignación a nuevo proyecto';
      message = `Has sido asignado como técnico al proyecto: ${project.name}`;
    } else {
      title = 'Acceso a nuevo proyecto';
      message = `Se te ha dado acceso al proyecto: ${project.name}`;
    }
    
    await Notification.createNotification({
      recipient: userId,
      title,
      message,
      type: 'info',
      relatedTo: {
        model: 'Project',
        id: project._id,
      },
      link: `/projects/${project._id}`,
    });
  } catch (error) {
    console.error('Error al enviar notificación de asignación:', error);
  }
}

// Notificar cambio de estado de proyecto
async function notifyStatusChanged(project, oldStatus, newStatus) {
  try {
    if (!Notification || !Notification.createNotification) {
      console.log('Sistema de notificaciones no disponible');
      return;
    }
    
    const title = 'Actualización de estado de proyecto';
    const message = `El proyecto ${project.name} ha cambiado de estado: ${oldStatus} → ${newStatus}`;
    
    // Notificar al técnico si existe
    if (project.technician) {
      await Notification.createNotification({
        recipient: project.technician,
        title,
        message,
        type: 'info',
        relatedTo: {
          model: 'Project',
          id: project._id,
        },
        link: `/projects/${project._id}`,
      });
    }
    
    // Notificar a los clientes asociados
    if (project.clients && project.clients.length > 0) {
      for (const clientId of project.clients) {
        await Notification.createNotification({
          recipient: clientId,
          title,
          message,
          type: 'info',
          relatedTo: {
            model: 'Project',
            id: project._id,
          },
          link: `/projects/${project._id}`,
        });
      }
    }
  } catch (error) {
    console.error('Error al enviar notificaciones de cambio de estado:', error);
  }
}