import { ensure } from 'certainty';
import * as dotenv from 'dotenv';
import * as mocha from 'mocha';
import { connect } from 'rethinkdb';
import * as r from 'rethinkdb';
import { RunState } from '../../common/types/api';
import { Job } from './Job';
import { JobControl } from './JobControl';
import { Queue } from './Queue';
import { FakeClock } from './testing/FakeClock';

dotenv.config();

describe('Queue', function () {
  this.slow(300);

  before(function (done) {
    connect({
      host: process.env.RETHINKDB_PROXY_SERVICE_HOST,
      port: process.env.RETHINKDB_PROXY_SERVICE_PORT,
    }, (err, connection) => {
      if (err) {
        console.error('error!', err);
        done();
      } else {
        this.connection = connection;
        done();
      }
    });
  });

  describe('real time', function () {
    before(function () {
      this.queue = new Queue<Job>(
          this.connection, {
            db: 'Factory_UnitTest',
            checkInterval: 5 * 1000,
          });
      return this.queue.ready;
    });

    beforeEach(function () {
      return this.queue.clear();
    });

    afterEach(function () {
      return this.queue.stop();
    });

    it('constructor', function () {
      ensure(this.queue.table).named('table').exists();
    });

    it('create', function () {
      const job = this.queue.create({});
      ensure(job.id).isUndefined();
      ensure(job.state).equals(RunState.READY);
    });

    it('create (properties)', function () {
      const job = this.queue.create({ state: RunState.WAITING });
      ensure(job.id).isUndefined();
      ensure(job.state).named('state').equals(RunState.WAITING);
    });

    it('addJob', function () {
      return this.queue.addJob(this.queue.create({})).then((jobs: Job[]) => {
        ensure(jobs).hasLength(1);
        const job = jobs[0];
        ensure(job.id).hasType('string');
        ensure(job.id.length).isGreaterThan(0);
        ensure(job.state).equals(RunState.READY);
        ensure(new Date(job.when)).isNotGreaterThan(new Date());
      });
    });

    it('addJob state=WAITING', function () {
      return this.queue.addJob(this.queue.create({ state: RunState.WAITING }))
      .then((jobs: Job[]) => {
        ensure(jobs).hasLength(1);
        const job = jobs[0];
        ensure(job.id).hasType('string');
        ensure(job.id.length).isGreaterThan(0);
        ensure(job.state).named('state').equals(RunState.WAITING);
        ensure(new Date(job.when)).isNotGreaterThan(new Date());
      });
    });

    it('addJob several', function () {
      return this.queue.addJob([
        this.queue.create({}),
        this.queue.create({}),
        this.queue.create({}),
      ]).then((jobs: Job[]) => {
        ensure(jobs).hasLength(3);
      });
    });

    it('external cancel', function (done) {
      this.queue.addJob(this.queue.create({})).then((jobs: Job[]) => {
        const id = jobs[0].id;
        this.queue.cancel(id).then((count: number) => {
          ensure(count).named('jobs cancelled').equals(1);
          done();
        });
      });
    });

    it('delete', function (done) {
      this.queue.addJob(this.queue.create({})).then((jobs: Job[]) => {
        const id = jobs[0].id;
        this.queue.delete(id).then((count: number) => {
          ensure(count).named('jobs deleted').equals(1);
          done();
        });
      });
    });

    it('process', function (done) {
      this.queue.process((job: any) => {
        done();
      });
      this.queue.addJob(this.queue.create({}));
    });

    it.skip('process with delay', function (done) {
      this.queue.process((job: any) => {
        done();
      });
      setTimeout(() => {
        this.queue.addJob(this.queue.create({}));
      }, 100);
    });

    it.skip('process with long delay (6s)', function (done) {
      this.timeout(10000);
      this.slow(20000);
      this.queue.process((job: any) => {
        done();
      });
      setTimeout(() => {
        this.queue.addJob(this.queue.create({}));
      }, 6000);
    });
  });

  describe('fake time', function () {
    before(function () {
      this.queue = new Queue(this.connection, { db: 'Factory_UnitTest', checkInterval: 5 * 1000 });
      return this.queue.ready;
    });

    beforeEach(function () {
      this.queue.clock = new FakeClock(1000);
      return this.queue.clear();
    });

    afterEach(function () {
      return this.queue.stop();
    });

    it('process', function (done) {
      this.queue.process((job: any) => {
        ensure(this.queue.clock.time).equals(1001);
        done();
      });
      this.queue.addJob(this.queue.create({}));
      this.queue.clock.advance(1);
    });

    it('process multiple', function (done) {
      let processCount = 0;
      this.queue.process((job: any) => {
        ensure(this.queue.clock.time).equals(1001);
        processCount += 1;
        if (processCount === 2) {
          done();
        }
      });
      this.queue.addJob(this.queue.create({}));
      this.queue.addJob(this.queue.create({}));
      this.queue.clock.advance(1);
    });

    it('process programmatic delayed', function (done) {
      this.queue.process((job: any) => {
        ensure(this.queue.clock.time).equals(1100);
        done();
      });
      this.queue.addJob(this.queue.create({ when: this.queue.clock.after(100) }));
      this.queue.clock.advance(99); // Shouldn't wake at 99
      this.queue.clock.advance(1); // But only at 100
    });

    it('process series of events', function (done) {
      this.slow(10000);
      let processCount = 0;
      this.queue.process((job: any) => {
        switch (processCount) {
          case 0:
            ensure(this.queue.clock.time).equals(1100);
            this.queue.clock.advance(6000 - 100);
            break;
          case 1:
            ensure(this.queue.clock.time).equals(7000);
            this.queue.clock.advance(15000 - 6000);
            break;
          case 2:
            ensure(this.queue.clock.time).equals(16000);
            done();
            break;
        }
        processCount += 1;
      });
      this.queue.addJob(this.queue.create({ when: this.queue.clock.after(100) }));
      this.queue.addJob(this.queue.create({ when: this.queue.clock.after(6000) }));
      this.queue.addJob(this.queue.create({ when: this.queue.clock.after(15000) }));
      this.queue.clock.advance(99);
      this.queue.clock.advance(1);
    });

    it('cancel', function (done) {
      let processCount = 0;
      this.queue.process((job: Job, jobControl: JobControl<Job>) => {
        ensure(processCount).equals(0);
        ensure(this.queue.clock.time).equals(1100);
        jobControl.cancel();
        this.queue.clock.advance(100);
        processCount += 1;
        done();
      });
      this.queue.addJob(this.queue.create({ when: this.queue.clock.after(100) }));
      this.queue.clock.advance(100);
    });

    it('fail', function (done) {
      let processCount = 0;
      this.queue.process((job: Job, jobControl: JobControl<Job>) => {
        ensure(processCount).equals(0);
        ensure(this.queue.clock.time).equals(1100);
        jobControl.fail();
        this.queue.clock.advance(100);
        processCount += 1;
        done();
      });
      this.queue.addJob(this.queue.create({ when: this.queue.clock.after(100) }));
      this.queue.clock.advance(100);
    });

    it('reschedule', function (done) {
      let processCount = 0;
      this.queue.process((job: Job, jobControl: JobControl<Job>) => {
        if (processCount === 0) {
          ensure(this.queue.clock.time).equals(1100);
          jobControl.reschedule(100);
          this.queue.clock.advance(100);
        } else {
          ensure(this.queue.clock.time).equals(1200);
          done();
        }
        processCount += 1;
      });
      this.queue.addJob(this.queue.create({ when: this.queue.clock.after(100) }));
      this.queue.clock.advance(100);
    });

    it('wake soon', function (done) {
      this.queue.addJob(this.queue.create({ when: this.queue.clock.after(100) }))
      .then((jobs: Job[]) => {
        this.queue.wake(jobs[0].id, 50).then((count: number) => {
          ensure(count).named('wake count').equals(1);
          done();
        });
      });
    });

    it('wake not soon', function (done) {
      this.queue.addJob(this.queue.create({ when: this.queue.clock.after(100) }))
      .then((jobs: Job[]) => {
        this.queue.wake(jobs[0].id, 150).then((count: number) => {
          ensure(count).named('wake count').equals(0);
          done();
        });
      });
    });
  });

  describe('processOne', function () {
    before(function () {
      this.queue = new Queue(this.connection, { db: 'Factory_UnitTest', checkInterval: 5 * 1000 });
      return this.queue.ready;
    });

    beforeEach(function () {
      this.queue.clock = new FakeClock(1000);
      // Access to private method.
      this.processOne = this.queue.processOneJob.bind(this.queue);
      return this.queue.clear();
    });

    afterEach(function () {
      return this.queue.stop();
    });

    it('reschedule', function (done) {
      this.queue.addJob(this.queue.create({})).then((added: Job[]) => {
        this.queue.processCallback = (job: Job, jobControl: JobControl<Job>) => {
          return jobControl.reschedule(100).then(() => {
            return this.queue.get(job.id).then((updated: Job) => {
              ensure(updated.state).equals(RunState.RUNNING);
              ensure(updated.when.getTime()).equals(1200);
              done();
            });
          });
        };
        this.queue.clock.advance(100);
        this.processOne(added[0].id);
      });
    });
  });
});
