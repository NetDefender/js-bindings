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

    const controlBindingEventHandler = function (e) {
      if (bindingInstance.supressBinding) {
        return;
      }
      const newalue = bindingInstance.toValue(bindingInstance.control);
      setter(model, newalue, bindingInstance.onChanging, bindingInstance.onChanged);
      bindingInstance.toControl(bindingInstance.control, newalue);
    } // controlBindingEventHandler

    const controlFocusEventHandler = function (e) {
      if (bindingInstance.control === e.target && bindingInstance.onFocused) {
        bindingInstance.onFocused(e.target, bindingInstance.getValue());
      }
    } // controlFocusEventHandler

    /*
      insertText, deleteContentBackward, deleteContentForward, insertFromPaste, and formatBold
    */
    const controlBeforeInputEventHandler = function (e) {
      if (bindingInstance.onBeforeInput) {
        const beforeInputParameters = {
          cancel: false,
          text: e.target.value,
          rangeText: e.data,
          type: e.inputType,
          selectedText: e.target.value?.substring(e.target.selectionStart, e.target.selectionEnd),
          selectionStart: e.target.selectionStart,
          selectionEnd: e.target.selectionEnd,
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
          e.target.setSelectionRange(beforeInputParameters.selectionStart, beforeInputParameters.selectionEnd, 'forward');
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
  }
}

/**
 * 
 * @param {name: string, getter: function, controlId: string, onChanged: function, onValidateModel: function} parameter
 * @returns 
 */
function createTextBinding({ name, getter, controlId, onChanged = null, onValidateModel = null }) {
  return {
    name: name,
    control: document.getElementById(controlId ?? name),
    getter: getter,
    onBeforeInput: (p) => {

    },
    toControl: (c, v) => c.value = v,
    toValue: c => c.value,
    onChanged: onChanged,
    onValidateModel: onValidateModel,
  }
}

/**
 * 
 * @param {name: string, getter: function, controlId: string, onChanged: function, onValidateModel: function} parameter
 * @returns 
 */
function createEuroBinding({ name, getter, controlId, onChanged = null, onValidateModel = null }) {
  return {
    name: name,
    control: document.getElementById(controlId ?? name),
    getter: getter,
    onFocused: (c, v) => c.value = c.value?.replace(/[.€]/, ''),
    onBeforeInput: (p) => {
      /*
          { 
            cancel,
            text,
            type,
            selectedText
            selectionStart,
            selectionEnd
          }
      */

      if (p.rangeText === '.' || p.rangeText === ',') {
        if (p.text.indexOf(',') !== -1 && (!p.selectedText || p.selectedText.indexOf(',') === -1)) {
          p.cancel = true;
        }
        else {
          p.rangeText = ',';
          p.selectionStart += 1;
          p.selectionEnd = p.selectionStart;
        }
        return;
      }

      if (p.rangeText && !p.rangeText.match(/\d+/)) {
        p.cancel = true;
        return;
      }

      // if (p.rangeText) {
      //   const caret = p.selectionStart;

      // }
    },
    toControl: (c, v) => c.value = formatters.euroFormatter.format(v),
    toValue: c => parsers.euroParser.parse(c.value),
    onChanged: onChanged,
    onValidateModel: onValidateModel,
  }
}