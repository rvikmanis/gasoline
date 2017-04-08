import babel from 'rollup-plugin-babel';
import babelrc from 'babelrc-rollup';
import nodeResolve from 'rollup-plugin-node-resolve'
import commonJs from 'rollup-plugin-commonjs'

let pkg = require('./package.json');
let external = [
  'react', 'lodash',
  'recompose', 'react-redux',
  'redux', 'reselect'
];

let plugins = [
  nodeResolve({
    module: true,
    jsnext: true,
    main: true
  }),
  commonJs({
    namedExports: {
      'node_modules/lodash/fp.js': [
        'mapValues', 'get', 'omit', 'keys', 'sortBy', 'map',
        'compose', 'set', 'isEqual', 'reduce', 'some', 'identity',
        'memoize', 'findLast'
      ],
      'node_modules/react/react.js': [
        'Children', 'Component', 'PropTypes',
        'createElement'
      ]
    },
    include: 'node_modules/**'
  }),
  babel(babelrc({ addModuleOptions: false }))
]

let configuration = {
  entry: 'src/index.js',
  plugins: plugins,
  external: external,
  targets: [
    {
      dest: pkg['main'],
      format: 'cjs',
      // moduleName: 'Gasoline',
      sourceMap: true
    },
    {
      dest: pkg['jsnext:main'],
      format: 'es',
      sourceMap: true
    }
  ]
};

export default configuration
