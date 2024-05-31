### Binding system between a model and a list of controls


```javascript
const bindings = [{
  name: "firstName",
  control: document.getElementById('firstName'),
  getter: o => o.firstName,
  eventName: 'blur',
  onChanged: function ({
    prevValue,
    value
  }) {
    console.log('onChanged', prevValue, value);
  },
  onValidateInput: function ({
    prevModelValue,
    control,
    errorsInput
  }) {
    if (control.value === "A") {
      errorsInput.push({
        code: 'X-011',
        message: 'One letter "A" is not allowed'
      });
      //control.value = null;
    }
    console.log('Errors on validateInput', errorsInput);
  },
  validateModel: function (model) {
    console.log('validating model');
  },
  toControl: (c, v) => c.value = v,
  toValue: c => c.value
},
];

const proxyModel = createBindings(model, bindings);
proxyModel.subscribe();
```
then when you set a property value, the control associated is updated with the format specified by the function `toControl`
`toValue` converts the control value to the property format

```javascript
proxyModel.firstName = "Perico";
```

when you call `validateModel`, a list of errors are returned

```javascript
const errors = proxyModel.validateModel()
```

you can access the `errors` in other point of your code 

```javascript
const errors = proxyModel.errors()
```


when you are done you can dispose the proxy object

```javascript
proxyObject.dispose()
```

a most basic binding with a text input without validation would be something like

```javascript
const bindings = [{
  name: "comment",
  control: document.getElementById('comment'),
  getter: o => o.comment,
  eventName: 'blur',
  toControl: (c, v) => c.value = v,
  toValue: c => c.value,
}];
```
