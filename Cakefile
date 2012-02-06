fs     = require 'fs'
{exec} = require 'child_process'

task 'build', 'Build JS files from Coffee sources', ->

  exec 'coffee -c -o js/ src/', (err, stdout, stderr) ->
    throw err if err
    console.log stdout + stderr

  exec 'coffee -c test/node_dirty_query_test.coffee', (err, stdout, stderr) ->
    throw err if err
    console.log stdout + stderr

task "test", "Test the code", ->
  path = require 'path'
  reporter = require('nodeunit').reporters.default

  reporter.run ["test/node_dirty_query_test.js"]