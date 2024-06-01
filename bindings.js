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

  let isDisposed = false;

  const bindingMap = new Map();
  bindings.forEach(binding => {
    const setter = createSetter(binding.getter);
    const bindingInstance = {
      name: binding.name,
      control: binding.control,
      supressBinding: false,
      onChanging: binding.onChanging,
      onChanged: binding.onChanged,
      onValidateInput: binding.onValidateInput,
      validateModel: binding.validateModel,
      getValue: function () {
        return binding.getter(model);
      },
      setValue: function (newValue) {
        this.supressBinding = true;
        setter(model, newValue, this.onChanging, this.onChanged);
        this.toControl(this.control, newValue);
        this.supressBinding = false;
      },
      eventName: binding.eventName,
      toControl: binding.toControl,
      toValue: binding.toValue,
      subscribe: function () {
        this.unsubscribe();
        binding.control.addEventListener(binding.eventName, controlEventHandlerToken);
      },
      unsubscribe: function () {
        binding.control.removeEventListener(binding.eventName, controlEventHandlerToken);
      },
      errors: [],
      errorsInput: [],
      errorsModel: [],
      dispose: function () {
        this.errors.length = 0;
        this.unsubscribe();
      }
    }; //bindingInstance

    const controlEventHandlerToken = function controlEventHandler(e) {
      if (bindingInstance.supressBinding) {
        return;
      }
      bindingInstance.errorsInput.length = 0;
      if (bindingInstance.onValidateInput) {
        const prevModelValue = bindingInstance.getValue();
        const validationParameters = {
          prevModelValue,
          control: bindingInstance.control,
          errorsInput: []
        }
        bindingInstance.onValidateInput(validationParameters);
        if (validationParameters.errorsInput.length) {
          const newErrorsInput = [...validationParameters.errorsInput];
          newErrorsInput.forEach(error => error.bindingName = bindingInstance.name);
          bindingInstance.errorsInput = newErrorsInput;
          return;
        }
      }
      const proposedValue = bindingInstance.toValue(bindingInstance.control);
      //console.log(controlValue);
      setter(model, proposedValue, bindingInstance.onChanging, bindingInstance.onChanged);
    } //vcontrolEventHandler

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
      Array.prototype.push.apply(errors, [...value.errorsInput]);
      Array.prototype.push.apply(errors, [...value.errorsModel]);
    })
    return errors;
  } // unsubscribe

  function clearErrors(filter = null) {
    bindingMap.forEach(value => {
      value.errorsInput = filter ? value.errorsInput.filter(filter) : [];
      value.errorsModel = filter ? value.errorsModel.filter(filter) : [];
    })
  } // clearErrors

  function validateModel() {
    bindingMap.forEach(value => {
      if (value.validateModel) {
        value.validateModel(model);
      }
    })
    return errors();
  } // validate

  function serialize() {
    return this.model;
  }

  const propertyMap = new Map([
    ['dispose', dispose],
    ['subscribe', subscribe],
    ['model', model],
    ['unsubscribe', unsubscribe],
    ['errors', errors],
    ['validateModel', validateModel],
    ['toJSON', serialize]
  ]);

  const proxy = new Proxy(model, {
    get(target, property) {
      const propertyName = property.toString();
      if (propertyMap.has(propertyName)) {
        return propertyMap.get(propertyName);
      }
      return bindingMap.get(propertyName).getValue();
    },
    set(target, property, value) {
      const propertyName = property.toString();
      bindingMap.get(propertyName).setValue(value);
    }
  }); // proxy

  //proxy.subscribe();
  bindings.forEach(binding => {
    proxy[binding.name] = binding.getter(model);
  });


  return proxy;
}

const converters = {
  InputNumberToOptionalNumberConverter: function (c) {
    let proposed = parseFloat(c.value);
    if (isNaN(proposed)) {
      proposed = null;
    }
    return proposed;
  },
  InputDateToOptionalDateConverter: function (c) {
    let proposed = null;
    try {
      proposed = new Date(c.value);
    } catch (error) {
      proposed = null;
    }
    return proposed;
  },
  OptionalDateToInputDateToConverter: function (c, v) {
    let proposed = null;

    try {
      if (v instanceof String || v instanceof Number) {
        proposed = new Date(v);
      } else if (v instanceof Date) {
        proposed = v;
      }
    } catch (error) {
      proposed = null;
    }
    c.valueAsDate = proposed;
  }
}

const formatters = {
  euroFormatter: new Intl.NumberFormat('es-ES', {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    useGrouping: 'true',
    roundingMode: 'halfEven'
  })
}

const parsers = {

  euroParser: {
    /**
     * 
     * @param {string} text - the string to parse 
     * @returns 
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
 * @param {name: string, getter: function, controlId: string, eventName: string, onChanged: function, onValidateInput: function, validateModel: function} parameter
 * @returns 
 */
function createTextBinding({ name, getter, controlId, eventName = 'blur', onChanged = null, onValidateInput = null, validateModel = null }) {
  return {
    name: name,
    control: document.getElementById(controlId ?? name),
    getter: getter,
    eventName: eventName,
    toControl: (c, v) => c.value = v,
    toValue: c => c.value,
    onChanged: onChanged,
    onValidateInput: onValidateInput,
    validateModel: validateModel,
  }
}

/**
 * 
 * @param {name: string, getter: function, controlId: string, eventName: string, onChanged: function, onValidateInput: function, validateModel: function} parameter 
 * @returns 
 */
function createEuroBinding({ name, getter, controlId, eventName = 'blur', onChanged = null, onValidateInput = null, validateModel = null }) {
  return {
    name: name,
    control: document.getElementById(controlId ?? name),
    getter: getter,
    eventName: eventName,
    toControl: (c, v) => c.value = formatters.euroFormatter.format(v),
    toValue: c => parsers.euroParser.parse(c.value),
    onChanged: onChanged,
    onValidateInput: onValidateInput,
    validateModel: validateModel,
  }
}