module.exports = Em.View.extend({
    classNames: ['lazy-list-scrolling'],
    attributeBindings: ['style'],
    style: Ember.computed(function() {
        return "height: " + this.get('parentView.totalHeight') + "px";
    }).property('parentView.totalHeight')
});