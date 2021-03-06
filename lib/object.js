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
require('polyfill/lib/promise.js'); // need promises

var createHashMap = require('js-ext/extra/hashmap.js').createMap,
    TYPES = createHashMap({
       'undefined' : true,
       'number' : true,
       'boolean' : true,
       'string' : true,
       '[object Function]' : true,
       '[object RegExp]' : true,
       '[object Array]' : true,
       '[object Date]' : true,
       '[object Error]' : true,
       '[object Blob]' : true,
       '[object Promise]' : true // DOES NOT WORK in all browsers
    }),
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

    cloneObj = function(obj, descriptors) {
        var copy, i, len, value;

        // Handle Array
        if (obj instanceof Array) {
            copy = [];
            len = obj.length;
            for (i=0; i<len; i++) {
                value = obj[i];
                copy[i] = (Object.isObject(value) || Array.isArray(value)) ? cloneObj(value, descriptors) : value;
            }
            return copy;
        }

        // Handle Date
        if (obj instanceof Date) {
            copy = new Date();
            copy.setTime(obj.getTime());
            return copy;
        }

        // Handle Object
        if (Object.isObject(obj)) {
            return obj.deepClone(descriptors);
        }

        return obj;
    },

    valuesAreTheSame = function(value1, value2) {
        var same, i, len;
        // complex values need to be inspected differently:
        if (Object.isObject(value1)) {
            same = Object.isObject(value2) ? value1.sameValue(value2) : false;
        }
        else if (Array.isArray(value1)) {
            if (Array.isArray(value2)) {
                len = value1.length;
                if (len===value2.length) {
                    same = true;
                    for (i=0; same && (i<len); i++) {
                        same = valuesAreTheSame(value1[i], value2[i]);
                    }
                }
                else {
                    same = false;
                }
            }
            else {
                same = false;
            }
        }
        else if (value1 instanceof Date) {
            same = (value2 instanceof Date) ? (value1.getTime()===value2.getTime()) : false;
        }
        else {
            same = (value1===value2);
        }
        return same;
    },

    deepCloneObj = function (source, target, descriptors, proto) {
        var m = target || Object.create(proto || Object.getPrototypeOf(source)),
            keys = Object.getOwnPropertyNames(source),
            l = keys.length,
            i = -1,
            key, value, propDescriptor;
        // loop through the members:
        while (++i < l) {
            key = keys[i];
            value = source[key];
            if (descriptors) {
                propDescriptor = Object.getOwnPropertyDescriptor(source, key);
                if (propDescriptor.writable) {
                    Object.defineProperty(m, key, propDescriptor);
                }
                if ((Object.isObject(value) || Array.isArray(value)) && ((typeof propDescriptor.get)!=='function') && ((typeof propDescriptor.set)!=='function')) {
                    m[key] = cloneObj(value, descriptors);
                }
                else {
                    m[key] = value;
                }
            }
            else {
                m[key] = (Object.isObject(value) || Array.isArray(value)) ? cloneObj(value, descriptors) : value;
            }
        }
        return m;
    };


/**
 * Pollyfils for often used functionality for objects
 * @class Object
*/
defineProperties(Object.prototype, {
    /**
     * Loops through all properties in the object.  Equivalent to Array.forEach.
     * The callback is provided with the value of the property, the name of the property
     * and a reference to the whole object itself.
     * The context to run the callback in can be overriden, otherwise it is undefined.
     *
     * @method each
     * @param fn {Function} Function to be executed on each item in the object.  It will receive
     *                      value {any} value of the property
     *                      key {string} name of the property
     *                      obj {Object} the whole of the object
     * @chainable
     */
    each: function (fn, context) {
        var obj = this,
            keys = Object.keys(obj),
            l = keys.length,
            i = -1,
            key;
        while (++i < l) {
            key = keys[i];
            fn.call(context || obj, obj[key], key, obj);
        }
        return obj;
    },

    /**
     * Loops through the properties in an object until the callback function returns *truish*.
     * The callback is provided with the value of the property, the name of the property
     * and a reference to the whole object itself.
     * The order in which the elements are visited is not predictable.
     * The context to run the callback in can be overriden, otherwise it is undefined.
     *
     * @method some
     * @param fn {Function} Function to be executed on each item in the object.  It will receive
     *                      value {any} value of the property
     *                      key {string} name of the property
     *                      obj {Object} the whole of the object
     * @return {Boolean} true if the loop was interrupted by the callback function returning *truish*.
     */
    some: function (fn, context) {
        var keys = Object.keys(this),
            l = keys.length,
            i = -1,
            key;
        while (++i < l) {
            key = keys[i];
            if (fn.call(context || this, this[key], key, this)) {
                return true;
            }
        }
        return false;
    },

    /*
     * Loops through the properties in an object until the callback assembling a new object
     * with its properties set to the values returned by the callback function.
     * If the callback function returns `undefined` the property will not be copied to the new object.
     * The resulting object will have the same keys as the original, except for those where the callback
     * returned `undefined` which will have dissapeared.
     * The callback is provided with the value of the property, the name of the property
     * and a reference to the whole object itself.
     * The context to run the callback in can be overriden, otherwise it is undefined.
     *
     * @method map
     * @param fn {Function} Function to be executed on each item in the object.  It will receive
     *                      value {any} value of the property
     *                      key {string} name of the property
     *                      obj {Object} the whole of the object
     * @return {Object} The new object with its properties set to the values returned by the callback function.
     */
/* DEPRECATED --> Google maps uses its own (different) implication
    map: function (fn, context) {
        var keys = Object.keys(this),
            l = keys.length,
            i = -1,
            m = {},
            val, key;
        while (++i < l) {
            key = keys[i];
            val = fn.call(context, this[key], key, this);
            if (val !== undefined) {
                m[key] = val;
            }
        }
        return m;
    },
*/

    /**
     * Returns the keys of the object: the enumerable properties.
     *
     * @method keys
     * @return {Array} Keys of the object
     */
    keys: function () {
        return Object.keys(this);
    },

    /**
     * Checks whether the given property is a key: an enumerable property.
     *
     * @method hasKey
     * @param property {String} the property to check for
     * @return {Boolean} Keys of the object
     */
    hasKey: function (property) {
        return this.hasOwnProperty(property) && this.propertyIsEnumerable(property);
    },

    /**
     * Returns the number of keys of the object
     *
     * @method size
     * @param inclNonEnumerable {Boolean} wether to include non-enumeral members
     * @return {Number} Number of items
     */
    size: function (inclNonEnumerable) {
        return inclNonEnumerable ? Object.getOwnPropertyNames(this).length : Object.keys(this).length;
    },

    /**
     * Loops through the object collection the values of all its properties.
     * It is the counterpart of the [`keys`](#method_keys).
     *
     * @method values
     * @return {Array} values of the object
     */
    values: function () {
        var keys = Object.keys(this),
            i = -1,
            len = keys.length,
            values = [];

        while (++i < len) {
            values.push(this[keys[i]]);
        }

        return values;
    },

    /**
     * Returns true if the object has no own members
     *
     * @method isEmpty
     * @return {Boolean} true if the object is empty
     */
    isEmpty: function () {
        for (var key in this) {
            if (this.hasOwnProperty(key)) return false;
        }
        return true;
    },

    /**
     * Returns a shallow copy of the object.
     * It does not clone objects within the object, it does a simple, shallow clone.
     * Fast, mostly useful for plain hash maps.
     *
     * @method shallowClone
     * @param [options.descriptors=false] {Boolean} If true, the full descriptors will be set. This takes more time, but avoids any info to be lost.
     * @return {Object} shallow copy of the original
     */
    shallowClone: function (descriptors) {
        var instance = this,
            m = Object.create(Object.getPrototypeOf(instance)),
            keys = Object.getOwnPropertyNames(instance),
            l = keys.length,
            i = -1,
            key, propDescriptor;
        while (++i < l) {
            key = keys[i];
            if (descriptors) {
                propDescriptor = Object.getOwnPropertyDescriptor(instance, key);
                if (!propDescriptor.writable) {
                    m[key] = instance[key];
                }
                else {
                    Object.defineProperty(m, key, propDescriptor);
                }
            }
            else {
                m[key] = instance[key];
            }
        }
        return m;
    },

    /**
     * Compares this object with the reference-object whether they have the same value.
     * Not by reference, but their content as simple types.
     *
     * Compares both JSON.stringify objects
     *
     * @method sameValue
     * @param refObj {Object} the object to compare with
     * @return {Boolean} whether both objects have the same value
     */
    sameValue: function(refObj) {
        var instance = this,
            keys = Object.getOwnPropertyNames(instance),
            l = keys.length,
            i = -1,
            same, key;
        same = (l===refObj.size(true));
        // loop through the members:
        while (same && (++i < l)) {
            key = keys[i];
            same = refObj.hasOwnProperty(key) ? valuesAreTheSame(instance[key], refObj[key]) : false;
        }
        return same;
    },

    /**
     * Returns a deep copy of the object.
     * Only handles members of primary types, Dates, Arrays and Objects.
     * Will clone all the properties, also the non-enumerable.
     *
     * @method deepClone
     * @param [descriptors=false] {Boolean} If true, the full descriptors will be set. This takes more time, but avoids any info to be lost.
     * @param [proto] {Object} Another prototype for the new object.
     * @return {Object} deep-copy of the original
     */
    deepClone: function (descriptors, proto) {
        return deepCloneObj(this, null, descriptors, proto);
    },

    /**
     * Transforms the object into an array with  'key/value' objects
     *
     * @example
     * {country: 'USA', Continent: 'North America'} --> [{key: 'country', value: 'USA'}, {key: 'Continent', value: 'North America'}]
     *
     * @method toArray
     * @param [options] {Object}
     * @param [options.key] {String} to overrule the default `key`-property-name
     * @param [options.value] {String} to overrule the default `value`-property-name
     * @return {Array} the transformed Array-representation of the object
     */
    toArray: function(options) {
        var newArray = [],
            keyIdentifier = (options && options.key) || 'key',
            valueIdentifier = (options && options.value) || 'value';
        this.each(function(value, key) {
            var obj = {};
            obj[keyIdentifier] = key;
            obj[valueIdentifier] = value;
            newArray[newArray.length] = obj;
        });
        return newArray;
    },

    /**
     * Merges into this object the properties of the given object.
     * If the second argument is true, the properties on the source object will be overwritten
     * by those of the second object of the same name, otherwise, they are preserved.
     *
     * @method merge
     * @param obj {Object} Object with the properties to be added to the original object
     * @param [options] {Object}
     * @param [options.force=false] {Boolean} If true, the properties in `obj` will override those of the same name
     *        in the original object
     * @param [options.full=false] {Boolean} If true, also any non-enumerable properties will be merged
     * @param [options.replace=false] {Boolean} If true, only properties that already exist on the instance will be merged (forced replaced). No need to set force as well.
     * @param [options.descriptors=false] {Boolean} If true, the full descriptors will be set. This takes more time, but avoids any info to be lost.
     * @chainable
     */
    merge: function (obj, options) {
        var instance = this,
            i = -1,
            keys, l, key, force, replace, descriptors, propDescriptor;
        if (!Object.isObject(obj)) {
            return instance;
        }
        options || (options={});
        keys = options.full ? Object.getOwnPropertyNames(obj) : Object.keys(obj);
        l = keys.length;
        force = options.force;
        replace = options.replace;
        descriptors = options.descriptors;
        // we cannot use obj.each --> obj might be an object defined through Object.create(null) and missing Object.prototype!
        while (++i < l) {
            key = keys[i];
            if ((force && !replace) || (!replace && !(key in instance)) || (replace && (key in instance))) {
                if (descriptors) {
                    propDescriptor = Object.getOwnPropertyDescriptor(obj, key);
                    if (!propDescriptor.writable) {
                        instance[key] = obj[key];
                    }
                    else {
                        Object.defineProperty(instance, key, propDescriptor);
                    }
                }
                else {
                    instance[key] = obj[key];
                }
            }
        }
        return instance;
    },

    /**
     * Sets the properties of `obj` to the instance. This will redefine the object, while remaining the instance.
     * This way, external references to the object-instance remain valid.
     *
     * @method defineData
     * @param obj {Object} the Object that holds the new properties.
     * @param [clone=false] {Boolean} whether the properties should be cloned
     * @chainable
     */
    defineData: function(obj, clone) {
        var thisObj = this;
        thisObj.emptyObject();
        if (clone) {
            deepCloneObj(obj, thisObj, true);
        }
        else {
            thisObj.merge(obj);
        }
        return thisObj;
    },

    /**
     * Empties the Object by deleting all its own properties (also non-enumerable).
     *
     * @method emptyObject
     * @chainable
     */
    emptyObject: function() {
        var thisObj = this,
            props = Object.getOwnPropertyNames(thisObj),
            len = props.length,
            i;
        for (i=0; i<len; i++) {
            delete thisObj[props[i]];
        }
        return thisObj;
    }

});

/**
* Returns true if the item is an object, but no Array, Function, RegExp, Date or Error object
*
* @method isObject
* @static
* @return {Boolean} true if the object is empty
*/
Object.isObject = function (item) {
   // cautious: some browsers detect Promises as [object Object] --> we always need to check instance of :(
   return !!(!TYPES[typeof item] && !TYPES[({}.toString).call(item)] && item && (!(item instanceof Promise)));
};

/**
 * Returns a new object resulting of merging the properties of the given objects.
 * The copying is shallow, complex properties will reference the very same object.
 * Properties in later objects do **not overwrite** properties of the same name in earlier objects.
 * If any of the objects is missing, it will be skiped.
 *
 * @example
 *
 *  var foo = function (config) {
 *       config = Object.merge(config, defaultConfig);
 *  }
 *
 * @method merge
 * @static
 * @param obj* {Object} Objects whose properties are to be merged
 * @return {Object} new object with the properties merged in.
 */
Object.merge = function() {
    var m = {};
    Array.prototype.forEach.call(arguments, function (obj) {
        if (obj) m.merge(obj);
    });
    return m;
};

/**
 * Returns a new object with the prototype specified by `proto`.
 *
 *
 * @method newProto
 * @static
 * @param obj {Object} source Object
 * @param proto {Object} Object that should serve as prototype
 * @param [clone=false] {Boolean} whether the sourceobject should be deep-cloned. When false, the properties will be merged.
 * @return {Object} new object with the prototype specified.
 */
Object.newProto = function(obj, proto, clone) {
    return clone ? obj.deepClone(true, proto) : Object.create(proto).merge(obj, {force: true});
};

/**
 * Creates a protected property on the object.
 *
 * @method protectedProp
 * @static
 */
Object.protectedProp = function(obj, property, value) {
    Object.defineProperty(obj, property, {
        configurable: false,
        enumerable: false,
        writable: false,
        value: value
    });
};