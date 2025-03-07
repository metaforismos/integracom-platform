const Project = require('../models/project.model');
const ServiceRequest = require('../models/serviceRequest.model');
const Rendition = require('../models/rendition.model');
const User = require('../models/user.models');
const mongoose = require('mongoose');

// @desc    Obtener reporte de proyectos
// @route   GET /api/reports/projects
// @access  Private/Admin
exports.getProjectsReport = async (req, res) => {
  try {
    // Filtros
    const startDate = req.query.startDate ? new Date(req.query.startDate) : new Date(new Date().setMonth(new Date().getMonth() - 1));
    const endDate = req.query.endDate ? new Date(req.query.endDate) : new Date();

    // Reportes de proyectos por estado
    const projectsByStatus = await Project.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    // Reportes de solicitudes por proyecto
    const serviceRequestsByProject = await ServiceRequest.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: '$project',
          count: { $sum: 1 }
        }
      }
    ]);

    // Obtener nombres de proyectos
    const projectIds = serviceRequestsByProject.map(item => item._id);
    const projects = await Project.find({ _id: { $in: projectIds } }, 'name');
    
    const projectsMap = {};
    projects.forEach(project => {
      projectsMap[project._id] = project.name;
    });

    const serviceRequestsByProjectWithNames = serviceRequestsByProject.map(item => ({
      projectId: item._id,
      projectName: projectsMap[item._id] || 'Proyecto Desconocido',
      count: item.count
    }));

    res.status(200).json({
      success: true,
      data: {
        projectsByStatus,
        serviceRequestsByProject: serviceRequestsByProjectWithNames,
        dateRange: {
          startDate,
          endDate
        }
      }
    });
  } catch (error) {
    console.error('Error al generar reporte de proyectos:', error);
    res.status(500).json({
      success: false,
      message: 'Error al generar reporte de proyectos',
      error: error.message
    });
  }
};

// @desc    Obtener reporte de solicitudes de servicio
// @route   GET /api/reports/service-requests
// @access  Private/Admin
exports.getServiceRequestsReport = async (req, res) => {
  try {
    // Filtros
    const startDate = req.query.startDate ? new Date(req.query.startDate) : new Date(new Date().setMonth(new Date().getMonth() - 1));
    const endDate = req.query.endDate ? new Date(req.query.endDate) : new Date();

    // Solicitudes por estado
    const requestsByStatus = await ServiceRequest.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    // Solicitudes por prioridad
    const requestsByPriority = await ServiceRequest.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: '$priority',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    // Solicitudes por tipo
    const requestsByType = await ServiceRequest.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: '$requestType',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    // Solicitudes por mes (para gráfico de tendencia)
    const requestsByMonth = await ServiceRequest.aggregate([
      {
        $match: {
          createdAt: { $gte: new Date(new Date().setFullYear(new Date().getFullYear() - 1)) }
        }
      },
      {
        $group: {
          _id: {
            month: { $month: '$createdAt' },
            year: { $year: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: {
          '_id.year': 1,
          '_id.month': 1
        }
      }
    ]);

    const formattedRequestsByMonth = requestsByMonth.map(item => ({
      month: `${item._id.year}-${item._id.month.toString().padStart(2, '0')}`,
      count: item.count
    }));

    res.status(200).json({
      success: true,
      data: {
        requestsByStatus,
        requestsByPriority,
        requestsByType,
        requestsByMonth: formattedRequestsByMonth,
        dateRange: {
          startDate,
          endDate
        }
      }
    });
  } catch (error) {
    console.error('Error al generar reporte de solicitudes de servicio:', error);
    res.status(500).json({
      success: false,
      message: 'Error al generar reporte de solicitudes de servicio',
      error: error.message
    });
  }
};

// @desc    Obtener reporte de rendiciones
// @route   GET /api/reports/renditions
// @access  Private/Admin
exports.getRenditionsReport = async (req, res) => {
  try {
    // Filtros
    const startDate = req.query.startDate ? new Date(req.query.startDate) : new Date(new Date().setMonth(new Date().getMonth() - 1));
    const endDate = req.query.endDate ? new Date(req.query.endDate) : new Date();

    // Rendiciones por estado
    const renditionsByStatus = await Rendition.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    // Rendiciones por técnico
    const renditionsByTechnician = await Rendition.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: '$technician',
          count: { $sum: 1 }
        }
      }
    ]);

    // Obtener nombres de técnicos
    const technicianIds = renditionsByTechnician.map(item => item._id);
    const technicians = await User.find({ _id: { $in: technicianIds } }, 'firstName lastName');
    
    const techniciansMap = {};
    technicians.forEach(tech => {
      techniciansMap[tech._id] = `${tech.firstName} ${tech.lastName}`;
    });

    const renditionsByTechnicianWithNames = renditionsByTechnician.map(item => ({
      technicianId: item._id,
      technicianName: techniciansMap[item._id] || 'Técnico Desconocido',
      count: item.count
    }));

    // Análisis de gastos por categoría
    const expensesByCategory = await Rendition.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $unwind: '$expenses'
      },
      {
        $group: {
          _id: '$expenses.category',
          totalAmount: { $sum: '$expenses.amount' },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { totalAmount: -1 }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        renditionsByStatus,
        renditionsByTechnician: renditionsByTechnicianWithNames,
        expensesByCategory,
        dateRange: {
          startDate,
          endDate
        }
      }
    });
  } catch (error) {
    console.error('Error al generar reporte de rendiciones:', error);
    res.status(500).json({
      success: false,
      message: 'Error al generar reporte de rendiciones',
      error: error.message
    });
  }
};

// @desc    Obtener reporte de desempeño de técnicos
// @route   GET /api/reports/technician-performance
// @access  Private/Admin
exports.getTechnicianPerformanceReport = async (req, res) => {
  try {
    // Filtros
    const startDate = req.query.startDate ? new Date(req.query.startDate) : new Date(new Date().setMonth(new Date().getMonth() - 1));
    const endDate = req.query.endDate ? new Date(req.query.endDate) : new Date();

    // Obtener todos los técnicos
    const technicians = await User.find({ role: 'technician' }, '_id firstName lastName');

    // Array para almacenar resultados
    const technicianPerformance = [];

    for (const technician of technicians) {
      // Contar solicitudes asignadas
      const assignedRequests = await ServiceRequest.countDocuments({
        assignedTo: technician._id,
        createdAt: { $gte: startDate, $lte: endDate }
      });

      // Contar solicitudes completadas
      const completedRequests = await ServiceRequest.countDocuments({
        assignedTo: technician._id,
        status: 'Finalizada',
        createdAt: { $gte: startDate, $lte: endDate }
      });

      // Contar rendiciones creadas
      const renditionsSubmitted = await Rendition.countDocuments({
        technician: technician._id,
        createdAt: { $gte: startDate, $lte: endDate }
      });

      // Contar rendiciones aprobadas
      const renditionsApproved = await Rendition.countDocuments({
        technician: technician._id,
        status: 'Aprobada',
        createdAt: { $gte: startDate, $lte: endDate }
      });

      // Tiempo promedio de respuesta (días) desde asignación hasta finalización
      const avgResponseTime = await ServiceRequest.aggregate([
        {
          $match: {
            assignedTo: mongoose.Types.ObjectId(technician._id),
            status: 'Finalizada',
            createdAt: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $project: {
            responseTime: { 
              $divide: [
                { $subtract: ['$completionDate', '$createdAt'] },
                1000 * 60 * 60 * 24 // convertir milisegundos a días
              ]
            }
          }
        },
        {
          $group: {
            _id: null,
            avgResponseTime: { $avg: '$responseTime' }
          }
        }
      ]);

      technicianPerformance.push({
        technicianId: technician._id,
        technicianName: `${technician.firstName} ${technician.lastName}`,
        metrics: {
          assignedRequests,
          completedRequests,
          completionRate: assignedRequests > 0 ? (completedRequests / assignedRequests) * 100 : 0,
          renditionsSubmitted,
          renditionsApproved,
          approvalRate: renditionsSubmitted > 0 ? (renditionsApproved / renditionsSubmitted) * 100 : 0,
          avgResponseTime: avgResponseTime.length > 0 ? avgResponseTime[0].avgResponseTime.toFixed(2) : 0
        }
      });
    }

    res.status(200).json({
      success: true,
      data: {
        technicianPerformance,
        dateRange: {
          startDate,
          endDate
        }
      }
    });
  } catch (error) {
    console.error('Error al generar reporte de desempeño de técnicos:', error);
    res.status(500).json({
      success: false,
      message: 'Error al generar reporte de desempeño de técnicos',
      error: error.message
    });
  }
};

// @desc    Obtener reporte mensual
// @route   GET /api/reports/monthly
// @access  Private/Admin
exports.getMonthlyReport = async (req, res) => {
  try {
    // Obtener el mes y año del query o usar el mes actual
    const year = req.query.year ? parseInt(req.query.year) : new Date().getFullYear();
    const month = req.query.month ? parseInt(req.query.month) : new Date().getMonth() + 1;

    // Crear fechas de inicio y fin del mes
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    // Proyectos nuevos en el mes
    const newProjects = await Project.countDocuments({
      createdAt: { $gte: startDate, $lte: endDate }
    });

    // Proyectos finalizados en el mes
    const completedProjects = await Project.countDocuments({
      status: 'Finalizado',
      endDate: { $gte: startDate, $lte: endDate }
    });

    // Solicitudes nuevas en el mes
    const newRequests = await ServiceRequest.countDocuments({
      createdAt: { $gte: startDate, $lte: endDate }
    });

    // Solicitudes finalizadas en el mes
    const completedRequests = await ServiceRequest.countDocuments({
      status: 'Finalizada',
      completionDate: { $gte: startDate, $lte: endDate }
    });

    // Rendiciones creadas en el mes
    const newRenditions = await Rendition.countDocuments({
      createdAt: { $gte: startDate, $lte: endDate }
    });

    // Rendiciones aprobadas en el mes
    const approvedRenditions = await Rendition.countDocuments({
      status: 'Aprobada',
      reviewDate: { $gte: startDate, $lte: endDate }
    });

    // Total de gastos en rendiciones aprobadas en el mes
    const totalExpenses = await Rendition.aggregate([
      {
        $match: {
          status: 'Aprobada',
          reviewDate: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $unwind: '$expenses'
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$expenses.amount' }
        }
      }
    ]);

    // Cambios de estado de solicitudes por día (para gráfica de actividad)
    const activityByDay = await ServiceRequest.aggregate([
      {
        $match: {
          'history.changedAt': { $gte: startDate, $lte: endDate }
        }
      },
      {
        $unwind: '$history'
      },
      {
        $match: {
          'history.changedAt': { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: {
            day: { $dayOfMonth: '$history.changedAt' },
            status: '$history.status'
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.day': 1 }
      }
    ]);

    const formattedActivityByDay = [];
    for (let day = 1; day <= endDate.getDate(); day++) {
      const dayActivities = activityByDay.filter(act => act._id.day === day);
      formattedActivityByDay.push({
        day,
        activities: dayActivities.map(act => ({
          status: act._id.status,
          count: act.count
        }))
      });
    }

    res.status(200).json({
      success: true,
      data: {
        period: {
          year,
          month,
          startDate,
          endDate
        },
        summary: {
          newProjects,
          completedProjects,
          newRequests,
          completedRequests,
          newRenditions,
          approvedRenditions,
          totalExpenses: totalExpenses.length > 0 ? totalExpenses[0].total : 0
        },
        activityByDay: formattedActivityByDay
      }
    });
  } catch (error) {
    console.error('Error al generar reporte mensual:', error);
    res.status(500).json({
      success: false,
      message: 'Error al generar reporte mensual',
      error: error.message
    });
  }
};