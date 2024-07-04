const express = require('express');
const session = require('express-session');
const passport = require('./passport-config');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const bodyParser = require('body-parser');
const jayson = require('jayson');

const app = express();
const port = 3001;

app.use(cors());
app.use(bodyParser.json());
app.use(session({
  secret: 'secret',
  resave: false,
  saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'libraryDB',
  password: '271115',
  port: 5432,
});

// Endpoint para login
app.post('/login', passport.authenticate('local'), (req, res) => {
  res.json({ message: 'Login successful', user: req.user });
});

// Endpoint para registro de usuarios
app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    await pool.query('INSERT INTO users (username, password) VALUES ($1, $2)', [username, hashedPassword]);
    res.json({ message: 'User registered successfully' });
  } catch (err) {
    console.error('Error registering user:', err);
    res.status(500).json({ error: 'Error registering user' });
  }
});

// Crear el servidor JSON-RPC
const server = jayson.server({
  getBooks: async (args, callback) => {
    try {
      const result = await pool.query('SELECT * FROM books');
      callback(null, result.rows);
    } catch (err) {
      callback(err);
    }
  },
  reserveBook: async (args, callback) => {
    const { bookId, userId } = args;
    try {
      await pool.query('UPDATE books SET is_reserved = TRUE, reserved_by = $1 WHERE id = $2', [userId, bookId]);
      callback(null, { message: 'Book reserved successfully' });
    } catch (err) {
      callback(err);
    }
  },
  cancelReservation: async (args, callback) => {
    const { bookId, userId } = args;
    try {
      const result = await pool.query('SELECT reserved_by FROM books WHERE id = $1', [bookId]);
      if (result.rows.length > 0 && result.rows[0].reserved_by === userId) {
        await pool.query('UPDATE books SET is_reserved = FALSE, reserved_by = NULL WHERE id = $1', [bookId]);
        callback(null, { message: 'Reservation cancelled successfully' });
      } else {
        callback({ code: -32603, message: 'Unauthorized action' });
      }
    } catch (err) {
      callback({ code: -32603, message: 'Internal error' });
    }
  }
});

app.post('/rpc', (req, res) => {
  server.call(req.body, (err, response) => {
    if (err) {
      res.status(500).json(err);
    } else {
      res.json(response);
    }
  });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
