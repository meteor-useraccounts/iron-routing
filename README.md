# Iron Router add-on for User Accounts

User Accounts is a suite of packages for the [Meteor.js](https://www.meteor.com/) platform. It provides highly customizable user accounts UI templates for many different front-end frameworks. At the moment it includes forms for sign in, sign up, forgot password, reset password, change password, enroll account.

This package is an optional add-on for integration with [Iron Router](https://atmospherejs.com/iron/router).

## Configuration

Before you configure routes for User Accounts with Iron Router, you will need to make sure you have set a few default configuration items.  

Assuming you have a main layout that looks like this:

```handlebars
<template name="myLayout">
  {{> yield region='nav'}}

  <div id="content">
    {{> yield}}
  </div>

  {{> yield region='footer'}}
</template>
```

You would configure the router and this package to use it like this:

```js
Router.configure({
    layoutTemplate: 'masterLayout',
    yieldTemplates: {
        myNav: {to: 'nav'},
        myFooter: {to: 'footer'},
    }
});

AccountsTemplates.configure({
    defaultLayout: 'myLayout',
});
```

NOTE: The above configs must load BEFORE your AccountsTemplates routes are defined (next section).

## Routes

There are no routes provided by default. But you can easily configure routes for sign in, sign up, forgot password, reset password, change password, enroll account using `AccountsTemplates.configureRoute`. This is done internally relying on the awesome [Iron-Router](https://atmospherejs.com/package/iron-router) package.

The simplest way is to make the call passing just the route code (available codes are: changePwd, enrollAccount, forgotPwd, resetPwd, signIn, signUp):

```javascript
AccountsTemplates.configureRoute('signIn');
```

This will set up the sign in route with a full-page form letting users access your app.

But you can also pass in more options to adapt it to your needs with:

```javascript
AccountsTemplates.configureRoute(route_code, options);
```

The following is a complete example of a route configuration:

```javascript
AccountsTemplates.configureRoute('signIn', {
    name: 'signin',
    path: '/login',
    template: 'myLogin',
    layoutTemplate: 'myLayout',
    redirect: '/user-profile',
});
```

Fields `name`, `path`, `template`, and `layoutTemplate` are passed down directly to Router.map (see the official iron router documentation [here](https://github.com/EventedMind/iron-router/#api) for more details), while `redirect` permits to specify where to redirect the user after successful form submit. Actually, `redirect` can be a function so that, for example, the following:

```javascript
AccountsTemplates.configureRoute('signIn', {
    redirect: function(){
        var user = Meteor.user();
        if (user)
          Router.go('/user/' + user._id);
    }
});
```

will redirect to, e.g., '/user/ae8WQQk6DrtDzA2AZ' after succesful login :-)


All the above fields are optional and fall back to default values in case you don't provide them. Default values are as follows:

| Action          | route_code    | Route Name      | Route Path       | Template       | Redirect after Timeout |
| --------------- | ------------- | --------------- | ---------------  | -------------- |:----------------------:|
| change password | changePwd     | atChangePwd     | /change-password | fullPageAtForm |                        |
| enroll account  | enrollAccount | atEnrollAccount | /enroll-account  | fullPageAtForm |            X           |
| forgot password | forgotPwd     | atForgotPwd     | /forgot-password | fullPageAtForm |            X           |
| reset password  | resetPwd      | atResetPwd      | /reset-password  | fullPageAtForm |            X           |
| sign in         | signIn        | atSignIn        | /sign-in         | fullPageAtForm |                        |
| sign up         | signUp        | atSignUp        | /sign-up         | fullPageAtForm |                        |
| verify email    | verifyEmail   | atVerifyEmail   | /verify-email    | fullPageAtForm |            X           |
| resend verification email    | resendVerificationEmail   | atresendVerificationEmail   | /send-again    | fullPageAtForm |                        |

If `layoutTemplate` is not specified, it falls back to what is currently set up with Iron-Router.
If `redirect` is not specified, it default to the previous route (obviously routes set up with `AccountsTemplates.configureRoute` are excluded to provide a better user experience). What more, when the login form is shown to protect private content (see [Content Protection](#content-protection), the user is redirect to the protected page after successful sign in or sign up, regardless of whether a `redirect` parameter was passed for `signIn` or `signUp` route configuration or not.

Besides the above list of routes you can also configure `ensureSignedIn` in order to specify different template and layout to be used for the Iron Router `ensuredSignedIn` plugin (see [Content Protection](#content-protection)):

```javascript
AccountsTemplates.configureRoute('ensureSignedIn', {
    template: 'myLogin',
    layoutTemplate: 'myLayout',
});
```

in this case, any field different from `template` and `layoutTemplate` will be ignored!

## Content Protection

useraccounts:iron-routing package come with an Iron Router plugin called `ensureSignedIn` which permits to prompt for the sign in form for the pages requiring the user to be signed in.
It behaves nicely letting the required route path inside the address bar and bringing you back to the same route once logged in.

**Please note that a fake version of `ensureSignedIn` is also available on server-side to allow for shared routing files, but there's no way to check whether a user is logged in or not on a server-side route!**

To protect **all** you routes use it like this:

```javascript
Router.plugin('ensureSignedIn');
```

While in case you want to protect *almost all* your routes you might want to set up the plugin this way:

```javascript
Router.plugin('ensureSignedIn', {
    except: ['home', 'atSignIn', 'atSignUp', 'atForgotPassword']
});
```

while an even better example could be

```javascript
Router.plugin('ensureSignedIn', {
  except: _.pluck(AccountsTemplates.routes, 'name').concat(['home', 'contacts'])
});
```

if, instead, it's only a bunch of routes to be protected you could do (even more than once inside different files...):

```javascript
Router.plugin('ensureSignedIn', {
    only: ['profile', 'privateStuff']
});
```

Moreover, if you wish to customize the template and layout to be used you can change them with:

```javascript
AccountsTemplates.configureRoute('ensureSignedIn', {
    template: 'myLogin',
    layoutTemplate: 'myLayout',
});
```
