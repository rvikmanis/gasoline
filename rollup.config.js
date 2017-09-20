import babel from 'rollup-plugin-babel'
import babelrc from 'babelrc-rollup'
import nodeResolve from 'rollup-plugin-node-resolve'
import commonJs from 'rollup-plugin-commonjs'
import builtins from 'rollup-plugin-node-builtins'

const dependencies = require('./package.json').dependencies

const plugins = [
  builtins(),
  nodeResolve({
    module: true,
    jsnext: true,
    main: true,
  }),
  commonJs(),
  babel(Object.assign(
    {},
    babelrc({ addModuleOptions: false }),
    { include: 'build/step-1/**' }
  )),
]

const configuration = {
  input: 'build/step-1/index.js',
  plugins,
  external: Object.keys(dependencies),
  globals: { rxjs: 'Rx', react: "React" },
  output: [
    {
      file: 'build/step-2/gasoline.js',
      format: 'umd',
      name: 'gasoline',
      sourcemap: true,
    },
    {
      file: 'build/step-2/gasoline.mjs',
      format: 'es',
      sourcemap: true,
    },
  ],
}

export default configuration
