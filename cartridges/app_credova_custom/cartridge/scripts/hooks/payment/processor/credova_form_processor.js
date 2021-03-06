'use strict';
/* global request, dw*/

var BasketMgr = require('dw/order/BasketMgr');

var site = require('dw/system/Site').current;


/**
 * Verifies the required information for billing form is provided.
 * @param {Object} req - The request object
 * @param {Object} paymentForm - the payment form
 * @param {Object} viewFormData - object contains billing form data
 * @returns {Object} an object that has error information or payment information
 */
function processForm(req, paymentForm, viewFormData) {
    var service = require('*/cartridge/scripts/services/credovaService');
    var collections = require('*/cartridge/scripts/util/collections');
    var basket = BasketMgr.getCurrentBasket();
    var viewData = viewFormData;
    var products = [];
    var apikey = site.getCustomPreferenceValue('credovaApiUsername');
    var address = '';
    var fields = {};
    var isFirearm = false;
    viewData.paymentMethod = {
        value: paymentForm.paymentMethod.value,
        htmlName: paymentForm.paymentMethod.value
    };
    if (basket !== null) {
        collections.forEach(basket.allLineItems, function (item) {
            if (item instanceof dw.order.ShippingLineItem) {
                products.push({
                    id: 'ship',
                    description: 'shipping',
                    serialNumber: 'ship',
                    quantity: 1,
                    value: item.price.value,
                    salesTax: item.tax.value
                });
            }

            if (item instanceof dw.order.ProductLineItem) {
                products.push({
                    id: item.productID,
                    description: item.productName,
                    serialNumber: item.UUID,
                    quantity: item.quantity.value,
                    value: item.adjustedNetPrice.value,
                    salesTax: item.tax.value
                });
                if (item.getProduct().custom.availableForInStorePickup && !isFirearm) {
                    isFirearm = true;
                }
            }
        });
    }
    if (viewFormData.address.address2.value !== '') {
        address = viewFormData.address.address1.value + ', ' + viewFormData.address.address2.value;
    } else {
        address = viewFormData.address.address1.value;
    }
    if (basket !== null) {
        fields = {
            storeCode: apikey,
            firstName: viewFormData.address.firstName.value,
            lastName: viewFormData.address.lastName.value,
            mobilePhone: viewFormData.phone.value,
            email: basket.customerEmail,
            containsFirearm: isFirearm,
            address: {
                street: address,
                city: viewFormData.address.city.value,
                state: viewFormData.address.stateCode.value,
                zipCode: viewFormData.address.postalCode.value
            },
            products: products
        };
    }
    var serviceResult = service.application.create(fields);
    if (serviceResult.publicId) {
        var publicId = serviceResult.publicId;
        session.privacy.publicId = publicId; // eslint-disable-line no-undef
        viewData.paymentInformation = {
            publicId: {
                value: publicId,
                htmlName: paymentForm.credovaFields.publicId.htmlName
            }
        };
        return {
            error: false,
            viewData: viewData
        };
    }
    return {
        errors: serviceResult.callResult,
        error: true
    };
}

/**
 * Not compatible with current payment method
 */
function savePaymentInformation() {
    return;
}
exports.processForm = processForm;
exports.savePaymentInformation = savePaymentInformation;
