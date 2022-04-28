var base = require('base/checkout/billing');

/**
 * updates the billing address selector within billing forms
 * @param {Object} order - the order model
 */
function updatePaymentInformation(order) {
    // update payment details
    var $paymentSummary = $('.payment-details');
    var htmlToAppend = '';
    if (order.billing.payment && order.billing.payment.selectedPaymentInstruments
        && order.billing.payment.selectedPaymentInstruments.length > 0) {
        if (order.billing.payment.selectedPaymentInstruments[0].paymentMethod === 'CREDOVA') {
            htmlToAppend += '<span>Credova Financial</span><div>PublicId: <span id="credova-public-id">' + order.billing.payment.selectedPaymentInstruments[0].publicId + '</span></div>';
        } else {
            htmlToAppend += '<span>' + order.resources.cardType + ' '
                    + order.billing.payment.selectedPaymentInstruments[0].type
                    + '</span><div>'
                    + order.billing.payment.selectedPaymentInstruments[0].maskedCreditCardNumber
                    + '</div><div><span>'
                    + order.resources.cardEnding + ' '
                    + order.billing.payment.selectedPaymentInstruments[0].expirationMonth
                    + '/' + order.billing.payment.selectedPaymentInstruments[0].expirationYear
                    + '</span></div>';
        }
    }

    $paymentSummary.empty().append(htmlToAppend);
}
base.methods.updatePaymentInformation = updatePaymentInformation;
module.exports = base;
