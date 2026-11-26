import { describe, it, expect, vi } from 'vitest';
import { EventBus } from '../../src/core/events/EventBus';

type Events = { ping: { n: number }; pong: undefined };

describe('EventBus (EVT-1)', () => {
  it('EVT-1: emite a suscriptores y permite desuscribir', () => {
    const bus = new EventBus<Events>();
    const fn = vi.fn();
    const off = bus.on('ping', fn);
    bus.emit('ping', { n: 1 });
    off();
    bus.emit('ping', { n: 2 });
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith({ n: 1 });
  });
  it('EVT-1: un handler que falla no corta a los demás', () => {
    const bus = new EventBus<Events>();
    const ok = vi.fn();
    bus.on('pong', () => { throw new Error('x'); });
    bus.on('pong', ok);
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    bus.emit('pong', undefined);
    expect(ok).toHaveBeenCalled();
    err.mockRestore();
  });
});
