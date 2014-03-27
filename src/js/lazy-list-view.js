var functionProxy = require('function-proxy');

module.exports = Em.ContainerView.extend({

    classNames: ['lazy-list'],

    rowHeight: null,
    columns: 1,
    columnWidth: null,
    columnSpacing: 0,

    itemViewClass: null,
    itemControllerClass: null,

    init: function() {
        this.contentDidChange();
        this._super();
        this._itemViews = {};
        this._createScrollingView();
    },

    scrollContainer: function() {
        return $('.section-body');
    }.property(),

    totalHeight: function() {
        return Math.ceil(this.get('content.length') / this.get('columns')) * this.get('rowHeight');
    }.property('content.length', 'rowHeight', 'columns'),

    _createScrollingView: function() {
        this.pushObject(this.createChildView(require('./lazy-list-scrolling-view')));
    },

    didInsertElement: function() {
        this._super();
        this.get('scrollContainer').on('scroll', functionProxy(this._didScroll, this));
        $(window).on('resize', functionProxy(this._didResizeWindow, this));
        this._cleanupInterval = setInterval(functionProxy(this._cleanup, this), 5*1000);
        Ember.run(this, this._updateViewport);
    },
    willDestroyElement: function() {
        this._super();
        this.get('scrollContainer').off('scroll', functionProxy(this._didScroll, this));
        $(window).off('resize', functionProxy(this._didResizeWindow, this));
        clearInterval(this._cleanupInterval);
    },

    willDestroy: function() {
        this.contentWillChange();
        this._super();
    },

    _didScroll: function(e) {
        Ember.run(this, this._updateViewport);
    },

    _didResizeWindow: function() {
        Ember.run(this, this._updateViewport);
    },

    _updateViewport: function() {
        if (this.get('isDestroying')) {
            return;
        }
        var el = this.$(),
            scrollCt = this.get('scrollContainer'),
            rowHeight = this.get('rowHeight'),
            columns = this.get('columns'),
            top = Math.max(0, scrollCt.offset().top - el.offset().top),
            bottom = Math.min(this.get('totalHeight'), top + scrollCt.height()),
            extra = 5 * columns,
            startIndex = Math.max(0, Math.floor(top / rowHeight) * columns - extra),
            endIndex = Math.ceil(bottom / rowHeight) * columns + extra,
            content = this.get('content'),
            length = content.get('length'),
            pageSize = content.get('pageSize'),
            i;
        this.set('startIndex', startIndex);
        this.set('endIndex', endIndex);
        for (i = startIndex; i <= endIndex; i++) {
            if (i < length) {
                this._setupItemView(i);
            }
        }
        //Probe the previous and next half page from the sparse array
        if (pageSize) {
            content.objectAt(Math.min(length, startIndex - pageSize / 2));
            content.objectAt(Math.min(length, endIndex + pageSize / 2));
        }
    },

    _topForIndex: function(index) {
        return this.get('rowHeight') * Math.floor(index / this.get('columns'));
    },
    _leftForIndex: function(index) {
        return this.get('columnWidth') * (index % this.get('columns'));
    },
    _setupItemView: function(index) {
        var itemView = this._itemViews[index];
        if (!itemView) {
            var content = this.get('content').objectAt(index);
            var controller = this.createChildController({
                target: this.get('controller'),
                content: content
            });
            itemView = this.createChildView(this.get('itemViewClass'), {
                controller: controller,
                context: controller,
                content: content,
                contentIndex: index,
                top: this._topForIndex(index),
                left: this._leftForIndex(index)
            });
            this._itemViews[index] = itemView;
            this.pushObject(itemView);
        }
    },
    createChildController: function(properties) {
        var itemControllerClass = this.get('itemControllerClass') || Em.ObjectController;
        return itemControllerClass.create(properties);
    },
    _moveItemView: function(oldIndex, newIndex) {
        var itemView = this._itemViews[oldIndex];
        if (itemView) {
            itemView.setProperties({
                contentIndex: newIndex,
                top: this._topForIndex(newIndex),
                left: this._leftForIndex(newIndex)
            });
            itemView._updateStyle();
            delete this._itemViews[oldIndex];
            this._itemViews[newIndex] = itemView;
        } else {
            this._setupItemView(newIndex);
        }
    },
    _destroyItemView: function(index) {
        var itemView = this._itemViews[index];
        if (itemView) {
            this.willDestroyItemView(itemView);
            this.removeObject(itemView);
            itemView.destroy();
            delete this._itemViews[index];
        }
    },
    _destroyAllItemViews: function() {
        for (var index in this._itemViews) {
            if (!this._itemViews.hasOwnProperty(index)) continue;
            this._destroyItemView(index);
        }
    },
    willDestroyItemView: Em.K,

    _cleanup: function() {
        var startIndex = this.get('startIndex'),
            endIndex = this.get('endIndex'),
            index;
        for (index in this._itemViews) {
            if (!this._itemViews.hasOwnProperty(index)) continue;
            if (index < startIndex || index > endIndex) {
                this._destroyItemView(index);
            }
        }
    },

    contentWillChange: Ember.beforeObserver(function() {
        var content = this.get('content');
        if (content) {
            content.removeArrayObserver(this);
        }
    }, 'content'),

    contentDidChange: Ember.observer(function() {
        var content = this.get('content');
        if (content) {
            content.addArrayObserver(this);
        }
        if (this.get('state') == 'inDOM') {
            this._destroyAllItemViews();
            this._updateViewport();
        }
    }, 'content'),

    arrayWillChange: Ember.K,
    arrayDidChange: function(content, start, removedCount, addedCount) {
        var startIndex = this.get('startIndex'),
            endIndex = this.get('endIndex'),
            length = this.get('content.length'),
            i,
            newIndex;
        //Destroy removed items
        for (i = start; i < start + removedCount; i++) {
            this._destroyItemView(i);
        }
        //If something was removed, then move the items following it "up"
        if (removedCount) {
            for (i = start + removedCount; i <= Math.min(endIndex, length + removedCount - 1); i++) {
                newIndex = i - removedCount;
                if (newIndex >= startIndex && newIndex <= endIndex) {
                    this._moveItemView(i, newIndex);
                } else {
                    this._destroyItemView(i);
                }
            }
        }
        //If something was added, then move the existing items in those spots "down"
        if (addedCount) {
            for (i = Math.min(endIndex, length - addedCount - 1); i >= start; i--) {
                newIndex = i + addedCount;
                if (newIndex >= startIndex && newIndex <= endIndex) {
                    this._moveItemView(i, newIndex);
                } else {
                    this._destroyItemView(i);
                }
            }
        }
        //Setup added items
        for (i = start; i < start + addedCount; i++) {
            if (i >= startIndex && i <= endIndex) {
                this._setupItemView(i);
            }
        }
    },
    contentLengthDidChange: function() {
        Em.run.next(this, this._updateViewport);
    }.observes('content.length')

});