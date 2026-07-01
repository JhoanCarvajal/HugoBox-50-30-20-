import { Text } from 'react-native';
import { render, screen, userEvent } from '@testing-library/react-native';
import { ErrorBoundary } from '../ErrorBoundary';

// Componente cuyo comportamiento (lanzar o no) se controla desde afuera con
// una variable de módulo, para poder simular que tras "Reintentar" el árbol
// de hijos ya no falla (p.ej. porque el estado que causaba el error cambió).
let lanzar = true;
function Flaky() {
  if (lanzar) {
    throw new Error('Fallo simulado de render');
  }
  return <Text>Contenido recuperado</Text>;
}

describe('ErrorBoundary', () => {
  // React (y React Native) imprimen un console.error esperado cuando un hijo
  // lanza durante el render (así es como React reporta el error internamente
  // antes de que el boundary lo capture). Se silencia aquí y se restaura al
  // final para no ensuciar la salida de la suite con ruido esperado.
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    lanzar = true;
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('cuando un hijo lanza durante el render, muestra "Algo salió mal" y el mensaje del error', async () => {
    await render(
      <ErrorBoundary>
        <Flaky />
      </ErrorBoundary>,
    );

    expect(screen.getByText('Algo salió mal')).toBeTruthy();
    expect(screen.getByText('Fallo simulado de render')).toBeTruthy();
  });

  it('el botón "Reintentar" existe, es presionable y limpia el error para volver a renderizar el contenido', async () => {
    await render(
      <ErrorBoundary>
        <Flaky />
      </ErrorBoundary>,
    );

    const botonReintentar = screen.getByText('Reintentar');
    expect(botonReintentar).toBeTruthy();

    // El hijo deja de lanzar antes de reintentar, simulando que la condición
    // que causaba el error ya no aplica (p.ej. datos corregidos).
    lanzar = false;
    const user = userEvent.setup();
    await user.press(botonReintentar);

    expect(screen.getByText('Contenido recuperado')).toBeTruthy();
    expect(screen.queryByText('Algo salió mal')).toBeNull();
  });
});
