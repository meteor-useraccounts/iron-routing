/* global
  AccountsTemplates: false,
  grecaptcha: false,
  Iron: false,
  Router: false
*/
'use strict';


// Previous path used for redirect after form submit
AccountsTemplates._prevPath = null;

// Possibly keeps reference to the handle for the timed out redirect
// set on some routes
AccountsTemplates.timedOutRedirect = null;


AccountsTemplates.clearState = function() {
  _.each(this._fields, function(field){
    field.clearStatus();
  });
  var form = this.state.form;
  form.set('error', null);
  form.set('result', null);
  form.set('message', null);

  AccountsTemplates.setDisabled(false);

  // Possibly clears timed out redirects
  if (AccountsTemplates.timedOutRedirect !== null) {
    Meteor.clearTimeout(AccountsTemplates.timedOutRedirect);
    AccountsTemplates.timedOutRedirect = null;
  }
};

// Getter for previous route's path
AccountsTemplates.getPrevPath = function() {
    return this._prevPath;
};

// Setter for previous route's path
AccountsTemplates.setPrevPath = function(newPath) {
    check(newPath, String);
    this._prevPath = newPath;
};

var ensureSignedIn = function() {
  if (!Meteor.userId()) {
    Tracker.nonreactive(function () {
      AccountsTemplates.setPrevPath(Router.current().url);
    });
    AccountsTemplates.setState(AccountsTemplates.options.defaultState, function(){
      var err = AccountsTemplates.texts.errors.mustBeLoggedIn;
      AccountsTemplates.state.form.set('error', [err]);
    });
    AccountsTemplates.avoidRedirect = true;
    // render the login template but keep the url in the browser the same

    var options = AccountsTemplates.routes.ensureSignedIn;

    // Determines the template to be rendered in case no specific one was configured for ensureSignedIn
    var signInRouteTemplate = AccountsTemplates.routes.signIn && AccountsTemplates.routes.signIn.template;
    var template = (options && options.template) || signInRouteTemplate || 'fullPageAtForm';

    // Determines the layout to be used in case no specific one was configured for ensureSignedIn
    var defaultLayout = AccountsTemplates.options.defaultLayout || Router.options.layoutTemplate;
    var layoutTemplate = (options && options.layoutTemplate) || defaultLayout;

    this.layout(layoutTemplate);
    this.render(template);
    this.renderRegions();
  } else {
    AccountsTemplates.clearError();
    this.next();
  }
};

AccountsTemplates.ensureSignedIn = function() {
  console.warn(
    '[UserAccounts] AccountsTemplates.ensureSignedIn will be deprecated soon, please use the plugin version\n' +
    '               see https://github.com/meteor-useraccounts/core/blob/master/Guide.md#content-protection'
  );
  ensureSignedIn.call(this);
};


Iron.Router.plugins.ensureSignedIn = function (router, options) {
  // this loading plugin just creates an onBeforeAction hook
  router.onRun(function(){
    if (Meteor.loggingIn()) {
        this.renderRegions();
    } else {
        this.next();
    }
  }, options);

  router.onBeforeAction(
    ensureSignedIn,
    options
  );

  router.onStop(function(){
    AccountsTemplates.clearError();
  });
};



// Stores previous path on path change...
Router.onStop(function() {
  Tracker.nonreactive(function () {
    var currentPath = Router.current().url;
    var currentPathClean = currentPath.replace(/^\/+|\/+$/gm,'');
    var isKnownRoute = _.map(AccountsTemplates.knownRoutes, function(path){
      if (!path) {
        return false;
      }
      path = path.replace(/^\/+|\/+$/gm,'');
      var known = RegExp(path).test(currentPathClean);
      return known;
    });
    if (!_.some(isKnownRoute)) {
      AccountsTemplates.setPrevPath(currentPath);
    }
    AccountsTemplates.avoidRedirect = false;
  });
});


AccountsTemplates.linkClick = function(route){
  if (AccountsTemplates.disabled()) {
    return;
  }
  var path = AccountsTemplates.getRoutePath(route);
  if (path === '#' || AccountsTemplates.avoidRedirect || path === Router.current().route.path()) {
    AccountsTemplates.setState(route);
  }
  else {
    Meteor.defer(function(){
      Router.go(path);
    });
  }

  var firstVisibleInput = _.find(this.getFields(), function(f){
    return _.contains(f.visible, route);
  });
  if (firstVisibleInput) {
    $('input#at-field-' + firstVisibleInput._id).focus();
  }
};

AccountsTemplates.logout = function(){
  var onLogoutHook = AccountsTemplates.options.onLogoutHook;
  var homeRoutePath = AccountsTemplates.options.homeRoutePath;
  Meteor.logout(function(){
    if (onLogoutHook) {
      onLogoutHook();
    }
    else if (homeRoutePath) {
      Router.go(homeRoutePath);
    }
  });
};

AccountsTemplates.postSubmitRedirect = function(route){
  if (AccountsTemplates.avoidRedirect) {
    AccountsTemplates.avoidRedirect = false;
  }
  else {
    var nextPath = AccountsTemplates.routes[route] && AccountsTemplates.routes[route].redirect;
    if (nextPath){
      if (_.isFunction(nextPath)) {
        nextPath();
      }
      else {
        Router.go(nextPath);
      }
    }else{
      var previousPath = AccountsTemplates.getPrevPath();
      if (previousPath && Router.current().route.path() !== previousPath) {
        Router.go(previousPath);
      }
      else{
        var homeRoutePath = AccountsTemplates.options.homeRoutePath;
        if (homeRoutePath) {
          Router.go(homeRoutePath);
        }
      }
    }
  }
};

AccountsTemplates.submitCallback = function(error, state, onSuccess){

  var onSubmitHook = AccountsTemplates.options.onSubmitHook;
  if(onSubmitHook) {
    onSubmitHook(error, state);
  }

  if (error) {
    if(_.isObject(error.details)) {
      // If error.details is an object, we may try to set fields errors from it
      _.each(error.details, function(error, fieldId){
          AccountsTemplates.getField(fieldId).setError(error);
      });
    }
    else {
      var err = 'error.accounts.Unknown error';
      if (error.reason) {
        err = error.reason;
      }
      if (err.substring(0, 15) !== 'error.accounts.') {
        err = 'error.accounts.' + err;
      }
      AccountsTemplates.state.form.set('error', [err]);
    }
    AccountsTemplates.setDisabled(false);
    // Possibly resets reCaptcha form
    if (state === 'signUp' && AccountsTemplates.options.showReCaptcha) {
      grecaptcha.reset();
    }
  }
  else{
    if (onSuccess) {
      onSuccess();
    }

    if (_.contains(['enrollAccount', 'forgotPwd', 'resetPwd', 'verifyEmail'], state)){
      var redirectTimeout = AccountsTemplates.options.redirectTimeout;
      if (redirectTimeout > 0) {
        AccountsTemplates.timedOutRedirect = Meteor.setTimeout(function(){
          AccountsTemplates.timedOutRedirect = null;
          AccountsTemplates.setDisabled(false);
          AccountsTemplates.postSubmitRedirect(state);
        }, redirectTimeout);
      }
    }
    else if (state){
      AccountsTemplates.setDisabled(false);
      AccountsTemplates.postSubmitRedirect(state);
    }
  }
};
