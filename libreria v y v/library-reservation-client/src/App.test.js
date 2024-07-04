import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from './App';

// Mock global fetch function
beforeEach(() => {
  global.fetch = jest.fn((url, options) => {
    if (url.endsWith('/login')) {
      return Promise.resolve({
        json: () => Promise.resolve({
          message: 'Login successful',
          user: { id: 1, username: 'testuser' }
        })
      });
    } else if (url.endsWith('/rpc')) {
      const { method } = JSON.parse(options.body);
      if (method === 'getBooks') {
        return Promise.resolve({
          json: () => Promise.resolve({
            result: [
              { id: 1, title: 'Test Book', author: 'Test Author' }
            ]
          })
        });
      } else if (method === 'reserveBook') {
        return Promise.resolve({
          json: () => Promise.resolve({
            result: { message: 'Book reserved successfully' }
          })
        });
      } else if (method === 'cancelReservation') {
        return Promise.resolve({
          json: () => Promise.resolve({
            result: { message: 'Reservation cancelled successfully' }
          })
        });
      }
    }
    return Promise.reject(new Error('Unknown endpoint'));
  });
});

afterEach(() => {
  global.fetch.mockRestore();
});

// Mock window.alert
beforeAll(() => {
  global.alert = jest.fn();
});

afterAll(() => {
  global.alert.mockRestore();
});

describe('Componente App', () => {
  test('renderiza la página de inicio', async () => {
    render(<App />);
    expect(await screen.findByText('Welcome to the Home page!')).toBeInTheDocument();
  });

  test('permite al usuario iniciar sesión', async () => {
    render(<App />);
    fireEvent.click(screen.getByRole('link', { name: /login/i }));
    const usernameInput = await screen.findByLabelText('Username:');
    const passwordInput = await screen.findByLabelText('Password:');
    expect(usernameInput).toBeInTheDocument();
    expect(passwordInput).toBeInTheDocument();
  });

  test('permite al usuario registrarse', async () => {
    render(<App />);
    fireEvent.click(screen.getByRole('link', { name: /register/i }));
    const usernameInput = await screen.findByLabelText('Username:');
    const passwordInput = await screen.findByLabelText('Password:');
    expect(usernameInput).toBeInTheDocument();
    expect(passwordInput).toBeInTheDocument();
  });

  test('muestra los libros en el panel de control', async () => {
    render(<App />);
    fireEvent.click(screen.getByRole('link', { name: /login/i }));
    const usernameInput = await screen.findByLabelText('Username:');
    const passwordInput = await screen.findByLabelText('Password:');
    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(passwordInput, { target: { value: 'testpassword' } });
    fireEvent.submit(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /dashboard/i })).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText((content, element) => {
        return element.tagName.toLowerCase() === 'span' && content.includes('Test Book by Test Author');
      })).toBeInTheDocument();
    });
  });

  test('permite al usuario reservar un libro', async () => {
    render(<App />);

    // Simula el login del usuario
    fireEvent.click(screen.getByRole('link', { name: /login/i }));
    const usernameInput = await screen.findByLabelText('Username:');
    const passwordInput = await screen.findByLabelText('Password:');
    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(passwordInput, { target: { value: 'testpassword' } });
    fireEvent.submit(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /dashboard/i })).toBeInTheDocument();
    });

    const reserveButton = await screen.findByRole('button', { name: /reserve/i });
    fireEvent.click(reserveButton);

    await waitFor(() => {
      expect(screen.getByTestId('success-message')).toHaveTextContent('Reservation successful');
    });

    // Verificar el cambio en el estado del libro reservado
    const cancelButton = await screen.findByRole('button', { name: /cancel reservation/i });
    expect(cancelButton).toBeInTheDocument();
  });

  test('permite al usuario cancelar una reserva', async () => {
    render(<App />);

    // Simula el login del usuario
    fireEvent.click(screen.getByRole('link', { name: /login/i }));
    const usernameInput = await screen.findByLabelText('Username:');
    const passwordInput = await screen.findByLabelText('Password:');
    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(passwordInput, { target: { value: 'testpassword' } });
    fireEvent.submit(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /dashboard/i })).toBeInTheDocument();
    });

    const reserveButton = await screen.findByRole('button', { name: /reserve/i });
    fireEvent.click(reserveButton);

    await waitFor(() => {
      expect(screen.getByTestId('success-message')).toHaveTextContent('Reservation successful');
    });

    const cancelReservationButton = await screen.findByRole('button', { name: /cancel reservation/i });
    fireEvent.click(cancelReservationButton);

    await waitFor(() => {
      expect(screen.getByTestId('success-message')).toHaveTextContent('Cancellation successful');
    });

    // Verificar que el botón de reserva esté presente nuevamente
    const reserveButtonAgain = await screen.findByRole('button', { name: /reserve/i });
    expect(reserveButtonAgain).toBeInTheDocument();
  });

  test('muestra un mensaje de error si el login falla', async () => {
    // Simula una falla en el login
    global.fetch.mockImplementationOnce(() =>
      Promise.resolve({
        json: () => Promise.resolve({ message: 'Login failed' })
      })
    );
  
    render(<App />);
    fireEvent.click(screen.getByRole('link', { name: /login/i }));
    const usernameInput = await screen.findByLabelText('Username:');
    const passwordInput = await screen.findByLabelText('Password:');
    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(passwordInput, { target: { value: 'testpassword' } });
    fireEvent.submit(screen.getByRole('button', { name: /login/i }));
  
    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith('Login failed');
    });
  });

  test('muestra un mensaje de error si la obtención de libros falla', async () => {
    // Simula una falla al obtener los libros
    global.fetch.mockImplementationOnce(() =>
      Promise.resolve({
        json: () => Promise.resolve({ error: { message: 'Failed to fetch books' } })
      })
    );

    render(<App />);
    fireEvent.click(screen.getByRole('link', { name: /login/i }));
    const usernameInput = await screen.findByLabelText('Username:');
    const passwordInput = await screen.findByLabelText('Password:');
    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(passwordInput, { target: { value: 'testpassword' } });
    fireEvent.submit(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /dashboard/i })).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByTestId('error-message')).toHaveTextContent('Error fetching books: Failed to fetch books');
    });
  });

  test('muestra un mensaje de error si la reserva de un libro falla', async () => {
    // Simula una falla al reservar un libro
    global.fetch.mockImplementationOnce(() =>
      Promise.resolve({
        json: () => Promise.resolve({ error: { message: 'Failed to reserve book' } })
      })
    );
  
    render(<App />);
    fireEvent.click(screen.getByRole('link', { name: /login/i }));
    const usernameInput = await screen.findByLabelText('Username:');
    const passwordInput = await screen.findByLabelText('Password:');
    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(passwordInput, { target: { value: 'testpassword' } });
    fireEvent.submit(screen.getByRole('button', { name: /login/i }));
  
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /dashboard/i })).toBeInTheDocument();
    });
  
    const reserveButton = await screen.findByRole('button', { name: /reserve/i });
    fireEvent.click(reserveButton);
  
    await waitFor(() => {
      expect(screen.getByTestId('error-message')).toHaveTextContent('Reservation failed: Failed to reserve book');
    });
  });

  test('muestra un mensaje de error si la cancelación de una reserva falla', async () => {
    // Simula una falla al cancelar una reserva
    global.fetch.mockImplementationOnce(() =>
      Promise.resolve({
        json: () => Promise.resolve({ error: { message: 'Failed to cancel reservation' } })
      })
    );
  
    render(<App />);
    fireEvent.click(screen.getByRole('link', { name: /login/i }));
    const usernameInput = await screen.findByLabelText('Username:');
    const passwordInput = await screen.findByLabelText('Password:');
    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(passwordInput, { target: { value: 'testpassword' } });
    fireEvent.submit(screen.getByRole('button', { name: /login/i }));
  
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /dashboard/i })).toBeInTheDocument();
    });
  
    const reserveButton = await screen.findByRole('button', { name: /reserve/i });
    fireEvent.click(reserveButton);
  
    await waitFor(() => {
      expect(screen.getByTestId('success-message')).toHaveTextContent('Reservation successful');
    });
  
    const cancelReservationButton = await screen.findByRole('button', { name: /cancel reservation/i });
    fireEvent.click(cancelReservationButton);
  
    await waitFor(() => {
      expect(screen.getByTestId('error-message')).toHaveTextContent('Cancellation failed: Failed to cancel reservation');
    });
  });
});



