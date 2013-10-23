module.exports =  require('./item-view').extend({

    classNames: ['lazy-list-item'],

    _updateStyle: function() {
        var el = this.get('element');
        if (el) {
            el.style.top = this.get('top') + 'px';
            el.style.left = this.get('left') + 'px';
        }
    },

    didInsertElement: function() {
        this._updateStyle();
    }

});