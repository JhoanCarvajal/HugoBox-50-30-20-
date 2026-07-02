import { render, screen, fireEvent } from '@testing-library/react-native';
import { MoneyInput } from '../MoneyInput';

async function setup(props: Partial<React.ComponentProps<typeof MoneyInput>> = {}) {
  const onChangeValue = props.onChangeValue ?? jest.fn();
  await render(
    <MoneyInput
      testID="monto"
      value={props.value ?? ''}
      {...props}
      onChangeValue={onChangeValue}
    />,
  );
  return { onChangeValue, input: screen.getByTestId('monto') };
}

describe('MoneyInput', () => {
  it('muestra el prefijo de moneda por defecto', async () => {
    await setup();
    expect(screen.getByText('$')).toBeTruthy();
  });

  it('usa el placeholder por defecto cuando está vacío', async () => {
    const { input } = await setup({ value: '' });
    expect(input.props.value).toBe('');
    expect(input.props.placeholder).toBe('Ingresa un monto');
  });

  it('propaga el canónico al teclear dígitos', async () => {
    const { input, onChangeValue } = await setup({ value: '' });
    fireEvent.changeText(input, '1500');
    expect(onChangeValue).toHaveBeenCalledWith('1500');
  });

  it('normaliza el formato US al pegar', async () => {
    const { input, onChangeValue } = await setup({ value: '' });
    fireEvent.changeText(input, '1,500.00');
    expect(onChangeValue).toHaveBeenCalledWith('1500.00');
  });

  it('normaliza el formato EU al pegar', async () => {
    const { input, onChangeValue } = await setup({ value: '' });
    fireEvent.changeText(input, '1.500,00');
    expect(onChangeValue).toHaveBeenCalledWith('1500.00');
  });

  it('agrupa miles sin añadir decimales cuando no se teclearon', async () => {
    const { input } = await setup({ value: '1500' });
    expect(input.props.value).toBe('1,500');
  });

  it('muestra los decimales solo cuando se teclearon', async () => {
    const { input } = await setup({ value: '1500.5' });
    expect(input.props.value).toBe('1,500.5');
  });

  it('al perder foco elimina el punto decimal colgante', async () => {
    const { input, onChangeValue } = await setup({ value: '1500.' });
    fireEvent(input, 'blur');
    expect(onChangeValue).toHaveBeenCalledWith('1500');
  });

  it('usa teclado decimal', async () => {
    const { input } = await setup();
    expect(input.props.keyboardType).toBe('decimal-pad');
  });
});
