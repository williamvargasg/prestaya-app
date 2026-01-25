import { render, screen } from '@testing-library/react';
import App from './App';

test('muestra el estado de carga inicial', () => {
  render(<App />);
  const loadingElement = screen.getByText(/Cargando.../i);
  expect(loadingElement).toBeInTheDocument();
});
