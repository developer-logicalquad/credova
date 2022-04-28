'use strict';
var server = require('server');


server.post('Set', function (req, res, next) {
    if (req.body !== null) {
        session.privacy.publicId = req.body.publicId;
    }
    next();
});

server.get('Check', function (req, res, next) {
    var service = require('*/cartridge/services/credovaService');
    var serviceResult = service.application.retrieve('7def601b-548e-4ccf-b312-391291dca1fe');
    res.json(serviceResult);
    next();
});

server.get('Cron', function (req, res, next) {
    var cron = require('*/cartridge/scripts/credova/jobs/processSavedOrders');
    cron.execute();
    res.print('done');
    next();
});

server.get('Get', function (req, res, next) {
    var site = require('dw/system/Site').current;
    var apikey = site.getCustomPreferenceValue('credovaApiUsername');
    var apimode = site.getCustomPreferenceValue('credovaMode');
    res.json({
        apikey: apikey,
        apimode: apimode.value
    });
    next();
});

module.exports = server.exports();
