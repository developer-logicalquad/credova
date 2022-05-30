'use strict';

/* API Includes */
var LocalServiceRegistry = require('dw/svc/LocalServiceRegistry');

/**
 * Traverses a payload object to collect parameters and values to be passed
 * as key/value pairs either as query string or application/x-www-form-urlencoded
 * body.
 *
 * @param {Object} collector - An object to collect key/value pairs. Must provide
 *   addParam(name, value) method. Could be dw.svc.Service.
 * @param {Object} payload - Payload to collect parameters from. Can be acutal
 *   payload or an object containing query string parameters.
 * @param {string} prefix - Prefix to append to parameter names. Used recursively,
 *   not needed for the intial call.
 */
function collectParams(collector, payload, prefix) {
    if (payload && typeof payload === 'object') {
        Object.keys(payload).forEach(function (key) {
            var paramName = prefix && prefix.length ? prefix + '[' + (Array.isArray(payload) ? '' : key) + ']' : key;
            var paramValue = payload[key];

            if (paramValue === null || typeof paramValue === 'undefined') {
                paramValue = '';
            }

            if (paramValue && typeof paramValue === 'object') {
                collectParams(collector, paramValue, paramName);
            } else {
                collector.addParam(paramName, paramValue);
            }
        });
    }
}

/**
 * Creates a Local Services Framework service definition
 *
 * @returns {dw.svc.Service} - The created service definition.
 */
function getCredovaToken() {
    return LocalServiceRegistry.createService('credova.http.token.service', {

        /**
         * A callback function to configure HTTP request parameters before
         * a call is made to Credova web service
         *
         * @param {dw.svc.Service} svc Service instance
         * @param {string} requestObject - Request object, containing the end point, query string params, payload etc.
         * @returns {string} - The body of HTTP request
         */
        createRequest: function (svc) {
            var Site = require('dw/system/Site').current;
            var apikey = Site.getCustomPreferenceValue('credovaApiUsername');
            var apiPassword = Site.getCustomPreferenceValue('credovaPassword');
            var apiUrl = Site.getCustomPreferenceValue('credovaApiUrl');
            svc.setRequestMethod('POST');
            svc.addParam('username', apikey);
            svc.addParam('password', apiPassword);
            var URL = apiUrl;
            URL += '/v2/token';
            svc.setURL(URL);
            return svc;
        },

        /**
         * A callback function to parse Credova web service response
         *
         * @param {dw.svc.Service} svc - Service instance
         * @param {dw.net.HTTPClient} httpClient - HTTP client instance
         * @returns {string} - Response body in case of a successful request or null
         */
        parseResponse: function (svc, httpClient) {
            return JSON.parse(httpClient.text);
        },

        mockCall: function (svc) {
            var mockResponsesHelper = require('./mockResponsesHelper');

            return mockResponsesHelper.getMockedResponse(svc);
        },

        /**
         * A callback that allows filtering communication URL, request, and response
         * log messages. Must be implemented to have messages logged on Production.
         *
         * @param {string} msg - The original message to log.
         * @returns {string} - The original message itself, as no sensitive data is
         *   communicated.
         */
        filterLogMessage: function (msg) {
            return (msg);
        }
    });
}

exports.getCredovaToken = getCredovaToken;

/**
 * Creates a Local Services Framework service definition
 *
 * @returns {dw.svc.Service} - The created service definition.
 */
function getCredovaServiceDefinition() {
    return LocalServiceRegistry.createService('credova.http.service', {

        /**
         * A callback function to configure HTTP request parameters before
         * a call is made to Credova web service
         *
         * @param {dw.svc.Service} svc Service instance
         * @param {string} requestObject - Request object, containing the end point, query string params, payload etc.
         * @returns {string} - The body of HTTP request
         */
        createRequest: function (svc, requestObject) {
            var Site = require('dw/system/Site').current;
            var apiUrl = Site.getCustomPreferenceValue('credovaApiUrl');
            var tokenResult = getCredovaToken().call();
            if (tokenResult.status === 'OK') {
                var token = tokenResult.object.jwt;
                svc.addHeader('Authorization', 'Bearer ' + token);
            }
            svc.addHeader('Content-Type', 'application/json');
            var URL = apiUrl + requestObject.endpoint;
            svc.setURL(URL);
            if (requestObject.httpMethod) {
                svc.setRequestMethod(requestObject.httpMethod);
            }

            if (requestObject.queryString) {
                collectParams(svc, requestObject.queryString);
            }

            if (requestObject.payload) {
                return JSON.stringify(requestObject.payload);
            }

            return null;
        },

        /**
         * A callback function to parse Credova web service response
         *
         * @param {dw.svc.Service} svc - Service instance
         * @param {dw.net.HTTPClient} httpClient - HTTP client instance
         * @returns {string} - Response body in case of a successful request or null
         */
        parseResponse: function (svc, httpClient) {
            return JSON.parse(httpClient.text);
        },

        mockCall: function (svc) {
            var mockResponsesHelper = require('./mockResponsesHelper');

            return mockResponsesHelper.getMockedResponse(svc);
        },

        /**
         * A callback that allows filtering communication URL, request, and response
         * log messages. Must be implemented to have messages logged on Production.
         *
         * @param {string} msg - The original message to log.
         * @returns {string} - The original message itself, as no sensitive data is
         *   communicated.
         */
        filterLogMessage: function (msg) {
            return msg;
        }
    });
}

// Only for unit testing!
exports.getCredovaServiceDefinition = getCredovaServiceDefinition;

/**
 * Creates an Error and appends web service call result as callResult
 *
 * @param {dw.svc.Result} callResult - Web service call result
 * @return {Error} - Error created
 */
function CredovaServiceError(callResult) {
    var message = 'Credova web service call failed';
    if (callResult && callResult.errorMessage) {
        message += ': ' + JSON.parse(callResult.errorMessage).errors;
    }

    var err = new Error(message);
    err.callResult = callResult;
    err.name = 'CredovaServiceError';

    return err;
}

/**
 * Makes a call to Credova web service given a request object.
 * Throws an error (CredovaServiceError, which will have the call dw.svc.Result
 * object in callResult property) in case the result of a call is not ok.
 *
 * @param {Object} requestObject - An object having details for the request to
 *   be made, including endpoint, payload etc.
 * @return {dw.svc.Result} - Result returned by the call.
 */
function callTokenService() {
    var callResult = getCredovaToken().call();

    if (!callResult.ok) {
        throw new CredovaServiceError(callResult);
    }

    return callResult.object;
}

/**
 * Makes a call to Credova web service given a request object.
 * Throws an error (CredovaServiceError, which will have the call dw.svc.Result
 * object in callResult property) in case the result of a call is not ok.
 *
 * @param {Object} requestObject - An object having details for the request to
 *   be made, including endpoint, payload etc.
 * @return {dw.svc.Result} - Result returned by the call.
 */
function callService(requestObject) {
    if (!requestObject) {
        throw new Error('Required requestObject parameter missing or incorrect.');
    }

    var callResult = getCredovaServiceDefinition().call(requestObject);

    if (!callResult.ok) {
        throw new CredovaServiceError(callResult);
    }

    return callResult.object;
}

exports.call = callService;
exports.callToken = callTokenService;

exports.application = {
    create: function (createPaymentPayload) {
        var requestObject = {
            endpoint: '/v2/applications/',
            httpMethod: 'POST',
            payload: createPaymentPayload
        };

        return callService(requestObject);
    },
    retrieve: function (publicId) {
        var requestObject = {
            endpoint: '/v2/applications/' + publicId + '/status',
            httpMethod: 'GET'
        };

        return callService(requestObject);
    },
    update: function (publicId, updateOrderPayload) {
        var requestObject = {
            endpoint: '/v2/applications/' + publicId + '/orders',
            httpMethod: 'POST',
            payload: updateOrderPayload
        };

        return callService(requestObject);
    },
    return: function (publicId, returnPayload) {
        var requestObject = {
            endpoint: '/v2/applications/' + publicId + '/requestreturn',
            httpMethod: 'POST',
            payload: returnPayload
        };

        return callService(requestObject);
    }
};
