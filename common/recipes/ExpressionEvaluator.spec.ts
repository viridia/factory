import { ensure, expect } from 'certainty';
import * as mocha from 'mocha';
import ExpressionEvaluator from './ExpressionEvaluator';

describe('ExpressionEvaluator', function () {
  before(function () {
    this.ee = new ExpressionEvaluator();
  });

  it('parseTemplate', function () {
    ensure(this.ee.parseTemplate('a')).isDeeplyEqualTo(['a']);
    ensure(this.ee.parseTemplate('abc')).isDeeplyEqualTo(['abc']);
    ensure(this.ee.parseTemplate('abc{d}')).isDeeplyEqualTo(['abc{d}']);
    ensure(this.ee.parseTemplate('{{d}}')).isDeeplyEqualTo([
      { key: 'd', format: {} },
    ]);
    ensure(this.ee.parseTemplate('abc{{d}}')).isDeeplyEqualTo([
      'abc',
      { key: 'd', format: {} },
    ]);
    ensure(this.ee.parseTemplate('{{d}}abc')).isDeeplyEqualTo([
      { key: 'd', format: {} },
      'abc',
    ]);
    ensure(this.ee.parseTemplate('abc{{d:02}}efg{{hi:3}}jk')).isDeeplyEqualTo([
      'abc',
      { key: 'd', format: { width: 2, leadingZeros: true } },
      'efg',
      { key: 'hi', format: { width: 3, leadingZeros: false } },
      'jk',
    ]);
  });

  it('eval boolean', function () {
    ensure(this.ee.eval(true)).isExactly(true);
    ensure(this.ee.eval(true, {}, 'boolean')).isExactly(true);
    ensure(this.ee.eval(true, {}, 'number')).isExactly(1);
    ensure(this.ee.eval(true, {}, 'string')).isExactly('true');
    try {
      this.ee.eval(true, {}, 'array');
    } catch (e) {
      ensure(e.message).equals('Cannot convert boolean to array.');
    }
  });

  it('eval number', function () {
    ensure(this.ee.eval(1)).isExactly(1);
    ensure(this.ee.eval(1, {}, 'boolean')).isExactly(true);
    ensure(this.ee.eval(1, {}, 'number')).isExactly(1);
    ensure(this.ee.eval(1, {}, 'string')).isExactly('1');
    try {
      this.ee.eval(1, {}, 'array');
    } catch (e) {
      ensure(e.message).equals('Cannot convert number to array.');
    }
  });

  it('eval string', function () {
    ensure(this.ee.eval('sss')).isExactly('sss');
    ensure(this.ee.eval('sss', {}, 'string')).isExactly('sss');
    try {
      this.ee.eval('sss', {}, 'boolean');
    } catch (e) {
      ensure(e.message).equals('Cannot convert string to boolean.');
    }
    try {
      this.ee.eval('sss', {}, 'array');
    } catch (e) {
      ensure(e.message).equals('Cannot convert string to array.');
    }
    // ensure(this.ee.eval('sss', {}, 'number')).isExactly(1);
  });

  it('eval template to string', function () {
    ensure(this.ee.eval('Hello, {{name}}!', { name: 'World' }))
        .isExactly('Hello, World!');
    ensure(this.ee.eval('Hello, {{name}}!', { name: 'World' }, 'string'))
        .isExactly('Hello, World!');
    ensure(this.ee.eval('Number {{name}}', { name: 12 }, 'string')).isExactly('Number 12');
    ensure(this.ee.eval('Number {{name:3}}', { name: 12 }, 'string')).isExactly('Number  12');
    ensure(this.ee.eval('Number {{name:03}}', { name: 12 }, 'string')).isExactly('Number 012');
    ensure(this.ee.eval('Number {{name:03}}', { name: true }, 'string')).isExactly('Number true');
  });

  it('eval template to number', function () {
    ensure(this.ee.eval('{{n}}', { n: 7 })).isExactly(7);
    ensure(this.ee.eval('{{n}}', { n: 7 }, 'number')).isExactly(7);
  });

  it('eval template to boolean', function () {
    ensure(this.ee.eval('{{n}}', { n: true })).isExactly(true);
    ensure(this.ee.eval('{{n}}', { n: 7 }, 'boolean')).isExactly(true);
  });
});
