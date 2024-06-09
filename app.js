//reference: bindings.js
//reference: parsers.js

const model = {
    id: 1,
    createDate: '01/11/2080',
    firstName: "Daniel",
    total: 587622.36,
    nativeDate: new Date('2050-5-6'),
};

/** @type {Binding[]} */
const bindings = [];

bindings.push(createTextBinding({
    name: 'firstName', getter: o => o.firstName, onValidateModel: (p) => {
        console.log(`validating model ${JSON.stringify(p.modelCopy)}, with value ${p.value}`);
        if (p.value === 'A') {
            p.errorsModel.push({ code: 'X-011', message: 'One letter "A" is not allowed' });
        }
    }
}));
bindings.push(createEuroBinding({ name: 'total', getter: o => o.total }));
bindings.push(createDateStringBinding({ name: 'createDate', getter: o => o.createDate }));
bindings.push(createDateBinding({ name: 'nativeDate', getter: o => o.nativeDate }));

const proxyModel = createBindings(model, bindings);
proxyModel.subscribe();

const nativeDateControl = document.getElementById('nativeDate');

document.getElementById('view').addEventListener('click', () => {
    console.log(JSON.stringify(proxyModel));
});

document.getElementById('validate').addEventListener('click', () => {
    console.log(proxyModel.validate());
});