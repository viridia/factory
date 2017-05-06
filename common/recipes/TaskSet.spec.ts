import { ensure } from 'certainty';
import * as mocha from 'mocha';
import TaskSet from './TaskSet';

describe('TaskSet', function () {
  const assertThrows: (fn: () => void, message: string) => void = (fn, message) => {
    try {
      fn.call(null);
    } catch (e) {
      ensure(e.message).equals(message);
      return;
    }
    throw new Error(`Expected exception with message "${message}".`);
  };

  beforeEach(function () {
    this.recipe = {
      id: 'test',
      title: 'test-recipe',
      type: 'Job',
      params: [],
      steps: [{
        id: 'render.{{i}}.{{j}}',
        title: 'Render Frame {{i}} Tile {{j}}',
        multiplicity: {
          i: '{{frames}}',
          j: '{{tiles}}',
        },
        args: ['--frame', '{{i}}'],
        env: { TILE: '{{j}}' },
        outputs: ['frame_{{i}}.jpg'],
      }, {
        id: 'movie',
        title: 'Create Movie',
        depends: [
          { $foreach: ['frame', '{{frames}}', 'render.{{frame}}.1'] },
        ],
        inputs: [
          { $foreach: ['frame', '{{frames}}', 'frame_{{frame}}.jpg'] },
        ],
      }],
    };
  });

  it('construction', function () {
    const ts = new TaskSet(this.recipe);
    ensure(ts.id).equals('test');
    ensure(ts.params).hasLength(0);
  });

  describe('task creation', function() {
    it('multiplicity expansion', function () {
      const ts = new TaskSet(this.recipe);
      ts.setUserArgs({ frames: [1, 3], tiles: [1, 10, 5] });
      ts.createTasks();
      ensure(Object.getOwnPropertyNames(ts.taskMap).length === 7);
      ensure(ts.taskList).hasLength(7);
      ensure(ts.taskMap).hasField('render.1.1');
      ensure(ts.taskMap).hasField('render.1.6');
      ensure(ts.taskMap).hasField('render.2.1');
      ensure(ts.taskMap).hasField('render.2.6');
      ensure(ts.taskMap).hasField('render.3.1');
      ensure(ts.taskMap).hasField('render.3.6');
      ensure(ts.taskMap).hasField('movie');
    });

    it('task id', function () {
      const ts = new TaskSet(this.recipe);
      ts.setUserArgs({ frames: [1, 3], tiles: [1, 10, 5] });
      ts.createTasks();
      ensure(ts.taskMap['render.1.1'].taskId).equals('render.1.1');
      ensure(ts.taskMap.movie.taskId).equals('movie');
    });

    it('task title', function () {
      const ts = new TaskSet(this.recipe);
      ts.setUserArgs({ frames: [1, 3], tiles: [1, 10, 5] });
      ts.createTasks();
      ensure(ts.taskMap['render.1.1'].title).equals('Render Frame 1 Tile 1');
      ensure(ts.taskMap.movie.title).equals('Create Movie');
    });

    it('dependencies', function () {
      const ts = new TaskSet(this.recipe);
      ts.setUserArgs({ frames: [1, 3], tiles: [1, 10, 5] });
      ts.createTasks();
      ensure(ts.taskMap['render.1.1'].depends).hasLength(0);
      ensure(ts.taskMap['render.1.1'].dependents).containsExactly('movie');
      ensure(ts.taskMap.movie.depends).containsExactly('render.1.1', 'render.2.1', 'render.3.1').inOrder();
      ensure(ts.taskMap.movie.dependents).isEmpty();
    });

    it('arguments', function () {
      const ts = new TaskSet(this.recipe);
      ts.setUserArgs({ frames: [1, 3], tiles: [1, 10, 5] });
      ts.createTasks();
      ensure(ts.taskMap['render.1.1'].args).containsExactly('--frame', '1').inOrder();
      ensure(ts.taskMap.movie.args).isDeeplyEqualTo([]);
    });

    it('environment', function () {
      const ts = new TaskSet(this.recipe);
      ts.setUserArgs({ frames: [1, 3], tiles: [1, 10, 5] });
      ts.createTasks();
      ensure(ts.taskMap['render.1.1'].env).isDeeplyEqualTo({ TILE: '1' });
      ensure(ts.taskMap.movie.env).isDeeplyEqualTo({});
    });

    it('inputs', function () {
      const ts = new TaskSet(this.recipe);
      ts.setUserArgs({ frames: [1, 3], tiles: [1, 10, 5] });
      ts.createTasks();
      ensure(ts.taskMap['render.1.1'].inputs).isEmpty();
      ensure(ts.taskMap.movie.inputs).containsExactly('frame_1.jpg', 'frame_2.jpg', 'frame_3.jpg').inOrder();
    });

    it('outputs', function () {
      const ts = new TaskSet(this.recipe);
      ts.setUserArgs({ frames: [1, 3], tiles: [1, 10, 5] });
      ts.createTasks();
      ensure(ts.taskMap['render.1.1'].outputs).containsExactly('frame_1.jpg');
      ensure(ts.taskMap.movie.outputs).isEmpty();
    });
  });

  describe('task creation errors', function() {
    it('require non-empty multiplicity', function () {
      const { ...recipe } = this.recipe;
      recipe.steps[0].multiplicity = {};
      const ts = new TaskSet(recipe);
      ts.setUserArgs({ frames: [1, 3], tiles: [1, 10, 5] });
      assertThrows(() => ts.createTasks(), 'Empty multiplicity specification');
    });

    it('require unique task names', function () {
      const { ...recipe } = this.recipe;
      recipe.steps[0].id = 'x';
      const ts = new TaskSet(recipe);
      ts.setUserArgs({ frames: [1, 3], tiles: [1, 10, 5] });
      assertThrows(() => ts.createTasks(), 'Task id "x" is not unique.');
    });

    it('require dependencies refer to valid tasks', function () {
      const { ...recipe } = this.recipe;
      recipe.steps[0].depends = ['x'];
      const ts = new TaskSet(recipe);
      ts.setUserArgs({ frames: [1, 3], tiles: [1, 10, 5] });
      assertThrows(() => ts.createTasks(), 'Task "render.1.1" depends on non-existent task "x".');
    });

    it('require dependencies to be in different steps', function () {
      const { ...recipe } = this.recipe;
      recipe.steps[0].depends = ['render.2.1'];
      const ts = new TaskSet(recipe);
      ts.setUserArgs({ frames: [1, 3], tiles: [1, 10, 5] });
      assertThrows(() => ts.createTasks(),
        'Task "render.1.1" cannot depend on task "render.2.1" which is in the same step.');
    });

    it('require dependencies to be in different steps', function () {
      const { ...recipe } = this.recipe;
      recipe.steps[0].depends = ['movie'];
      const ts = new TaskSet(recipe);
      ts.setUserArgs({ frames: [1, 3], tiles: [1, 10, 5] });
      assertThrows(() => ts.createTasks(),
        'Task "render.1.1" cannot depend on subsequent task "movie".');
    });
  });
});
