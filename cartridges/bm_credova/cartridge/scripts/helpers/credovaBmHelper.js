/* eslint-env es6 */
/* eslint-disable no-plusplus */

'use strict';

var PaymentMgr = require('dw/order/PaymentMgr');

/**
* Gets the Stripe secret API key from Site Preferences.
*
* @returns {string} Stripe secret API key.
*/
exports.getApiKey = function () {
    return require('dw/system/Site').current.getCustomPreferenceValue('credovaApiUsername');
};

/**
 * Get Stripe Payment Method Definitions
 *
 * @return {Array} array with Stripe payment methods definitions
 */
function getCredovaPaymentMethodDefinitions() {
    return [
        {
            id: 'CREDOVA',
            name: 'Credova Financial',
            currencies: {},
            payment_processor: 'CREDOVA'
        }
    ];
}

exports.getCredovaPaymentMethodDefinitions = getCredovaPaymentMethodDefinitions;

/**
 * Get Array with Stripe Payment Methods info for Current site
*
* @return {Array} list with Stripe Payment methods info
*/
exports.getCredovaPaymentMethods = function () {
    var result = [];

    var credovaPaymentMethods = getCredovaPaymentMethodDefinitions();

    for (var i = 0; i < credovaPaymentMethods.length; i++) {
        var paymentMethodId = credovaPaymentMethods[i].id;
        var paymentMethodName = credovaPaymentMethods[i].name;
        var paymentProcessorId = credovaPaymentMethods[i].payment_processor;

        var paymentMethod = PaymentMgr.getPaymentMethod(paymentMethodId);

        var isActive = paymentMethod && paymentMethod.isActive()
                        && (paymentProcessorId === paymentMethod.getPaymentProcessor().getID());

        result.push({
            id: paymentMethodId,
            name: paymentMethodName,
            isactive: isActive
        });
    }
    return result;
};

/**
 * Writes payment method elements to XML file.
 *
 * @param {dw.io.XMLStreamWriter} xsw Class used to write XML to file.
 * @param {Object} paymentMethod Object containing payment method info.
 * @param {Bolean} isEnabled true if payment method needs to be enabled
 */
exports.writePaymentMethod = function (xsw, paymentMethod, isEnabled) {
    /* eslint-disable indent */
    xsw.writeStartElement('payment-method');
    xsw.writeAttribute('method-id', paymentMethod.id);
        xsw.writeStartElement('name');
        xsw.writeAttribute('xml:lang', 'x-default');
        xsw.writeCharacters(paymentMethod.name);
        xsw.writeEndElement();

        xsw.writeStartElement('enabled-flag');
        xsw.writeCharacters(isEnabled);
        xsw.writeEndElement();

        xsw.writeStartElement('processor-id');
        xsw.writeCharacters(paymentMethod.payment_processor);
        xsw.writeEndElement();

        xsw.writeStartElement('currencies');
        for (var i = 0; i < paymentMethod.currencies.length; i++) {
            var currency = paymentMethod.currencies[i];

            xsw.writeStartElement('currency');
            xsw.writeCharacters(currency);
            xsw.writeEndElement();
        }
        xsw.writeEndElement();

    xsw.writeEndElement();
    /* eslint-enable indent */
};
