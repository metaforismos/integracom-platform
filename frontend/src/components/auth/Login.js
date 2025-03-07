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
    <Container fluid className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh', backgroundColor: '#f8f9fa' }}>
      <Row className="w-100">
        <Col md={6} lg={4} className="mx-auto">
          <Card className="shadow-lg">
            <Card.Header className="bg-primary text-white text-center py-3">
              <h2>Iniciar Sesión</h2>
            </Card.Header>
            <Card.Body className="p-4">
              <Form onSubmit={handleSubmit}>
                <Form.Group className="mb-4" controlId="email">
                  <Form.Label>Email</Form.Label>
                  <Form.Control
                    type="email"
                    value={credentials.email}
                    onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
                    placeholder="Ingresa tu email"
                    required
                    size="lg"
                  />
                </Form.Group>
                <Form.Group className="mb-4" controlId="password">
                  <Form.Label>Contraseña</Form.Label>
                  <Form.Control
                    type="password"
                    value={credentials.password}
                    onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                    placeholder="Ingresa tu contraseña"
                    required
                    size="lg"
                  />
                </Form.Group>
                <Button variant="primary" type="submit" size="lg" className="w-100">
                  Iniciar Sesión
                </Button>
              </Form>
              {error && <Alert variant="danger" className="mt-4">{error}</Alert>}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}

export default Login;