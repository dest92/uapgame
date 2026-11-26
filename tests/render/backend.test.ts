import { describe, it, expect } from 'vitest';
import { chooseBackend } from '../../src/render/backend';

describe('chooseBackend (RND-1/2)', () => {
  it('RND-1: WebGPU si hay navigator.gpu y adaptador', () => {
    expect(chooseBackend({ hasNavigatorGpu: true, adapterAvailable: true, query: '' })).toBe('webgpu');
  });
  it('RND-1: WebGL2 si no hay adaptador o API', () => {
    expect(chooseBackend({ hasNavigatorGpu: true, adapterAvailable: false, query: '' })).toBe('webgl2');
    expect(chooseBackend({ hasNavigatorGpu: false, adapterAvailable: false, query: '' })).toBe('webgl2');
  });
  it('RND-2: ?backend=webgl fuerza WebGL2', () => {
    expect(chooseBackend({ hasNavigatorGpu: true, adapterAvailable: true, query: '?backend=webgl' })).toBe('webgl2');
  });
});
