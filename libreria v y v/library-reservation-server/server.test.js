const request = require('supertest');
const express = require('express');
const session = require('express-session');
const passport = require('./passport-config');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
const bodyParser = require('body-parser');
const jayson = require('jayson');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(session({
  secret: 'secret',
  resave: false,
  saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

const pool = new Pool();

app.post('/login', passport.authenticate('local'), (req, res) => {
  res.json({ message: 'Login successful', user: req.user });
});

app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    await pool.query('INSERT INTO users (username, password) VALUES ($1, $2)', [username, hashedPassword]);
    res.json({ message: 'User registered successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Error registering user' });
  }
});

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

describe('Server Endpoints', () => {
  let serverInstance;

  beforeAll(() => {
    serverInstance = app.listen(4000);
  });

  afterAll((done) => {
    serverInstance.close(done);
  });

  describe('POST /register', () => {
    it('should register a user successfully', async () => {
      // Mockear pool.query
      pool.query = jest.fn().mockResolvedValueOnce();
      const response = await request(app)
        .post('/register')
        .send({ username: 'testuser', password: 'password' });
      expect(response.status).toBe(200);
      expect(response.body.message).toBe('User registered successfully');
    });

    it('should handle errors during registration', async () => {
      // Mockear pool.query
      pool.query = jest.fn().mockRejectedValueOnce(new Error('Database error'));
      const response = await request(app)
        .post('/register')
        .send({ username: 'testuser', password: 'password' });
      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Error registering user');
    });
  });

  describe('RPC methods', () => {
    it('should return a list of books', async () => {
      // Mockear pool.query
      const books = [{ id: 1, title: 'Book 1', author: 'Author 1' }];
      pool.query = jest.fn().mockResolvedValueOnce({ rows: books });
      const response = await request(app)
        .post('/rpc')
        .send({ method: 'getBooks', params: [], id: 1, jsonrpc: '2.0' });
      expect(response.status).toBe(200);
      expect(response.body.result).toEqual(books);
    });

    it('should reserve a book successfully', async () => {
      // Mockear pool.query
      pool.query = jest.fn().mockResolvedValueOnce();
      const response = await request(app)
        .post('/rpc')
        .send({ method: 'reserveBook', params: { bookId: 1, userId: 1 }, id: 1, jsonrpc: '2.0' });
      expect(response.status).toBe(200);
      expect(response.body.result.message).toBe('Book reserved successfully');
    });

    it('should cancel a reservation successfully', async () => {
      // Mockear pool.query
      pool.query = jest.fn()
        .mockResolvedValueOnce({ rows: [{ reserved_by: 1 }] })
        .mockResolvedValueOnce();
      const response = await request(app)
        .post('/rpc')
        .send({ method: 'cancelReservation', params: { bookId: 1, userId: 1 }, id: 1, jsonrpc: '2.0' });
      expect(response.status).toBe(200);
      expect(response.body.result.message).toBe('Reservation cancelled successfully');
    });

    it('should handle unauthorized cancellation', async () => {
      // Mockear pool.query
      pool.query = jest.fn().mockResolvedValueOnce({ rows: [{ reserved_by: 2 }] });
      const response = await request(app)
        .post('/rpc')
        .send({ method: 'cancelReservation', params: { bookId: 1, userId: 1 }, id: 1, jsonrpc: '2.0' });
      expect(response.status).toBe(500);
      expect(response.body.error.message).toBe('Unauthorized action'); // Verifica el campo message
    });
  });
});
