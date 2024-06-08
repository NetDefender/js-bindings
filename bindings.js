/**
 * @typedef BeforeInputParameters
 * @type {object}
 * @property {boolean} cancel - true if you want to cancel the input.
 * @property {string} text - the text of the input.
 * @property {string} rangeText - the text that will be inserted into the input.
 * @property {string} type - 
 * @property {string} selectedText - the selected Text
 * @property {number} selectionStart - the selectionStart of the input.
 * @property {number} selectionEnd - the selectionEnd of the input.
 */

/**
 * @callback BeforeInputFunction
 * @param {BeforeInputParameters} p
 */

/**
* @callback FocusedFunction
* @param {HTMLElement} control
* @param {object?} value
*/

/**
 * @typedef ChangingParameters
 * @type {object}
 * @property {object} currentValue
 * @property {object} proposedValue
 */

/**
 * @callback ChangingFunction
 * @param {ChangingParameters} parameters
 */

/**
 * @typedef ChangedParameters
 * @property {object} value
 * @property {object} prevValue
 */

/**
 * @callback ChangedFunction
 * @param {ChangedParameters} parameters
 */

/**
 * @typedef Binding
 * @property {string} name,
 * @property {object} model
 * @property {HTMLElement} control,
 * @property {BeforeInputFunction} onBeforeInput
 * @property {FocusedFunction} onFocused
 * @property {ChangingFunction} onChanging
 * @property {ChangedFunction} onChanged
 * @property {ValidateModelFunction} onValidateModel
 * @property {GetterFunction} getter,
 * @property {ToControlFunction} toControl,
 * @property {ToValueFunction} toValue,
 */

/**
 * @callback createBindingFunction
 * @param {string} name
 * @param {GetterFunction} getter
 * @param {string} controlId
 * @param {ChangedFunction} onChanged
 * @param {ValidateModelFunction} onValidateModel
 * @returns {Binding}
 */

/**
 * @typedef ValidationParameters
 * @type {object}
 * @property {object} value
 * @property {object} modelCopy
 * @property {object[]} errorsModel
 */

/**
 * @callback ValidateModelFunction
 * @param {ValidationParameters} parameters
 */

/**
 * @callback GetterFunction
 * @param {object} model
 * @returns {object}
 */

/**
 * @callback SetterFunction
 * @param {object} model
 * @param {object} value
 * @param {ChangingFunction} onChanging
 * @param {ChangedFunction} onChanged
 * @param {boolean} ignoreOnChange
 * @returns {void}
 */


/**
 * @param {GetterFunction} getter 
 * @returns {SetterFunction}
 */

/**
 * @callback ToControlFunction
 * @param {HTMLElement} control
 * @param {object} value
 * @returns {void}
 */

/**
 * @callback ToValueFunction
 * @param {HTMLElement} control
 * @returns {object} value
 */

/**
 * 
 * @param {GetterFunction} getter 
 * @returns {SetterFunction}
 */
function createSetter(getter) {
  const path = [];
  const proxy = new Proxy({}, {
    get(_, property) {
      path.push(property);
      return proxy;
    }
  });
  getter(proxy);
  const lastPath = path.pop().toString();
  const previousPath = path.map(e => e.toString()).join('?.');
  const callChainText = 'model' + (previousPath ? `?.${previousPath}` : '');
  const setterFactoryText = `return (model, value, onChanging, onChanged, ignoreOnChange) => {
    const callChain = ${callChainText};
    if(callChain == null || callChain == undefined || ignoreOnChange) {
    	return;
    }
    const prevValue = callChain.${lastPath};
    if(prevValue == value) { 
    	return;
    }
    if(onChanging) {
    	onChanging({currentValue: prevValue, proposedValue: value});
    }
    callChain.${lastPath}=value;
    if(onChanged) {
    	onChanged({prevValue, value});
    }
  }`;

  //console.log(getterFactoryText);
  return new Function(setterFactoryText)();
}

/**
 * 
 * @param {object} model 
 * @param {Binding[]} bindings 
 * @returns {Proxy}
 */
function createBindings(model, bindings) {
  if (!Array.isArray(bindings)) {
    bindings = [bindings];
  }
  const bindingEventName = 'focusout';
  const focusEventName = 'focusin';
  const beforeInputEventName = 'beforeinput';

  let isDisposed = false;

  const bindingMap = new Map();
  bindings.forEach(binding => {
    const setter = createSetter(binding.getter);
    const bindingInstance = {
      name: binding.name,
      control: binding.control,
      supressBinding: false,
      onBeforeInput: binding.onBeforeInput,
      onFocused: binding.onFocused,
      onChanging: binding.onChanging,
      onChanged: binding.onChanged,
      onValidateModel: binding.onValidateModel,
      getValue: function () {
        return binding.getter(model);
      },
      getModelCopy: function () {
        return JSON.parse(JSON.stringify(model));
      },
      setValue: function (newValue) {
        this.supressBinding = true;
        setter(model, newValue, this.onChanging, this.onChanged);
        this.toControl(this.control, newValue);
        this.supressBinding = false;
      },
      toControl: binding.toControl,
      toValue: binding.toValue,
      errors: [],
      errorsModel: [],
      subscribe: function () {
        this.unsubscribe();
        binding.control.addEventListener(bindingEventName, controlBindingEventHandler);
        binding.control.addEventListener(focusEventName, controlFocusEventHandler);
        binding.control.addEventListener(beforeInputEventName, controlBeforeInputEventHandler);
      },
      unsubscribe: function () {
        binding.control.removeEventListener(bindingEventName, controlBindingEventHandler);
        binding.control.removeEventListener(focusEventName, controlFocusEventHandler);
        binding.control.removeEventListener(beforeInputEventName, controlBeforeInputEventHandler);
      },
      dispose: function () {
        this.errors.length = 0;
        this.unsubscribe();
      }
    }; //bindingInstance


    /**
     * @param {FocusEvent} e 
     */
    const controlBindingEventHandler = function (e) {
      if (bindingInstance.supressBinding) {
        return;
      }
      const newalue = bindingInstance.toValue(bindingInstance.control);
      setter(model, newalue, bindingInstance.onChanging, bindingInstance.onChanged);
      bindingInstance.toControl(bindingInstance.control, newalue);
    } // controlBindingEventHandler

    /**
     * @param {FocusEvent} e 
     */
    const controlFocusEventHandler = function (e) {
      if (bindingInstance.control === e.target && bindingInstance.onFocused) {
        bindingInstance.onFocused(e.target, bindingInstance.getValue());
      }
    } // controlFocusEventHandler

    /*
      insertText, deleteContentBackward, deleteContentForward, insertFromPaste, and formatBold
    */
    /**
     * 
     * @param {InputEvent} e 
     * @returns 
     */
    const controlBeforeInputEventHandler = function (e) {
      if (bindingInstance.onBeforeInput) {

        /** @type {BeforeInputParameters} */
        const beforeInputParameters = {
          cancel: false,
          text: e.target.value,
          rangeText: e.data,
          type: e.inputType,
          selectedText: e.target?.value?.substring(e.target.selectionStart, e.target.selectionEnd),
          selectionStart: e.target?.selectionStart ?? 0,
          selectionEnd: e.target?.selectionEnd ?? 0,
        };

        bindingInstance.onBeforeInput(beforeInputParameters);

        if (beforeInputParameters.cancel) {
          e.preventDefault();
          return;
        }

        if (e.data != beforeInputParameters.rangeText) {
          e.preventDefault();
          e.target.setRangeText(replacement = beforeInputParameters.rangeText);
        }

        if (e.target.selectionStart != beforeInputParameters.selectionStart
          || e.target.selectionEnd != beforeInputParameters.selectionEnd) {
          e.target.setSelectionRange(beforeInputParameters.selectionStart, beforeInputParameters.selectionEnd/*, 'forward'*/);
        }
      }
    } // controlBeforeInputEventHandler

    bindingMap.set(binding.name, bindingInstance);
  }); // forEach

  function dispose() {
    unsubscribe();
    isDisposed = true;
  } // dispose

  function subscribe() {
    bindingMap.forEach(value => {
      value.subscribe();
    })
  } // subscribe

  function unsubscribe() {
    bindingMap.forEach(value => {
      value.unsubscribe();
    })
  } // unsubscribe

  function errors() {
    const errors = [];
    bindingMap.forEach(value => {
      Array.prototype.push.apply(errors, [...value.errorsModel]);
    })
    return errors;
  } // unsubscribe

  function clearErrors(filter = null) {
    bindingMap.forEach(value => {
      value.errorsModel = filter ? value.errorsModel.filter(filter) : [];
    })
  } // clearErrors

  function validate() {
    bindingMap.forEach(binding => {
      binding.errorsModel.length = 0;
      if (binding.onValidateModel) {
        const validationParameters = {
          value: binding.getValue(),
          modelCopy: binding.getModelCopy(),
          errorsModel: []
        }
        binding.onValidateModel(validationParameters);
        validationParameters.errorsModel.forEach(error => {
          error.bindingName = binding.name;
          error.control = binding.control;
        });
        binding.errorsModel = [...validationParameters.errorsModel];
      }
    })
    return errors();
  } // validate

  /**
   * 
   * @returns {object}
   */
  function serialize() {
    return this.model;
  }

  const reservedMembersMap = new Map([
    ['dispose', dispose],
    ['subscribe', subscribe],
    ['model', model],
    ['unsubscribe', unsubscribe],
    ['errors', errors],
    ['validate', validate],
    ['clearErrors', clearErrors],
    ['toJSON', serialize]
  ]);

  const proxy = new Proxy(model, {
    get(target, property) {
      const propertyName = property.toString();
      if (reservedMembersMap.has(propertyName)) {
        return reservedMembersMap.get(propertyName);
      }
      return bindingMap.get(propertyName).getValue();
    },
    set(target, property, value) {
      const propertyName = property.toString();
      bindingMap.get(propertyName).setValue(value);
    }
  }); // proxy

  bindings.forEach(binding => {
    proxy[binding.name] = binding.getter(model);
  });

  return proxy;
}

const formatters = {
  euroFormatter: new Intl.NumberFormat('es-ES', {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    useGrouping: 'true',
    roundingMode: 'halfEven'
  }),
  dateFormat: /^(?<day>\d{1,2})\/(?<month>\d{1,2})\/(?<year>\d{4})$/,
  dateStringFormatter: {
    /**
     * 
     * @param {string?} dateString 
     * @returns {string?}
     */
    format(dateString) {
      const date = parsers.dateParser.parse(dateString);
      if (date === null) {
        return null;
      }
      return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
    }
  },
  dateFormatter: {
    /**
     * 
     * @param {Date?} date 
     * @returns 
     */
    format(date) {
      if (!(date instanceof Date) || isNaN(date.getTime())) {
        return null;
      }
      return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
    }
  },
}

const parsers = {
  euroParser: {
    /**
     * Parse a number in the format "123.456,78" with optional '€' symbol
     * @param {string} text - the string to parse 
     * @returns {number?}
     */
    parse: function (text) {
      if (text === null || text.length === 0) {
        return null;
      }
      const parsed = parseFloat(text.replace(/[.€ ]/g, '').replace(/[,]/g, '.'));

      return isNaN(parsed) ? null : parsed;
    }
  },
  dateParser: {
    /**
     * Parse a number in the format "123.456,78" with optional '€' symbol
     * @param {string} text - the string to parse 
     * @returns {date?}
     */
    parse: function (text) {
      if (text === null || text.length === 0) {
        return null;
      }

      const match = text.match(formatters.dateFormat);

      if (!match) {
        return null;
      }
      const date = new Date(`${match.groups.year}-${match.groups.month}-${match.groups.day}`);
      if (isNaN(date.getTime())) {
        return null;
      }
      return date;
    },
  },
}

const inputHandlers = {
  date: {
    /**
     * 
     * @param {BeforeInputParameters} p 
     * @returns 
     */
    onBeforeInput: function (p) {
      // if not type nothing let it go
      if (!p.rangeText) {
        return;
      }

      if (p.selectionStart !== p.selectionEnd) {
        return;
      }

      const separators = getSeparatorIndexes(p.text);

      if (p.rangeText === '/') {
        if (p.selectionStart === separators.firstIndex) {
          p.rangeText = '';
          p.selectionStart += 1;
          p.selectionEnd = separators.secondIndex ?? p.selectionStart;
        } else if (p.selectionStart === separators.secondIndex) {
          p.rangeText = '';
          p.selectionStart += 1;
          p.selectionEnd = p.selectionStart + p.text.length - separators.secondIndex;
        }
      }

      /**
       * 
       * @param {string?} text 
       * @returns {{firstIndex: number?, secondIndex: number?}}
       */
      function getSeparatorIndexes(text) {
        const separators = {
          firstIndex: null,
          secondIndex: null
        }
        if (text === null || text.length === 0) {
          return separators;
        }
        const firstIndex = text.indexOf('/');
        if (firstIndex === -1) {
          return separators;
        }
        separators.firstIndex = firstIndex;

        const secondIndex = text.indexOf('/', firstIndex + 1);
        if (secondIndex === -1) {
          return separators;
        }

        separators.secondIndex = secondIndex;

        return separators;
      }
    },
  },
  euro: {
    /**
     * 
     * @param {BeforeInputParameters} p 
     * @returns 
     */
    onBeforeInput: (p) => {
      // if not type nothing let it go
      if (!p.rangeText) {
        return;
      }

      // if dot or comma, check if there is already one
      if (p.rangeText === '.' || p.rangeText === ',') {
        if (p.text.indexOf(',') !== -1 && (!p.selectedText || p.selectedText.indexOf(',') === -1)) {
          p.cancel = true;
        }
        else if (p.rangeText === '.') {
          p.rangeText = ',';
          p.selectionStart += 1;
          p.selectionEnd = p.selectionStart;
        }
        return;
      }

      // if not digit, cancel
      if (!p.rangeText.match(/\d+/)) {
        p.cancel = true;
        return;
      }

      // here is digit only, check if we have more than 2 decimals
      const commaIndex = p.text.indexOf(',');
      if (commaIndex != -1) {
        if (p.selectedText.indexOf(',') === -1 && p.selectionStart > commaIndex) {
          const decimalsConsumed = (p.selectionStart - (commaIndex + 1)) + (p.text.length - p.selectionEnd);
          if (decimalsConsumed >= 2) {
            p.cancel = true;
          }
        }
      }
    },
  }
}


/** @type {createBindingFunction} */
function createTextBinding({ name, getter, controlId, onChanged = null, onValidateModel = null }) {
  return {
    name: name,
    control: document.getElementById(controlId ?? name),
    getter: getter,
    onFocused: (c, v) => c.select(),
    onBeforeInput: (p) => {

    },
    toControl: (c, v) => c.value = v,
    toValue: c => c.value,
    onChanged: onChanged,
    onValidateModel: onValidateModel,
  }
}



/** @type {createBindingFunction} */
function createEuroBinding({ name, getter, controlId, onChanged = null, onValidateModel = null }) {
  return {
    name: name,
    control: document.getElementById(controlId ?? name),
    getter: getter,
    onFocused: (c, v) => {
      c.value = c.value?.replace(/[.€]/, '');
      c.select();
    },
    onBeforeInput: inputHandlers.euro.onBeforeInput,
    toControl: (c, v) => c.value = formatters.euroFormatter.format(v),
    toValue: c => parsers.euroParser.parse(c.value),
    onChanged: onChanged,
    onValidateModel: onValidateModel,
  }
}

/** @type {createBindingFunction} */
function createDateStringBinding({ name, getter, controlId, onChanged = null, onValidateModel = null }) {

  return {
    name: name,
    control: document.getElementById(controlId ?? name),
    getter: getter,
    onFocused: (c, v) => {
      c.selectionStart = 0;
      c.selectionEnd = 2;
    },
    onBeforeInput: inputHandlers.date.onBeforeInput,
    toControl: (c, v) => c.value = formatters.dateStringFormatter.format(v),
    toValue: c => formatters.dateStringFormatter.format(c.value),
    onChanged: onChanged,
    onValidateModel: onValidateModel,
  }
}


/** @type {createBindingFunction} */
function createDateBinding({ name, getter, controlId, onChanged = null, onValidateModel = null }) {
  return {
    name: name,
    control: document.getElementById(controlId ?? name),
    getter: getter,
    onFocused: (c, v) => {
      c.selectionStart = 0;
      c.selectionEnd = 2;
    },
    onBeforeInput: inputHandlers.date.onBeforeInput,
    toControl: (c, v) => c.value = formatters.dateFormatter.format(v),
    toValue: c => parsers.dateParser.parse(c.value),
    onChanged: onChanged,
    onValidateModel: onValidateModel,
  }
}