/*
Copyright © 2015-2016 ADP, LLC.

Licensed under the Apache License, Version 2.0 (the “License”);
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an “AS IS” BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
express or implied.  See the License for the specific language
governing permissions and limitations under the License.
*/

'use strict';

var payloadHelper = require('./payloadHelper');
var objectPath = require('simple-object-path');
var metaHelper = require('./metaHelper');
var schemaHelper = require('./schemaHelper');
var async = require('async');
var uuid = require('uuid').v4;

/**
@module Event
@description Represents a single event.
*/
function Event(opts) {

	var payload;
	var schema;
	var meta;
	var cbMap = {};
	var eventId = uuid();
	var schemaLocation = opts.schemaLocation;
	var eventContextPath = 'events/0/data/eventContext';
	var eventNameCodePath = 'events/0/eventNameCode/codeValue';
	var canonicalUri = opts.apiInfo.canonicalUri;
	var eventNameCode = canonicalUri.substring(canonicalUri.lastIndexOf('/') + 1, canonicalUri.length);
	// var serviceCategoryCodePath = 'events/0/serviceCategoryCode/shortName';
	// var tmpCanonicalUri = canonicalUri.substring(1);
	// var serviceCategoryCode = tmpCanonicalUri.substring(0, tmpCanonicalUri.indexOf('/'));

	function buildPayload(cb) {
		payload = payloadHelper.removeUnusedProperties(payloadHelper.defaultPayload(schema));
		cb();
	}

	function buildFinalPayload() {
		var payloadDataPaths = metaHelper.getPayloadDataPaths(getPayload());
		var finalPayload = payloadHelper.removePropsNotSet(getPayload(), payloadDataPaths, meta);
		// finalPayload = payloadHelper.removeUnusedDefaultedProperties(finalPayload);
		payload = finalPayload;
	}

	function getAPIInfo() {
		return opts.apiInfo;
	}

	function getPayload() {
		payload.eventId = eventId;
		return payload;
	}

	function getEventId() {
		return eventId;
	}

	function getValidationRules() {
		return meta;
	}

	function getEventContext() {
		return objectPath(payload, eventContextPath);
	}

	function init(cb) {
		cbMap[eventId] = cb;
		async.series([retrieveSchema, buildPayload, retrieveMeta], initFinish);
	}

	function initFinish(err) {
		// !err && setPathValue(serviceCategoryCodePath, serviceCategoryCode);
		!err && setPathValue(eventNameCodePath, eventNameCode);
		if(typeof cbMap[eventId] === 'function') {
			cbMap[eventId](err);
			delete cbMap[eventId];
		}
	}

	function retrieveMeta(cb) {
		metaHelper.getMeta({conn: opts.conn, apiInfo: opts.apiInfo, payload: payload}, function getMetaCb(err, metaObj) {
			if(metaObj) {
				meta = metaObj;
			}
			cb();
		});
	}

	function retrieveSchema(cb) {
		schemaHelper.getSchema(schemaLocation, opts.apiInfo.schemaName, function getSchemaCb(err, schemaObj) {
			if(schemaObj) {
				schema = schemaObj;
			}
			cb(err);
		});
	}

	function setPayload(p) {
		payload = p;
	}

	function setPathValue(path, val) {
		var pathProps = path.split('/');
		var pathProp = pathProps.pop();
		var dataObj = objectPath(payload, pathProps.join('/'));
		dataObj[pathProp] = val;
	}

	function validate(cb) {
		if(!meta) return cb(undefined, []);
		var failures = metaHelper.validate(opts.conn, payload, meta, cb);
		return failures;
	}

	return {
		buildPayload: buildPayload,
		buildFinalPayload: buildFinalPayload,
		getAPIInfo: getAPIInfo,
		getPayload: getPayload,
		getEventId: getEventId,
		getEventContext: getEventContext,
		getValidationRules: getValidationRules,
		init: init,
		setPayload: setPayload,
		validate: validate
	};
}

module.exports = Event;
