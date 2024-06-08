//reference: bindings.js

const model = {
    id: 1,
    createDate: '01/11/2080',
    firstName: "Daniel",
    total: null,
    nativeDate: new Date('2050-05-6'),
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

// nativeDateControl.addEventListener('input', (e) => {
//     if (e.target.value) {
//         const nextCharacter = e.target.value.substring(e.target.selectionStart, e.target.selectionStart + 1);
//         console.log(nextCharacter);
//         if (nextCharacter === '/') {
//             // p.rangeText = `${p.rangeText}/`;
//             // p.selectionStart += 1;
//             // p.selectionEnd = p.selectionStart;
//         }
//     }
// })