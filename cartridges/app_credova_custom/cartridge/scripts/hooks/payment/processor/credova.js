'use strict';


var Resource = require('dw/web/Resource');
var Transaction = require('dw/system/Transaction');


/**
 * Verifies that entered credit card information is a valid card. If the information is valid a
 * credit card payment instrument is created
 * @param {dw.order.Basket} basket Current users's basket
 * @param {Object} paymentInformation - the payment information
 * @param {string} paymentMethodID - paymentmethodID
 * @param {Object} req the request object
 * @return {Object} returns an error object
 */
function Handle(basket, paymentInformation, paymentMethodID) {
    var collections = require('*/cartridge/scripts/util/collections');
    var currentBasket = basket;
    var cardErrors = {};
    var serverErrors = [];
    var invalidPaymentMethod;
    var publicId = paymentInformation.publicId.value;

    // Validate payment instrument
    if (paymentMethodID === 'CREDOVA') {
        if (publicId === '') {
            // Invalid Payment Instrument
            invalidPaymentMethod = Resource.msg('error.payment.not.valid', 'checkout', null);
            return { fieldErrors: [], serverErrors: [invalidPaymentMethod], error: true };
        }
    }

    Transaction.wrap(function () {
        var paymentInstruments = currentBasket.getPaymentInstruments(
            'CREDOVA'
        );
        var paymentInstrument = currentBasket.createPaymentInstrument(
            'CREDOVA', currentBasket.totalGrossPrice
        );
        collections.forEach(paymentInstruments, function (item) {
            currentBasket.removePaymentInstrument(item);
        });
        paymentInstrument.custom.publicId = publicId;
    });

    return { fieldErrors: cardErrors, serverErrorapps: serverErrors, error: false };
}

/**
 * Authorizes a payment using a credit card. Customizations may use other processors and custom
 *      logic to authorize credit card payment.
 * @param {string} orderNumber - The current order's number
 * @param {dw.order.OrderPaymentInstrument} paymentInstrument -  The payment instrument to authorize
 * @param {dw.order.PaymentProcessor} paymentProcessor -  The payment processor of the current
 *      payment method
 * @return {Object} returns an error object
 */
function Authorize(orderNumber, paymentInstrument, paymentProcessor) {
    var service = require('*/cartridge/services/credovaService');
    var serverErrors = [];
    var fieldErrors = {};
    var error = false;
    try {
        if (paymentInstrument.custom.publicId !== '') {
            var publicId = paymentInstrument.custom.publicId;
            var applicationResult = service.application.retrieve(publicId);
            if (applicationResult.applicationId) {
                if (applicationResult.status === 'Signed') {
                    var fields = {
                        orders: [
                            orderNumber
                        ]
                    };
                    var serviceResult = service.application.update(applicationResult.publicId, fields);
                    if (!serviceResult) {
                        Transaction.wrap(function () {
                            if (paymentInstrument) {
                                if (paymentInstrument.paymentTransaction) {
                                    paymentInstrument.paymentTransaction.setTransactionID(orderNumber);
                                    paymentInstrument.paymentTransaction.setPaymentProcessor(paymentProcessor);
                                }
                            }
                        });
                    } else {
                        error = true;
                        serverErrors.push(
                            Resource.msg('error.technical', 'checkout', null)
                        );
                    }
                } else {
                    error = true;
                    serverErrors.push(
                        Resource.msg('error.technical', 'checkout', null)
                    );
                }
            } else {
                error = true;
                serverErrors.push(
                    Resource.msg('error.technical', 'checkout', null)
                );
            }
        } else {
            error = true;
            serverErrors.push(
                Resource.msg('error.technical', 'checkout', null)
            );
        }
    } catch (e) {
        error = true;
        serverErrors.push(
            Resource.msg('error.technical', 'checkout', null)
        );
    }

    return { fieldErrors: fieldErrors, serverErrors: serverErrors, error: error };
}

exports.Handle = Handle;
exports.Authorize = Authorize;
