'use strict';

var isArray = require('lodash/lang/isArray');

var DROPDOWN_TYPE = 'Dropdown';

var VALID_TYPES = [ 'String', 'Text', 'Boolean', DROPDOWN_TYPE ];

var PROPERTY_TYPE = 'property',
    CAMUNDA_PROPERTY_TYPE = 'camunda:property',
    INPUT_PARAMETER_TYPE = 'camunda:inputParameter',
    OUTPUT_PARAMETER_TYPE = 'camunda:outputParameter';

var VALID_BINDING_TYPES = [
  PROPERTY_TYPE,
  CAMUNDA_PROPERTY_TYPE,
  INPUT_PARAMETER_TYPE,
  OUTPUT_PARAMETER_TYPE
];


/**
 * A element template validator.
 */
function Validator() {

  this._templatesById = {};

  this._validTemplates = [];
  this._errors = [];


  /**
   * Adds the templates.
   *
   * @param {Array<TemplateDescriptor>} templates
   *
   * @return {Validator} self
   */
  this.addAll = function(templates) {

    if (!isArray(templates)) {
      this._logError('templates must be []');
    } else {
      templates.forEach(this.add, this);
    }

    return this;
  };

  /**
   * Add the given element template, if it is valid.
   *
   * @param {TemplateDescriptor} template
   *
   * @return {Validator} self
   */
  this.add = function(template) {

    var err = this._validateTemplate(template);

    if (!err) {
      this._templatesById[template.id] = template;

      this._validTemplates.push(template);
    }

    return this;
  };

  /**
   * Validate given template and return error (if any).
   *
   * @param {TemplateDescriptor} template
   *
   * @return {Error} validation error, if any
   */
  this._validateTemplate = function(template) {

    var err,
        id = template.id,
        appliesTo = template.appliesTo,
        properties = template.properties;

    if (!id) {
      return this._logError('missing template id');
    }

    if (id in this._templatesById) {
      return this._logError('template id <' + id + '> already used');
    }

    if (!isArray(appliesTo)) {
      err = this._logError('missing appliesTo=[]', template);
    }

    if (!isArray(properties)) {
      err = this._logError('missing properties=[]', template);
    } else {
      if (!this._validateProperties(properties)) {
        err = new Error('invalid properties');
      }
    }

    return err;
  };

  /**
   * Validate properties and return false if any is invalid.
   *
   * @param {Array<PropertyDescriptor>} properties
   *
   * @return {Boolean} true if all properties are valid
   */
  this._validateProperties = function(properties) {
    var validProperties = properties.filter(this._validateProperty, this);

    return properties.length === validProperties.length;
  };

  /**
   * Validate property and return false, if there was
   * a validation error.
   *
   * @param {PropertyDescriptor} property
   *
   * @return {Boolean} true if property is valid
   */
  this._validateProperty = function(property) {

    var type = property.type,
        binding = property.binding;

    var err;

    if (VALID_TYPES.indexOf(type) === -1) {
      err = this._logError(
              'invalid property type <' + type + '>; ' +
              'must be any of { ' + VALID_TYPES.join(', ') + ' }');
    }

    if (type === DROPDOWN_TYPE) {
      if (!isArray(property.choices)) {
        err = this._logError('must provide choices=[] with ' + DROPDOWN_TYPE + ' type');
      } else

      if (!property.choices.every(isDropdownChoiceValid)) {
        err = this._logError(
          '{ name, value } must be specified for ' +
          DROPDOWN_TYPE + ' choices'
        );
      }
    }

    if (!binding) {
      return this._logError('property missing binding');
    }

    var bindingType = binding.type;

    if (VALID_BINDING_TYPES.indexOf(bindingType) === -1) {
      err = this._logError(
              'invalid property.binding type <' + bindingType + '>; ' +
              'must be any of { ' + VALID_BINDING_TYPES.join(', ') + ' }');
    }

    if (bindingType === PROPERTY_TYPE ||
        bindingType === CAMUNDA_PROPERTY_TYPE ||
        bindingType === INPUT_PARAMETER_TYPE) {

      if (!binding.name) {
        err = this._logError(
                'property.binding <' + bindingType + '> requires name');
      }
    }

    if (bindingType === OUTPUT_PARAMETER_TYPE) {
      if (!binding.source) {
        err = this._logError(
                'property.binding <' + bindingType + '> requires source');
      }
    }

    return !err;
  };


  this._logError = function(err, template) {

    if (typeof err === 'string') {
      if (template) {
        err = 'template(id: ' + template.id + ') ' + err;
      }

      err = new Error(err);
    }

    this._errors.push(err);

    return err;
  };

  this.getErrors = function() {
    return this._errors;
  };

  this.getValidTemplates = function() {
    return this._validTemplates;
  };
}

module.exports = Validator;


//////// helpers ///////////////////////////////////

function isDropdownChoiceValid(c) {
  return 'name' in c && 'value' in c;
}