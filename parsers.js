
// #region Formatters
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
// #endregion

// #region Parsers
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
// #endregion

// #region Input Handlers
const inputHandlers = {
    date: {
        /**
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
// #endregion