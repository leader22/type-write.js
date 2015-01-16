(function() {
    'use strict';

    var gulp   = require('gulp');
    var uglify = require('gulp-uglify');
    var rename = require('gulp-rename');
    var header  = require('gulp-header');
    var pkg     = require('./package.json');

    var BANNER = '/*! <%= name %> / @version:<%= version %> @author:<%= author %> @license:<%= license %> */ \n';

    gulp.task('uglify', function() {
        gulp.src([ 'src/type-write.js' ])
            .pipe(uglify({
                mangle: true,
                compress: {
                    drop_console: true,
                    drop_debugger: true
                }
            }))
            .pipe(header(BANNER, pkg))
            .pipe(rename({ extname: '.min.js' }))
            .pipe(gulp.dest('dist/'));
    });

    gulp.task('default', ['uglify']);

}());
