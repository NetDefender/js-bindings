//reference: bindings.js

const model = {
    id: 1,
    createDate: null,
    firstName: "Daniel",
    total: 1000.34,
};

const bindings = [];
bindings.push(createTextBinding({ name: 'firstName', getter: o => o.firstName }));
bindings.push(createTextBinding({ name: 'createDate', getter: o => o.createDate }));
bindings.push(createEuroBinding({ name: 'total', getter: o => o.total }));

const proxyModel = createBindings(model, bindings);
proxyModel.subscribe();

document.getElementById('check').addEventListener('click', () => {
    console.log(proxyModel.model);
    console.log(proxyModel.errors());
});

document.getElementById('validate').addEventListener('click', () => {
    console.log(proxyModel.validateModel());
});