/* eslint-env es6 */
/* eslint-disable no-plusplus */
/* eslint-disable no-useless-concat */
'use strict';
var server = require('server');
var Site = require('dw/system/Site');
var Transaction = require('dw/system/Transaction');

var URLUtils = require('dw/web/URLUtils');
var URLAction = require('dw/web/URLAction');
var HTTPClient = require('dw/net/HTTPClient');

var StringWriter = require('dw/io/StringWriter');
var XMLStreamWriter = require('dw/io/XMLStreamWriter');

var OrderMgr = require('dw/order/OrderMgr');
var Resource = require('dw/web/Resource');


/**
 * Check if site is SFRA
 *
 * @param {string} siteID id of site to check
 * @return {boolean} true if site is SFRA
 */
function isSiteSFRA(siteID) {
    var urlAction = new URLAction('CSRF-Generate', siteID);
    var url = URLUtils.abs(false, urlAction).toString();

    var httpClient = new HTTPClient();

    httpClient.open('GET', url);
    httpClient.setTimeout(3000);
    httpClient.send();

    return (httpClient.statusCode === 500);
}

/**
 * Get site data
 *
 * @param {string} siteID id of site to get
 * @return {Object} site if site is SFRA
 */
function getSite(siteID) {
    var sites = Site.getAllSites();

    for (var i = 0; i < sites.length; i++) {
        var site = sites[i];
        if (siteID === site.getID()) {
            return site;
        }
    }

    return null;
}


server.get('QuickSetup', function (req, res, next) {
    res.render('/credova/quicksetup');
    next();
});

server.post('HandleCredovaQuickSetup', function (req, res, next) {
    var siteIDs = [];
    if (req.form.stripe_site_ids) {
        siteIDs = req.form.stripe_site_ids.split(',');
    }
    var credovaPrivateKey = req.form.credova_private_key;
    var credovaPublicKey = req.form.credova_public_key;
    var credovaMode = req.form.credova_mode;
    var credovaApiUrl;
    if (credovaMode === 'sandbox') {
        credovaApiUrl = 'https://sandbox-lending-api.credova.com';
    } else {
        credovaApiUrl = 'https://lending-api.credova.com/';
    }
    var credovaMinAmount = req.form.credova_min_amount;
    var credovaMaxAmount = req.form.credova_max_amount;
    var resultOutput = '';
    for (var siteIndex = 0; siteIndex < siteIDs.length; siteIndex++) {
        var siteID = siteIDs[siteIndex];
        try {
            var site = getSite(siteID);
            // check if site is SFRA
            var isSFRA = isSiteSFRA(siteID);
            resultOutput = resultOutput.concat('<br><br>' + site.getName() + '(' + siteID + ')' + '<br>');

            Transaction.wrap(function () {
                site.setCustomPreferenceValue('credovaEnabled', true);
                site.setCustomPreferenceValue('credovaApiUsername', credovaPublicKey);
                site.setCustomPreferenceValue('credovaPassword', credovaPrivateKey);
                site.setCustomPreferenceValue('credovaMode', credovaMode);
                site.setCustomPreferenceValue('credovaApiUrl', credovaApiUrl);
                site.setCustomPreferenceValue('credovaMinAmount', credovaMinAmount);
                site.setCustomPreferenceValue('credovaMaxAmount', credovaMaxAmount);
                site.setCustomPreferenceValue('credovaIsSFRA', isSFRA);
                // site.setCustomPreferenceValue('credovaAccountCountryCode', countryCode);
            });

            resultOutput = resultOutput.concat('<br>Updated: credovaEnabled = ' + true);
            resultOutput = resultOutput.concat('<br>Updated: credovaApiUsername = ' + credovaPublicKey);
            resultOutput = resultOutput.concat('<br>Updated: credovaPassword = ' + credovaPrivateKey);
            resultOutput = resultOutput.concat('<br>Updated: credovaApiUrl = ' + credovaApiUrl);
            resultOutput = resultOutput.concat('<br>Updated: credovaMode = ' + credovaMode);
            resultOutput = resultOutput.concat('<br>Updated: credovaMinAmount = ' + credovaMinAmount);
            resultOutput = resultOutput.concat('<br>Updated: credovaMaxAmount = ' + credovaMaxAmount);
            resultOutput = resultOutput.concat('<br>Updated: credovaIsSFRA = ' + isSFRA);

        // return next();
        } catch (e) {
            res.json({
                error: true,
                message: e.message
            });
            return next();
        }
    }

    resultOutput = resultOutput.concat('<br><br>SUCCESS');
    res.json({
        error: false,
        message: resultOutput
    });

    return next();
});

server.get('PaymentsSetup', function (req, res, next) {
    res.render('/credova/paymentssetup');
    next();
});

server.post('HandlePaymentsSetup', function (req, res, next) {
    var credovaBmHelper = require('~/cartridge/scripts/helpers/credovaBmHelper');

    try {
        var stringWriter = new StringWriter();
        var xmlWriter = new XMLStreamWriter(stringWriter);
        xmlWriter.writeStartElement('payment-settings');
        xmlWriter.writeAttribute('xmlns', 'http://www.demandware.com/xml/impex/paymentsettings/2009-09-15');

        var credovaPaymentMethodDefinitions = credovaBmHelper.getCredovaPaymentMethodDefinitions();
        for (var i = 0; i < credovaPaymentMethodDefinitions.length; i++) {
            var credovaPaymentMethodDefinition = credovaPaymentMethodDefinitions[i];
            var isPaymentMethodEnabled = !!req.form[credovaPaymentMethodDefinition.id];

            credovaBmHelper.writePaymentMethod(xmlWriter, credovaPaymentMethodDefinition, isPaymentMethodEnabled);
        }
        xmlWriter.writeEndElement();

        xmlWriter.close();

        res.json({
            error: false,
            message: '',
            content: stringWriter.toString()
        });

        return next();
    } catch (e) {
        res.json({
            error: true,
            message: e.message
        });

        return next();
    }
});

server.get('PaymentsRefund', function (req, res, next) {
    res.render('/credova/paymentsrefund');
    next();
});

server.post('HandlePaymentsRefund', function (req, res, next) {
    var service = require('*/cartridge/services/credovaService');
    var orderNumber = req.form.credova_order_number;
    var returnType = req.form.credova_return_type;
    var returnReason = req.form.credova_return_reason;
    try {
        if (orderNumber !== undefined) {
            var order = OrderMgr.getOrder(orderNumber);
            if (!order) {
                res.json({
                    error: true,
                    message: Resource.msgf('paymentsrefund.ordernotfound', 'credovabm', null, orderNumber)
                });
                return next();
            }

            if (order) {
                var fields = {
                    public_id: order.paymentInstrument.custom.publicId,
                    returnType: returnType,
                    returnReasonPublicId: returnReason
                };
                var serviceResult = service.application.return(fields.publicId, fields);
                if (serviceResult) {
                    res.json({
                        error: false,
                        message: Resource.msg('paymentsrefund.refundsucceeded', 'credovabm', null)
                    });
                } else {
                    var error = JSON.parse(serviceResult.callResult);
                    res.json({
                        error: false,
                        message: error.errors[0]
                    });
                }
                return next();
            }
        }

        res.json({
            error: true,
            message: Resource.msg('paymentsrefund.cannotrefundorder', 'credovabm', null)
        });

        return next();
    } catch (e) {
        res.json({
            error: true,
            message: e.message
        });

        return next();
    }
});

module.exports = server.exports();
