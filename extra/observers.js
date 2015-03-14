/**
 *
 * Pollyfils for often used functionality for Objects
 *
 * <i>Copyright (c) 2014 ITSA - https://github.com/itsa</i>
 * New BSD License - http://choosealicense.com/licenses/bsd-3-clause/
 *
 * @module js-ext
 * @submodule lib/object.js
 * @class Object
 *
*/

"use strict";

require('polyfill/polyfill-base.js');
require('../lib/object.js');
require('../lib/array.js');

var NATIVE_OBJECT_OBSERVE = !!Object.observe,
    later = require('utils').later,
    _watchers = [],
    POLL_OBSERVE = 100,
    // Define configurable, writable and non-enumerable props
    // if they don't exist.
    defineProperty = function (object, name, method, force) {
        if (!force && (name in object)) {
            return;
        }
        Object.defineProperty(object, name, {
            configurable: true,
            enumerable: false,
            writable: true,
            value: method
        });
    },
    defineProperties = function (object, map, force) {
        var names = Object.keys(map),
            l = names.length,
            i = -1,
            name;
        while (++i < l) {
            name = names[i];
            defineProperty(object, name, map[name], force);
        }
    },
    watchObject = function(obj, callback) {
        var watcher;
        watcher = {
            obj: obj,
            cb: callback,
            cloneObj: obj.deepClone(true),
            timer: later(function() {
                if (!obj.sameValue(watcher.cloneObj)) {
                    watcher.cloneObj = obj.deepClone(true);
                    callback();
                }
            }, POLL_OBSERVE, true)
        };
        _watchers[_watchers.length] = watcher;
    },

    unWatchObject = function(obj, callback) {
        var currentWatcher;
        _watchers.some(function(watcher) {
            if ((watcher.obj===obj) && (watcher.callback===callback)) {
                currentWatcher = watcher;
            }
            return currentWatcher;
        });
        if (currentWatcher) {
            currentWatcher.timer.cancel();
            _watchers.remove(currentWatcher);
        }
    },


    structureChanged = function(callback) {
        var watcher;
        watcher = function(changes) {
            // changes is an array with objects having the following properties:
            // {
            //    name: The name of the property which was changed.
            //    object: The changed object after the change was made.
            //    type: A string indicating the type of change taking place. One of "add", "update", or "delete".
            //    oldValue: Only for "update" and "delete" types. The value before the change.
            // }
            var len = changes.length,
                i, changedProp, property;
            for (i=0; i<len; i++) {
                changedProp = changes[i];
                property = changedProp.object[changedProp.name];
                if (changedProp.type==='delete') {
                    // clear previous observer
                    if (Object.isObject(property) || Array.isArray(property)) {
                        property.unobserve(callback);
                    }
                }
                if (changedProp.type==='add') {
                    // set new observer
                    if (Object.isObject(property) || Array.isArray(property)) {
                        property.observe(callback);
                    }
                }
            }
        };
        return watcher;
    };

defineProperties(Object.prototype, {
    /**
     * Observes changes of the instance. On any changes, the callback will be invoked.
     * Uses a polyfill on environments that don't support native Object.observe.
     *
     * The callback comes without arguments (native Object.oserve does, but non-native doesn't)
     * so, they cannot be used.
     *
     * @method observe
     * @chainable
     */
    observe: function (callback) {
        var obj = this,
            property;
        if (typeof callback==='function') {
            if (NATIVE_OBJECT_OBSERVE) {
console.warn('going to observe object: '+JSON.stringify(obj));
                Object.observe(obj, callback);
                // check all properties if they are an Array or Object:
                // in those cases, we need extra observers
                for (property in obj) {
console.warn('inspecting '+property);
                    if (Object.isObject(obj[property]) || Array.isArray(obj[property])) {
console.warn(property+' is object or array');
                        obj[property].observe(callback);
                    }
                }
                // we also need to watch the object for new/replaced/removed properties ot the type Object/Array:
                // they also need to be watched/unwatched
                // to register this, we add an extra observer that looks for the type of the change


                Object.observe(obj, structureChanged(callback), ['add', 'delete']);



            }
            else {
                watchObject(obj, callback);
            }
        }
        return obj;
    },

    /**
     * Un-observes changes that are registered with `observe`.
     * Uses a polyfill on environments that don't support native Object.observe.
     *
     * @method observe
     * @chainable
     */
    unobserve: function (callback) {
        var obj = this,
            property;
        if (typeof callback==='function') {
            if (NATIVE_OBJECT_OBSERVE) {
                Object.unobserve(obj, callback);
                for (property in obj) {
                    if (Object.isObject(obj[property])) {
                        Object.unobserve(obj[property], callback);
                    }
                    else if (Array.isArray(obj[property])) {
                        Array.unobserve(obj[property], callback);
                    }
                }
            }
            else {
                unWatchObject(obj, callback);
            }
        }
        return obj;
    }
});

defineProperties(Array.prototype, {
    /**
     * Observes changes of the instance. On any changes, the callback will be invoked.
     * Uses a polyfill on environments that don't support native Object.observe.
     *
     * The callback comes without arguments (native Object.oserve does, but non-native doesn't)
     * so, they cannot be used.
     *
     * @method observe
     * @chainable
     */
    observe: function (callback) {
        var array = this,
            item, i, len;
        if (typeof callback==='function') {
            if (NATIVE_OBJECT_OBSERVE) {
console.warn('going to observe array: '+JSON.stringify(array));
                Array.observe(array, callback);
                // check all properties if they are an Array or Object:
                // in those cases, we need extra observers
                len = array.length;
                for (i=0; i<len; i++) {
                    item = array[i];
console.warn('inspecting '+item);
                    if (Object.isObject(item) || Array.isArray(item)) {
console.warn(item+' is object or array');
                        item.observe(callback);
                    }
                }
                // we also need to watch the object for new/replaced/removed properties ot the type Object/Array:
                // they also need to be watched/unwatched
                // to register this, we add an extra observer that looks for the type of the change


                Array.observe(array, structureChanged(callback));



            }
            else {
                watchObject(array, callback);
            }
        }
        return array;
    },

    /**
     * Un-observes changes that are registered with `observe`.
     * Uses a polyfill on environments that don't support native Object.observe.
     *
     * @method observe
     * @chainable
     */
    unobserve: function (callback) {
        var array = this,
            item, i, len;
        if (typeof callback==='function') {
            if (NATIVE_OBJECT_OBSERVE) {
                Array.unobserve(array, callback);
                len = array.length;
                for (i=0; i<len; i++) {
                    item = array[i];
                    if (Object.isObject(item)) {
                        Object.unobserve(item, callback);
                    }
                    else if (Array.isArray(item)) {
                        Array.unobserve(item, callback);
                    }
                }
            }
            else {
                unWatchObject(array, callback);
            }
        }
        return array;
    }
});