// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { DebouncedInput } from './DebouncedInput';

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('DebouncedInput', () => {
  it('no emite al montarse: el valor inicial ya es el de la búsqueda', () => {
    const onChange = vi.fn();
    render(<DebouncedInput value='' onChange={onChange} slotProps={{ htmlInput: { 'aria-label': 'Buscar' } }} />);

    act(() => vi.advanceTimersByTime(1_000));

    expect(onChange).not.toHaveBeenCalled();
  });

  it('emite una vez lo escrito al pasar la espera, y no otra vez cuando el padre lo devuelve como valor', () => {
    const onChange = vi.fn();
    const { rerender } = render(<DebouncedInput value='' onChange={onChange} debounce={300} slotProps={{ htmlInput: { 'aria-label': 'Buscar' } }} />);

    fireEvent.change(screen.getByLabelText('Buscar'), { target: { value: 'ana' } });
    act(() => vi.advanceTimersByTime(299));
    expect(onChange).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(onChange).toHaveBeenCalledWith('ana');

    rerender(<DebouncedInput value='ana' onChange={onChange} debounce={300} slotProps={{ htmlInput: { 'aria-label': 'Buscar' } }} />);
    act(() => vi.advanceTimersByTime(1_000));
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});
