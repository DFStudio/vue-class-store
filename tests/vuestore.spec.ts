require('jsdom-global')()

import chai, {assert, expect} from 'chai';
import spies from 'chai-spies';
import VueStore from '../src';
import Component from "vue-class-component";
import Vue, {ComponentOptions} from "vue";
import { mount } from '@vue/test-utils'

chai.use(spies)

type C = { new(...args: any[]): {} }
type CO = ComponentOptions<Vue>

function testStores(storeFunction: <T extends C>(constructor: T) => T) {
  it("`this` should be preserved", () => {
    @storeFunction
    class Store {
      constructedInstance: Store

      constructor() {
        this.constructedInstance = this
      }
    }

    let store = new Store()
    expect(store.constructedInstance).to.equal(store)
  });

  it("the instance should be vue-like", () => {
    @storeFunction
    class Store {
    }

    let store = new Store()
    expect(store['$data']).to.exist
    expect(store['$options']).to.exist
    expect(store['$attrs']).to.exist
    expect(store['$listeners']).to.exist
    expect(store['$watch']).to.exist
    expect(store['$set']).to.exist
    expect(store['$delete']).to.exist
  });

  it("properties should be preserved", () => {
    @storeFunction
    class Store {
      plain = 10
      'quotes!' = 20
      declared: number

      constructor() {
        this.declared = 30
        this['notDeclared'] = 40
      }
    }

    let store = new Store()
    expect(store).to.include({plain: 10, 'quotes!': 20, declared: 30, notDeclared: 40})
  });

  it("properties should be reactive", async () => {
    @storeFunction
    class Store {
      plain = 10
      declared: number

      constructor() {
        this.declared = 20
        this['notDeclared'] = 30
      }
    }

    interface Store extends Vue {
    }

    let store = new Store()
    store['late'] = 40

    let plainSpy = chai.spy()
    let declaredSpy = chai.spy()
    let notDeclaredSpy = chai.spy()
    let lateSpy = chai.spy()
    store.$watch('plain', plainSpy)
    store.$watch('declared', declaredSpy)
    store.$watch('notDeclared', notDeclaredSpy)
    store.$watch('late', lateSpy)

    store.plain = 100
    store.declared = 200
    store['notDeclared'] = 300
    store['late'] = 400

    await Vue.nextTick()

    expect(plainSpy).to.be.called.with(100, 10)
    expect(declaredSpy).to.be.called.with(200, 20)
    expect(notDeclaredSpy).to.be.called.with(300, 30)
    expect(lateSpy).to.not.be.called()
  });

  it("getters should be reactive", async () => {
    @storeFunction
    class Store {
      value = 10

      get plusTen() {
        return this.value + 10
      }
    }
    interface Store extends Vue {}

    let store = new Store()

    let plusTenSpy = chai.spy()
    store.$watch('plusTen', plusTenSpy)

    store.value = 100

    await Vue.nextTick()

    expect(plusTenSpy).to.be.called.with(110, 20)
  });

  it("methods should work", async () => {
    @storeFunction
    class Store {
      plain = 10

      changePlain() {
        this.plain = 100
      }
    }
    interface Store extends Vue {}

    let store = new Store()

    let plainSpy = chai.spy()
    store.$watch('plain', plainSpy)

    store.changePlain()

    await Vue.nextTick()

    expect(plainSpy).to.be.called.with(100, 10)
  });

  it("watches should trigger", async () => {
    @storeFunction
    class Store {
      plain = 10
      deep = {value: 20}
      stringData = 'old'
      immediate = 30
      nesting = {value: 40}
      replace: object = {value: 50}
      array: any[] = []
      replaceWithMissing: object = {value: 10}
      replaceFromMissing: object = {}

      constructor(public spies: {
        plainSpy(...args),
        deepSpy(...args),
        immediateSpy(...args),
        stringSpy(...args),
        nestingSpy(...args),
        replaceSpy(...args),
        arrayReplaceSpy(...args),
        nestedReplaceSpy(...args),
        nestedReplaceWithMissingSpy(...args),
        nestedReplaceFromMissingSpy(...args),
      }) {
      }

      stringChanged(...args) {
        this.spies.stringSpy(...args)
      }
      'on:stringData' = 'stringChanged'

      'on:plain'(...args) {
        this.spies.plainSpy(...args)
      }

      'on.deep:deep'(...args) {
        this.spies.deepSpy(...args)
      }

      'on.immediate:immediate'(...args) {
        this.spies.immediateSpy(...args)
      }

      'on:nesting.value'(...args) {
        this.spies.nestingSpy(...args)
      }

      'on:replace'(...args) {
        this.spies.replaceSpy(...args)
      }

      'on:array'(...args) {
        this.spies.arrayReplaceSpy(...args)
      }

      'on:replace.value'(...args) {
        this.spies.nestedReplaceSpy(...args)
      }

      'on:replaceWithMissing.value'(...args) {
        this.spies.nestedReplaceWithMissingSpy(...args)
      }

      'on:replaceFromMissing.value'(...args) {
        this.spies.nestedReplaceFromMissingSpy(...args)
      }
    }

    interface Store extends Vue {
    }

    let store = new Store({
      plainSpy: chai.spy(),
      deepSpy: chai.spy(),
      immediateSpy: chai.spy(),
      stringSpy: chai.spy(),
      nestingSpy: chai.spy(),
      replaceSpy: chai.spy(),
      arrayReplaceSpy: chai.spy(),
      nestedReplaceSpy: chai.spy(),
      nestedReplaceWithMissingSpy: chai.spy(),
      nestedReplaceFromMissingSpy: chai.spy(),
    })
    let spies = store.spies

    expect(spies.immediateSpy).to.be.called.with(30)

    store.plain = 100
    store.deep.value = 200
    store.immediate = 300
    store.stringData = 'new'
    store.nesting.value = 400
    let original = store.replace
    let replacement = {value: 500}
    store.replace = replacement
    let originalArray = store.array
    let replacementArray = [100]
    store.array = replacementArray
    store.replaceWithMissing = {}
    store.replaceFromMissing = {value: 10}

    await Vue.nextTick()

    expect(spies.plainSpy).to.be.called.with(100, 10)
    expect(spies.deepSpy).to.be.called.with({value: 200}, {value: 200})
    expect(spies.immediateSpy).to.be.called.with(300, 30)
    expect(spies.stringSpy).to.be.called.with('new', 'old')
    expect(spies.nestingSpy).to.be.called.with(400, 40)
    expect(spies.replaceSpy).to.be.called.with(replacement, original)
    expect(spies.arrayReplaceSpy).to.be.called.with(replacementArray, originalArray)
    expect(spies.nestedReplaceSpy).to.be.called.with(500, 50)
    expect(spies.nestedReplaceWithMissingSpy).to.be.called.with(undefined, 10)
    expect(spies.nestedReplaceFromMissingSpy).to.be.called.with(10, undefined)
  });

  it("should not hold references", function(done) {
    this.timeout(5000)

    @VueStore
    class Store {
      constructor(public prop: number) {}
    }

    let blackhole: (Store | null)[] = [null, null]
    let baseline = process.memoryUsage().heapUsed
    let didCollect = false // whether a net-negative GC pass was executed
    for (let i = 0; i < 20; i++) {
      let start = process.memoryUsage().heapUsed
      for(let j = 0; j < 10000; j++) {
        blackhole[j % 2] = new Store(j)
      }
      let end = process.memoryUsage().heapUsed
      if(end < start) {
        didCollect = true
        break
      }
    }
    if(!didCollect) {
      assert.fail('a net-negative GC pass should run when creating 200,000 stores')
    }
    done()
  })

  it("data should be reactive in components", async () => {
    @storeFunction
    class Store {
      value: number = 10
      array: any[] = []
      deep = {value: 20}
    }
    let store = new Store()

    let TestComponent: CO = {
      template: `<div>
      <div id="value">{{ value }}</div>
      <div id="array">{{ array }}</div>
      <div id="deep">{{ deep.value }}</div>
      </div>`,
      computed: {
        value: function() { return store.value },
        array: function() { return store.array.join('+') },
        deep: function() { return store.deep },
      },
    }

    const wrapper = mount(TestComponent)
    expect(wrapper.find('#value').text()).to.equal('10')
    expect(wrapper.find('#array').text()).to.equal('')
    expect(wrapper.find('#deep').text()).to.equal('20')
    store.value = 20
    store.array = [1, 2, 3]
    store.deep.value = 30
    await Vue.nextTick()
    expect(wrapper.find('#value').text()).to.equal('20')
    expect(wrapper.find('#array').text()).to.equal('1+2+3')
    expect(wrapper.find('#deep').text()).to.equal('30')
  })

  it("computed properties should be reactive in components", async () => {
    @storeFunction
    class Store {
      value: number = 10
      array: any[] = []
      deepValue = 20

      get computedValue() {
        return this.value * 10
      }
      get computedArray() {
        return this.array.map(v => '$' + v)
      }
      get computedDeep() {
        return {value: this.deepValue}
      }
    }
    let store = new Store()

    let TestComponent: CO = {
      template: `<div>
      <div id="value">{{ value }}</div>
      <div id="array">{{ array }}</div>
      <div id="deep">{{ deep.value }}</div>
      </div>`,
      computed: {
        value: function() { return store.computedValue },
        array: function() { return store.computedArray.join('+') },
        deep: function() { return store.computedDeep },
      },
    }

    const wrapper = mount(TestComponent)
    expect(wrapper.find('#value').text()).to.equal('100')
    expect(wrapper.find('#array').text()).to.equal('')
    expect(wrapper.find('#deep').text()).to.equal('20')
    store.value = 20
    store.array = [1, 2, 3]
    store.deepValue = 30
    await Vue.nextTick()
    expect(wrapper.find('#value').text()).to.equal('200')
    expect(wrapper.find('#array').text()).to.equal('$1+$2+$3')
    expect(wrapper.find('#deep').text()).to.equal('30')
  })

  it("class components should be reactive", async () => {
    @storeFunction
    class Store {
      value: number = 10
    }
    let store = new Store()

    @Component({
      template: `<div>{{ value }}</div>`
    })
    class TestClassComponent extends Vue {
      get value() {
        return store.value
      }
    }

    const wrapper = mount(TestClassComponent)
    expect(wrapper.text()).to.equal('10')
    store.value = 20
    await Vue.nextTick()
    expect(wrapper.text()).to.equal('20')
  })
}


describe("@VueStore", () => {
  testStores(VueStore)

  it("statics should work", () => {
    @VueStore
    class Store {
      static prop = 10
      static bump() {
        this.prop += 10
      }
    }

    expect(Store.prop).to.equal(10)
    Store.bump()
    expect(Store.prop).to.equal(20)
  });

  it("instanceof should be preserved", () => {
    @VueStore
    class Store {}

    let store = new Store()
    expect(store).to.be.instanceof(Store)
  });
});

describe("VueStore.create", () => {
  testStores(<T extends C>(constructor: T) => {
        return function (...args: any[]) {
          return VueStore.create(new (constructor as C)(...args))
        } as unknown as T
      }
  )
});
