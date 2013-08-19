var Emitter = require('events').EventEmitter,
    def     = Object.defineProperty,
    slice   = Array.prototype.slice,
    methods = ['push','pop','shift','unshift','splice','sort','reverse']

var arrayMutators = {
    remove: function (index) {
        if (typeof index !== 'number') index = this.indexOf(index)
        this.splice(index, 1)
    },
    replace: function (index, data) {
        if (typeof index !== 'number') index = this.indexOf(index)
        this.splice(index, 1, data)
    }
}

methods.forEach(function (method) {
    arrayMutators[method] = function () {
        var result = Array.prototype[method].apply(this, arguments),
            newElements

        // watch new objects - do we need this? maybe do it in each.js

        // if (method === 'push' || method === 'unshift') {
        //     newElements = arguments
        // } else if (method === 'splice') {
        //     newElements = slice.call(arguments, 2)
        // }
        // if (newElements) {
        //     var i = newElements.length
        //     while (i--) watch(newElements[i])
        // }
        this.__observer__.emit('mutate', this.__path__, this, mutation = {
            method: method,
            args: slice.call(arguments),
            result: result
        })
    }
})

// EXTERNAL
function observe (obj, path, observer) {
    watch(obj)
    path = path + '.'
    obj.__observer__
        .on('get', function (key) {
            observer.emit('get', path + key)
        })
        .on('set', function (key, val) {
            observer.emit('set', path + key, val)
        })
        .on('mutate', function (key, val, mutation) {
            observer.emit('mutate', path + key, val, mutation)
        })
}

// INTERNAL
function watch (obj, path, observer) {
    var type = typeOf(obj)
    if (type === 'Object') {
        watchObject(obj, path, observer)
    } else if (type === 'Array') {
        watchArray(obj, path, observer)
    }
}

function watchObject (obj, path, observer) {
    defProtected(obj, '__values__', {})
    defProtected(obj, '__observer__', observer || new Emitter())
    for (var key in obj) {
        bind(obj, key, path, obj.__observer__)
    }
}

function watchArray (arr, path, observer) {
    defProtected(arr, '__path__', path)
    defProtected(arr, '__observer__', observer || new Emitter())
    for (method in arrayMutators) {
        defProtected(arr, method, arrayMutators[method])
    }
    // var i = arr.length
    // while (i--) watch(arr[i])
}

function bind (obj, key, path, observer) {
    var val = obj[key],
        values = obj.__values__,
        fullKey = (path ? path + '.' : '') + key
    values[fullKey] = val
    def(obj, key, {
        enumerable: true,
        get: function () {
            observer.emit('get', fullKey)
            return values[fullKey]
        },
        set: function (newVal) {
            values[fullKey] = newVal
            watch(newVal, fullKey, observer)
            observer.emit('set', fullKey, newVal)
        }
    })
    watch(val, fullKey, observer)
}

function defProtected (obj, key, val) {
    def(obj, key, {
        enumerable: false,
        configurable: false,
        value: val
    })
}

function typeOf (obj) {
    return toString.call(obj).slice(8, -1)
}

var data = {
    id: 1,
    user: {
        firstName: 'Jack',
        lastName: 'Daniels'
    },
    posts: [
        {
            title: 'hi',
            content: 'Whaaat up'
        },
        {
            title: 'lol',
            content: 'This is cool'
        }
    ]
}

var ob = new Emitter()

observe(data, 'testing', ob)
ob.on('set', function (key, val) {
    console.log('set: ' + key + ' =>\n', val)
})
ob.on('mutate', function (key, val, mutation) {
    console.log('mutate: '+ key + ' =>\n', val)
    console.log(mutation)
})

data.id = 2
data.posts.push({ title: 'hola' })

module.exports = data