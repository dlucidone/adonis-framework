'use strict'

/*
 * adonis-framework
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const _ = require('lodash')
const pathToRegexp = require('path-to-regexp')
const Route = require('./index')
const RouteGroup = require('./Group')
const RouteStore = require('./Store')
const RouteResource = require('./Resource')
const GE = require('@adonisjs/generic-exceptions')

/**
 * Route Manager is the public interface used to define
 * routes, groups and resources.
 *
 * @namespace Adonis/Src/Route
 * @alias Route
 * @singleton
 * @group Http
 *
 * @class RouteManager
 */
class RouteManager {
  /**
   * Validates the group closure to make sure
   * it is a function
   *
   * @method _validateGroupClosure
   *
   * @param  {Function}            callback
   *
   * @return {void}
   *
   * @private
   */
  _validateGroupClosure (callback) {
    if (typeof (callback) !== 'function') {
      throw GE.InvalidArgumentException.invalidParamter('Route.group expects a callback', callback)
    }
  }

  /**
   * Validates that nested groups are not created.
   *
   * @method _validateNestedGroups
   *
   * @return {void}
   *
   * @private
   */
  _validateNestedGroups () {
    if (RouteStore.hasBreakpoint()) {
      RouteStore.releaseBreakpoint()
      throw GE.RuntimeException.invoke('Nested route groups are not allowed', 500, 'E_NESTED_ROUTE_GROUPS')
    }
  }

  /**
   * Create a new route and push it to the
   * routes store.
   *
   * @method route
   *
   * @param  {String}          route
   * @param  {Function|String} handler
   * @param  {Array}           verbs
   *
   * @return {Route}
   *
   * @example
   * ```js
   * Route.route('/', 'HomeController.render', ['GET'])
   * ```
   */
  route (route, handler, verbs) {
    const routeInstance = new Route(route, handler, verbs)
    RouteStore.add(routeInstance)
    return routeInstance
  }

  /**
   * Create a new route with `GET` and `HEAD`
   * verbs.
   *
   * @method get
   *
   * @param  {String} route
   * @param  {Function|String} handler
   *
   * @return {Route}
   *
   * @example
   * ```js
   * Route.get('users', 'UserController.index')
   * ```
   */
  get (route, handler) {
    return this.route(route, handler, ['HEAD', 'GET'])
  }

  /**
   * Create a new route with `POST` verb.
   *
   * @method post
   *
   * @param  {String} route
   * @param  {Function|String} handler
   *
   * @return {Route}
   *
   * @example
   * ```js
   * Route.post('users', 'UserController.store')
   * ```
   */
  post (route, handler) {
    return this.route(route, handler, ['POST'])
  }

  /**
   * Create a new route with `PUT` verb.
   *
   * @method put
   *
   * @param  {String} route
   * @param  {Function|String} handler
   *
   * @return {Route}
   *
   * @example
   * ```js
   * Route.put('users', 'UserController.update')
   * ```
   */
  put (route, handler) {
    return this.route(route, handler, ['PUT'])
  }

  /**
   * Create a new route with `PATCH` verb.
   *
   * @method patch
   *
   * @param  {String} route
   * @param  {Function|String} handler
   *
   * @return {Route}
   *
   * @example
   * ```js
   * Route.patch('users', 'UserController.update')
   * ```
   */
  patch (route, handler) {
    return this.route(route, handler, ['PATCH'])
  }

  /**
   * Create a new route with `DELETE` verb.
   *
   * @method delete
   *
   * @param  {String} route
   * @param  {Function|String} handler
   *
   * @return {Route}
   *
   * @example
   * ```js
   * Route.delete('users', 'UserController.destroy')
   * ```
   */
  delete (route, handler) {
    return this.route(route, handler, ['DELETE'])
  }

  /**
   * Create a route that response to all the following
   * HTTP verbs. Mostly required when creating a
   * wildcard route for the SPA apps.
   *
   * @method any
   *
   * @param  {String} route
   * @param  {Function|String} handler
   *
   * @return {Route}
   *
   * @example
   * ```js
   * Route.any('*', 'SpaController.render')
   * ```
   */
  any (route, handler) {
    return this.route(route, handler, ['HEAD', 'GET', 'POST', 'PUT', 'PATCH', 'DELETE'])
  }

  /**
   * Create a route with `GET` and `HEAD`
   * verb, which renders a view by
   * chaining the `render` methid.
   *
   * @method on
   *
   * @param  {String} route
   *
   * @return {Object} Object containing the render method
   *
   * @example
   * ```js
   * Route.on('/').render('welcome')
   * ```
   */
  on (route) {
    return {
      render: (template) => {
        return this.route(route, ({ view }) => {
          return view.render(template)
        }, ['HEAD', 'GET'])
      }
    }
  }

  /**
   * Resolves and return the route that matches
   * the given **url**, **verb** and the **host**.
   * The Host is only matched when the route has
   * a domain attached to it.
   *
   * ## Note
   * The first matching route will be used. So make
   * sure the generic routes are created after the
   * static routes.
   *
   * @method match
   *
   * @param  {String} url
   * @param  {String} verb
   * @param  {String} [host = null]
   *
   * @return {Object|Null}
   *
   * @example
   * ```js
   * Route.match('users/1', 'GET')
   *
   * // returns { url: 'users/1', params: [1], route: <RouteInstance> }
   * ```
   */
  match (url, verb, host) {
    let resolvedValues = {}

    /**
     * Find the first matching route.
     */
    const matchingRoute = _.find(RouteStore.list(), (route) => {
      resolvedValues = route.resolve(url, verb, host)
      return resolvedValues
    })

    /**
     * Return null when unable to find a route.
     */
    if (!matchingRoute) {
      return null
    }

    return _.assign({}, { route: matchingRoute }, resolvedValues)
  }

  /**
   * Create a new group to nested routes of
   * same behaviour.
   *
   * @method group
   *
   * @param  {String}   [name = null]
   * @param  {Function} callback
   *
   * @return {Object}          Instance of {{#crossLink "RouteGroup"}}{{/crossLink}}
   *
   * @example
   * ```js
   * Route.group(function () {
   *   Route.get('users', 'UsersController.index')
   * }).prefix('api/v1')
   * ```
   */
  group (name, callback) {
    /**
     * If name is a function, consider it as a callback
     * and mark name as null.
     */
    if (typeof (name) === 'function') {
      callback = name
      name = null
    }

    this._validateGroupClosure(callback)
    this._validateNestedGroups()
    RouteStore.breakpoint(name)
    callback()

    /**
     * Create a new group and pass all the routes
     * to the group.
     */
    const group = new RouteGroup(RouteStore.breakpointRoutes())

    RouteStore.releaseBreakpoint()
    return group
  }

  /**
   * Create an instance of resourceful routes, which
   * in turn will create a list of 7 restful routes.
   *
   * @method resource
   *
   * @param  {String} resource
   * @param  {String} controller
   *
   * @return {Object}          Instance of {{#crossLink "RouteResource"}}{{/crossLink}}
   */
  resource (resource, controller) {
    return new RouteResource(resource, controller, RouteStore._breakpoint.name)
  }

  /**
   * Returns an array of all the registered route
   *
   * @method list
   *
   * @return {Array}
   */
  list () {
    return RouteStore.list()
  }

  /**
   * Make url for a route.
   *
   * @method url
   *
   * @param  {String} urlOrName    - Url, route name or controller action
   * @param  {Object} [data = {}]  - Data object
   * @param  {String} [domain]     - Optional domain
   *
   * @return {String|Null}
   */
  url (routeNameOrHandler, data, domain) {
    const route = RouteStore.find(routeNameOrHandler, domain)
    if (!route) {
      return null
    }
    return pathToRegexp.compile(route._route)(data || {})
  }
}

module.exports = new RouteManager()
