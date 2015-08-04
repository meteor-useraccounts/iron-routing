/* global
  Iron: false
*/
'use strict';


// Fake server-side IR plugin to allow for shared routing files
Iron.Router.plugins.ensureSignedIn = function (router, options) {};
