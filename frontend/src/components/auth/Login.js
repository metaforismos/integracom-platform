import React, { useState, useContext } from 'react';
import AuthContext from '../../contexts/authContext';
import { login } from '../../services/authService';
import { Container, Row, Col, Form, Button, Alert, Card } from 'react-bootstrap';
import './Login.css';

function Login() {
  const { setCurrentUser } = useContext(AuthContext);
  const [credentials, setCredentials] = useState({ email: '', password: '' });
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await login(credentials);
      localStorage.setItem('token', response.token);
      setCurrentUser(response.user);
    } catch (err) {
      setError('Error al iniciar sesión');
    }
  };

  return (
    <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
      <Row>
        <Col md={6} lg={4}>
          <Card>
            <Card.Body>
              <h1 className="text-center mb-4">Iniciar Sesión</h1>
              <Form onSubmit={handleSubmit}>
                <Form.Group className="mb-3" controlId="email">
                  <Form.Label>Email</Form.Label>
                  <Form.Control
                    type="email"
                    value={credentials.email}
                    onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
                    placeholder="Ingresa tu email"
                    required
                  />
                </Form.Group>
                <Form.Group className="mb-3" controlId="password">
                  <Form.Label>Contraseña</Form.Label>
                  <Form.Control
                    type="password"
                    value={credentials.password}
                    onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                    placeholder="Ingresa tu contraseña"
                    required
                  />
                </Form.Group>
                <Button variant="primary" type="submit" className="w-100">
                  Iniciar Sesión
                </Button>
              </Form>
              {error && <Alert variant="danger" className="mt-3">{error}</Alert>}
            </Card.Body>
          </Card>  // Añadido aquí
        </Col>
      </Row>
    </Container>
  );
}

export default Login;