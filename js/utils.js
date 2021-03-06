
/*jshint browser: true */
/* global ObserveUtils*/

var app = app || {};

(function (window) {
    'use strict';

    var List = ObserveUtils.List;
    
    // simple function that will observe a list
    // and all object contained in this list (if they are observable)
    function listObserve(list, handler) {
        function objectObserver(changes) {
            handler(changes);
        }
        
        function listObserver(changes) {
            changes.forEach(function (change) {
                if (change.type === 'splice') {
                    if (change.removed) {
                        change.removed.forEach(function (object) {
                            if (Object(object) === object) {
                                Object.unobserve(object, objectObserver);
                            }
                        });
                    }
                    if (change.addedCount > 0) {
                        var i, l = change.index + change.addedCount;
                        for (i = change.index; i < l; i++) {
                            var item = list[i];
                            if (Object(item) === item) {
                                Object.observe(item, objectObserver);
                            }
                        }
                    }
                } else if (change.type === 'update') {
                    if (Object(change.oldValue) === change.oldValue) {
                        Object.unobserve(change.oldValue, objectObserver);
                    }
                    if (Object(list[change.name]) === list[change.name]) {
                        Object.unobserve(list[change.name], objectObserver);
                    }
                }
            });
            handler(changes);
        }
        
        List.observe(list, listObserver);
        
        list.forEach(function (object) {
            if (Object(object) === object) {
                Object.observe(object, objectObserver);
            }
        });
        
        return {
            dispose: function () {
                list.forEach(function (object) {
                    if (Object(object) === object) {
                        Object.unobserve(object, objectObserver);
                    }
                });
                Object.unobserve(list, listObserver);
            }
        };
    }
    
    function shallowEqual(objA, objB) {
        if (objA === objB) {
            return true;
        }
        var key;
        // Test for A's keys different from B.
        for (key in objA) {
            if (objA.hasOwnProperty(key) &&
                (!objB.hasOwnProperty(key) || objA[key] !== objB[key])) {
                return false;
            }
        }
      // Test for B'a keys missing from A.
      for (key in objB) {
            if (objB.hasOwnProperty(key) && !objA.hasOwnProperty(key)) {
                return false;
            }
      }
      return true;
    }

    
    
    var Utils = app.Utils = {
        uuid: function () {
            /*jshint bitwise:false */
            var i, random;
            var uuid = '';

            for (i = 0; i < 32; i++) {
                random = Math.random() * 16 | 0;
                if (i === 8 || i === 12 || i === 16 || i === 20) {
                    uuid += '-';
                }
                uuid += (i === 12 ? 4 : (i === 16 ? (random & 3 | 8) : random))
                    .toString(16);
            }

            return uuid;
        },

        pluralize: function (count, word) {
            return count === 1 ? word : word + 's';
        },

        store: function (namespace, data) {
            if (data) {
                return localStorage.setItem(namespace, JSON.stringify(data));
            }

            var store = localStorage.getItem(namespace);
            return (store && JSON.parse(store)) || [];
        },

        assign: function (target, source) {
            return Object.keys(source).reduce(function(target, key) {
                target[key] = source[key];
                return target;
            }, target);
        },
        
        observe: function (object, handler) {
            if (object instanceof List) {
                List.observe(object, handler);
            } else {
                Object.observe(object, handler);
            }
        },
        
        //Observe a list and all objects in this list
        deepObserve: function (object, handler) {
            if (object instanceof List) {
                return listObserve(object, handler);
            } else {
                Object.observe(object, handler);
                return {
                    dispose: function () {
                        Object.unobserve(object, handler);
                    }
                };
            }
        },
        
        // A simple mixin that will 'observe' objects returned by the 'getObservedObjects' method of 
        // components and forceUpdate if they dispatch changes
        ObserveMixin : {
            componentDidMount: function () {
                this._observeObjects();
            },
            
            componentDidUpdate: function () {
                if (typeof this.getObservedObjects === 'function') {
                    if (!shallowEqual(this.getObservedObjects(), this._observedObjects)) {
                        this._unobserveObjects();
                        this._observeObjects();
                    }
                }
            },
            
            // We consider that components should react to changes dispatched by Object.observe
            // or to props change, if we want to track properties of objects in our 'props'
            // we just observe them
            shouldComponentUpdate: function(nextProps, nextState) {
                return !shallowEqual(this.props, nextProps) ||
                       !shallowEqual(this.state, nextState);
            },
            
            componentWillUnmount: function () {
                this._unobserveObjects();
            },
            
            _observedObjectsChangeHandler : function () {
                this.forceUpdate();
            },
            
            _observeObjects: function () {
                if (typeof this.getObservedObjects === 'function') {
                    this._observedObjects = this.getObservedObjects();
                    this._observedObjects.forEach(function (object) {
                        Utils.observe(object, this._observedObjectsChangeHandler);
                    }, this);
                }
            },
            
            _unobserveObjects: function () {
                if (this._observedObjects) {
                    this._observedObjects.forEach(function (object) {
                        Object.unobserve(object, this._observedObjectsChangeHandler);
                    }, this);
                } 
            },
        }
    };
    
    

})(window);