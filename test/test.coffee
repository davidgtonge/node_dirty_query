_ = require "underscore"
db = require("dirty")('test.db')
{query} = require "../src/node_dirty_query.coffee"
request = require "request"
fs = require "fs"


get_sample_data = ->
  request "http://catalogue.data.gov.uk/dump/data.gov.uk-ckan-meta-data-2012-02-05.json.zip", (req, resp) ->
    reader = z.Reader(resp)
    for doc in JSON.parse reader.toObject('utf-8')
      db.set _.uniqueId('gov_'), doc

    console.log db.length


time = -> (new Date).getTime()
pgm_init = time()

db.on "drain", -> console.log "data written to disk"
db.on "load", (length) ->
  loaded = time()
  console.log "#{length} records read from disk in #{loaded - pgm_init} ms"
  get_sample_data() if length < 10

  query_param =
    $not:
      title: $likeI: "variant"
    $nor:
      state: "deleted"
      title: $likeI: "the"
    $and:
      notes: $likeI: "scotland"

  query_param2 = id: "5e831393-bcf2-4c6e-a959-5fb494b653b7"

  options =
    findOne: true

  a = time()
  results = query db, query_param2, options
  b = time()
  console.log "#{results.length} Matches found in #{b - a} ms (find one)"


  a = time()
  results = query db, query_param2
  b = time()
  console.log "#{results.length} Matches found in #{b - a} ms (find many)"





  #console.log results

#fs.readFile "../db/gov.json", (err, contents) ->
#  throw err if err
#

#db.set 1, {title:"Home", colors:["red","yellow","blue"], likes:12, featured:true, content: "Dummy content about coffeescript"}
#db.set 2, {title:"About", colors:["red"], likes:2, featured:true, content: "dummy content about javascript"}
#db.set 3, {title:"Contact", colors:["red","blue"], likes:20, content: "Dummy content about PHP"}
