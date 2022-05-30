'use strict';

var mockResults = [
// Applications
    { // credova.application.create
        urlRegEx: /application$/,
        httpMethod: 'POST',
        mockedResponseId: 'application.create'
    },
    { // credova.application.retrieve
        urlRegEx: /application\/[^/]*\/status$/,
        httpMethod: 'GET',
        mockedResponseId: 'application.retrieve'
    },
    { // credova.application.update
        urlRegEx: /application\/[^/]*\/orders$/,
        httpMethod: 'POST',
        mockedResponseId: 'application.update'
    },
    { // credova.application.return
        urlRegEx: /application\/[^/]*\/requestreturn$/,
        httpMethod: 'POST',
        mockedResponseId: 'application.return'
    }
];

/**
 * Returns a mocked response for a Credova service call.
 * @param {type} svc Service
 * @return {Object} mocked response
 */
function getMockedResponse(svc) {
    if (svc && svc.URL && svc.requestMethod) {
        for (var i = 0; i < mockResults.length; i++) {
            var mockResult = mockResults[i];

            if (mockResult.urlRegEx.test(svc.URL) && mockResult.httpMethod.equalsIgnoreCase(svc.requestMethod)) {
                var mockedResponses = require('./mockedResponses.json');
                var mockedResponse = mockedResponses[mockResult.mockedResponseId];

                return {
                    statusCode: 200,
                    statusMessage: 'Success',
                    text: JSON.stringify(mockedResponse)
                };
            }
        }
    }

    return {
        statusCode: 404,
        statusMessage: 'Not found',
        errorText: 'No mocked response available for ' + svc.requestMethod + ' ' + svc.URL
    };
}

exports.getMockedResponse = getMockedResponse;
