/*
* gulp开发版本配置
*/
var gulp = require("gulp"),                                 //gulp基础库
    os = require('os'),                                     //获取操作系统对象
    jshint = require("gulp-jshint"),                        //审查js代码
    uglify = require("gulp-uglify"),                        //压缩js代码
    stylelish = require("jshint-stylish"),                  //js错误信息高亮显示
    csslint = require("gulp-csslint"),                      //审查css代码
    less = require("gulp-less"),                            //将less编译成css
    minifycss = require("gulp-clean-css"),                  //压缩css文件
    htmlmin = require("gulp-htmlmin"),                      //压缩html文件
    imagemin = require("gulp-imagemin"),                    //压缩图片
    header = require("gulp-header"),                        //用来在压缩后的JS、CSS文件中添加头部注释
    spritesmith = require("gulp.spritesmith"),              //合并sprite小图片，生成单独的css和一张大图
    spriter = require("gulp-css-spriter"),                  //将sprite图合并生成样式文件
    base64 = require("gulp-css-base64"),                    //把小图片的URL替换为Base64编码图片
    concat = require("gulp-concat"),                        //文件合并
    rename = require("gulp-rename"),                        //文件重命名
    jeditor = require("gulp-json-editor"),                  //编辑json对象
    merge = require('merge-stream'),                        //将多个流合并成一个返回
    rev = require("gulp-rev"),                              //加MD5版本号生成无缓存文件
    md5 = require('gulp-md5-plus'),                         //给页面引用的js,css,图片引用路径加MD5
    revReplace = require("gulp-rev-replace"),               //重写加了MD5的文件名
    clean = require("gulp-clean"),                          //清除文件
    revCollector = require("gulp-rev-collector"),           //根据map文件替换页面引用文件
    gutil = require("gulp-util"),                            //提供很多常用函数
    usemin = require("gulp-usemin"),                        //文件合并到指定的目录，将样式和脚本直接嵌入到页面中，移除部分文件，为文件执行各种任务
    useref = require("gulp-useref"),                        //合并html中引入的静态文件
    fileinclude = require("gulp-file-include"),             //在html中引入模板文件
    runSequence = require("run-sequence"),                  //串行依次执行任务
    filter = require("gulp-filter"),                        //把stream里的文件根据一定的规则进行筛选过滤
    gulpOpen = require('gulp-open'),                        //自动在浏览器打开页面
    print = require("gulp-print"),                          //打印出stream里面的所有文件名
    plumber = require("gulp-plumber"),                      //一旦pipe中的某一steam报错了，保证下面的steam还继续执行
    inject = require("gulp-inject"),                        //指定需要插入html引用文件的列表
    gulpExpress = require("gulp-express"),                  //express服务器自动刷新
    connect = require("gulp-connect"),                      //web服务器
    webpack = require("webpack"),                           //webpack基础库
    webpackConfig = require('./webpack.config.js');         //引入webpack的配置文件

var host = {
    path: "src/static/",
    port: 3000,
    html: "index.html"
};

//配置打开的浏览器，mac chrome: "Google chrome"
var browser = os.platform() === "linux" ? "Google chrome" : (
    os.platform() === "darwin" ? "Google chrome" : (
        os.platform() === "win32" ? "chrome" : "firefox"
    )
);

//将字体拷贝到目标文件夹
gulp.task("copy:fonts", function () {
    return gulp.src(["bower_components/font-awesome/fonts/**"])
        .pipe(gulp.dest("src/static/fonts/"));
});

//将图片拷贝到目标目录
gulp.task("copy:images", function () {
    return gulp.src("src/assets/images/**/*")
        .pipe(imagemin())
        .pipe(gulp.dest("src/static/images"));
});

//压缩合并样式文件，包括先把less文件编译成css和引入的第三方css
gulp.task("build-css", function () {
    var cssFilter = filter("src/**/default.css", {restore: true}),
        lessFilter = filter("src/**/main.less", {restore: true}),
        cssOptions = {
            keepSpecialComments: 0                  //删除所有注释
        };
    return gulp.src("src/assets/css/*.{css,less}")
        .pipe(cssFilter)
        .pipe(concat("components.min.css"))
        .pipe(minifycss(cssOptions))
        .pipe(cssFilter.restore)
        .pipe(lessFilter)
        .pipe(less())
        .pipe(plumber())
        .pipe(concat("style.min.css"))
        .pipe(minifycss(cssOptions))
        .pipe(plumber.stop())
        .pipe(lessFilter.restore)
        .pipe(gulp.dest("src/static/css/"))
        .pipe(connect.reload());
});

//在html文件中引入include文件
gulp.task("build-html", ["build-css"], function () {
    var source = gulp.src(["src/static/css/*.css"], {read: false}),
        injectOp = {
            ignorePath: "/src/static/",
            removeTags: true,
            addRootSlash: false
        },
        options = {
            removeComments: true,                   //清除html注释
            collapseBooleanAttributes: true,        //省略布尔属性值
            collapseWhitespace: true,               //压缩HTML
            preserveLineBreaks: true,               //每行保持一个换行符
            removeEmptyAttributes: true,            //删除所有空格作为属性值
            removeScriptTypeAttributes: true,       //删除script的type属性
            removeStyleTypeAttributes: true,        //删除link的type属性
            minifyJS: true,                         //压缩页面js
            minifyCSS: true                         //压缩页面css
        };
    return gulp.src(["src/views/*.html"])
        .pipe(fileinclude({
            prefix: '@@',
            basepath: '@file'
        }))
        .pipe(inject(source, injectOp))
        .pipe(usemin())
        .pipe(htmlmin(options))
        .pipe(gulp.dest("src/static/"))
        .pipe(connect.reload());
});

//雪碧图操作，先拷贝图片合并压缩css
gulp.task("sprite", ["copy:images", "build-css"], function () {
    var timestamp = +new Date();
    return gulp.src("src/static/css/style.min.css")
        .pipe(spriter({
            //生成sprite的位置
            spriteSheet: "src/static/images/spritesheet" + timestamp + ".png",
            //修改样式文件引用图片地址路径
            pathToSpriteSheetFromCSS: "../images/spritesheet" +timestamp + ".png",
            spritesmithOptions: {
                padding: 10
            }
        }))
        .pipe(base64())
        .pipe(gulp.dest("src/static/css/"));
});

//引用webpack对js进行操作
var myDevConfig = Object.create(webpackConfig);
var devCompiler = webpack(myDevConfig);
gulp.task("build-js", ['build-html'], function(callback) {
    devCompiler.run(function(err, stats) {
        if(err) throw new gutil.PluginError("webpack:build-js", err);
        gutil.log("[webpack:build-js]", stats.toString({
            colors: true
        }));
        callback();
    });
});

//css,js文件加MD5，并修改html中的引用路径
gulp.task("md5:files", ["sprite", "build-js"], function () {
    var stream1 = function () {
            return gulp.src('src/static/css/*.css')
                .pipe(plugins.md5Plus(10, 'src/static/*.html'))
                .pipe(gulp.dest('src/static/css'));
        },
        stream2 = function () {
            return gulp.src('src/static/js/*.js')
                .pipe(plugins.md5Plus(10, 'src/static/*.html'))
                .pipe(gulp.dest('src/static/js'));
        };
    return merge(stream1(), stream2());
});

//清除文件
gulp.task('clean', function () {
    return gulp.src(['src/static'])
        .pipe(clean());
});

//监听文件变化
gulp.task('watch', function () {
    gulp.watch('src/assets/css/**', ["build-css"]);
    gulp.watch('src/assets/js/**', ['build-js']);
    gulp.watch('src/views/*.html', ['build-html']);
    gulp.watch('src/views/include/**', ['build-html']);
});

//定义web服务器
gulp.task('connect', function () {
    connect.server({
        root: host.path,
        port: host.port,
        livereload: true
    });
    console.log('========服务器已启动=======');
});

//自动在浏览器发开页面
gulp.task('open', function () {
    return gulp.src('')
        .pipe(gulpOpen({
            app: browser,
            uri: 'http://localhost:3000'
        }));
});

//执行默认任务
gulp.task('default', function(){
    runSequence("clean", "build-css", "build-html", "build-js", ["copy:images", "copy:fonts"]);
});

//启动服务
gulp.task("start", function(){
    runSequence("watch", "connect", "open");
});

//开发
gulp.task('dev', function(){
    runSequence("clean", "build-css", "build-html", "build-js", ["copy:images", "copy:fonts"], "watch", "connect", "open");
});

//开发加MD5
gulp.task('md5', function () {
    runSequence('clean', 'build-css', 'build-html', 'build-js', ['copy:images', 'copy:fonts'], 'sprite', 'md5:files', 'watch', 'connect', 'open');
});
