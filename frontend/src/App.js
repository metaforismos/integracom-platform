import React, { useContext } from 'react';
import AuthContext from './contexts/authContext'; // Cambia a import por defecto
import Dashboard from './components/admin/Dashboard'; // Admin dashboard
import ProjectList from './components/client/ProjectList'; // Client dashboard
import RenditionForm from './components/technician/RenditionForm'; // Technician dashboard
import './App.css';
import Login from './components/auth/Login.js'                                  

function App() {
  const { currentUser, loading } = useContext(AuthContext);

  if (loading) {
    return <div>Cargando...</div>;
  }

  if (!currentUser) {
    return <Login />;
  }

  switch (currentUser.role) {
    case 'admin':
      return <Dashboard />;
    case 'user':
      return <ProjectList />;
    case 'technician':
      return <RenditionForm />;
    default:
      return <div>Rol no reconocido</div>;
  }
}

export default App;