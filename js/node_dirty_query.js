
/*
Backbone Query - A lightweight query API for Backbone Collections
(c)2012 - Dave Tonge
May be freely distributed according to MIT license.
*/

(function() {
  var cache, get_cache, get_models, get_sorted_models, iterator, page_models, parse_query, perform_query, sort_models, test_model_attribute, test_query_value,
    __indexOf = Array.prototype.indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  parse_query = function(raw_query) {
    var key, o, query_param, type, value, _results;
    _results = [];
    for (key in raw_query) {
      query_param = raw_query[key];
      o = {
        key: key
      };
      if (_.isRegExp(query_param)) {
        o.type = "$regex";
        o.value = query_param;
      } else if (_(query_param).isObject()) {
        for (type in query_param) {
          value = query_param[type];
          if (test_query_value(type, value)) {
            o.type = type;
            o.value = value;
          }
        }
      } else {
        o.type = "$equal";
        o.value = query_param;
      }
      _results.push(o);
    }
    return _results;
  };

  test_query_value = function(type, value) {
    switch (type) {
      case "$in":
      case "$nin":
      case "$all":
      case "$any":
        return _(value).isArray();
      case "$size":
        return _(value).isNumber();
      case "$regex":
        return _(value).isRegExp();
      case "$like":
      case "$likeI":
        return _(value).isString();
      case "$between":
        return _(value).isArray() && (value.length === 2);
      case "$cb":
        return _(value).isFunction();
      default:
        return true;
    }
  };

  test_model_attribute = function(type, value) {
    switch (type) {
      case "$like":
      case "$likeI":
      case "$regex":
        return _(value).isString();
      case "$contains":
      case "$all":
      case "$any":
        return _(value).isArray();
      case "$size":
        return _(value).isArray() || _(value).isString();
      case "$in":
      case "$nin":
        return value != null;
      default:
        return true;
    }
  };

  perform_query = function(type, value, attr, model) {
    switch (type) {
      case "$equal":
        return attr === value;
      case "$contains":
        return __indexOf.call(attr, value) >= 0;
      case "$ne":
        return attr !== value;
      case "$lt":
        return attr < value;
      case "$gt":
        return attr > value;
      case "$lte":
        return attr <= value;
      case "$gte":
        return attr >= value;
      case "$between":
        return (value[0] < attr && attr < value[1]);
      case "$in":
        return __indexOf.call(value, attr) >= 0;
      case "$nin":
        return __indexOf.call(value, attr) < 0;
      case "$all":
        return _(attr).all(function(item) {
          return __indexOf.call(value, item) >= 0;
        });
      case "$any":
        return _(attr).any(function(item) {
          return __indexOf.call(value, item) >= 0;
        });
      case "$size":
        return attr.length === value;
      case "$exists":
      case "$has":
        return (attr != null) === value;
      case "$like":
        return attr.indexOf(value) !== -1;
      case "$likeI":
        return attr.toLowerCase().indexOf(value.toLowerCase()) !== -1;
      case "$regex":
        return value.test(attr);
      case "$cb":
        return value.call(model, attr);
      default:
        return false;
    }
  };

  iterator = function(collection, query, query_type, find_one) {
    var key, parsed_query, query_iterator, results, value;
    parsed_query = parse_query(query);
    results = {};
    query_iterator = function(key, value) {
      var attr, found, model, q, stop, test, _i, _len;
      stop = false;
      found = 0;
      model = {
        key: value
      };
      for (_i = 0, _len = parsed_query.length; _i < _len; _i++) {
        q = parsed_query[_i];
        if (!stop) {
          attr = value[q.key];
          test = test_model_attribute(q.type, attr);
          if (test) test = perform_query(q.type, q.value, attr, model);
          if (test) found++;
          if (test && query_type === "$or") stop = true;
          if ((!test) && query_type === "$nor") stop = true;
        }
      }
      switch (query_type) {
        case "$or":
          if (found > 0) results[key] = value;
          break;
        case "$and":
          if (found === parsed_query.length) results[key] = value;
          break;
        case "$nor":
        case "$not":
          if (found === 0) results[key] = value;
      }
      if (find_one && results.length) return false;
    };
    if (_(collection.forEach).isFunction()) {
      collection.forEach(query_iterator);
    } else {
      for (key in collection) {
        value = collection[key];
        query_iterator(key, value);
      }
    }
    return results;
  };

  cache = {};

  get_cache = function(db, query, options) {
    var db_cache, models, query_string, _name, _ref;
    query_string = JSON.stringify(query);
    db_cache = (_ref = cache[_name = db.path]) != null ? _ref : cache[_name] = {};
    models = db_cache[query_string];
    if (!models) {
      models = get_sorted_models(db, query, options);
      db_cache[query_string] = models;
    }
    return models;
  };

  get_models = function(db, query) {
    var compound_query, reduce_iterator;
    compound_query = _.intersection(["$and", "$not", "$or", "$nor"], _(query).keys());
    if (compound_query.length === 0) {
      return iterator(db, query, "$and");
    } else {
      reduce_iterator = function(memo, query_type) {
        return iterator(memo, query[query_type], query_type);
      };
      return _.reduce(compound_query, reduce_iterator, db);
    }
  };

  get_sorted_models = function(db, query, options) {
    var key, models, models_array, val;
    models = get_models(db, query);
    models_array = (function() {
      var _results;
      _results = [];
      for (key in models) {
        val = models[key];
        _results.push(val);
      }
      return _results;
    })();
    if (options.sortBy) models_array = sort_models(models_array, options);
    return models_array;
  };

  sort_models = function(models, options) {
    if (_(options.sortBy).isString()) {
      models = _(models).sortBy(function(model) {
        return model[options.sortBy];
      });
    } else if (_(options.sortBy).isFunction()) {
      models = _(models).sortBy(options.sortBy);
    }
    if (options.order === "desc") models = models.reverse();
    return models;
  };

  page_models = function(models, options) {
    var end, sliced_models, start, total_pages;
    if (options.offset) {
      start = options.offset;
    } else if (options.page) {
      start = (options.page - 1) * options.limit;
    } else {
      start = 0;
    }
    end = start + options.limit;
    sliced_models = models.slice(start, end);
    if (options.pager && _.isFunction(options.pager)) {
      total_pages = Math.ceil(models.length / options.limit);
      options.pager(total_pages, sliced_models);
    }
    return sliced_models;
  };

  if (typeof _ === "undefined" || _ === null) _ = require('underscore');

  exports.query = function(db, query, options) {
    var models;
    if (options == null) options = {};
    if (query === "reset_cache") return cache[db.path] = {};
    if (options.cache) {
      models = get_cache(db, query, options);
    } else {
      models = get_sorted_models(db, query, options);
    }
    if (options.limit) models = page_models(models, options);
    return models;
  };

}).call(this);
