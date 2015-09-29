/* global
  AccountsTemplates: false,
  Router: false
*/
'use strict';

AccountsTemplates.atInputRendered.push(function(){
  var fieldId = this.data._id;
  var queryKey = this.data.options && this.data.options.queryKey || fieldId;
  var currentR = Router.current();
  var inputQueryVal = currentR && currentR.params && currentR.params.query && currentR.params.query[queryKey];
  if (inputQueryVal) {
    this.$("input#at-field-" + fieldId).val(inputQueryVal);
  }
});
