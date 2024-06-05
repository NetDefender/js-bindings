//reference: bindings.js

const model = {
    id: 1,
    createDate: null,
    firstName: "Daniel",
    total: null,
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
bindings.push(createDateBinding({ name: 'createDate', getter: o => o.createDate }));
bindings.push(createEuroBinding({ name: 'total', getter: o => o.total }));

const proxyModel = createBindings(model, bindings);
proxyModel.subscribe();

const totalControl = document.getElementById('total');

document.getElementById('check').addEventListener('click', () => {
    console.log(proxyModel.model);
});

document.getElementById('validate').addEventListener('click', () => {
    console.log(proxyModel.validate());
});