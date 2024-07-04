import React, { useState, useEffect } from 'react';
import { Routes, Route, BrowserRouter as Router, Link, useNavigate, Navigate } from 'react-router-dom';
import './App.css';

const App = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);

  const handleLogin = (user) => {
    setIsLoggedIn(true);
    setUser(user);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUser(null);
  };

  return (
    <Router>
      <div>
        <nav className="nav-bar">
          <ul>
            <li><Link to="/">Home</Link></li>
            {!isLoggedIn ? (
              <>
                <li><Link to="/login">Login</Link></li>
                <li><Link to="/register">Register</Link></li>
              </>
            ) : (
              <>
                <li><Link to="/dashboard">Dashboard</Link></li>
                <li><button onClick={handleLogout}>Logout</button></li>
              </>
            )}
          </ul>
        </nav>
        <div className="content">
          <Routes>
            <Route path="/" element={<Home />} />
            {!isLoggedIn && <Route path="/login" element={<LoginForm onLogin={handleLogin} />} />}
            {!isLoggedIn && <Route path="/register" element={<Register />} />}
            {isLoggedIn && <Route path="/dashboard" element={<Dashboard user={user} />} />}
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
};

const Home = () => {
  return (
    <div className="home-container">
      <h1>Biblioteca El Saber</h1>
      <p>Bienvenido a la Biblioteca El Saber, tu portal de conocimiento y aprendizaje.</p>
      <div className="mission-vision">
        <h2>Nuestra Misión dsfsd</h2>
        <p>Fomentar la lectura y el aprendizaje continuo a través de una amplia colección de recursos bibliográficos y actividades educativas.</p>
        <h2>Nuestra Visión</h2>
        <p>Ser un referente en la promoción del conocimiento y la cultura en nuestra comunidad, ofreciendo servicios de calidad y acceso a la información para todos.</p>
        <h2>Valores</h2>
        <ul>
          <li>Compromiso</li>
          <li>Innovación</li>
          <li>Inclusión</li>
          <li>Accesibilidad</li>
        </ul>
      </div>
    </div>
  );
};

const LoginForm = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (event) => {
    event.preventDefault();
    try {
      const response = await fetch('http://localhost:3001/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      });
      const data = await response.json();
      if (data.message === 'Login successful') {
        onLogin(data.user);
        navigate('/dashboard');
      } else {
        alert('Login failed');
      }
    } catch (error) {
      console.error('Error logging in:', error);
      alert('Login failed');
    }
  };

  return (
    <div className="form-container">
      <h2>Login</h2>
      <form onSubmit={handleLogin}>
        <label htmlFor="username">Username:</label>
        <input type="text" id="username" value={username} onChange={(e) => setUsername(e.target.value)} />
        <label htmlFor="password">Password:</label>
        <input type="password" id="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <button type="submit">Login</button>
      </form>
    </div>
  );
};

const Register = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleRegister = async (event) => {
    event.preventDefault();
    try {
      const response = await fetch('http://localhost:3001/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      });
      const data = await response.json();
      if (data.message === 'User registered successfully') {
        alert('Registration successful');
        setUsername('');
        setPassword('');
      } else {
        alert('Registration failed');
      }
    } catch (error) {
      console.error('Error registering user:', error);
      alert('Registration failed');
    }
  };

  return (
    <div className="form-container">
      <h2>Register</h2>
      <form onSubmit={handleRegister}>
        <label htmlFor="newUsername">Username:</label>
        <input type="text" id="newUsername" value={username} onChange={(e) => setUsername(e.target.value)} />
        <label htmlFor="newPassword">Password:</label>
        <input type="password" id="newPassword" value={password} onChange={(e) => setPassword(e.target.value)} />
        <button type="submit">Register</button>
      </form>
    </div>
  );
};

const Dashboard = ({ user }) => {
  const [books, setBooks] = useState([]);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState(''); // 'success' or 'error'

  useEffect(() => {
    const fetchBooks = async () => {
      try {
        const response = await fetch('http://localhost:3001/rpc', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            method: 'getBooks',
            params: [],
            id: 1,
            jsonrpc: '2.0'
          })
        });
        const data = await response.json();
        if (data.result) {
          setBooks(data.result);
        } else {
          setMessage(`Error fetching books: ${data.error?.message || 'Unknown error'}`);
          setMessageType('error');
        }
      } catch (error) {
        console.error('Error fetching books:', error);
        setMessage('Error fetching books: ' + error.message);
        setMessageType('error');
      }
    };

    fetchBooks();
  }, []);

  const handleReserve = async (bookId) => {
    try {
      const response = await fetch('http://localhost:3001/rpc', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          method: 'reserveBook',
          params: { bookId, userId: user.id },
          id: 1,
          jsonrpc: '2.0'
        })
      });
      const data = await response.json();
      if (data.result && data.result.message === 'Book reserved successfully') {
        setBooks(books.map(book => book.id === bookId ? { ...book, is_reserved: true, reserved_by: user.id } : book));
        setMessage('Reservation successful');
        setMessageType('success');
      } else {
        setMessage(`Reservation failed: ${data.error?.message || 'Unknown error'}`);
        setMessageType('error');
      }
    } catch (error) {
      console.error('Error reserving book:', error);
      setMessage('Reservation failed: ' + error.message);
      setMessageType('error');
    }
  };

  const handleCancelReservation = async (bookId) => {
    try {
      const response = await fetch('http://localhost:3001/rpc', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          method: 'cancelReservation',
          params: { bookId, userId: user.id },
          id: 1,
          jsonrpc: '2.0'
        })
      });
      const data = await response.json();
      if (data.result && data.result.message === 'Reservation cancelled successfully') {
        setBooks(books.map(book => book.id === bookId ? { ...book, is_reserved: false, reserved_by: null } : book));
        setMessage('Cancellation successful');
        setMessageType('success');
      } else {
        setMessage(`Cancellation failed: ${data.error?.message || 'Unknown error'}`);
        setMessageType('error');
      }
    } catch (error) {
      console.error('Error cancelling reservation:', error);
      setMessage('Cancellation failed: ' + error.message);
      setMessageType('error');
    }
  };

  return (
    <div className="dashboard-container">
      <h2>Dashboard</h2>
      {message && <p data-testid={messageType === 'success' ? 'success-message' : 'error-message'}>{message}</p>}
      <ul className="book-list">
        {books.map(book => (
          <li key={book.id} className="book-item">
            <span>{book.title} by {book.author}</span>
            {book.is_reserved ? (
              book.reserved_by === user.id ? (
                <button className="cancel-button" onClick={() => handleCancelReservation(book.id)}>Cancel Reservation</button>
              ) : (
                <span>Reserved</span>
              )
            ) : (
              <button className="reserve-button" onClick={() => handleReserve(book.id)}>Reserve</button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

const NotFound = () => {
  return <h2>404 Not Found</h2>;
};

export default App;
