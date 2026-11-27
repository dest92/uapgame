import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

/** Reglas de capas: el dominio y el código compartido no conocen motores ni DOM de render. */
const ENGINE_LIBS = [
  { group: ['three', 'three/*'], message: 'Esta capa no puede depender de Three.js.' },
  { group: ['@dimforge/*'], message: 'Esta capa no puede depender de Rapier.' },
];
/** Rutas relativas a capas de infraestructura de src/ (no afecta a @shared/*). */
const infra = (...names) => names.flatMap((n) => [`../${n}/**`, `../../${n}/**`, `../../../${n}/**`]);
const layer = (files, patterns) => ({
  files,
  rules: { 'no-restricted-imports': ['error', { patterns }] },
});

export default tseslint.config(
  { ignores: ['dist/**', 'dist-artifact/**', 'node_modules/**', 'public/**', 'coverage/**', 'reference/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  { files: ['tools/**/*.{ts,mjs}', '*.{js,ts}', 'vite-plugins/**/*.ts'], languageOptions: { globals: globals.node } },
  { files: ['src/**/*.ts'], languageOptions: { globals: globals.browser } },
  // Los callbacks de page.evaluate() corren en el navegador.
  { files: ['tools/e2e/**/*.mjs'], languageOptions: { globals: { ...globals.node, ...globals.browser } } },
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'max-lines': ['warn', { max: 300, skipBlankLines: true, skipComments: true }],
    },
  },
  layer(['shared/**/*.ts'], [
    ...ENGINE_LIBS,
    { group: ['**/src/**', '**/tools/**'], message: 'shared/ no depende de src/ ni tools/.' },
  ]),
  layer(['src/domain/**/*.ts', 'src/core/**/*.ts'], [
    ...ENGINE_LIBS,
    { group: infra('render', 'world', 'physics', 'player', 'ui', 'gameplay', 'app'), message: 'domain/core no dependen de capas de infraestructura.' },
  ]),
  layer(['src/ui/**/*.ts'], [
    ...ENGINE_LIBS,
    { group: infra('render', 'physics', 'world', 'player'), message: 'La UI solo conoce domain/core.' },
  ]),
  layer(['src/physics/**/*.ts'], [
    { group: ['three', 'three/*'], message: 'La física no depende del render.' },
    { group: infra('render', 'ui'), message: 'La física no depende del render ni la UI.' },
  ]),
);
