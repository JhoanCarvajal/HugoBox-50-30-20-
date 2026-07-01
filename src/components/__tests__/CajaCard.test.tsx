import { render } from '@testing-library/react-native';
import { CajaCard } from '../CajaCard';
import { Caja } from '../../types/models';

const cajaBase: Caja = {
  id: '1',
  nombre: 'Gastos',
  porcentaje: 50,
  saldo: 12345,
  esPorDefecto: true,
  orden: 0,
  createdAt: 1,
};

describe('CajaCard', () => {
  it('muestra el nombre, el porcentaje y el saldo de la caja', async () => {
    const { getByText } = await render(<CajaCard caja={cajaBase} />);

    expect(getByText('Gastos')).toBeTruthy();
    expect(getByText('50%')).toBeTruthy();

    // No asveramos el string de moneda carácter por carácter: formatearMoneda usa
    // Intl.NumberFormat('es-CO', { currency: 'COP' }), cuyo formato exacto (símbolo,
    // separadores de miles/decimales) puede variar según los datos ICU disponibles
    // en el entorno de Node/Jest. En su lugar verificamos de forma tolerante que el
    // saldo en centavos (12345) se representa con sus dígitos significativos ("123")
    // en algún texto renderizado, sin asumir formato exacto.
    expect(getByText(/123/)).toBeTruthy();
  });

  it('renderiza un saldo negativo sin romper, con estilo de color rojo', async () => {
    const cajaNegativa: Caja = { ...cajaBase, saldo: -500 };
    const { toJSON, getAllByText } = await render(<CajaCard caja={cajaNegativa} />);

    expect(toJSON()).toBeTruthy();

    // Verificación opcional del estilo: entre todos los textos renderizados, al menos
    // uno (el del saldo) debe incluir el color rojo (#d32f2f) del estilo `neg` que se
    // aplica cuando el saldo es negativo.
    const textos = getAllByText(/./);
    const saldoConEstiloRojo = textos.some((t) => {
      const estilos = Array.isArray(t.props.style) ? t.props.style.flat() : [t.props.style];
      return estilos.some((st) => st && st.color === '#d32f2f');
    });
    expect(saldoConEstiloRojo).toBe(true);
  });
});
