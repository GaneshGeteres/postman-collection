var _ = require('../util').lodash,

    __PARENT = '__parent',

    PropertyBase; // constructor

/**
 * @typedef PropertyBase~definition
 * @property {String|Description} [description]
 */
/**
 * Base of all properties in Postman Collection. It defines the root for all standalone properties for postman
 * collection.
 *
 * @constructor
 * @private
 * @param {PropertyBase~definition} definition
 */
PropertyBase = function PropertyBase (definition) {
    // In case definition object is missing, there is no point moving forward. Also if the definition is basic string
    // we do not need to do anything with it.
    if (!definition || typeof definition === 'string') { return; }

    // call the meta extraction functions to create the object where all keys that are prefixed with underscore can be
    // stored. more details on that can be retrieved from the propertyExtractMeta function itself.
    // @todo: make this a closed function to do getter and setter which is non enumerable
    var src = definition && definition.info || definition,
        meta = _(src).pickBy(PropertyBase.propertyIsMeta).mapKeys(PropertyBase.propertyUnprefixMeta).value();

    if (_.keys(meta).length) {
        this._ = _.isObject(this._) ? _.mergeDefined(this._, meta) : meta;
    }
};

_.assign(PropertyBase.prototype, /** @lends PropertyBase.prototype */ {

    /**
     * Invokes the given iterator for every parent in the parent chain of the given element.
     *
     * @param {?Object|Boolean} [options={}] - A set of options for the parent chain traversal.
     * @param {?Boolean} [options.withRoot=false] - Set to true to include the collection object as well.
     * @param {Function} iterator - The function to call for every parent in the ancestry chain.
     * @todo Cache the results
     */
    forEachParent: function (options, iterator) {
        _.isFunction(options) && (iterator = options, options = {});
        if (!_.isFunction(iterator) || !_.isObject(options)) { return; }

        var parent = this.parent(),
            grandparent = parent && _.isFunction(parent.parent) && parent.parent();

        while (parent && (grandparent || options.withRoot)) {
            iterator(parent);
            parent = grandparent;
            grandparent = grandparent && _.isFunction(grandparent.parent) && grandparent.parent();
        }
    },

    /**
     * Tries to find the given property locally, and then proceeds to lookup in each parent,
     * going up the chain as necessary.
     *
     * @param {String} property
     */
    findInParents: function (property) {
        var owner = this.findParentContaining(property);
        return owner ? owner[property] : undefined;
    },

    /**
     * Looks up the closest parent which has a truthy value for the given property.
     *
     * @param {String} property
     * @private
     */
    findParentContaining: function (property) {
        var parent;

        // If the required property is present locally, `this` is the owner
        if (this[property]) {
            return this;
        }

        // Start travelling up the parent chain, to find the required property.
        parent = this.__parent;

        while (parent) {
            if (parent[property]) {
                return parent;
            }
            parent = parent.__parent;
        }
    },

    /**
     * Returns the JSON representation of a property, which conforms to the way it is defined in a collection.
     * You can use this method to get the instantaneous representation of any property, including a {@link Collection}.
     */
    toJSON: function () {
        return _.reduce(this, function (accumulator, value, key) {
            if (value === undefined) { // true/false/null need to be preserved.
                return accumulator;
            }

            // Handle plurality of PropertyLists in the SDK vs the exported JSON.
            // Basically, removes the trailing "s" from key if the value is a property list.
            // eslint-disable-next-line max-len
            if (value && value._postman_propertyIsList && !value._postman_proprtyIsSerialisedAsPlural && _.endsWith(key, 's')) {
                key = key.slice(0, -1);
            }

            // Handle 'PropertyBase's
            if (value && _.isFunction(value.toJSON)) {
                accumulator[key] = value.toJSON();
                return accumulator;
            }

            // Handle Strings
            if (_.isString(value)) {
                accumulator[key] = value;
                return accumulator;
            }

            // Everything else
            accumulator[key] = _.cloneElement(value);
            return accumulator;
        }, {});
    },

    /**
     * Returns the meta keys associated with the property
     *
     * @returns {*}
     */
    meta: function () {
        return arguments.length ? _.pick(this._, Array.prototype.slice.apply(arguments)) : _.cloneDeep(this._);
    },

    /**
     * Returns the parent of item
     *
     * @returns {*|undefined}
     */
    parent: function () {
        return this && this.__parent && this.__parent.__parent || undefined;
    },

    /**
     * Accepts an object and sets it as the parent of the current property.
     *
     * @param {Object} parent The object to set as parent.
     * @private
     */
    setParent: function (parent) {
        _.assignHidden(this, __PARENT, parent);
    }
});

_.assign(PropertyBase, /** @lends Base */ {

    /**
     * Defines the name of this property for internal use.
     * @private
     * @readOnly
     * @type {String}
     */
    _postman_propertyName: 'PropertyBase',

    /**
     * Filter function to check whether a key starts with underscore or not. These usually are the meta properties. It
     * returns `true` if the criteria is matched.
     *
     * @param {*} value
     * @param {String} key
     *
     * @returns {boolean}
     */
    propertyIsMeta: function (value, key) {
        return _.startsWith(key, '_') && (key !== '_');
    },

    /**
     * Map function that removes the underscore prefix from an object key.
     *
     * @param {*} value
     * @param {String} key
     *
     * @returns {String}
     */
    propertyUnprefixMeta: function (value, key) {
        return _.trimStart(key, '_');
    },

    /**
     * Static function which allows calling toJSON() on any object.
     *
     * @param {Object} obj
     * @returns {*}
     */
    toJSON: function (obj) {
        return PropertyBase.prototype.toJSON.call(obj);
    }
});

module.exports = {
    PropertyBase: PropertyBase
};
