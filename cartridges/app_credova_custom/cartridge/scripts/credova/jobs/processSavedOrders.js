'use strict';

var Transaction = require('dw/system/Transaction');
var OrderMgr = require('dw/order/OrderMgr');
var Status = require('dw/system/Status');
var Logger = require('dw/system/Logger');
var Order = require('dw/order/Order');
var credovaLogger = Logger.getLogger('credova_payments_job', 'credova');
var logger = Logger.getLogger('Credova', 'credova');


/**
 * Retrieves the payment instrument using Credova payment method for
 * an order.
 *
 * @param {dw.order.Order} order - Order to get the payment isntrument for
 *
 * @returns {null} - Payment Instrument for credova
 */
function getCredovaPaymentInstrument(order) {
    for (var i = 0; i < order.paymentInstruments.length; i++) {
        var paymentInstrument = order.paymentInstruments[i];
        var paymentTransaction = paymentInstrument.paymentTransaction;
        var paymentProcessor = paymentTransaction && paymentTransaction.paymentProcessor;
        if (paymentProcessor && 'CREDOVA'.equals(paymentProcessor.ID)) {
            return paymentInstrument;
        }
    }
    return null;
}


/**
 * Places an order.
 *
 * @param {dw.order.Order} order - Order to place
 * @param {dw.order.PaymentInstrument} credovaPaymentInstrument - selected payment Instrument
 * @return {boolean} - Credova payment instrument if found or null otherwise
 */
function placeOrder(order, credovaPaymentInstrument) {
    var service = require('*/cartridge/services/credovaService');
    var serviceResult = service.application.retrieve(credovaPaymentInstrument.custom.publicId);
    if (serviceResult) {
        var data = (serviceResult);
        if (data.status === 'Signed') {
            Transaction.wrap(function () {
                order.setConfirmationStatus(Order.CONFIRMATION_STATUS_CONFIRMED);
                order.setPaymentStatus(Order.PAYMENT_STATUS_PAID);
                order.setExportStatus(Order.EXPORT_STATUS_READY);
            });
        }
        credovaLogger.info('Successfully processed Order with order id:{0}.', order.orderNo);
        return true;
    }
    return false;
}

exports.execute = function () {
    var queryString = 'paymentStatus={0}';
    var Orders = OrderMgr.searchOrders(queryString, 'orderNo desc', 0);
    while (Orders.hasNext()) {
        try {
            var order = Orders.next();
            var credovaPaymentInstrument = getCredovaPaymentInstrument(order);
            if (credovaPaymentInstrument) {
                placeOrder(order, credovaPaymentInstrument);
            }
        } catch (e) {
            logger.error('Error: {0}', e.message);
            return new Status(Status.ERROR);
        }
    }
    return new Status(Status.OK);
};
