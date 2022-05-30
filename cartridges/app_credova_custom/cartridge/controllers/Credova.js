'use strict';
var server = require('server');


server.post('Set', function (req, res, next) {
    if (req.body !== null) {
        session.privacy.publicId = req.body.publicId; // eslint-disable-line no-undef
    }
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
