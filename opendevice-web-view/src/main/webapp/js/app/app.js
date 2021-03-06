/*
 * *****************************************************************************
 * Copyright (c) 2013-2014 CriativaSoft (www.criativasoft.com.br)
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 *
 *  Contributors:
 *  Ricardo JL Rufino - Initial API and Implementation
 * *****************************************************************************
 */

'use strict';

// Requied to define "package" of modules.
angular.module('opendevice.controllers', []);

var AppConstants = {
    LocalStorage: {
        AUTH_TOKEN : "AuthToken",
        EXTENSIONS : "odev.extensions",
        DEVICE_CACHE : "odev_devices",
    }
};


// This applications will be instantiated in BootstrapApp.js
var App = function(){

    // Get dynamic extenions
    var odev_extensions = localStorage.getItem(AppConstants.LocalStorage.EXTENSIONS);
    if(odev_extensions != null){
        odev_extensions = JSON.parse(odev_extensions);
        odev_extensions = odev_extensions.map(function(item) {
            return "ext." + item['pathName'];
        });
    }

    var modules = [
        'ngRoute',
        'ngSanitize', // for: ui.select
        'ngAnimate',
        'ui.select',
        'gridster',
        //'opendevice.filters',
        //'opendevice.directives',
        'opendevice.services',
        'opendevice.controllers'
    ].concat(odev_extensions);

    var app = angular.module('opendevice', modules);

    // Constants
    // ===================
    // app.constant('opendevice_url', 'http://'+window.location.host);

    // Global variables
    app.run(function($rootScope) {

        OpenDevice.setAppID(OpenDevice.findAppID()); // find ApiKey in cookie/localstore
        if(!$rootScope.ext) $rootScope.ext = {}; // Extension support
        if(!$rootScope.ext.menu) $rootScope.ext.menu = [];

        ODev.connect();

        // Notification from Server
        ODev.on("ui_notification", function(message){
            $.notify(message.params, {type : message.params.type, delay : 3000});
        });

        // Avoid Expire session
        setInterval(function(){
            $.get("/api/auth/ping");
        }, 1000 * 60 * 15); //15min

        // If not logged go to login page
        if(!sessionStorage.getItem("logged") || sessionStorage.getItem("logged") == 'false'){
            window.location = "/login.html";
        }

        ODev.on("loginFail", function(){
            sessionStorage.setItem("logged", false);
            window.location = "/login.html?message=Not%20Logged%20or%20Expired";
        });

        $( document ).ajaxError(function( event, jqXHR, ajaxSettings, thrownError ) {
            //alert("error");
            //window.location = "/?message=Not%20Logged%20or%20Expired";
        });


        // Bootstrap Notify Config
        $.notifyDefaults({
            type: 'danger',
            allow_dismiss: true,
            delay: 3000
        });


        // Highcharts - Radialize the colors
        Highcharts.getOptions().colors = Highcharts.map(Highcharts.getOptions().colors, function (color) {
            return {
                radialGradient: { cx: 0.5, cy: 0.3, r: 0.7 },
                stops: [
                    [0, color],
                    [1, Highcharts.Color(color).brighten(-0.3).get('rgb')] // darken
                ]
            };
        });


        Highcharts.setOptions({
            global: {useUTC: false, colorSetup : true}
        });

    });

    app.config(['$routeProvider', function($routeProvider) {

        var odev_wait = {
            "check":function($q){
                var defer = $q.defer();

                defer.resolve(true); // disable wait connection
                // if(ODev.isConnected()){
                //     defer.resolve(true);
                // }else{
                //     ODev.onConnect(function(){
                //         defer.resolve(true);
                //     });
                // }
                return defer.promise; // route will wait the promise
            }
        };

        $routeProvider.when('/', {templateUrl: 'pages/dashboard.html', controller: 'DashboardController',  controllerAs: 'ctrl', resolve : odev_wait});
        $routeProvider.when('/boards', {templateUrl: 'pages/boards.html', controller: 'DeviceController',  controllerAs: 'ctrl', resolve : odev_wait});
        $routeProvider.when('/boards/:boardID', {templateUrl: 'pages/devices.html', controller: 'DeviceController',  controllerAs: 'ctrl', resolve : odev_wait});
        $routeProvider.when('/devices/:deviceID', {templateUrl: 'pages/device-view.html', controller: 'DeviceViewController',  controllerAs: 'ctrl', resolve : odev_wait});
        $routeProvider.when('/new', {templateUrl: 'pages/new.html', controller: 'DeviceController',  controllerAs: 'ctrl'});
        $routeProvider.when('/users', {templateUrl: 'pages/users.html', controller: 'UserController',  controllerAs: 'ctrl'});
        $routeProvider.when('/connections', {templateUrl: 'pages/connections.html', controller: 'ConnectionController',  controllerAs: 'ctrl'});
        $routeProvider.when('/firmwares', {templateUrl: 'pages/firmwares.html', controller: 'FirmwareController',  controllerAs: 'ctrl'});
        $routeProvider.when('/rules', {templateUrl: 'pages/rules.html', controller: 'RuleController',  controllerAs: 'ctrl'});
        $routeProvider.when('/rules/:id', {templateUrl: 'pages/subpages/new-rule.html', controller: 'RuleController',  controllerAs: 'ctrl', resolve : odev_wait});
        $routeProvider.when('/jobs', {templateUrl: 'pages/jobs.html', controller: 'JobController',  controllerAs: 'ctrl'});
        $routeProvider.when('/jobs/:id', {templateUrl: 'pages/subpages/new-job.html', controller: 'JobController',  controllerAs: 'ctrl', resolve : odev_wait});

        $routeProvider.otherwise({redirectTo: '/'});
    }]);

// Configuration to Work like JSP templates
    app.config(['$interpolateProvider', function($interpolateProvider) {
        $interpolateProvider.startSymbol('${');
        $interpolateProvider.endSymbol('}');
    }]);

    app.config(['$animateProvider', function($animateProvider) {
        $animateProvider.classNameFilter(/animate/);
    }]);

    app.filter('propsFilter', function() {
        return function(items, props) {
            var out = [];

            if (angular.isArray(items)) {
                items.forEach(function(item) {
                    var itemMatches = false;

                    var keys = Object.keys(props);
                    for (var i = 0; i < keys.length; i++) {
                        var prop = keys[i];
                        var text = props[prop].toLowerCase();
                        if (item[prop].toString().toLowerCase().indexOf(text) !== -1) {
                            itemMatches = true;
                            break;
                        }
                    }

                    if (itemMatches) {
                        out.push(item);
                    }
                });
            } else {
                // Let the output be the input untouched
                out = items;
            }

            return out;
        };
    });


    app.filter('deviceType', function() {
        return function(type) {
            for (var p in od.DeviceType) {
                if( od.DeviceType.hasOwnProperty(p) ) {
                    if(type == od.DeviceType[p]){
                        return p;
                    }
                }
            }
            return "Undefined";
        }
    });

    app.filter('deviceIcon', function() {
        return function(device) {

            if(!device) return "fa-cog";

            if(device.type == od.DeviceType.DIGITAL){
                return device.sensor ? "fa-plug" : "fa-lightbulb-o";
            }else if(device.type == od.DeviceType.ANALOG){
                return "fa-thermometer-quarter";
            }else if(device.type == od.DeviceType.NUMERIC){
                return "fa-bars";
            }else if(device.type == od.DeviceType.BOARD){
                return "fa-sitemap";
            }else{
                return "fa-cog";
            }

        }
    });

    app.filter('deviceRef', function() {
        return function(resourceID) {
            var device = ODev.findDevice(resourceID) || { description : "[Not Found]"};
            return device.description;

        }
    });

    app.filter('deviceNameRef', function() {
        return function(resourceID) {
            var device = ODev.findDevice(resourceID) || { name : "[Not Found]"};
            return device.name;

        }
    });



// After the AngularJS has been bootstrapped, you can no longer
// use the normal module methods (ex, app.controller) to add
// components to the dependency-injection container. Instead,
// you have to use the relevant providers. Since those are only
// available during the config() method at initialization time,
// we have to keep a reference to them.
// --
// NOTE: This general idea is based on excellent article by
// Ifeanyi Isitor: http://ify.io/lazy-loading-in-angularjs/
    var ex = {};
    app.config(
        function( $controllerProvider, $provide, $compileProvider ) {

            // $routeProvider

            // Provider-based controller.
            ex.controller = function( name, constructor ) {
                $controllerProvider.register( name, constructor );
                return( this );
            };

            ex.route = function() {
                debugger;
                $routeProvider.when(arguments);
                return( this );
            };

            // Provider-based service.
            ex.service = function( name, constructor ) {
                $provide.service( name, constructor );
                return( this );
            };
            // Provider-based factory.
            ex.factory = function( name, factory ) {
                $provide.factory( name, factory );
                return( this );
            };
            // Provider-based value.
            ex.value = function( name, value ) {
                $provide.value( name, value );
                return( this );
            };
            // Provider-based directive.
            ex.directive = function( name, factory ) {
                $compileProvider.directive( name, factory );
                return( this );
            };
            // NOTE: You can do the same thing with the "filter"
            // and the "$filterProvider"; but, I don't really use
            // custom filters.
        }
    );


// Service Worker for off-line capabilities
// SEE: https://developers.google.com/web/fundamentals/codelabs/your-first-pwapp/
    if ('serviceWorker-DISABLEDDDDDDDDDDDDDDDDDD' in navigator) {
        // Delay registration until after the page has loaded, to ensure that our
        // precaching requests don't degrade the first visit experience.
        // See https://developers.google.com/web/fundamentals/instant-and-offline/service-worker/registration
        window.addEventListener('load', function() {
            // Your service-worker.js *must* be located at the top-level directory relative to your site.
            // It won't be able to control pages unless it's located at the same level or higher than them.
            // *Don't* register service worker file in, e.g., a scripts/ sub-directory!
            // See https://github.com/slightlyoff/ServiceWorker/issues/468
            navigator.serviceWorker.register('service-worker.js').then(function(reg) {
                // updatefound is fired if service-worker.js changes.
                reg.onupdatefound = function() {
                    // The updatefound event implies that reg.installing is set; see
                    // https://w3c.github.io/ServiceWorker/#service-worker-registration-updatefound-event
                    var installingWorker = reg.installing;

                    installingWorker.onstatechange = function() {
                        switch (installingWorker.state) {
                            case 'installed':
                                if (navigator.serviceWorker.controller) {
                                    // At this point, the old content will have been purged and the fresh content will
                                    // have been added to the cache.
                                    // It's the perfect time to display a "New content is available; please refresh."
                                    // message in the page's interface.
                                    console.log('New or updated content is available.');
                                } else {
                                    // At this point, everything has been precached.
                                    // It's the perfect time to display a "Content is cached for offline use." message.
                                    console.log('Content is now available offline!');
                                }
                                break;

                            case 'redundant':
                                console.error('The installing service worker became redundant.');
                                break;
                        }
                    };
                };
            }).catch(function(e) {
                console.error('Error during service worker registration:', e);
            });
        });
    }

};

