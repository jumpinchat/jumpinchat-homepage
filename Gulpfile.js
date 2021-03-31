/**
 * Created by Zaccary on 24/03/2017.
 */

const gulp = require('gulp');
const log = require('fancy-log');
const sourcemaps = require('gulp-sourcemaps');
const sass = require('gulp-sass');
const autoprefixer = require('gulp-autoprefixer');
const gulpif = require('gulp-if');
const minifyEs = require('gulp-terser');
const babel = require('gulp-babel');
const path = require('path');
const vinylPaths = require('vinyl-paths');
const runSequence = require('run-sequence');
const del = require('del');
const csso = require('gulp-csso');
const imagemin = require('gulp-imagemin');
const pngquant = require('pngquant');
const mozJpeg = require('imagemin-mozjpeg');
const rev = require('gulp-rev');
const rollup = require('rollup');
const rollupBabel = require('rollup-plugin-babel');
const resolve = require('rollup-plugin-node-resolve');
const replace = require('rollup-plugin-replace');
const commonJs = require('rollup-plugin-commonjs');
const json = require('rollup-plugin-json');

const paths = {
  src: 'src',
  dist: 'public',
  tmp: '.tmp',
};


let cache;

// clean <tmp> directory
gulp.task('clean:tmp', () => gulp.src(path.join(paths.tmp, '*'))
  .pipe(vinylPaths(del)));

// clean <dist> directory
gulp.task('clean:dist', () => gulp.src(path.join(paths.dist, '*'))
  .pipe(vinylPaths(del)));

// watch for file changes and run injection and processing
gulp.task('watch', () => {
  gulp.watch(path.join(paths.src, 'js/**/*.js'), ['compile:js:watch']);
  gulp.watch(path.join(paths.src, 'styles/**/*.scss'), ['sass']);
  gulp.watch(
    [
      path.join(paths.src, 'styles/**/*.scss'),
      `!${path.join(paths.src, 'styles/site.scss')}`,
    ]);
  gulp.watch(`${paths.src}/images/**/*`, ['imagemin']);
});

const compileSass = (saveMaps) =>
  gulp.src([path.join(paths.src, 'styles/site.scss'), '!node_modules/**/*.scss'])
    .pipe(gulpif(saveMaps, sourcemaps.init({ loadMaps: true })))
    .pipe(sass().on('error', sass.logError))
    .pipe(autoprefixer())
    .pipe(gulpif(saveMaps, sourcemaps.write('./')))
    .pipe(gulp.dest(path.join(paths.dist, 'styles/')));

// compile sass/scss files and run autoprefixer on processed css
gulp.task('sass', () => compileSass(true));
gulp.task('sass:prod', () => compileSass(false));

gulp.task('csso', () => gulp.src(`${paths.dist}/**/*.css`)
  .pipe(csso())
  .pipe(gulp.dest(paths.dist)));


gulp.task('imagemin', () => gulp.src(path.join(paths.src, 'images/**/*'))
  .pipe(imagemin({
    progressive: true,
    svgoPlugins: [{ removeViewBox: false }],
    use: [pngquant(), mozJpeg({ quality: 60 })],
  }))
  .pipe(gulp.dest(`${paths.dist}/images`)));


gulp.task('babelify', () => gulp.src(`${paths.src}/**/*.js`)
  .pipe(sourcemaps.init())
  .pipe(babel({
    presets: ['es2015'],
  }))
  .pipe(sourcemaps.write('.'))
  .pipe(gulp.dest(paths.tmp)));

function compile(watch, esNext = false) {
  let babelConfig = {
    presets: [
      ['@babel/preset-env', {
        corejs: 3,
        useBuiltIns: 'usage',
        targets: {
          esmodules: false,
        },
      }],
    ],
  };
  let outputFilename = 'bundle.js';

  if (esNext || watch) {
    babelConfig = {
      presets: [
        ['@babel/preset-env', {
          corejs: 3,
          useBuiltIns: 'usage',
          targets: {
            esmodules: true,
          },
        }],
      ],
    };
    outputFilename = 'bundle.mjs';
  }

  const rollupConf = {
    input: './src/js/app.js',
    perf: true,
    onwarn: (message) => {
      if (message.code === 'CIRCULAR_DEPENDENCY') {
        return;
      }
      log.warn(message.message);
    },
    plugins: [
      resolve({
        jsnext: true,
        browser: true,
        preferBuiltins: false,
      }),
      json(),
      rollupBabel({
        ...babelConfig,
        ignore: ['node_modules'],
      }),
      replace({
        'process.env.NODE_ENV': `'${process.env.NODE_ENV}'`,
      }),
      commonJs({
        include: [
          'node_modules/**',
        ],
        exclude: [
          'node_modules/process-es6/**',
        ],
        namedExports: {
          'node_modules/react/index.js': ['Component', 'PureComponent', 'Fragment', 'Children', 'createElement'],
          'node_modules/react-dom/index.js': ['render'],
          'node_modules/events/events.js': ['EventEmitter'],
        },
      }),
    ],
  };

  let bundleStart;
  function rebundle() {
    log.info('-> bundling...');
    bundleStart = Date.now();
    return rollup.rollup({ ...rollupConf, cache })
      .then((bundle) => {
        cache = bundle.cache;
        const bundleDuration = (Date.now() - bundleStart) / 1000;

        log.info(`Bundle finished: ${bundleDuration.toFixed(2)}s`);

        return bundle.write({
          file: path.join(paths.dist, 'js', outputFilename),
          format: esNext ? 'esm' : 'iife',
          name: 'bundle',
          sourcemap: true,
        });
      });
  }

  return rebundle();
}

gulp.task('uglify', () => gulp.src(`${paths.dist}/**/*.{js,mjs}`)
  .pipe(minifyEs({
    output: {
      comments: /(?:^!|@(?:license|preserve|cc_on))/,
    },
    warnings: true,
  }))
  .pipe(gulp.dest(paths.dist)));

gulp.task('revision',
  () => gulp.src([path.join(paths.dist, '**/*.css'), path.join(paths.dist, '**/*.{js,mjs}')])
    .pipe(rev())
    .pipe(gulp.dest(paths.dist))
    .pipe(rev.manifest())
    .pipe(gulp.dest(paths.dist)));


gulp.task('compile:js', () => compile());
gulp.task('compile:js:esNext', () => compile(false, true));
gulp.task('compile:js:watch', () => compile(true));


gulp.task('build', done => runSequence(
  ['clean:dist'],
  ['compile:js', 'compile:js:esNext'],
  ['sass:prod', 'imagemin'],
  ['csso', 'uglify'],
  'revision',
  done,
));

gulp.task('watchify', done => runSequence(
  'clean:dist',
  ['compile:js:watch', 'sass', 'imagemin'],
  'revision',
  'watch',
  done,
));
