module.exports = Ember.CollectionView.extend({

    itemControllerClass: null,

    createChildView: function(viewClass, attrs) {
        attrs.context = attrs.controller = this.createChildController({
            content: attrs.content,
            target: this.get('controller')
        });
        return this._super(viewClass, attrs);
    },

    createChildController: function(properties) {
        properties.container = this.container;
        var itemControllerClass = this.get('itemControllerClass') || Em.ObjectController;
        return itemControllerClass.create(properties);
    }

});