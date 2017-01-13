'use strict';

var buttons = $('.m-menu__item');
var contents = $('.m-menu-targets');
var callback;

function Menu(){
};

Menu.prototype.init = function(){
  var self = this;
	self.destroy();
	buttons.on('click.menu', function(e){
		buttons.each(_.bind(function(idx, button){
			var $button = $(button);
      var targetName = $button.data('menuTarget');
			var $target = $('[data-menu-name='+targetName+']', contents);
      
			if( button === this ){
				$button.addClass('_active');
				$target.addClass('_active');
        self.changeTab(targetName);
			}else{
				$button.removeClass('_active');
				$target.removeClass('_active');
			}
		},this));
		return false;
	});
};

Menu.prototype.destroy = function(){
	buttons.off('.menu');
};

Menu.prototype.cbChangeTab = function(cb){
  callback = cb;
}

Menu.prototype.changeTab = function(str){
    callback(str);
}

module.exports = new Menu();
