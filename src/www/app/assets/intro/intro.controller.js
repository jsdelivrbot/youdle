(function() {
  'use strict';

  angular
    .module('youdle')
    .controller('introController', introController);

  introController.$inject = ['localStorageFactory', 'introFactory', '$state', 'loggerFactory', '$ionicHistory', '$interval', '$ionicPlatform'];

  function introController(localStorageFactory, introFactory, $state, loggerFactory, $ionicHistory, $interval, $ionicPlatform) {
    var vm = this;
    var facebookCheck;

    vm.activate = function ()
    {
      $ionicPlatform.ready(function() {
        if (window.cordova)
        {
          // for phone/cordova
          initializeFacebook();
        }
        else
        {
          // for browser
          startFacebookCheck();
        }
      });
    }

    vm.activate();

    // this function periodically checks for the facebook sdk to be
    // loaded so that it can initializeFacebook.  This is done this way
    // because the sdk is load async and would cause an error otherwise
    function startFacebookCheck()
    {
      facebookCheck = $interval(function(){
        if (window.FB)
        {
          // when facebook is found we can stop checking and initialize;
          stopFacebookCheck();
        }
      }, 100);
    }

    // stop checking for facebook and initialize the framework
    function stopFacebookCheck()
    {
      if (angular.isDefined(facebookCheck))
      {
        $interval.cancel(facebookCheck);
        facebookCheck = undefined;
        initializeFacebook();  // after FB is found we can init
      }
    }

    // initialize the facebook framework
    function initializeFacebook()
    {
      introFactory.facebookInit();
      autoLogin();
    }

    // user clicks facebook button
    vm.facebookClick = function ()
    {
      console.log('logging in to facebook...');
      introFactory.facebookLogin()
        .then(facebookLoginSuccess, facebookLoginFailed);
    }

    // login to facebook api success handler
    function facebookLoginSuccess(response)
    {
      console.log('Log in to facebook successful.');
      console.log(response);
      var accessToken = response.authResponse.accessToken;

      // TODO - calculate age and add to parameters
      introFactory.backendlessFacebookLogin(accessToken)
        .then(function(response)
        {
          navigateHome();
          console.log('Backendless facebook login success!');
          localStorageFactory.set('userObjectId', response.data.objectId);
          localStorageFactory.set('userToken', response.data['user-token']);
          loggerFactory.info('com.youdle.intro', 'user logged in to backendless successfully with facebook.  userObjectId: ' + response.data.objectId);
        },
        function(errors)
        {
          console.error('Backendless facebook login failed!', errors);
          loggerFactory.error('com.youdle.intro', 'Backendless facebook login failed!  Errors: ' + errors);
          // TODO - handle error / display to user
        })
    }

    // login to facebook api failure handler
    function facebookLoginFailed(errors)
    {
      // TODO - display error message back to user
      loggerFactory.error('com.youdle.intro', 'Log in to facebook failed.  Errors: ' + errors);
      console.error('Log in to facebook failed.', errors);
    }

    // if the user has already logged in previously automatically login the user in
    function autoLogin()
    {
      console.log('Checking current login status for auto login...');
      var userToken = localStorageFactory.get('userToken');
      if (!userToken)
      {
        console.log('User not currently logged in.');
        return;
      }
      introFactory.isUserValid(userToken)
        .then(isUserValidSuccess, isUserValidFailed);
    }

    // check to see if user is valid success handler
    function isUserValidSuccess(response)
    {
      if (response.data)
      {
        var userObjectId = localStorageFactory.get('userObjectId');
        console.log('User is valid in backendless.')

        introFactory.getUserProperties(userObjectId)
          .then (getUserPropertiesSuccess, getUserPropertiesFailed);
      }
      else
      {
        console.log('User is not currently valid in backendless.  Not allowing auto login access.');
      }
    }

    // check to see if user is valid failed handler
    function isUserValidFailed(errors)
    {
      loggerFactory.error('com.youdle.intro', 'Request for user validity failed!  Errors: ' + errors);
      console.error('problem checking if user is valid', errors);
    }

    function getUserPropertiesSuccess(response)
    {
      if (response.data.socialAccount == 'Facebook')
      {
        introFactory.getFacebookLoginStatus()
          .then(getFacebookLoginStatusSuccess, getFacebookLoginStatusFailed);
      }
      else
      {
        console.log('User is a valid email user.  Allowing access.');
        var userObjectId = localStorageFactory.get('userObjectId');
        loggerFactory.info('com.youdle.intro', 'email user returning with valid user token.  userObjectId: ' + userObjectId);
        navigateHome();
      }
    }

    function getFacebookLoginStatusSuccess(response)
    {
      if (response.status == 'connected')
      {
        console.log('User is also connected to facebook.  Allowing access.');
        var userObjectId = localStorageFactory.get('userObjectId');
        loggerFactory.info('com.youdle.intro', 'facebook user returning with valid user token.  userObjectId: ' + userObjectId);
        navigateHome();
      }
    }

    function getFacebookLoginStatusFailed(errors)
    {
      console.error('Failure checking facebook login status.', errors);
      loggerFactory.error('com.youdle.intro', 'Failure checking facebook login status!  Errors: ' + errors);
    }

    function getUserPropertiesFailed(errors)
    {
      console.error('Failure retrieving user properties.', errors);
      loggerFactory.error('com.youdle.intro', 'Failure requesting user properties!  Errors: ' + errors);
    }

    function navigateHome()
    {
      $ionicHistory.nextViewOptions({
        historyRoot: true // if successfully navigating to home page we want to make that the root page
      });
      $state.go('app.home');
    }
  }
})();
