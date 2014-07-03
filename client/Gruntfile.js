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
			files: ['<%= jshint.files %>', 'app/**/*.html', 'index.tpl.html'],
			tasks: ['jshint', 'includeSource' ,'wiredep'],
			options: {
				livereload: true,
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
			options: {
				templates: {
					html: {
						js: '<script src="{filePath}"></script>',
					}
				}
			},
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
