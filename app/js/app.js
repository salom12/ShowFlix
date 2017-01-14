'use strict';

angular
    .module('showFlex', [
        'ngCookies',
        'ngResource',
        'ngSanitize',
        'ui.router',
        'ngMaterial',
        'ngMdIcons',
        'btford.socket-io'
    ])
    .config(function($stateProvider, $urlRouterProvider) {
        $stateProvider
            .state('app', {
                url: '/app',
                templateUrl: 'views/main.html',
                controller: 'MainCtrl',
                abstract: true
            })
            .state('app.home', {
                url: "/home",
                views: {
                    "mainView": {
                        templateUrl: "views/home.html",
                        controller: "homeCtrl"
                    }
                }
            })
            .state('app.downloads', {
                url: "/downloads",
                views: {
                    "mainView": {
                        templateUrl: "views/downloads.html",
                        controller: "downCtrl"
                    }
                }
            })
        $urlRouterProvider.otherwise("/app/home");
    }).run(function($rootScope, serverSocket) {
        $rootScope.$on('$stateChangeStart',
            function(event, toState, toParams, fromState, fromParams, options) {
                if (toState.name === "app.downloads") {
                    serverSocket.emit("watchDownloads", true);
                } else {
                    serverSocket.emit("watchDownloads", false);
                }
            })
    })
