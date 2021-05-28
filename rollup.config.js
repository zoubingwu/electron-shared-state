import typescript from 'rollup-plugin-typescript2';
import { terser } from 'rollup-plugin-terser';
import resolve from '@rollup/plugin-node-resolve';

function config({ format, minify = true, input, ext = 'js' }) {
  const dir = `dist`;

  return {
    input: `./lib/${input}.ts`,
    output: {
      name: 'index',
      file: `${dir}/${input}.${format}.${ext}`,
      format,
      sourcemap: true,
    },
    plugins: [
      resolve(),
      typescript({
        clean: true,
        typescript: require('typescript'),
      }),

      minify
        ? terser({
            compress: true,
            mangle: true,
          })
        : undefined,
    ].filter(Boolean),
    external: ['electron'],
  };
}

require('rimraf').sync('dist');

export default [
  { input: 'index', format: 'esm' },
  { input: 'index', format: 'cjs' },
].map(config);
