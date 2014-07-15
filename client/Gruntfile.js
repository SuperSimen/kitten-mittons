module.exports = function(grunt) {

	grunt.initConfig({
		jshint: {
			files: ['Gruntfile.js', 'app/**/*.js'],
			options: {
				globals: {
					console: true,
					module: true
				}
			}
		},
		watch: {
			files: ['<%= jshint.files %>', 'app/**/*.html', 'index.tpl.html', 'bower.json', 'css/*.css'],
			tasks: ['jshint', 'includeSource' ,'wiredep'],
			options: {
				livereload: {
					key: grunt.file.read('../server/auth/server.key'),
					cert: grunt.file.read('../server/auth/server.crt')
				},
			},
		},
		wiredep: {
			target: {
				src: [
					'index.html',
				],
			}
		},
		includeSource: {
			target: {
				files: {
					'index.html': 'index.tpl.html'
				}
			}
		},
		plato: {
			your_task: {
				files: {
					'report/output/directory': ['app/**/*.js'],
				}
			},
		},
		open : {
			report : {
				path: 'file://localhost/Users/Simen/Dropbox/UNINETT/kitten-mittons/client/report/output/directory/index.html',
				app: 'Google Chrome'
			}
		}
	});

	grunt.loadNpmTasks('grunt-contrib-watch');
	grunt.loadNpmTasks('grunt-contrib-jshint');
	grunt.loadNpmTasks('grunt-wiredep');
	grunt.loadNpmTasks('grunt-include-source');
	grunt.loadNpmTasks('grunt-plato');
	grunt.loadNpmTasks('grunt-open');

	grunt.registerTask('default', ['jshint', 'includeSource' ,'wiredep']);
	grunt.registerTask('report', ['plato', 'open']);
};
