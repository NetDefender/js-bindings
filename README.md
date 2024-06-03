### Binding system between a model and a list of controls


```javascript
const model = {
    id: 1,
    createDate: null,
    firstName: "Daniel",
    total: 11000.34,
};

const bindings = [];

bindings.push(createTextBinding({
    name: 'firstName', getter: o => o.firstName, onValidateModel: (p) => {
        console.log(`validating model ${JSON.stringify(p.modelCopy)}, with value ${p.value}`);
        if (p.value === 'A') {
            p.errorsModel.push({ code: 'X-011', message: 'One letter "A" is not allowed' });
        }
    }
}));
bindings.push(createTextBinding({ name: 'createDate', getter: o => o.createDate }));
bindings.push(createEuroBinding({ name: 'total', getter: o => o.total }));

const proxyModel = createBindings(model, bindings);
proxyModel.subscribe();

document.getElementById('check').addEventListener('click', () => {
    console.log(proxyModel.model);
    console.log(proxyModel.errors());
});

document.getElementById('validate').addEventListener('click', () => {
    console.log(proxyModel.validate());
});
```
then when you set a property value, the control associated is updated with the format specified by the function `toControl`
`toValue` converts the control value to the property format

```javascript
proxyModel.firstName = "Perico";
```

when you call `validate`, a list of errors are returned

```javascript
const errors = proxyModel.validate()
```

you can access the `errors` in other point of your code 

```javascript
const errors = proxyModel.errors()
```


when you are done you can dispose the proxy object

```javascript
proxyObject.dispose()
```
