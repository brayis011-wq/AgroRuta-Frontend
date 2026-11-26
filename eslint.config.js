// @ts-check
const eslint = require('@eslint/js');
const { defineConfig } = require('eslint/config');
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');

module.exports = defineConfig([
  {
    files: ['**/*.ts'],
    extends: [
      eslint.configs.recommended,
      tseslint.configs.recommended,
      tseslint.configs.stylistic,
      angular.configs.tsRecommended,
    ],
    processor: angular.processInlineTemplates,
    rules: {
      // Las directivas propias empiezan por "ar" (AgroRuta): [arContar], [arPrecargar]...
      '@angular-eslint/directive-selector': [
        'error',
        { type: 'attribute', prefix: 'ar', style: 'camelCase' },
      ],
      '@angular-eslint/component-selector': [
        'error',
        { type: 'element', prefix: 'app', style: 'kebab-case' },
      ],
      // "_" al inicio = se ignora a propósito (p. ej. al quitar una propiedad con desestructuración)
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
    },
  },
  {
    // En las pruebas los dobles de servicios usan any y funciones vacías
    files: ['**/*.spec.ts', 'src/test-*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-empty-function': 'off',
    },
  },
  {
    files: ['**/*.html'],
    extends: [angular.configs.templateRecommended, angular.configs.templateAccessibility],
    rules: {
      // "x == null" cubre null y undefined a la vez; el resto, con ===
      '@angular-eslint/template/eqeqeq': ['error', { allowNullOrUndefined: true }],
      // Fondos de paneles y tarjetas que también tienen su botón: avisar, no bloquear
      '@angular-eslint/template/click-events-have-key-events': 'warn',
      '@angular-eslint/template/interactive-supports-focus': 'warn',
    },
  },
]);
