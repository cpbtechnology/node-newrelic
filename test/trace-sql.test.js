'use strict';

var path        = require('path')
  , chai        = require('chai')
  , expect      = chai.expect
  , helper      = require(path.join(__dirname, 'lib', 'agent_helper'))
  , Stats       = require(path.join(__dirname, '..', 'lib', 'stats'))
  , SQLTrace    = require(path.join(__dirname, '..' , 'lib', 'transaction', 'trace', 'sql'))
  , Transaction = require(path.join(__dirname, '..', 'lib', 'transaction'))
  ;

describe('SQLTrace', function () {
  var agent
    , query
    , stats
    , transaction
    ;

  before(function () {
    agent       = helper.loadMockedAgent();
    query       = "SELECT age, risk_index FROM expectancies WHERE beneficiary_id = ?";
    stats       = new Stats();
    transaction = new Transaction(agent);
    transaction.measureWeb("/getBeneficiary", 200, 812, 700);
  });

  after(function () {
    helper.unloadAgent(agent);
  });

  it("should throw without a Transaction", function () {
    expect(function () { var trace = new SQLTrace(query, null, stats); }).throws();
  });

  it("should be assocaited with a Transaction", function () {
    expect((new SQLTrace(query, transaction, stats)).transaction).deep.equal(transaction);
  });

  it("should throw without statistics", function () {
    expect(function () { var trace = new SQLTrace(query, transaction, null); }).throws();
  });

  it("should be associated with statistics", function () {
    expect((new SQLTrace(query, transaction, stats)).stats).deep.equal(stats);
  });

  it("should throw without a query", function () {
    expect(function () { var trace = new SQLTrace(null, transaction, stats); }).throws();
  });

  it("should be associated with a query", function () {
    expect((new SQLTrace(query, transaction, stats)).query).deep.equal(query);
  });

  it("should generate a SQL ID", function () {
    expect((new SQLTrace(query, transaction, stats)).getSQLId()).equal(-748105207);
  });

  describe("should generate a query parameter string", function () {
    var params;

    before(function () {
      var trace = new SQLTrace(query, transaction, stats);
      params = {"beneficiary_id" : 101};
    });

    it("that is based on a JSON object literal of the query parameters", function () {
      expect(params).an('object');
    });

    it("that is compressed with zlib and Base64 encoded", function (done) {
      SQLTrace.encodeParams(params, function (err, encoded) {
        if (err) return done(err);

        expect(encoded).equal('eJyrVkpKzUtNy0zOTCyqjM9MUbIyNDCsBQBd+Ae2');

        return done();
      });
    });

    it("that can be reconstituted", function (done) {
      SQLTrace.decodeParams('eJyrVkpKzUtNy0zOTCyqjM9MUbIyNDCsBQBd+Ae2', function (err, decoded) {
        if (err) return done(err);

        expect(decoded).deep.equal({"beneficiary_id" : 101});

        return done();
      });
    });

    it("that can codecify itself", function (done) {
      SQLTrace.encodeParams(params, function (err, encoded) {
        if (err) return done(err);
        SQLTrace.decodeParams(encoded, function (err, decoded) {
          if (err) return done(err);

          expect(decoded).deep.equal(params);

          return done();
        });
      });
    });
  });

  // https://hudson.newrelic.com/job/collector-master/javadoc/com/nr/entities/SqlTrace.html
  it("should produce a representation that matches the spec", function (done) {
    var params = {"beneficiary_id" : 101};
    var trace = new SQLTrace(query, transaction, stats);

    trace.generateTrace("WebTransaction/DB/getBeneficiary", params, function (err, trace) {
      if (err) return done(err);

      var finished = [
        "WebTransaction/DB/getBeneficiary",
        "/getBeneficiary",
        -748105207,
        "SELECT age, risk_index FROM expectancies WHERE beneficiary_id = ?",
        0,
        0,
        0,
        0,
        "eJyrVkpKzUtNy0zOTCyqjM9MUbIyNDCsBQBd+Ae2"
      ];

      expect(trace).deep.equal(finished);

      return done();
    });
  });
});