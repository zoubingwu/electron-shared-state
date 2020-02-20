import typescript from 'rollup-plugin-typescript2';
import { terser } from 'rollup-plugin-terser';

function config({ format, minify, input, ext = 'js' }) {
  const dir = `dist/`;
  const minifierSuffix = minify ? '.min' : '';
  return {
    input: `./lib/${input}.ts`,
    output: {
      name: 'index',
      file: `${dir}/${input}.${format}${minifierSuffix}.${ext}`,
      format,
      sourcemap: true,
    },
    plugins: [
      typescript({
        clean: true,
        typescript: require('typescript'),
        tsconfigOverride: {
          compilerOptions: {
            sourceMap: true,
          },
        },
      }),
      minify
        ? terser({
            sourcemap: true,
            compress: true,
            mangle: true,
          })
        : undefined,
    ].filter(Boolean),
  };
}

require('rimraf').sync('dist');

export default [
  { input: 'index', format: 'esm', minify: true, ext: 'mjs' },
  { input: 'index', format: 'cjs', minify: true },
].map(config);
