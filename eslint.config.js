import { defineConfig } from 'eslint/config';
import { createBaseConfig } from '@wattry/tsconfig/eslint';

const files = ['**/*.ts'];
const ignores = ['dist/**/*', 'node_modules/**/*'];

export default defineConfig(
  createBaseConfig(import.meta, { files, ignores })
);

